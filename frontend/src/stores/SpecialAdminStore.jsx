import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { specialAdminService } from "../services/specialAdminService.js";

const SpecialAdminContext = createContext(null);

const loaders = {
  dashboard: specialAdminService.getDashboard,
  companies: specialAdminService.getCompanies,
  payments: specialAdminService.getPayments,
};

const initialResources = {
  dashboard: {
    data: { summary: {}, recentCompanies: [] },
    loading: false,
    error: "",
    loaded: false,
  },
  companies: {
    data: { companies: [] },
    loading: false,
    error: "",
    loaded: false,
  },
  payments: {
    data: { payments: [] },
    loading: false,
    error: "",
    loaded: false,
  },
};

function createInitialResources() {
  return {
    dashboard: { ...initialResources.dashboard, data: { ...initialResources.dashboard.data } },
    companies: { ...initialResources.companies, data: { companies: [] } },
    payments: { ...initialResources.payments, data: { payments: [] } },
  };
}

export function SpecialAdminDataProvider({ children, token }) {
  const [resources, setResources] = useState(createInitialResources);

  useEffect(() => {
    setResources(createInitialResources());
  }, [token]);

  const loadResource = useCallback(async (resourceKey) => {
    if (!token || !loaders[resourceKey]) return;

    setResources((prev) => ({
      ...prev,
      [resourceKey]: {
        ...prev[resourceKey],
        loading: true,
        error: "",
      },
    }));

    try {
      const data = await loaders[resourceKey](token);
      setResources((prev) => ({
        ...prev,
        [resourceKey]: {
          data,
          loading: false,
          error: "",
          loaded: true,
        },
      }));
    } catch (err) {
      setResources((prev) => ({
        ...prev,
        [resourceKey]: {
          ...prev[resourceKey],
          loading: false,
          error: err.message || "Unable to load data.",
          loaded: true,
        },
      }));
    }
  }, [token]);

  const createCompany = useCallback(async (values) => {
    const result = await specialAdminService.createCompany(values, token);

    setResources((prev) => ({
      ...prev,
      dashboard: {
        ...prev.dashboard,
        loaded: false,
      },
      companies: {
        ...prev.companies,
        data: {
          ...prev.companies.data,
          companies: [result.company, ...(prev.companies.data.companies || [])],
        },
        loaded: true,
      },
    }));

    return result;
  }, [token]);

  const value = useMemo(() => ({ resources, loadResource, createCompany }), [resources, loadResource, createCompany]);

  return <SpecialAdminContext.Provider value={value}>{children}</SpecialAdminContext.Provider>;
}

export function useSpecialAdminResource(resourceKey) {
  const ctx = useContext(SpecialAdminContext);
  if (!ctx) {
    throw new Error("useSpecialAdminResource must be used inside SpecialAdminDataProvider");
  }

  const resource = ctx.resources[resourceKey] || { data: {}, loading: false, error: "", loaded: false };

  useEffect(() => {
    if (!resource.loaded && !resource.loading) {
      ctx.loadResource(resourceKey);
    }
  }, [ctx, resource.loaded, resource.loading, resourceKey]);

  return {
    ...resource,
    refresh: () => ctx.loadResource(resourceKey),
  };
}

export function useSpecialAdminActions() {
  const ctx = useContext(SpecialAdminContext);
  if (!ctx) {
    throw new Error("useSpecialAdminActions must be used inside SpecialAdminDataProvider");
  }

  return {
    createCompany: ctx.createCompany,
  };
}
