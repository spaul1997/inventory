import { apiRequest } from "../lib/api.js";

const stockApiEntities = new Set(["stock-transfer", "stock-adjustment", "stock-count"]);

function documentPath(entityKey, id = "") {
  const base = `/stock-management/documents/${encodeURIComponent(entityKey)}`;
  return id ? `${base}/${encodeURIComponent(id)}` : base;
}

export function hasStockApiEntity(entityKey) {
  return stockApiEntities.has(entityKey);
}

export async function listStockRows(entityKey, token) {
  if (!hasStockApiEntity(entityKey)) return [];
  const result = await apiRequest(documentPath(entityKey), { token });
  return result.rows || [];
}

export async function createStockRow(entityKey, record, token) {
  const result = await apiRequest(documentPath(entityKey), {
    method: "POST",
    token,
    body: JSON.stringify(record),
  });
  return result.row;
}

export async function updateStockRow(entityKey, id, record, token) {
  const result = await apiRequest(documentPath(entityKey, id), {
    method: "PUT",
    token,
    body: JSON.stringify(record),
  });
  return result.row;
}

export async function getStockState(token) {
  const result = await apiRequest("/stock-management/state", { token });
  return result.state || null;
}

export async function saveStockState(state, token) {
  const result = await apiRequest("/stock-management/state", {
    method: "PUT",
    token,
    body: JSON.stringify(state),
  });
  return result.state;
}
