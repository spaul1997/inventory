import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { masterEntities } from "../../data/masterManagement.js";

const MasterDataContext = createContext(null);

function initialState() {
  const state = {};
  Object.keys(masterEntities).forEach((key) => {
    state[key] = masterEntities[key].list.rows.map((row) => ({ ...row }));
  });
  return state;
}

export function MasterDataProvider({ children }) {
  const [data, setData] = useState(initialState);

  const getRows = useCallback((entityKey) => data[entityKey] || [], [data]);

  const addRow = useCallback((entityKey, record) => {
    setData((prev) => ({ ...prev, [entityKey]: [{ ...record }, ...prev[entityKey]] }));
  }, []);

  const updateRow = useCallback((entityKey, id, patch) => {
    setData((prev) => ({
      ...prev,
      [entityKey]: prev[entityKey].map((row) => (row.code === id ? { ...row, ...patch } : row)),
    }));
  }, []);

  const value = useMemo(() => ({ getRows, addRow, updateRow }), [getRows, addRow, updateRow]);

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
}

export function useMasterData() {
  const ctx = useContext(MasterDataContext);
  if (!ctx) throw new Error("useMasterData must be used inside MasterDataProvider");
  return ctx;
}
