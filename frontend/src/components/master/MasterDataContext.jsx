import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { masterEntities } from "../../data/masterManagement.js";
import {
  createMasterRow,
  getMasterApiEntity,
  getMasterApiEntityKeys,
  listMasterRows,
  updateMasterRow,
} from "../../services/masterService.js";
import { sanitizeEntityCollections, useScopedState } from "../../lib/scopedStorage.js";

const MasterDataContext = createContext(null);

function initialState() {
  const state = {};
  Object.keys(masterEntities).forEach((key) => {
    state[key] = masterEntities[key].list.rows.map((row) => ({ ...row }));
  });
  return state;
}

export function MasterDataProvider({ children, storageScope, token }) {
  const [data, setData] = useScopedState(storageScope, "master-data", initialState, sanitizeEntityCollections);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});

  useEffect(() => {
    if (!token || !storageScope) return undefined;

    let mounted = true;
    const entityKeys = getMasterApiEntityKeys();
    setLoading(Object.fromEntries(entityKeys.map((entityKey) => [entityKey, true])));
    setError(Object.fromEntries(entityKeys.map((entityKey) => [entityKey, ""])));

    Promise.allSettled(
      entityKeys.map(async (entityKey) => {
        const rows = await listMasterRows(entityKey, token);
        return { entityKey, rows };
      })
    ).then((results) => {
      if (!mounted) return;

      results.forEach((result, index) => {
        const entityKey = entityKeys[index];
        const config = getMasterApiEntity(entityKey);

        if (result.status === "fulfilled") {
          setData((prev) => ({ ...prev, [result.value.entityKey]: result.value.rows }));
        } else {
          setError((prev) => ({ ...prev, [entityKey]: result.reason?.message || `Unable to load ${config.label}.` }));
          setData((prev) => ({ ...prev, [entityKey]: [] }));
        }
      });

      setLoading((prev) => ({
        ...prev,
        ...Object.fromEntries(entityKeys.map((entityKey) => [entityKey, false])),
      }));
    });

    return () => {
      mounted = false;
    };
  }, [setData, storageScope, token]);

  const getRows = useCallback((entityKey) => (Array.isArray(data[entityKey]) ? data[entityKey] : []), [data]);

  const addRow = useCallback(async (entityKey, record) => {
    if (getMasterApiEntity(entityKey)) {
      const row = await createMasterRow(entityKey, record, token);
      setData((prev) => ({ ...prev, [entityKey]: [row, ...(prev[entityKey] || [])] }));
      return row;
    }

    setData((prev) => ({ ...prev, [entityKey]: [{ ...record }, ...(Array.isArray(prev[entityKey]) ? prev[entityKey] : [])] }));
    return record;
  }, [setData, token]);

  const updateRow = useCallback(async (entityKey, id, patch) => {
    if (getMasterApiEntity(entityKey)) {
      const row = await updateMasterRow(entityKey, id, patch, token);
      setData((prev) => ({
        ...prev,
        [entityKey]: (prev[entityKey] || []).map((item) => (item.code === id ? row : item)),
      }));
      return row;
    }

    setData((prev) => ({
      ...prev,
      [entityKey]: (Array.isArray(prev[entityKey]) ? prev[entityKey] : []).map((row) => (row.code === id ? { ...row, ...patch } : row)),
    }));
    return patch;
  }, [setData, token]);

  const value = useMemo(() => ({ getRows, addRow, updateRow, loading, error }), [getRows, addRow, updateRow, loading, error]);

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
}

export function useMasterData() {
  const ctx = useContext(MasterDataContext);
  if (!ctx) throw new Error("useMasterData must be used inside MasterDataProvider");
  return ctx;
}
