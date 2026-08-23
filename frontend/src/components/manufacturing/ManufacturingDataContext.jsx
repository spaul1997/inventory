import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { manufacturingEntities } from "../../data/manufacturing/entities.js";
import { useMasterData } from "../master/MasterDataContext.jsx";
import { useStockData } from "../stock/StockDataContext.jsx";

const ManufacturingDataContext = createContext(null);

// Product/Finished Goods uses `code` as its natural key (like Master
// Management's entities); every other Manufacturing entity is a numbered
// document keyed by `id` (like Purchase/Stock Management's entities).
export function keyOf(row) {
  return row.id ?? row.code;
}

function initialEntityState() {
  const state = {};
  Object.keys(manufacturingEntities).forEach((key) => {
    state[key] = manufacturingEntities[key].rows.map((row) => ({
      ...row,
      items: row.items ? row.items.map((item) => ({ ...item })) : undefined,
      materialLines: row.materialLines ? row.materialLines.map((l) => ({ ...l })) : undefined,
      operationLines: row.operationLines ? row.operationLines.map((l) => ({ ...l })) : undefined,
    }));
  });
  return state;
}

function initialFgBalances() {
  const balances = {};
  manufacturingEntities["product-finished-goods"].rows.forEach((row) => {
    balances[row.code] = { [row.defaultWarehouse]: Number(row.stock) || 0 };
  });
  return balances;
}

export function ManufacturingDataProvider({ children }) {
  const masterData = useMasterData();
  const stockData = useStockData();
  const [data, setData] = useState(initialEntityState);
  const [fgBalances, setFgBalances] = useState(initialFgBalances);

  const getRows = useCallback((entityKey) => data[entityKey] || [], [data]);
  const getRecord = useCallback((entityKey, id) => (data[entityKey] || []).find((row) => keyOf(row) === id), [data]);

  const addRow = useCallback((entityKey, record) => {
    setData((prev) => ({ ...prev, [entityKey]: [{ ...record }, ...prev[entityKey]] }));
  }, []);

  const updateRow = useCallback((entityKey, id, patch) => {
    setData((prev) => ({ ...prev, [entityKey]: prev[entityKey].map((row) => (keyOf(row) === id ? { ...row, ...patch } : row)) }));
  }, []);

  const removeRow = useCallback((entityKey, id) => {
    setData((prev) => ({ ...prev, [entityKey]: prev[entityKey].filter((row) => keyOf(row) !== id) }));
  }, []);

  const getActiveBom = useCallback((productCode) => (data["bill-of-materials-bom"] || []).find((bom) => bom.product === productCode && bom.status === "Active"), [data]);

  const getBom = useCallback((bomId) => (data["bill-of-materials-bom"] || []).find((bom) => bom.id === bomId), [data]);

  const activateBom = useCallback((bomId) => {
    setData((prev) => {
      const rows = prev["bill-of-materials-bom"];
      const target = rows.find((b) => b.id === bomId);
      if (!target) return prev;
      const next = rows.map((b) => {
        if (b.id === bomId) return { ...b, status: "Active", isDefault: true };
        if (b.product === target.product && b.status === "Active") return { ...b, status: "Obsolete", isDefault: false };
        return b;
      });
      return { ...prev, "bill-of-materials-bom": next };
    });
  }, []);

  const getIssuedForWorkOrder = useCallback(
    (workOrderId) => {
      const totals = {};
      (data["material-issue"] || [])
        .filter((mi) => mi.workOrder === workOrderId && mi.status === "Issued")
        .forEach((mi) => {
          mi.items.forEach((item) => {
            if (!item.code) return;
            totals[item.code] = (totals[item.code] || 0) + (Number(item.qty) || 0);
          });
        });
      return totals;
    },
    [data]
  );

  const getConsumedForWorkOrder = useCallback(
    (workOrderId) => {
      const totals = {};
      (data["material-consumption"] || [])
        .filter((mc) => mc.workOrder === workOrderId && mc.status === "Posted")
        .forEach((mc) => {
          mc.items.forEach((item) => {
            if (!item.code) return;
            totals[item.code] = (totals[item.code] || 0) + (Number(item.consumedQty) || 0);
          });
        });
      return totals;
    },
    [data]
  );

  const getFgStock = useCallback((productCode) => Object.values(fgBalances[productCode] || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0), [fgBalances]);

  const postMaterialIssue = useCallback(
    (items, { warehouse, reference, user, date }) => {
      stockData.postStockOut(items, { warehouse, reference, user, date });
    },
    [stockData]
  );

  const postMaterialReturn = useCallback(
    (items, { warehouse, reference, user, date }) => {
      const returned = items.filter((item) => (Number(item.returnedQty) || 0) > 0).map((item) => ({ code: item.code, batch: item.batch, qty: item.returnedQty, unitCost: item.unitCost }));
      if (returned.length) stockData.postStockIn(returned, { warehouse, reference, user, date });
    },
    [stockData]
  );

  const postFinishedGoodsReceipt = useCallback(
    (items, { productCode, warehouse }) => {
      const qty = items.reduce((sum, item) => sum + (Number(item.qtyReceived) || 0), 0);
      setFgBalances((prev) => {
        const perWh = { ...(prev[productCode] || {}) };
        perWh[warehouse] = (Number(perWh[warehouse]) || 0) + qty;
        const next = { ...prev, [productCode]: perWh };
        const total = Object.values(next[productCode]).reduce((s, q) => s + (Number(q) || 0), 0);
        const product = (data["product-finished-goods"] || []).find((p) => p.code === productCode);
        updateRow("product-finished-goods", productCode, { stock: total });
        if (product?.linkedItemCode) {
          const linked = masterData.getRows("product-item").find((r) => r.code === product.linkedItemCode);
          if (linked) masterData.updateRow("product-item", product.linkedItemCode, { stock: (Number(linked.stock) || 0) + qty });
        }
        return next;
      });
    },
    [data, masterData, updateRow]
  );

  const value = useMemo(
    () => ({
      getRows,
      getRecord,
      addRow,
      updateRow,
      removeRow,
      getActiveBom,
      getBom,
      activateBom,
      getIssuedForWorkOrder,
      getConsumedForWorkOrder,
      getFgStock,
      fgBalances,
      postMaterialIssue,
      postMaterialReturn,
      postFinishedGoodsReceipt,
    }),
    [
      getRows,
      getRecord,
      addRow,
      updateRow,
      removeRow,
      getActiveBom,
      getBom,
      activateBom,
      getIssuedForWorkOrder,
      getConsumedForWorkOrder,
      getFgStock,
      fgBalances,
      postMaterialIssue,
      postMaterialReturn,
      postFinishedGoodsReceipt,
    ]
  );

  return <ManufacturingDataContext.Provider value={value}>{children}</ManufacturingDataContext.Provider>;
}

export function useManufacturingData() {
  const ctx = useContext(ManufacturingDataContext);
  if (!ctx) throw new Error("useManufacturingData must be used inside ManufacturingDataProvider");
  return ctx;
}
