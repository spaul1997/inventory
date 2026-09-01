import { apiRequest } from "../lib/api.js";

export const masterApiEntities = {
  "product-item": {
    path: "/master/product-items",
    label: "product items",
  },
  "raw-material": {
    path: "/master/raw-materials",
    label: "raw materials",
  },
  category: {
    path: "/master/categories",
    label: "categories",
  },
  unit: {
    path: "/master/units",
    label: "units",
  },
  supplier: {
    path: "/master/suppliers",
    label: "suppliers",
  },
  warehouse: {
    path: "/master/warehouses",
    label: "warehouses",
  },
  "stock-location": {
    path: "/master/stock-locations",
    label: "stock locations",
  },
};

export function getMasterApiEntityKeys() {
  return Object.keys(masterApiEntities);
}

export function getMasterApiEntity(entityKey) {
  return masterApiEntities[entityKey] || null;
}

export async function listMasterRows(entityKey, token) {
  const config = getMasterApiEntity(entityKey);
  if (!config) return null;

  const result = await apiRequest(config.path, { token });
  return result.rows || [];
}

export async function createMasterRow(entityKey, record, token) {
  const config = getMasterApiEntity(entityKey);
  if (!config) return null;

  const result = await apiRequest(config.path, {
    method: "POST",
    token,
    body: JSON.stringify(record),
  });
  return result.row;
}

export async function updateMasterRow(entityKey, id, patch, token) {
  const config = getMasterApiEntity(entityKey);
  if (!config) return null;

  const result = await apiRequest(`${config.path}/${encodeURIComponent(id)}`, {
    method: "PUT",
    token,
    body: JSON.stringify(patch),
  });
  return result.row;
}
