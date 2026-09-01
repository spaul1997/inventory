import { apiRequest } from "../lib/api.js";

export const authService = {
  login(credentials) {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  me(token) {
    return apiRequest("/auth/me", { token });
  },
};
