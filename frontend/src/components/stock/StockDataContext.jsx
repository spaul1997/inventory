import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  stockEntities,
  initialMovements,
  initialBatches,
} from "../../data/stockManagement.js";
import { useMasterData } from "../master/MasterDataContext.jsx";
import { sanitizeEntityCollections, useScopedState } from "../../lib/scopedStorage.js";
import {
  createStockRow,
  getStockState,
  hasStockApiEntity,
  listStockRows,
  saveStockState,
  updateStockRow,
} from "../../services/stockService.js";

const StockDataContext = createContext(null);

const legacyEntityIds = {
  "stock-in": new Set(["SIN-2026-0201", "SIN-2026-0202", "SIN-2026-0203", "SIN-2026-0204"]),
  "stock-out": new Set(["SOUT-2026-0301", "SOUT-2026-0302", "SOUT-2026-0303"]),
  "stock-transfer": new Set(["TRF-2026-0401", "TRF-2026-0402", "TRF-2026-0403"]),
  "stock-adjustment": new Set(["ADJ-2026-0501", "ADJ-2026-0502", "ADJ-2026-0503"]),
  "stock-count": new Set(["CNT-2026-0601", "CNT-2026-0602", "CNT-2026-0603"]),
};

const legacyMovementIds = new Set(Array.from({ length: 10 }, (_, index) => `MOV-${String(index + 1).padStart(4, "0")}`));
const legacyBatches = {
  "B-0821-01": { code: "RM-2001", warehouse: "Raw Material Store", qty: 480 },
  "B-0820-04": { code: "RM-2002", warehouse: "Raw Material Store", qty: 200 },
  "B-0820-05": { code: "RM-2006", warehouse: "Raw Material Store", qty: 92 },
  "B-0821-09": { code: "RM-2005", warehouse: "Raw Material Store", qty: 100 },
  "B-0715-02": { code: "RM-2004", warehouse: "Raw Material Store", qty: 25 },
  "B-0501-01": { code: "RM-2004", warehouse: "Raw Material Store", qty: 15 },
  "B-0610-03": { code: "RM-2003", warehouse: "Raw Material Store", qty: 3600 },
};

function initialEntityState() {
  const state = {};
  Object.keys(stockEntities).forEach((key) => {
    state[key] = stockEntities[key].rows.map((row) => ({ ...row, items: row.items ? row.items.map((item) => ({ ...item })) : undefined }));
  });
  return state;
}

