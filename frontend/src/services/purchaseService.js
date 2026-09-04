import { apiRequest } from "../lib/api.js";

const purchaseApiEntities = new Set(["purchase-request", "purchase-order", "goods-receipt", "purchase-return"]);

function pathFor(entityKey, id = "") {
  const base = `/purchase-management/${encodeURIComponent(entityKey)}`;
  return id ? `${base}/${encodeURIComponent(id)}` : base;
}

export function hasPurchaseApiEntity(entityKey) {
  return purchaseApiEntities.has(entityKey);
}

export async function listPurchaseRows(entityKey, token) {
  if (!hasPurchaseApiEntity(entityKey)) return null;

  const result = await apiRequest(pathFor(entityKey), { token });
  return result.rows || [];
}

export async function createPurchaseRow(entityKey, record, token) {
  if (!hasPurchaseApiEntity(entityKey)) return null;

  const result = await apiRequest(pathFor(entityKey), {
    method: "POST",
    token,
    body: JSON.stringify(record),
  });
  return result.row;
}

export async function updatePurchaseRow(entityKey, id, patch, token) {
  if (!hasPurchaseApiEntity(entityKey)) return null;

  const result = await apiRequest(pathFor(entityKey, id), {
    method: "PUT",
    token,
    body: JSON.stringify(patch),
  });
  return result.row;
}
