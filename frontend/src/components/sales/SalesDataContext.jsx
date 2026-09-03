import React, { createContext, useCallback, useContext, useMemo } from "react";
import { salesEntities } from "../../data/sales/entities.js";
import { computeOrderTotals, today } from "../../data/sales/shared.js";
import { useScopedState } from "../../lib/scopedStorage.js";
import { useMasterData } from "../master/MasterDataContext.jsx";

const SalesDataContext = createContext(null);

// Customer is code-keyed (like Master Management's entities); every other
// Sales entity is a numbered document keyed by id (like Purchase/Stock/
// Manufacturing's entities). See ManufacturingDataContext.jsx for the
// original version of this helper.
export function keyOf(row) {
  return row.id ?? row.code;
}

function initialEntityState() {
  const state = {};
  // Deep-copy array-shaped fields so editing one record's line items can't
  // mutate the shared seed data. Several of these keys are array-shaped only
  // on SOME entities (e.g. "notes" is an array on Customer rows but a plain
  // string on Invoice rows) — Array.isArray guards each one individually
  // rather than assuming presence implies array shape.
  const arrayFields = ["items", "shippingAddresses", "contacts", "attachments", "notes", "payments"];
  Object.keys(salesEntities).forEach((key) => {
    state[key] = salesEntities[key].rows.map((row) => {
      const copy = { ...row };
      arrayFields.forEach((field) => {
        if (Array.isArray(row[field])) copy[field] = row[field].map((entry) => ({ ...entry }));
      });
      return copy;
    });
  });
  return state;
}

// Sales' own lightweight per-product reservation ledger. Deliberately NOT an
// extension of StockDataContext (warehouse-broken-down —
// extending it would mean redesigning an unrelated module's internals). Real
// stock decrements/increments still go through Master Management's
// product-item.stock via masterData.updateRow, same call shape Manufacturing's
// postFinishedGoodsReceipt already uses.
function initialReservedQty() {
  return {};
}

export function SalesDataProvider({ children, storageScope }) {
  const masterData = useMasterData();
  const [data, setData] = useScopedState(storageScope, "sales-data", initialEntityState);
  const [reservedQty, setReservedQty] = useScopedState(storageScope, "sales-reserved-qty", initialReservedQty);

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

  const getProduct = useCallback((code) => masterData.getRows("product-item").find((p) => p.code === code), [masterData]);
  const getAvailableToAllocate = useCallback((code) => Math.max(0, (Number(getProduct(code)?.stock) || 0) - (Number(reservedQty[code]) || 0)), [getProduct, reservedQty]);

  const reserveStock = useCallback((items) => {
    setReservedQty((prev) => {
      const next = { ...prev };
      (items || []).forEach((item) => {
        if (!item.productCode) return;
        next[item.productCode] = (Number(next[item.productCode]) || 0) + (Number(item.allocatedQty) || 0);
      });
      return next;
    });
  }, []);

  const releaseStock = useCallback((items) => {
    setReservedQty((prev) => {
      const next = { ...prev };
      (items || []).forEach((item) => {
        if (!item.productCode) return;
        next[item.productCode] = Math.max(0, (Number(next[item.productCode]) || 0) - (Number(item.allocatedQty) || 0));
      });
      return next;
    });
  }, []);

  const dispatchStock = useCallback(
    (items, warehouse) => {
      (items || []).forEach((item) => {
        const qty = Number(item.dispatchQty) || 0;
        if (!item.productCode || qty <= 0) return;
        const product = getProduct(item.productCode);
        if (product) masterData.updateRow("product-item", item.productCode, { stock: Math.max(0, (Number(product.stock) || 0) - qty) });
      });
      setReservedQty((prev) => {
        const next = { ...prev };
        (items || []).forEach((item) => {
          const qty = Number(item.dispatchQty) || 0;
          if (!item.productCode || qty <= 0) return;
          next[item.productCode] = Math.max(0, (Number(next[item.productCode]) || 0) - qty);
        });
        return next;
      });
    },
    [getProduct, masterData]
  );

  const restockStock = useCallback(
    (items) => {
      (items || []).forEach((item) => {
        const qty = Number(item.returnQty) || 0;
        if (!item.productCode || qty <= 0) return;
        const product = getProduct(item.productCode);
        if (product) masterData.updateRow("product-item", item.productCode, { stock: (Number(product.stock) || 0) + qty });
      });
    },
    [getProduct, masterData]
  );

  // Returns the computed patch so callers can merge it into their own local
  // form state directly — reading back via getRecord() right after this call
  // would see a stale pre-update value, since setData()'s effect hasn't
  // flushed into this render's closures yet.
  const recordPayment = useCallback(
    (invoiceId, payment) => {
      const invoice = (data["sales-invoice"] || []).find((row) => row.id === invoiceId);
      if (!invoice) return null;
      const totals = computeOrderTotals(invoice.items, invoice);
      const payments = [...(invoice.payments || []), { date: today(), ...payment }];
      const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const status = paid >= totals.grandTotal ? "Paid" : "Partially Paid";
      const patch = { payments, status, activity: [...(invoice.activity || []), { event: status, date: today(), by: "You" }] };
      updateRow("sales-invoice", invoiceId, patch);
      return { ...invoice, ...patch };
    },
    [data, updateRow]
  );

  const value = useMemo(
    () => ({
      getRows,
      getRecord,
      addRow,
      updateRow,
      removeRow,
      reservedQty,
      getAvailableToAllocate,
      reserveStock,
      releaseStock,
      dispatchStock,
      restockStock,
      recordPayment,
    }),
    [getRows, getRecord, addRow, updateRow, removeRow, reservedQty, getAvailableToAllocate, reserveStock, releaseStock, dispatchStock, restockStock, recordPayment]
  );

  return <SalesDataContext.Provider value={value}>{children}</SalesDataContext.Provider>;
}

export function useSalesData() {
  const ctx = useContext(SalesDataContext);
  if (!ctx) throw new Error("useSalesData must be used inside SalesDataProvider");
  return ctx;
}