function readScopedStorage(storageScope, stateName) {
  if (!storageScope) return null;
  try {
    const stored = localStorage.getItem(`ims:${storageScope}:${stateName}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function migrateLegacyEntities(value, initialFactory) {
  const collections = sanitizeEntityCollections(value, initialFactory);
  return Object.fromEntries(
    Object.entries(collections).map(([entityKey, rows]) => [
      entityKey,
      rows.filter((row) => !legacyEntityIds[entityKey]?.has(row.id)),
    ])
  );
}

function migrateLegacyMovements(value, initialFactory) {
  const fallback = initialFactory();
  if (!Array.isArray(value)) return fallback;
  return value.filter((movement) => !legacyMovementIds.has(movement.id));
}

function migrateLegacyBatches(value, initialFactory) {
  const fallback = initialFactory();
  if (!Array.isArray(value)) return fallback;

  return value.flatMap((batch) => {
    const legacy = legacyBatches[batch.id];
    if (!legacy || legacy.code !== batch.code || legacy.warehouse !== batch.warehouse) return [batch];

    const liveQuantity = Math.max(0, (Number(batch.qty) || 0) - legacy.qty);
    return liveQuantity > 0 ? [{ ...batch, qty: liveQuantity, status: "Active" }] : [];
  });
}

function initialLiveEntities(storageScope) {
  return migrateLegacyEntities(readScopedStorage(storageScope, "stock-data"), initialEntityState);
}

function initialLiveMovements(storageScope) {
  const stored = readScopedStorage(storageScope, "stock-movements-live") ?? readScopedStorage(storageScope, "stock-movements");
  return readScopedStorage(storageScope, "stock-movements-live") !== null
    ? (Array.isArray(stored) ? stored : initialMovements)
    : migrateLegacyMovements(stored, () => initialMovements);
}

function initialLiveBatches(storageScope) {
  return migrateLegacyBatches(readScopedStorage(storageScope, "stock-batches"), () => initialBatches);
}

function sanitizeArray(value, initialFactory) {
  return Array.isArray(value) ? value : initialFactory();
}

function balancesFromMasterData(masterData, movements = []) {
  const activeWarehouses = masterData.getRows("warehouse").filter((row) => row.status !== "Inactive");
  const fallbackWarehouse = activeWarehouses[0]?.name || "Unassigned";
  const items = masterData.getRows("product-item");
  const movementTotals = movements.reduce((totals, movement) => {
    if (!movement.item) return totals;
    totals[movement.item] = (totals[movement.item] || 0) + (Number(movement.qtyIn) || 0) - (Number(movement.qtyOut) || 0);
    return totals;
  }, {});

  const result = items.reduce((balances, item) => {
    if (!item.code) return balances;
    const currentQuantity = Math.max(0, Number(item.stock) || 0);
    const openingQuantity = Math.max(0, currentQuantity - (movementTotals[item.code] || 0));
    if (openingQuantity <= 0) return balances;

    const warehouse = item.defaultWarehouse || item.warehouse || fallbackWarehouse;
    balances[item.code] = { [warehouse]: openingQuantity };
    return balances;
  }, {});

  [...movements]
    .sort((a, b) => {
      const aSequence = Number(String(a.id || "").match(/\d+$/)?.[0]) || 0;
      const bSequence = Number(String(b.id || "").match(/\d+$/)?.[0]) || 0;
      return aSequence - bSequence;
    })
    .forEach((movement) => {
      if (!movement.item || !movement.warehouse) return;
      const byWarehouse = { ...(result[movement.item] || {}) };
      const delta = (Number(movement.qtyIn) || 0) - (Number(movement.qtyOut) || 0);
      byWarehouse[movement.warehouse] = Math.max(0, (Number(byWarehouse[movement.warehouse]) || 0) + delta);
      result[movement.item] = byWarehouse;
    });

  items.forEach((item) => {
    if (!item.code) return;
    const targetQuantity = Math.max(0, Number(item.stock) || 0);
    const byWarehouse = { ...(result[item.code] || {}) };
    const currentQuantity = Object.values(byWarehouse).reduce((sum, quantity) => sum + (Number(quantity) || 0), 0);
    let difference = targetQuantity - currentQuantity;
    const homeWarehouse = item.defaultWarehouse || item.warehouse || fallbackWarehouse;

    if (difference > 0) {
      byWarehouse[homeWarehouse] = (Number(byWarehouse[homeWarehouse]) || 0) + difference;
    } else if (difference < 0) {
      let quantityToRemove = Math.abs(difference);
      const warehouses = [homeWarehouse, ...Object.keys(byWarehouse).filter((warehouse) => warehouse !== homeWarehouse)];
      warehouses.forEach((warehouse) => {
        if (quantityToRemove <= 0) return;
        const available = Number(byWarehouse[warehouse]) || 0;
        const removed = Math.min(available, quantityToRemove);
        byWarehouse[warehouse] = available - removed;
        quantityToRemove -= removed;
      });
    }

    if (targetQuantity > 0) result[item.code] = byWarehouse;
    else delete result[item.code];
  });

  return result;
}

function appendMovements(currentMovements, entries) {
  const highestId = currentMovements.reduce((highest, movement) => {
    const sequence = Number(String(movement.id || "").match(/\d+$/)?.[0]) || 0;
    return Math.max(highest, sequence);
  }, 0);
  const nextEntries = entries.map((entry, index) => ({
    id: `MOV-${String(highestId + index + 1).padStart(4, "0")}`,
    ...entry,
  }));
  return [...nextEntries.reverse(), ...currentMovements];
}

function batchesAfterStockIn(currentBatches, items, { warehouse, reference, supplier }) {
  const batchItems = (items || [])
    .map((item) => ({ ...item, batch: String(item.batch || "").trim(), qty: Number(item.qty) || 0 }))
    .filter((item) => item.batch && item.code && item.qty > 0);
  const next = [...currentBatches];

  batchItems.forEach((item) => {
    const existingIndex = next.findIndex((batch) => batch.id === item.batch && batch.code === item.code && batch.warehouse === warehouse);
    if (existingIndex >= 0) {
      const existing = next[existingIndex];
      next[existingIndex] = {
        ...existing,
        qty: (Number(existing.qty) || 0) + item.qty,
        expiryDate: item.expiry || existing.expiryDate || "",
        location: item.location || existing.location || "",
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
}

function batchesAfterStockOut(currentBatches, items, { warehouse }) {
  const batchItems = (items || [])
    .map((item) => ({ ...item, batch: String(item.batch || "").trim(), qty: Number(item.qty) || 0 }))
    .filter((item) => item.batch && item.code && item.qty > 0);

  return currentBatches.map((batch) => {
    const issuedQty = batchItems
      .filter((item) => item.batch === batch.id && item.code === batch.code && batch.warehouse === warehouse)
      .reduce((sum, item) => sum + item.qty, 0);
    if (issuedQty <= 0) return batch;
    const qty = Math.max(0, (Number(batch.qty) || 0) - issuedQty);
    return { ...batch, qty, status: qty > 0 ? batch.status : "Consumed" };
  });
}

function batchesAfterTransfer(currentBatches, items, { fromWarehouse, toWarehouse, toLocation }) {
  const batchItems = (items || [])
    .map((item) => ({ ...item, batch: String(item.batch || "").trim(), qty: Number(item.qty) || 0 }))
    .filter((item) => item.batch && item.code && item.qty > 0);
  const next = [...currentBatches];

  batchItems.forEach((item) => {
    const sourceIndex = next.findIndex((batch) => batch.id === item.batch && batch.code === item.code && batch.warehouse === fromWarehouse);
    if (sourceIndex < 0) return;
    const source = next[sourceIndex];
    const movedQuantity = Math.min(Number(source.qty) || 0, item.qty);
    if (movedQuantity <= 0) return;

    const sourceQuantity = Math.max(0, (Number(source.qty) || 0) - movedQuantity);
    next[sourceIndex] = { ...source, qty: sourceQuantity, status: sourceQuantity > 0 ? source.status : "Consumed" };
    const destinationIndex = next.findIndex((batch) => batch.id === item.batch && batch.code === item.code && batch.warehouse === toWarehouse);
    if (destinationIndex >= 0) {
      next[destinationIndex] = {
        ...next[destinationIndex],
        qty: (Number(next[destinationIndex].qty) || 0) + movedQuantity,
        location: toLocation || next[destinationIndex].location || "",
        status: "Active",
      };
    } else {
      next.push({ ...source, qty: movedQuantity, warehouse: toWarehouse, location: toLocation || "", status: "Active" });
    }
  });
  return next;
}

export function StockDataProvider({ children, storageScope, token }) {
  const masterData = useMasterData();
  const [data, setData] = useScopedState(storageScope, "stock-data-live", () => initialLiveEntities(storageScope), sanitizeEntityCollections);
  const [movements, setMovements] = useScopedState(storageScope, "stock-movements-live", () => initialLiveMovements(storageScope), sanitizeArray);
  const [batches, setBatches] = useScopedState(storageScope, "stock-batches-live", () => initialLiveBatches(storageScope), sanitizeArray);
  const [balances, setBalances] = useScopedState(storageScope, "stock-balances-live", () => balancesFromMasterData(masterData, initialLiveMovements(storageScope)));
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [remoteInventoryReady, setRemoteInventoryReady] = useState(!token);
  const [needsRemoteSeed, setNeedsRemoteSeed] = useState(false);
  const persistenceQueueRef = useRef(Promise.resolve());
  const inventoryRef = useRef({ balances, movements, batches });
  const masterLoadingStates = Object.values(masterData.loading || {});
  const masterStockReady =
    masterLoadingStates.length > 0 &&
    masterLoadingStates.every((loading) => !loading) &&
    !masterData.error?.["product-item"] &&
    !masterData.error?.warehouse;

  const persistInventory = useCallback((snapshot, force = false) => {
    if (!token || (!remoteInventoryReady && !force)) return Promise.resolve(snapshot);
    const task = persistenceQueueRef.current
      .catch(() => undefined)
      .then(() => saveStockState(snapshot, token));
    persistenceQueueRef.current = task.catch((requestError) => {
      setError(requestError.message || "Unable to save stock state.");
      return null;
    });
    return persistenceQueueRef.current;
  }, [remoteInventoryReady, token]);

  useEffect(() => {
    if (!token || !storageScope) {
      setLoading(false);
      setRemoteInventoryReady(true);
      setNeedsRemoteSeed(false);
      return undefined;
    }

    let mounted = true;
    const entityKeys = Object.keys(stockEntities).filter(hasStockApiEntity);
    setLoading(true);
    setError("");
    setRemoteInventoryReady(false);
    setNeedsRemoteSeed(false);
    persistenceQueueRef.current = Promise.resolve();

    Promise.all([
      Promise.all(entityKeys.map(async (entityKey) => ({ entityKey, rows: await listStockRows(entityKey, token) }))),
      getStockState(token),
    ])
      .then(([collections, state]) => {
        if (!mounted) return;
        setData((prev) => ({
          ...prev,
          ...Object.fromEntries(collections.map(({ entityKey, rows }) => [entityKey, rows])),
        }));

        if (state) {
          const nextInventory = {
            balances: state.balances || {},
            movements: Array.isArray(state.movements) ? state.movements : [],
            batches: Array.isArray(state.batches) ? state.batches : [],
          };
          inventoryRef.current = nextInventory;
          setBalances(nextInventory.balances);
          setMovements(nextInventory.movements);
          setBatches(nextInventory.batches);
          setRemoteInventoryReady(true);
        } else {
          setNeedsRemoteSeed(true);
        }
      })
      .catch((requestError) => {
        if (!mounted) return;
        setError(requestError.message || "Unable to load stock data.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [setBalances, setBatches, setData, setMovements, storageScope, token]);

  useEffect(() => {
    if (!masterStockReady) return;

    if (token) {
      if (!needsRemoteSeed) return;
      const nextBalances = balancesFromMasterData(masterData, movements);
      inventoryRef.current = { balances: nextBalances, movements, batches };
      setBalances(nextBalances);
      setNeedsRemoteSeed(false);
      setRemoteInventoryReady(true);
      persistInventory({ balances: nextBalances, movements, batches }, true);
      return;
    }

    const nextBalances = balancesFromMasterData(masterData, movements);
    inventoryRef.current = { balances: nextBalances, movements, batches };
    setBalances(nextBalances);
  }, [masterStockReady, needsRemoteSeed, persistInventory, storageScope, token]);

  const getRows = useCallback((entityKey) => (Array.isArray(data[entityKey]) ? data[entityKey] : []), [data]);
  const getRecord = useCallback((entityKey, id) => getRows(entityKey).find((row) => row.id === id), [getRows]);

  const addRow = useCallback(async (entityKey, record) => {
    try {
      const row = token && hasStockApiEntity(entityKey) ? await createStockRow(entityKey, record, token) : record;
      setData((prev) => ({ ...prev, [entityKey]: [row, ...(Array.isArray(prev[entityKey]) ? prev[entityKey] : [])] }));
      setError("");
      return row;
    } catch (requestError) {
      setError(requestError.message || "Unable to save stock document.");
      throw requestError;
    }
  }, [setData, token]);

  const updateRow = useCallback(async (entityKey, id, patch) => {
    try {
      const current = (Array.isArray(data[entityKey]) ? data[entityKey] : []).find((row) => row.id === id);
      const merged = current ? { ...current, ...patch } : patch;
      const row = token && hasStockApiEntity(entityKey) ? await updateStockRow(entityKey, id, merged, token) : merged;
      setData((prev) => ({
        ...prev,
        [entityKey]: (Array.isArray(prev[entityKey]) ? prev[entityKey] : []).map((item) => (item.id === id ? row : item)),
      }));
      setError("");
      return row;
    } catch (requestError) {
      setError(requestError.message || "Unable to update stock document.");
      throw requestError;
    }
  }, [data, setData, token]);

  const getAvailable = useCallback((code, warehouse) => (balances[code]?.[warehouse]) || 0, [balances]);
  const getTotalStock = useCallback(
    (code) => Object.values(balances[code] || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0),
    [balances]
  );
  const getWarehouseBreakdown = useCallback((code) => balances[code] || {}, [balances]);

  const commitInventory = useCallback((nextInventory) => {
    inventoryRef.current = nextInventory;
    setBalances(nextInventory.balances);
    setMovements(nextInventory.movements);
    setBatches(nextInventory.batches);
    return persistInventory(nextInventory);
  }, [persistInventory, setBalances, setBatches, setMovements]);

  function syncMasterStock(changes) {
    const rows = masterData.getRows("product-item");
    Object.entries(changes).forEach(([code, delta]) => {
      const current = rows.find((row) => row.code === code);
      if (!current || !delta) return;
      masterData
        .updateRow("product-item", code, { stock: Math.max(0, (Number(current.stock) || 0) + delta) })
        .catch((requestError) => setError(requestError.message || `Unable to update stock for ${code}.`));
    });
  }

  const postStockIn = useCallback((items, { warehouse, reference, user, date, supplier }) => {
    const current = inventoryRef.current;
    const nextBalances = { ...current.balances };
    const entries = [];
    const changes = {};
    (items || []).forEach((item) => {
      const qty = Number(item.qty) || 0;
      if (!item.code || !warehouse || qty <= 0) return;
      const perWarehouse = { ...(nextBalances[item.code] || {}) };
      const newBalance = (Number(perWarehouse[warehouse]) || 0) + qty;
      perWarehouse[warehouse] = newBalance;
      nextBalances[item.code] = perWarehouse;
      changes[item.code] = (changes[item.code] || 0) + qty;
      entries.push({ date, type: "Stock In", item: item.code, batch: item.batch || "", warehouse, qtyIn: qty, qtyOut: 0, balance: newBalance, reference, user });
    });
    const persisted = commitInventory({
      balances: nextBalances,
      movements: appendMovements(current.movements, entries),
      batches: batchesAfterStockIn(current.batches, items, { warehouse, reference, supplier }),
    });
    syncMasterStock(changes);
    return persisted;
  }, [commitInventory, masterData]);

  const postStockOut = useCallback((items, { warehouse, reference, user, date }) => {
    const current = inventoryRef.current;
    const nextBalances = { ...current.balances };
    const entries = [];
    const changes = {};
    (items || []).forEach((item) => {
      const requestedQty = Number(item.qty) || 0;
      if (!item.code || !warehouse || requestedQty <= 0) return;
      const perWarehouse = { ...(nextBalances[item.code] || {}) };
      const available = Number(perWarehouse[warehouse]) || 0;
      const qty = Math.min(available, requestedQty);
      if (qty <= 0) return;
      const newBalance = available - qty;
      perWarehouse[warehouse] = newBalance;
      nextBalances[item.code] = perWarehouse;
      changes[item.code] = (changes[item.code] || 0) - qty;
      entries.push({ date, type: "Stock Out", item: item.code, batch: item.batch || "", warehouse, qtyIn: 0, qtyOut: qty, balance: newBalance, reference, user });
    });
    const persisted = commitInventory({
      balances: nextBalances,
      movements: appendMovements(current.movements, entries),
      batches: batchesAfterStockOut(current.batches, items, { warehouse }),
    });
    syncMasterStock(changes);
    return persisted;
  }, [commitInventory, masterData]);

  const postTransfer = useCallback((items, { fromWarehouse, toWarehouse, toLocation, reference, user, date }) => {
    const current = inventoryRef.current;
    const nextBalances = { ...current.balances };
    const entries = [];
    (items || []).forEach((item) => {
      const requestedQty = Number(item.qty) || 0;
      if (!item.code || !fromWarehouse || !toWarehouse || fromWarehouse === toWarehouse || requestedQty <= 0) return;
      const perWarehouse = { ...(nextBalances[item.code] || {}) };
      const available = Number(perWarehouse[fromWarehouse]) || 0;
      const qty = Math.min(available, requestedQty);
      if (qty <= 0) return;
      const fromBalance = available - qty;
      const toBalance = (Number(perWarehouse[toWarehouse]) || 0) + qty;
      perWarehouse[fromWarehouse] = fromBalance;
      perWarehouse[toWarehouse] = toBalance;
      nextBalances[item.code] = perWarehouse;
      entries.push({ date, type: "Transfer Out", item: item.code, batch: item.batch || "", warehouse: fromWarehouse, qtyIn: 0, qtyOut: qty, balance: fromBalance, reference, user });
      entries.push({ date, type: "Transfer In", item: item.code, batch: item.batch || "", warehouse: toWarehouse, qtyIn: qty, qtyOut: 0, balance: toBalance, reference, user });
    });
    return commitInventory({
      balances: nextBalances,
      movements: appendMovements(current.movements, entries),
      batches: batchesAfterTransfer(current.batches, items, { fromWarehouse, toWarehouse, toLocation }),
    });
  }, [commitInventory]);

  const postAdjustment = useCallback((record, user) => {
    const qty = Number(record.qty) || 0;
    if (!record.code || !record.warehouse || qty <= 0) return;
    const requestedDelta = record.type === "Increase" ? qty : -qty;
    const current = inventoryRef.current;
    const nextBalances = { ...current.balances };
    const perWarehouse = { ...(nextBalances[record.code] || {}) };
    const previousBalance = Number(perWarehouse[record.warehouse]) || 0;
    const newBalance = Math.max(0, previousBalance + requestedDelta);
    const actualDelta = newBalance - previousBalance;
    perWarehouse[record.warehouse] = newBalance;
    nextBalances[record.code] = perWarehouse;
    const entry = {
      date: record.date,
      type: "Adjustment",
      item: record.code,
      batch: record.batch || "",
      warehouse: record.warehouse,
      qtyIn: actualDelta > 0 ? actualDelta : 0,
      qtyOut: actualDelta < 0 ? -actualDelta : 0,
      balance: newBalance,
      reference: record.id,
      user,
    };
    const persisted = commitInventory({ balances: nextBalances, movements: appendMovements(current.movements, [entry]), batches: current.batches });
    syncMasterStock({ [record.code]: actualDelta });
    return persisted;
  }, [commitInventory, masterData]);

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
      balances,
      movements,
      batches,
      loading,
      error,
    }),
    [getRows, getRecord, addRow, updateRow, getAvailable, getTotalStock, getWarehouseBreakdown, postStockIn, postStockOut, postTransfer, postAdjustment, balances, movements, batches, loading, error]
  );

  return <StockDataContext.Provider value={value}>{children}</StockDataContext.Provider>;
}

export function useStockData() {
  const ctx = useContext(StockDataContext);
  if (!ctx) throw new Error("useStockData must be used inside StockDataProvider");
  return ctx;
}
