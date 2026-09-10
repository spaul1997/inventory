import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { purchaseEntities } from "../../data/purchaseManagement.js";
import { useScopedState } from "../../lib/scopedStorage.js";
import {
  createPurchaseRow,
  hasPurchaseApiEntity,
  listPurchaseRows,
  updatePurchaseRow,
} from "../../services/purchaseService.js";

const PurchaseDataContext = createContext(null);
const demoPurchaseRequests = [
  ["PR-2026-001", "2026-08-01", "Rajesh Kumar", "Restock for Q3 production run"],
  ["PR-2026-002", "2026-08-05", "Priya Nair", "Bearing replacement stock"],
  ["PR-2026-003", "2026-08-10", "Karan Mehta", "Urgent shortage"],
  ["PR-2026-004", "2026-08-12", "Sunita Rao", "Lab testing samples"],
  ["PR-2026-005", "2026-08-14", "Anil Deshmukh", "September production plan"],
];
const isDemoPurchaseRequest = (row) =>
  demoPurchaseRequests.some(([id, date, requestedBy, purpose]) =>
    row.id === id && row.date === date && row.requestedBy === requestedBy && String(row.purpose || "").includes(purpose)
  );
const normalizePurchaseRequest = (row) => (row.status === "Converted" ? { ...row, status: "Received" } : row);

function initialState() {
  const state = {};
  Object.keys(purchaseEntities).forEach((key) => {
    state[key] = purchaseEntities[key].rows.map((row) => ({ ...row, items: row.items.map((item) => ({ ...item })) }));
  });
  return state;
}

export function PurchaseDataProvider({ children, storageScope, token }) {
  const [data, setData] = useScopedState(storageScope, "purchase-data", initialState);

  useEffect(() => {
    if (!token || !storageScope) return undefined;

    let mounted = true;
    const entityKeys = Object.keys(purchaseEntities).filter(hasPurchaseApiEntity);

    Promise.allSettled(
      entityKeys.map(async (entityKey) => {
        const rows = await listPurchaseRows(entityKey, token);
        return { entityKey, rows };
      })
    ).then((results) => {
      if (!mounted) return;

      results.forEach((result) => {
        if (result.status !== "fulfilled") return;
        setData((prev) => ({ ...prev, [result.value.entityKey]: result.value.rows }));
      });
    });

    return () => {
      mounted = false;
    };
  }, [setData, storageScope, token]);

  const normalizedData = useMemo(() => {
    const requestRows = data["purchase-request"] || [];
    const filteredRequests = requestRows
      .filter((row) => !isDemoPurchaseRequest(row))
      .map(normalizePurchaseRequest);

    const changed = filteredRequests.length !== requestRows.length || filteredRequests.some((row, index) => row !== requestRows[index]);
    if (!changed) return data;
    return { ...data, "purchase-request": filteredRequests };
  }, [data]);

  useEffect(() => {
    if (normalizedData !== data) setData(normalizedData);
  }, [data, normalizedData, setData]);

  const getRows = useCallback((entityKey) => normalizedData[entityKey] || [], [normalizedData]);
  const getRecord = useCallback((entityKey, id) => (normalizedData[entityKey] || []).find((row) => row.id === id), [normalizedData]);

  const addRow = useCallback(async (entityKey, record) => {
    if (token && hasPurchaseApiEntity(entityKey)) {
      const row = await createPurchaseRow(entityKey, record, token);
      setData((prev) => ({ ...prev, [entityKey]: [row, ...(prev[entityKey] || [])] }));
      return row;
    }

    setData((prev) => ({ ...prev, [entityKey]: [{ ...record }, ...prev[entityKey]] }));
    return record;
  }, [setData, token]);

  const updateRow = useCallback(async (entityKey, id, patch) => {
    if (token && hasPurchaseApiEntity(entityKey)) {
      const existingRow = (normalizedData[entityKey] || []).find((row) => row.id === id);
      const mergedPatch = existingRow ? { ...existingRow, ...patch } : patch;
      const row = await updatePurchaseRow(entityKey, id, mergedPatch, token);
      setData((prev) => ({
        ...prev,
        [entityKey]: (prev[entityKey] || []).map((item) => (item.id === id ? row : item)),
      }));
      return row;
    }

    setData((prev) => ({
      ...prev,
      [entityKey]: prev[entityKey].map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
    return patch;
  }, [normalizedData, setData, token]);

  const value = useMemo(() => ({ getRows, getRecord, addRow, updateRow }), [getRows, getRecord, addRow, updateRow]);

  return <PurchaseDataContext.Provider value={value}>{children}</PurchaseDataContext.Provider>;
}

export function usePurchaseData() {
  const ctx = useContext(PurchaseDataContext);
  if (!ctx) throw new Error("usePurchaseData must be used inside PurchaseDataProvider");
  return ctx;
}
