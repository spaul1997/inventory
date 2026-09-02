import { apiRequest } from "../lib/api.js";

export async function listStateDistricts() {
  const result = await apiRequest("/locations/state-districts");
  return result.stateDistricts || {};
}
