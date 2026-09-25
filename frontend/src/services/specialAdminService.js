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

  createPayment(values, token) {
    return apiRequest("/saas-admin/payments", {
      method: "POST",
      token,
      body: JSON.stringify(values),
    });
  },

  updatePaymentStatus(paymentId, paymentStatus, token) {
    return apiRequest(`/saas-admin/payments/${paymentId}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ paymentStatus }),
    });
  },

  createCompany(values, token) {
    return apiRequest("/saas-admin/companies", {
      method: "POST",
      token,
      body: JSON.stringify(values),
    });
  },

  updateCompany(companyId, values, token) {
    return apiRequest(`/saas-admin/companies/${companyId}`, {
      method: "PUT",
      token,
      body: JSON.stringify(values),
    });
  },
};
