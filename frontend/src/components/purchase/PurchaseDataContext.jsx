import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { purchaseEntities } from "../../data/purchaseManagement.js";
import { useScopedState } from "../../lib/scopedStorage.js";

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

export function PurchaseDataProvider({ children, storageScope }) {
  const [data, setData] = useScopedState(storageScope, "purchase-data", initialState);

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

  const addRow = useCallback((entityKey, record) => {
    setData((prev) => ({ ...prev, [entityKey]: [{ ...record }, ...prev[entityKey]] }));
  }, []);

  const updateRow = useCallback((entityKey, id, patch) => {
    setData((prev) => ({
      ...prev,
      [entityKey]: prev[entityKey].map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }, []);

  const value = useMemo(() => ({ getRows, getRecord, addRow, updateRow }), [getRows, getRecord, addRow, updateRow]);

  return <PurchaseDataContext.Provider value={value}>{children}</PurchaseDataContext.Provider>;
}

export function usePurchaseData() {
  const ctx = useContext(PurchaseDataContext);
  if (!ctx) throw new Error("usePurchaseData must be used inside PurchaseDataProvider");
  return ctx;
}
