import { apiRequest } from "../lib/api.js";

export const specialAdminService = {
  getDashboard(token) {
    return apiRequest("/saas-admin/dashboard", { token });
  },

  getCompanies(token) {
    return apiRequest("/saas-admin/companies", { token });
  },

  getPayments(token) {
    return apiRequest("/saas-admin/payments", { token });
  },

  createCompany(values, token) {
    return apiRequest("/saas-admin/companies", {
      method: "POST",
      token,
      body: JSON.stringify(values),
    });
  },
};
