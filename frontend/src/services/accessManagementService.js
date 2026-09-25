import { apiRequest } from "../lib/api.js";

export const accessManagementService = {
  getAccessManagement(token) {
    return apiRequest("/master/access-management", { token });
  },

  createUser(values, token) {
    return apiRequest("/master/users", {
      method: "POST",
      token,
      body: JSON.stringify(values),
    });
  },

  updateUser(userId, values, token) {
    return apiRequest(`/master/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      token,
      body: JSON.stringify(values),
    });
  },

  createRole(values, token) {
    return apiRequest("/master/roles", {
      method: "POST",
      token,
      body: JSON.stringify(values),
    });
  },

  updateRole(roleId, values, token) {
    return apiRequest(`/master/roles/${encodeURIComponent(roleId)}`, {
      method: "PUT",
      token,
      body: JSON.stringify(values),
    });
  },
};
