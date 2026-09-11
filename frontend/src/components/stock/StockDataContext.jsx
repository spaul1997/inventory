import React, { createContext, useCallback, useContext, useMemo } from "react";
import {
  stockEntities,
  initialBalances,
  initialMovements,
  initialBatches,
} from "../../data/stockManagement.js";
import { useMasterData } from "../master/MasterDataContext.jsx";
import { sanitizeEntityCollections, useScopedState } from "../../lib/scopedStorage.js";

const StockDataContext = createContext(null);

function initialEntityState() {
  const state = {};
  Object.keys(stockEntities).forEach((key) => {
    state[key] = stockEntities[key].rows.map((row) => ({ ...row, items: row.items ? row.items.map((item) => ({ ...item })) : undefined }));
  });
  return state;
}

let movementCounter = initialMovements.length;

export function StockDataProvider({ children, storageScope }) {
  const masterData = useMasterData();
  const [data, setData] = useScopedState(storageScope, "stock-data", initialEntityState, sanitizeEntityCollections);
  const [balances, setBalances] = useScopedState(storageScope, "stock-balances", () => initialBalances);
  const [movements, setMovements] = useScopedState(storageScope, "stock-movements", () => initialMovements);
  const [batches, setBatches] = useScopedState(storageScope, "stock-batches", () => initialBatches);

  const getRows = useCallback((entityKey) => (Array.isArray(data[entityKey]) ? data[entityKey] : []), [data]);
  const getRecord = useCallback((entityKey, id) => getRows(entityKey).find((row) => row.id === id), [getRows]);

  const addRow = useCallback((entityKey, record) => {
    setData((prev) => ({ ...prev, [entityKey]: [{ ...record }, ...(Array.isArray(prev[entityKey]) ? prev[entityKey] : [])] }));
  }, []);

  const updateRow = useCallback((entityKey, id, patch) => {
    setData((prev) => ({ ...prev, [entityKey]: (Array.isArray(prev[entityKey]) ? prev[entityKey] : []).map((row) => (row.id === id ? { ...row, ...patch } : row)) }));
  }, []);

  const getAvailable = useCallback((code, warehouse) => (balances[code]?.[warehouse]) || 0, [balances]);
  const getTotalStock = useCallback(
    (code) => Object.values(balances[code] || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0),
    [balances]
  );
  const getWarehouseBreakdown = useCallback((code) => balances[code] || {}, [balances]);

  function syncMasterStock(code, delta) {
    const rows = masterData.getRows("product-item");
    const current = rows.find((r) => r.code === code);
    if (current) masterData.updateRow("product-item", code, { stock: Math.max(0, (Number(current.stock) || 0) + delta) });
  }

  function nextMovementId() {
    movementCounter += 1;
    return `MOV-${String(movementCounter).padStart(4, "0")}`;
  }

  const pushMovements = useCallback((entries) => {
    setMovements((prev) => [...entries.map((entry) => ({ id: nextMovementId(), ...entry })).reverse(), ...prev]);
  }, []);

  const updateBatchesFromStockIn = useCallback((items, { warehouse, reference, supplier }) => {
    const batchItems = (items || [])
      .map((item) => ({ ...item, batch: String(item.batch || "").trim(), qty: Number(item.qty) || 0 }))
      .filter((item) => item.batch && item.code && item.qty > 0);
    if (batchItems.length === 0) return;

    setBatches((prev) => {
      const next = [...prev];
      batchItems.forEach((item) => {
        const existingIndex = next.findIndex((batch) => batch.id === item.batch && batch.code === item.code && batch.warehouse === warehouse);
        if (existingIndex >= 0) {
          const existing = next[existingIndex];
          next[existingIndex] = {
            ...existing,
            qty: (Number(existing.qty) || 0) + item.qty,
            expiryDate: item.expiry || existing.expiryDate || "",
            reference: reference || existing.reference,
            supplier: supplier || existing.supplier,
            status: "Active",
          };
          return;
        }

        next.unshift({
          id: item.batch,
          code: item.code,
          item: item.name || item.code,
          mfgDate: item.mfgDate || "",
          expiryDate: item.expiry || item.expiryDate || "",
          qty: item.qty,
          warehouse,
          location: item.location || "",
          supplier: supplier || "",
          reference: reference || "",
          status: "Active",
        });
      });
      return next;
    });
  }, [setBatches]);

  const updateBatchesFromStockOut = useCallback((items, { warehouse }) => {
    const batchItems = (items || [])
      .map((item) => ({ ...item, batch: String(item.batch || "").trim(), qty: Number(item.qty) || 0 }))
      .filter((item) => item.batch && item.code && item.qty > 0);
    if (batchItems.length === 0) return;

    setBatches((prev) =>
      prev.map((batch) => {
        const issuedQty = batchItems
          .filter((item) => item.batch === batch.id && item.code === batch.code && batch.warehouse === warehouse)
          .reduce((sum, item) => sum + item.qty, 0);
        if (issuedQty <= 0) return batch;

        const qty = Math.max(0, (Number(batch.qty) || 0) - issuedQty);
        return {
          ...batch,
          qty,
          status: qty > 0 ? batch.status : "Consumed",
        };
      })
    );
  }, [setBatches]);

  const postStockIn = useCallback(
    (items, { warehouse, reference, user, date, supplier }) => {
      setBalances((prev) => {
        const next = { ...prev };
        const entries = [];
        items.forEach((item) => {
          const qty = Number(item.qty) || 0;
          if (!item.code || qty <= 0) return;
          const perWh = { ...(next[item.code] || {}) };
          const newBal = (Number(perWh[warehouse]) || 0) + qty;
          perWh[warehouse] = newBal;
          next[item.code] = perWh;
          entries.push({ date, type: "Stock In", item: item.code, batch: item.batch || "", warehouse, qtyIn: qty, qtyOut: 0, balance: newBal, reference, user });
          syncMasterStock(item.code, qty);
        });
        pushMovements(entries);
        return next;
      });
      updateBatchesFromStockIn(items, { warehouse, reference, supplier });
    },
    [pushMovements, updateBatchesFromStockIn]
  );

  const postStockOut = useCallback(
    (items, { warehouse, reference, user, date }) => {
      setBalances((prev) => {
        const next = { ...prev };
        const entries = [];
        items.forEach((item) => {
          const qty = Number(item.qty) || 0;
          if (!item.code || qty <= 0) return;
          const perWh = { ...(next[item.code] || {}) };
          const newBal = Math.max(0, (Number(perWh[warehouse]) || 0) - qty);
          perWh[warehouse] = newBal;
          next[item.code] = perWh;
          entries.push({ date, type: "Stock Out", item: item.code, batch: item.batch || "", warehouse, qtyIn: 0, qtyOut: qty, balance: newBal, reference, user });
          syncMasterStock(item.code, -qty);
        });
        pushMovements(entries);
        return next;
      });
      updateBatchesFromStockOut(items, { warehouse });
    },
    [pushMovements, updateBatchesFromStockOut]
  );

  const postTransfer = useCallback(
    (items, { fromWarehouse, toWarehouse, reference, user, date }) => {
      setBalances((prev) => {
        const next = { ...prev };
        const entries = [];
        items.forEach((item) => {
          const qty = Number(item.qty) || 0;
          if (!item.code || qty <= 0) return;
          const fromWh = { ...(next[item.code] || {}) };
          const fromBal = Math.max(0, (Number(fromWh[fromWarehouse]) || 0) - qty);
          fromWh[fromWarehouse] = fromBal;
          const toBal = (Number(fromWh[toWarehouse]) || 0) + qty;
          fromWh[toWarehouse] = toBal;
          next[item.code] = fromWh;
          entries.push({ date, type: "Transfer Out", item: item.code, batch: item.batch || "", warehouse: fromWarehouse, qtyIn: 0, qtyOut: qty, balance: fromBal, reference, user });
          entries.push({ date, type: "Transfer In", item: item.code, batch: item.batch || "", warehouse: toWarehouse, qtyIn: qty, qtyOut: 0, balance: toBal, reference, user });
        });
        pushMovements(entries);
        return next;
      });
    },
    [pushMovements]
  );

  const postAdjustment = useCallback(
    (record, user) => {
      const qty = Number(record.qty) || 0;
      const delta = record.type === "Increase" ? qty : -qty;
      setBalances((prev) => {
        const next = { ...prev };
        const perWh = { ...(next[record.code] || {}) };
        const newBal = Math.max(0, (Number(perWh[record.warehouse]) || 0) + delta);
        perWh[record.warehouse] = newBal;
        next[record.code] = perWh;
        pushMovements([
          {
            date: record.date,
            type: "Adjustment",
            item: record.code,
            batch: "",
            warehouse: record.warehouse,
            qtyIn: delta > 0 ? delta : 0,
            qtyOut: delta < 0 ? -delta : 0,
            balance: newBal,
            reference: record.id,
            user,
          },
        ]);
        return next;
      });
      syncMasterStock(record.code, delta);
    },
    [pushMovements]
  );

  const value = useMemo(
    () => ({
      getRows,
      getRecord,
      addRow,
      updateRow,
      getAvailable,
      getTotalStock,
      getWarehouseBreakdown,
      postStockIn,
      postStockOut,
      postTransfer,
      postAdjustment,
      movements,
      batches,
    }),
    [getRows, getRecord, addRow, updateRow, getAvailable, getTotalStock, getWarehouseBreakdown, postStockIn, postStockOut, postTransfer, postAdjustment, movements, batches]
  );

  return <StockDataContext.Provider value={value}>{children}</StockDataContext.Provider>;
}

export function useStockData() {
  const ctx = useContext(StockDataContext);
  if (!ctx) throw new Error("useStockData must be used inside StockDataProvider");
  return ctx;
}
