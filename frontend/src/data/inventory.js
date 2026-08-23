export const products = [
  { sku: "IMS-PRD-001", name: "Surgical Gloves", category: "Consumables", store: "Main Store", stock: 1840, reorder: 500, unit: "box", value: 276000 },
  { sku: "IMS-PRD-002", name: "IV Cannula 20G", category: "Medical Supplies", store: "Ward Store", stock: 320, reorder: 450, unit: "pcs", value: 38400 },
  { sku: "IMS-PRD-003", name: "Paracetamol 500mg", category: "Pharmacy", store: "Pharmacy", stock: 9200, reorder: 3000, unit: "tab", value: 23000 },
  { sku: "IMS-PRD-004", name: "ECG Roll", category: "Diagnostics", store: "Diagnostic Store", stock: 74, reorder: 100, unit: "roll", value: 14800 },
  { sku: "IMS-PRD-005", name: "Disinfectant 5L", category: "Housekeeping", store: "Main Store", stock: 58, reorder: 40, unit: "can", value: 20300 },
];

export const purchases = [
  { id: "PO-1042", vendor: "Medline Supplies", items: 18, status: "Received", amount: 184500, date: "2026-08-12" },
  { id: "PO-1043", vendor: "CarePlus Pharma", items: 9, status: "Pending", amount: 72400, date: "2026-08-14" },
  { id: "PO-1044", vendor: "SterileTech", items: 6, status: "Approved", amount: 41500, date: "2026-08-16" },
];

export const sales = [
  { id: "SAL-3301", customer: "In-house Pharmacy", items: 12, amount: 28900, date: "2026-08-15" },
  { id: "SAL-3302", customer: "Ward Consumption", items: 31, amount: 63800, date: "2026-08-16" },
  { id: "SAL-3303", customer: "Emergency Store", items: 7, amount: 12600, date: "2026-08-17" },
];
