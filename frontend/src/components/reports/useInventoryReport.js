import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../stores/AuthStore.jsx";
import { inventoryReportService } from "../../services/inventoryReportService.js";

export const emptyReportFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
  warehouse: "",
  category: "",
  itemType: "",
  movementType: "",
  supplier: "",
  status: "",
  minStock: "",
  maxStock: "",
  minQty: "",
  maxQty: "",
  minValue: "",
  maxValue: "",
};

export function useInventoryReport(reportKey) {
  const { session } = useAuth();
  const token = session?.token;
  const [filters, setFilters] = useState(emptyReportFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyReportFilters);
  const [data, setData] = useState({ rows: [], summary: {}, options: {}, generatedAt: "" });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    inventoryReportService
      .getReport(reportKey, appliedFilters, token, controller.signal)
      .then((result) => setData({ rows: [], summary: {}, options: {}, ...result }))
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message || "Unable to load report data.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reportKey, token, appliedFilters, reloadVersion]);

  const updateFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const applyFilters = useCallback((event) => {
    event?.preventDefault();
    setAppliedFilters({ ...filters });
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters({ ...emptyReportFilters });
    setAppliedFilters({ ...emptyReportFilters });
  }, []);

  const reload = useCallback(() => setReloadVersion((current) => current + 1), []);

  const download = useCallback(async (format) => {
    try {
      setExporting(format);
      setError("");
      setAppliedFilters({ ...filters });
      await inventoryReportService.downloadReport(reportKey, format, filters, token);
    } catch (downloadError) {
      setError(downloadError.message || "Unable to download report.");
    } finally {
      setExporting("");
    }
  }, [filters, reportKey, token]);

  return {
    ...data,
    filters,
    updateFilter,
    applyFilters,
    resetFilters,
    reload,
    download,
    loading,
    exporting,
    error,
  };
}
