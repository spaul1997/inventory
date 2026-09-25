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
    data: { payments: [], companies: [] },
    loading: false,
    error: "",
    loaded: false,
  },
};

function createInitialResources() {
  return {
    dashboard: { ...initialResources.dashboard, data: { ...initialResources.dashboard.data } },
    companies: { ...initialResources.companies, data: { companies: [] } },
    payments: { ...initialResources.payments, data: { payments: [], companies: [] } },
  };
}

function upsertCompany(companies = [], company, prepend = false) {
  if (!company?._id) return companies;
  const exists = companies.some((item) => item._id === company._id);

  if (!exists) {
    return prepend ? [company, ...companies] : [...companies, company];
  }

  return companies.map((item) => item._id === company._id ? { ...item, ...company } : item);
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
          companies: upsertCompany(prev.companies.data.companies, result.company, true),
        },
        loaded: true,
      },
      payments: {
        ...prev.payments,
        data: {
          ...prev.payments.data,
          companies: upsertCompany(prev.payments.data.companies, result.company),
        },
      },
    }));

    return result;
  }, [token]);

  const updateCompany = useCallback(async (companyId, values) => {
    const result = await specialAdminService.updateCompany(companyId, values, token);

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
          companies: upsertCompany(prev.companies.data.companies, result.company),
        },
        loaded: true,
      },
      payments: {
        ...prev.payments,
        data: {
          ...prev.payments.data,
          companies: upsertCompany(prev.payments.data.companies, result.company),
        },
      },
    }));

    return result;
  }, [token]);

  const createPayment = useCallback(async (values) => {
    const result = await specialAdminService.createPayment(values, token);

    setResources((prev) => ({
      ...prev,
      dashboard: {
        ...prev.dashboard,
        loaded: false,
      },
      companies: {
        ...prev.companies,
        loaded: false,
      },
      payments: {
        ...prev.payments,
        data: {
          ...prev.payments.data,
          payments: [result.payment, ...(prev.payments.data.payments || [])],
        },
        loaded: true,
      },
    }));

    return result;
  }, [token]);

  const updatePaymentStatus = useCallback(async (paymentId, paymentStatus) => {
    const result = await specialAdminService.updatePaymentStatus(paymentId, paymentStatus, token);

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
          companies: (prev.companies.data.companies || []).map((company) =>
            company._id === result.company?._id ? result.company : company
          ),
        },
      },
      payments: {
        ...prev.payments,
        data: {
          ...prev.payments.data,
          payments: (prev.payments.data.payments || []).map((payment) =>
            payment._id === result.payment._id ? result.payment : payment
          ),
          companies: (prev.payments.data.companies || []).map((company) =>
            company._id === result.company?._id ? { ...company, ...result.company } : company
          ),
        },
        loaded: true,
      },
    }));

    return result;
  }, [token]);

  const value = useMemo(
    () => ({ resources, loadResource, createCompany, updateCompany, createPayment, updatePaymentStatus }),
    [resources, loadResource, createCompany, updateCompany, createPayment, updatePaymentStatus]
  );

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
    updateCompany: ctx.updateCompany,
    createPayment: ctx.createPayment,
    updatePaymentStatus: ctx.updatePaymentStatus,
  };
}
