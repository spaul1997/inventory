import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { purchaseEntities } from "../../data/purchaseManagement.js";

const PurchaseDataContext = createContext(null);

function initialState() {
  const state = {};
  Object.keys(purchaseEntities).forEach((key) => {
    state[key] = purchaseEntities[key].rows.map((row) => ({ ...row, items: row.items.map((item) => ({ ...item })) }));
  });
  return state;
}

export function PurchaseDataProvider({ children }) {
  const [data, setData] = useState(initialState);

  const getRows = useCallback((entityKey) => data[entityKey] || [], [data]);
  const getRecord = useCallback((entityKey, id) => (data[entityKey] || []).find((row) => row.id === id), [data]);

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
