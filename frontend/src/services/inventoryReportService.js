import { API_BASE_URL, apiRequest } from "../lib/api.js";

function queryString(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value).trim());
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

function responseFilename(response, fallback) {
  const disposition = response.headers.get("content-disposition") || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  return encoded ? decodeURIComponent(encoded) : plain || fallback;
}

async function getReport(reportKey, filters, token, signal) {
  return apiRequest(`/inventory-reports/${encodeURIComponent(reportKey)}${queryString(filters)}`, {
    token,
    signal,
  });
}

async function downloadReport(reportKey, format, filters, token) {
  const query = queryString({ ...filters, format });
  const response = await fetch(`${API_BASE_URL}/inventory-reports/${encodeURIComponent(reportKey)}/export${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Report download failed.");
  }

  const blob = await response.blob();
  const extension = format === "pdf" ? "pdf" : "xls";
  const filename = responseFilename(response, `${reportKey}.${extension}`);
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
}

export const inventoryReportService = {
  getReport,
  downloadReport,
};
