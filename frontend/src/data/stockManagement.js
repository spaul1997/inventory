// Config + sample data for the Stock Management module. Follows the same
// config-driven pattern as Master/Purchase Management. Adds a per-warehouse
// stock ledger on top of Master Management's Product / Item aggregate stock
// (see components/stock/StockDataContext.jsx for how the two stay in sync).
import { masterEntities } from "./masterManagement.js";
import { materials, materialByCode, warehouses, suppliers } from "./purchaseManagement.js";

export { materials, materialByCode, warehouses, suppliers };

export const initialBalances = {};
masterEntities["product-item"].list.rows.forEach((row) => {
  initialBalances[row.code] = { "Raw Material Store": row.stock };
});

export const initialBatches = [
  { id: "B-0821-01", code: "RM-2001", item: "Mild Steel Rod 12mm", mfgDate: "2026-08-10", expiryDate: "", qty: 480, warehouse: "Raw Material Store", location: "Rack 1 Shelf 1", supplier: "Bharat Steel Corp", reference: "GRN-2026-0032", status: "Active" },
  { id: "B-0820-04", code: "RM-2002", item: "ABS Plastic Granules", mfgDate: "2026-08-05", expiryDate: "2028-08-05", qty: 200, warehouse: "Raw Material Store", location: "Rack 1 Shelf 2", supplier: "Global Polymers Inc", reference: "GRN-2026-0033", status: "Active" },
  { id: "B-0820-05", code: "RM-2006", item: "Rubber Compound", mfgDate: "2026-08-05", expiryDate: "2027-08-20", qty: 92, warehouse: "Raw Material Store", location: "Bin 1", supplier: "Global Polymers Inc", reference: "GRN-2026-0033", status: "Active" },
  { id: "B-0821-09", code: "RM-2005", item: "Stainless Steel Sheet 2mm", mfgDate: "2026-08-14", expiryDate: "", qty: 100, warehouse: "Raw Material Store", location: "Rack 2 Shelf 1", supplier: "Precision Bearings Ltd", reference: "GRN-2026-0034", status: "Active" },
  { id: "B-0715-02", code: "RM-2004", item: "Industrial Adhesive", mfgDate: "2026-07-01", expiryDate: "2026-08-28", qty: 25, warehouse: "Raw Material Store", location: "Bin 3", supplier: "Hydro Tech Industries", reference: "PO-2026-0047", status: "Active" },
  { id: "B-0501-01", code: "RM-2004", item: "Industrial Adhesive", mfgDate: "2026-05-01", expiryDate: "2026-08-01", qty: 15, warehouse: "Raw Material Store", location: "Bin 3", supplier: "Hydro Tech Industries", reference: "PO-2026-0031", status: "Expired" },
  { id: "B-0610-03", code: "RM-2003", item: "Copper Wire 2.5mm", mfgDate: "2026-06-10", expiryDate: "", qty: 3600, warehouse: "Raw Material Store", location: "Rack 3 Shelf 1", supplier: "ElectroParts Supply Co", reference: "Opening Stock", status: "Active" },
];

export const stockInRows = [
  { id: "SIN-2026-0201", date: "2026-08-14", refType: "Purchase", refNumber: "GRN-2026-0032", warehouse: "Raw Material Store", location: "Rack 1 Shelf 1", receivedBy: "Priya Nair", items: [{ code: "RM-2001", name: "Mild Steel Rod 12mm", batch: "B-0821-01", qty: 480, unit: "KG", unitCost: 68, location: "Rack 1 Shelf 1" }], status: "Completed" },
  { id: "SIN-2026-0202", date: "2026-08-20", refType: "Purchase", refNumber: "GRN-2026-0033", warehouse: "Raw Material Store", location: "Rack 1 Shelf 2", receivedBy: "Priya Nair", items: [{ code: "RM-2002", name: "ABS Plastic Granules", batch: "B-0820-04", qty: 200, unit: "KG", unitCost: 145, location: "Rack 1 Shelf 2" }, { code: "RM-2006", name: "Rubber Compound", batch: "B-0820-05", qty: 92, unit: "KG", unitCost: 180, location: "Bin 1" }], status: "Completed" },
  { id: "SIN-2026-0203", date: "2026-08-21", refType: "Opening Stock", refNumber: "", warehouse: "Raw Material Store", location: "Rack 3 Shelf 1", receivedBy: "Anil Deshmukh", items: [{ code: "RM-2003", name: "Copper Wire 2.5mm", batch: "B-0610-03", qty: 3600, unit: "MTR", unitCost: 95, location: "Rack 3 Shelf 1" }], status: "Completed" },
  { id: "SIN-2026-0204", date: "2026-08-22", refType: "Production", refNumber: "WO-2026-0087", warehouse: "Finished Goods Warehouse", location: "Floor Storage D1", receivedBy: "Karan Mehta", items: [{ code: "RM-2005", name: "Stainless Steel Sheet 2mm", batch: "", qty: 40, unit: "KG", unitCost: 210, location: "Floor Storage D1" }], status: "Draft" },
];

export const stockOutRows = [
  { id: "SOUT-2026-0301", date: "2026-08-18", refType: "Production", refNumber: "WO-2026-0081", warehouse: "Raw Material Store", location: "Rack 1 Shelf 1", issuedTo: "Assembly Line 2", department: "Production", purpose: "Bracket fabrication run", items: [{ code: "RM-2001", name: "Mild Steel Rod 12mm", batch: "B-0821-01", qty: 220, unit: "KG", unitCost: 68 }], status: "Completed" },
  { id: "SOUT-2026-0302", date: "2026-08-19", refType: "Internal Consumption", refNumber: "", warehouse: "Raw Material Store", location: "Bin 1", issuedTo: "Maintenance Team", department: "Maintenance", purpose: "Gasket replacement", items: [{ code: "RM-2006", name: "Rubber Compound", batch: "B-0820-05", qty: 12, unit: "KG", unitCost: 180 }], status: "Completed" },
  { id: "SOUT-2026-0303", date: "2026-08-21", refType: "Damage", refNumber: "", warehouse: "Raw Material Store", location: "Bin 3", issuedTo: "Quality Hold", department: "Quality", purpose: "Damaged in handling", items: [{ code: "RM-2004", name: "Industrial Adhesive", batch: "B-0715-02", qty: 3, unit: "LTR", unitCost: 620 }], status: "Pending" },
];

export const transferRows = [
  {
    id: "TRF-2026-0401",
    date: "2026-08-19",
    fromWarehouse: "Raw Material Store",
    fromLocation: "Rack 1 Shelf 1",
    toWarehouse: "Main Manufacturing Plant",
    toLocation: "Line Feed Store",
    requestedBy: "Karan Mehta",
    reason: "Production line replenishment",
    expectedDate: "2026-08-19",
    items: [{ code: "RM-2001", name: "Mild Steel Rod 12mm", batch: "B-0821-01", qty: 150, unit: "KG" }],
    status: "Completed",
    activity: [
      { event: "Created", date: "2026-08-19", by: "Karan Mehta" },
      { event: "Approved", date: "2026-08-19", by: "Anil Deshmukh" },
      { event: "In Transit", date: "2026-08-19", by: "System" },
      { event: "Received", date: "2026-08-19", by: "Production Store" },
      { event: "Completed", date: "2026-08-19", by: "Production Store" },
    ],
  },
  {
    id: "TRF-2026-0402",
    date: "2026-08-21",
    fromWarehouse: "Raw Material Store",
    fromLocation: "Rack 1 Shelf 2",
    toWarehouse: "Finished Goods Warehouse",
    toLocation: "Floor Storage D1",
    requestedBy: "Priya Nair",
    reason: "Staging for packaging line",
    expectedDate: "2026-08-23",
    items: [{ code: "RM-2002", name: "ABS Plastic Granules", batch: "B-0820-04", qty: 50, unit: "KG" }],
    status: "In Transit",
    activity: [
      { event: "Created", date: "2026-08-21", by: "Priya Nair" },
      { event: "Approved", date: "2026-08-21", by: "Anil Deshmukh" },
      { event: "In Transit", date: "2026-08-21", by: "System" },
    ],
  },
  {
    id: "TRF-2026-0403",
    date: "2026-08-22",
    fromWarehouse: "Raw Material Store",
    fromLocation: "Rack 3 Shelf 1",
    toWarehouse: "Regional Distribution Hub",
    toLocation: "",
    requestedBy: "Sunita Rao",
    reason: "Balance stock redistribution",
    expectedDate: "2026-08-26",
    items: [{ code: "RM-2003", name: "Copper Wire 2.5mm", batch: "B-0610-03", qty: 300, unit: "MTR" }],
    status: "Pending Approval",
    activity: [{ event: "Created", date: "2026-08-22", by: "Sunita Rao" }],
  },
];

export const adjustmentRows = [
  { id: "ADJ-2026-0501", date: "2026-08-15", warehouse: "Raw Material Store", location: "Bin 3", type: "Decrease", code: "RM-2004", item: "Industrial Adhesive", currentStock: 40, qty: 2, reason: "Damage", remarks: "2 LTR container ruptured in storage.", status: "Posted" },
  { id: "ADJ-2026-0502", date: "2026-08-20", warehouse: "Raw Material Store", location: "Rack 1 Shelf 1", type: "Increase", code: "RM-2001", item: "Mild Steel Rod 12mm", currentStock: 8180, qty: 5, reason: "Found Stock", remarks: "Uncounted bundle found during cycle count.", status: "Posted" },
  { id: "ADJ-2026-0503", date: "2026-08-22", warehouse: "Raw Material Store", location: "Bin 1", type: "Decrease", code: "RM-2006", item: "Rubber Compound", currentStock: 80, qty: 6, reason: "Quality Rejection", remarks: "Below hardness spec, pending count approval.", status: "Pending Approval" },
];

export const countRows = [
  {
    id: "CNT-2026-0601",
    date: "2026-08-20",
    warehouse: "Raw Material Store",
    location: "Rack 1 Shelf 1",
    countType: "Cycle Count",
    assignedTo: "Priya Nair",
    supervisor: "Anil Deshmukh",
    items: [{ code: "RM-2001", name: "Mild Steel Rod 12mm", batch: "B-0821-01", systemQty: 8180, physicalQty: 8185, unit: "KG", remarks: "" }],
    varianceReason: "Found Stock",
    reviewedBy: "Anil Deshmukh",
    approvalStatus: "Approved",
    approvalRemarks: "Matches found-stock adjustment ADJ-2026-0502.",
    status: "Completed",
  },
  {
    id: "CNT-2026-0602",
    date: "2026-08-22",
    warehouse: "Raw Material Store",
    location: "Bin 1",
    countType: "Location Count",
    assignedTo: "Priya Nair",
    supervisor: "Anil Deshmukh",
    items: [{ code: "RM-2006", name: "Rubber Compound", batch: "B-0820-05", systemQty: 80, physicalQty: 74, unit: "KG", remarks: "Suspected quality loss." }],
    varianceReason: "Quality Rejection",
    reviewedBy: "",
    approvalStatus: "Pending",
    approvalRemarks: "",
    status: "Pending Review",
  },
  {
    id: "CNT-2026-0603",
    date: "2026-08-22",
    warehouse: "Raw Material Store",
    location: "Full Warehouse",
    countType: "Full Count",
    assignedTo: "Priya Nair",
    supervisor: "Anil Deshmukh",
    items: [
      { code: "RM-2002", name: "ABS Plastic Granules", batch: "B-0820-04", systemQty: 150, physicalQty: 150, unit: "KG", remarks: "" },
      { code: "RM-2005", name: "Stainless Steel Sheet 2mm", batch: "B-0821-09", systemQty: 100, physicalQty: 100, unit: "KG", remarks: "" },
    ],
    varianceReason: "",
    reviewedBy: "",
    approvalStatus: "",
    approvalRemarks: "",
    status: "In Progress",
  },
];

export const initialMovements = [
  { id: "MOV-0001", date: "2026-08-10", type: "Opening Stock", item: "RM-2001", batch: "B-0821-01", warehouse: "Raw Material Store", qtyIn: 8000, qtyOut: 0, balance: 8000, reference: "Opening Balance", user: "System" },
  { id: "MOV-0002", date: "2026-08-14", type: "Purchase", item: "RM-2001", batch: "B-0821-01", warehouse: "Raw Material Store", qtyIn: 480, qtyOut: 0, balance: 8480, reference: "GRN-2026-0032 / SIN-2026-0201", user: "Priya Nair" },
  { id: "MOV-0003", date: "2026-08-18", type: "Stock Out", item: "RM-2001", batch: "B-0821-01", warehouse: "Raw Material Store", qtyIn: 0, qtyOut: 220, balance: 8260, reference: "WO-2026-0081 / SOUT-2026-0301", user: "Karan Mehta" },
  { id: "MOV-0004", date: "2026-08-19", type: "Transfer Out", item: "RM-2001", batch: "B-0821-01", warehouse: "Raw Material Store", qtyIn: 0, qtyOut: 150, balance: 8110, reference: "TRF-2026-0401", user: "Karan Mehta" },
  { id: "MOV-0005", date: "2026-08-19", type: "Transfer In", item: "RM-2001", batch: "B-0821-01", warehouse: "Main Manufacturing Plant", qtyIn: 150, qtyOut: 0, balance: 150, reference: "TRF-2026-0401", user: "Karan Mehta" },
  { id: "MOV-0006", date: "2026-08-20", type: "Adjustment", item: "RM-2001", batch: "B-0821-01", warehouse: "Raw Material Store", qtyIn: 5, qtyOut: 0, balance: 8180, reference: "ADJ-2026-0502", user: "Anil Deshmukh" },
  { id: "MOV-0007", date: "2026-08-15", type: "Adjustment", item: "RM-2004", batch: "B-0715-02", warehouse: "Raw Material Store", qtyIn: 0, qtyOut: 2, balance: 40, reference: "ADJ-2026-0501", user: "Anil Deshmukh" },
  { id: "MOV-0008", date: "2026-08-20", type: "Purchase", item: "RM-2002", batch: "B-0820-04", warehouse: "Raw Material Store", qtyIn: 200, qtyOut: 0, balance: 1200, reference: "GRN-2026-0033 / SIN-2026-0202", user: "Priya Nair" },
  { id: "MOV-0009", date: "2026-08-20", type: "Purchase", item: "RM-2006", batch: "B-0820-05", warehouse: "Raw Material Store", qtyIn: 92, qtyOut: 0, balance: 92, reference: "GRN-2026-0033 / SIN-2026-0202", user: "Priya Nair" },
  { id: "MOV-0010", date: "2026-08-19", type: "Stock Out", item: "RM-2006", batch: "B-0820-05", warehouse: "Raw Material Store", qtyIn: 0, qtyOut: 12, balance: 80, reference: "SOUT-2026-0302", user: "Priya Nair" },
];

const referenceTypesIn = ["Purchase", "Production", "Sales Return", "Opening Stock", "Transfer", "Other"];
const referenceTypesOut = ["Production", "Sales", "Internal Consumption", "Damage", "Sample", "Other"];
const adjustmentReasons = ["Damage", "Loss", "Found Stock", "Data Correction", "Expired", "Quality Rejection", "Other"];
const countTypes = ["Full Count", "Cycle Count", "Location Count", "Category Count"];

export const stockEntities = {
  "stock-in": {
    label: "Stock In",
    singular: "Stock In",
    icon: "ArrowDownCircle",
    description: "Record materials and products received into inventory.",
    statLabel: "Total Stock In",
    rows: stockInRows,
    list: {
      subtitle: "Record materials and products received into inventory.",
      searchPlaceholder: "Search transaction number, item, reference...",
      searchKeys: ["id", "refNumber"],
      dateKey: "date",
      filters: [
        { key: "warehouse", label: "Warehouse", options: warehouses },
        { key: "refType", label: "Reference Type", options: referenceTypesIn },
        { key: "status", label: "Status", options: ["Draft", "Completed", "Cancelled"] },
      ],
      summary: [
        { label: "Today's Stock In", tone: "primary", compute: (rows) => rows.filter((r) => r.date === "2026-08-22").length },
        { label: "Pending Stock In", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Draft").length },
        { label: "Total Quantity", tone: "accent", compute: (rows) => rows.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (Number(i.qty) || 0), 0), 0) },
        {
          label: "Total Value",
          tone: "success",
          compute: (rows) =>
            new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
              rows.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0), 0)
            ),
        },
      ],
      columns: [
        { key: "id", label: "Transaction No", mono: true, link: true },
        { key: "date", label: "Date" },
        { key: "item", label: "Item", render: (row) => row.items.map((i) => i.name).join(", ") },
        { key: "refType", label: "Source" },
        { key: "warehouse", label: "Warehouse" },
        { key: "qty", label: "Quantity", align: "right", render: (row) => row.items.reduce((s, i) => s + (Number(i.qty) || 0), 0) },
        { key: "refNumber", label: "Reference", mono: true },
        { key: "status", label: "Status", badge: true },
      ],
      rowActions: [
        { key: "view", label: "View", icon: "Eye" },
        { key: "edit", label: "Edit", icon: "Pencil", hideWhen: (row) => row.status !== "Draft" },
        { key: "print", label: "Print", icon: "Printer", print: true },
        { key: "cancel", label: "Cancel", icon: "Ban", tone: "danger", hideWhen: (row) => row.status !== "Draft", setStatus: "Cancelled", confirm: "Cancel this Stock In transaction?" },
      ],
    },
    form: {
      tabs: [
        {
          key: "info",
          label: "Transaction Information",
          fields: [
            { key: "id", label: "Transaction Number", type: "text", required: true, autoLabel: "Auto-generated" },
            { key: "date", label: "Transaction Date", type: "date", required: true },
            { key: "refType", label: "Reference Type", type: "select", options: referenceTypesIn },
            { key: "refNumber", label: "Reference Number", type: "text" },
            { key: "warehouse", label: "Warehouse", type: "select", required: true, options: warehouses },
            { key: "location", label: "Stock Location", type: "text" },
            { key: "receivedBy", label: "Received By", type: "text" },
            { key: "remarks", label: "Remarks", type: "textarea", span: "full" },
          ],
        },
        {
          key: "items",
          label: "Item Details",
          fields: [
            {
              key: "items",
              label: "Item Details",
              type: "lineItems",
              span: "full",
              allowAddRemove: true,
              totals: "stockIn",
              columns: [
                { key: "code", label: "Item Code", type: "material-select" },
                { key: "name", label: "Item", type: "text", readOnly: true },
                { key: "batch", label: "Batch / Lot", type: "text" },
                { key: "qty", label: "Quantity", type: "number" },
                { key: "unit", label: "Unit", type: "text", readOnly: true },
                { key: "unitCost", label: "Unit Cost", type: "number" },
                { key: "total", label: "Total Value", type: "computed-total" },
                { key: "location", label: "Location", type: "text" },
              ],
            },
          ],
        },
        {
          key: "documents",
          label: "Documents",
          fields: [
            { key: "deliveryDoc", label: "Delivery Document", type: "file" },
            { key: "invoiceDoc", label: "Invoice", type: "file" },
            { key: "otherDoc", label: "Other Attachment", type: "file" },
          ],
        },
      ],
    },
    formActions: [
      { key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft" },
      { key: "post", label: "Post Stock In", kind: "primary", status: "Completed", validate: true, stockEffect: "in" },
    ],
  },

  "stock-out": {
    label: "Stock Out",
    singular: "Stock Out",
    icon: "ArrowUpCircle",
    description: "Record inventory leaving a warehouse.",
    statLabel: "Total Stock Out",
    rows: stockOutRows,
    list: {
      subtitle: "Record inventory leaving a warehouse.",
      searchPlaceholder: "Search transaction number, item, reference...",
      searchKeys: ["id", "refNumber"],
      dateKey: "date",
      filters: [
        { key: "warehouse", label: "Warehouse", options: warehouses },
        { key: "department", label: "Department", options: ["Production", "Maintenance", "Quality", "Warehouse"] },
        { key: "refType", label: "Reference Type", options: referenceTypesOut },
        { key: "status", label: "Status", options: ["Draft", "Pending", "Completed", "Cancelled"] },
      ],
      summary: [
        { label: "Today's Stock Out", tone: "primary", compute: (rows) => rows.filter((r) => r.date === "2026-08-22").length },
        { label: "Pending Stock Out", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Pending").length },
        { label: "Total Quantity", tone: "accent", compute: (rows) => rows.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (Number(i.qty) || 0), 0), 0) },
        {
          label: "Total Value",
          tone: "danger",
          compute: (rows) =>
            new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
              rows.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0), 0)
            ),
        },
      ],
      columns: [
        { key: "id", label: "Transaction No", mono: true, link: true },
        { key: "date", label: "Date" },
        { key: "item", label: "Item", render: (row) => row.items.map((i) => i.name).join(", ") },
        { key: "issuedTo", label: "Destination" },
        { key: "warehouse", label: "Warehouse" },
        { key: "qty", label: "Quantity", align: "right", render: (row) => row.items.reduce((s, i) => s + (Number(i.qty) || 0), 0) },
        { key: "refType", label: "Reference" },
        { key: "status", label: "Status", badge: true },
      ],
      rowActions: [
        { key: "view", label: "View", icon: "Eye" },
        { key: "edit", label: "Edit", icon: "Pencil", hideWhen: (row) => !["Draft", "Pending"].includes(row.status) },
        { key: "print", label: "Print", icon: "Printer", print: true },
        { key: "cancel", label: "Cancel", icon: "Ban", tone: "danger", hideWhen: (row) => !["Draft", "Pending"].includes(row.status), setStatus: "Cancelled", confirm: "Cancel this Stock Out transaction?" },
      ],
    },
    form: {
      tabs: [
        {
          key: "info",
          label: "Transaction Information",
          fields: [
            { key: "id", label: "Transaction Number", type: "text", required: true, autoLabel: "Auto-generated" },
            { key: "date", label: "Transaction Date", type: "date", required: true },
            { key: "refType", label: "Reference Type", type: "select", options: referenceTypesOut },
            { key: "refNumber", label: "Reference Number", type: "text" },
            { key: "warehouse", label: "Warehouse", type: "select", required: true, options: warehouses },
            { key: "location", label: "Stock Location", type: "text" },
            { key: "issuedTo", label: "Issued To", type: "text" },
            { key: "department", label: "Department", type: "select", options: ["Production", "Maintenance", "Quality", "Warehouse"] },
            { key: "purpose", label: "Purpose", type: "text" },
            { key: "remarks", label: "Remarks", type: "textarea", span: "full" },
          ],
        },
        {
          key: "items",
          label: "Items",
          fields: [
            {
              key: "items",
              label: "Items",
              type: "lineItems",
              span: "full",
              allowAddRemove: true,
              totals: "stockOut",
              stockAware: true,
              columns: [
                { key: "code", label: "Item Name", type: "material-select" },
                { key: "name", label: "Item", type: "text", readOnly: true },
                { key: "available", label: "Available Stock", type: "available-stock" },
                { key: "batch", label: "Batch", type: "text" },
                { key: "qty", label: "Issue Qty", type: "number", maxKey: "available" },
                { key: "unit", label: "Unit", type: "text", readOnly: true },
                { key: "unitCost", label: "Unit Cost", type: "number" },
                { key: "total", label: "Total", type: "computed-total" },
              ],
            },
          ],
        },
        {
          key: "documents",
          label: "Additional Information",
          fields: [
            { key: "attachment", label: "Attachment", type: "file" },
          ],
        },
      ],
    },
    formActions: [
      { key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft" },
      { key: "post", label: "Post Stock Out", kind: "primary", status: "Completed", validate: true, stockEffect: "out" },
    ],
  },

  "stock-transfer": {
    label: "Stock Transfer",
    singular: "Transfer",
    icon: "ArrowLeftRight",
    description: "Transfer inventory between warehouses or storage locations.",
    statLabel: "Total Transfers",
    rows: transferRows,
    list: {
      subtitle: "Transfer inventory between warehouses or storage locations.",
      searchPlaceholder: "Search transfer number, warehouse...",
      searchKeys: ["id", "fromWarehouse", "toWarehouse"],
      dateKey: "date",
      filters: [
        { key: "fromWarehouse", label: "From Warehouse", options: warehouses },
        { key: "toWarehouse", label: "To Warehouse", options: warehouses },
        { key: "status", label: "Status", options: ["Draft", "Pending Approval", "In Transit", "Completed", "Cancelled"] },
      ],
      summary: [
        { label: "Total Transfers", tone: "primary", compute: (rows) => rows.length },
        { label: "Pending Approval", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Pending Approval").length },
        { label: "In Transit", tone: "accent", compute: (rows) => rows.filter((r) => r.status === "In Transit").length },
        { label: "Completed", tone: "success", compute: (rows) => rows.filter((r) => r.status === "Completed").length },
      ],
      columns: [
        { key: "id", label: "Transfer No", mono: true, link: true },
        { key: "date", label: "Date" },
        { key: "fromWarehouse", label: "From Warehouse" },
        { key: "toWarehouse", label: "To Warehouse" },
        { key: "items", label: "Items", align: "right", render: (row) => row.items.length },
        { key: "qty", label: "Quantity", align: "right", render: (row) => row.items.reduce((s, i) => s + (Number(i.qty) || 0), 0) },
        { key: "requestedBy", label: "Requested By" },
        { key: "status", label: "Status", badge: true },
      ],
      rowActions: [
        { key: "view", label: "View", icon: "Eye" },
        { key: "edit", label: "Edit", icon: "Pencil", hideWhen: (row) => ["Completed", "Cancelled"].includes(row.status) },
        { key: "approve", label: "Approve", icon: "Check", tone: "success", showWhen: (row) => row.status === "Pending Approval", setStatus: "In Transit" },
        { key: "receive", label: "Receive Transfer", icon: "PackageCheck", showWhen: (row) => row.status === "In Transit", setStatus: "Completed", stockEffect: "transfer" },
        { key: "cancel", label: "Cancel", icon: "Ban", tone: "danger", hideWhen: (row) => ["Completed", "Cancelled"].includes(row.status), setStatus: "Cancelled", confirm: "Cancel this transfer?" },
      ],
    },
    form: {
      tabs: [
        {
          key: "info",
          label: "Transfer Information",
          fields: [
            { key: "id", label: "Transfer Number", type: "text", required: true, autoLabel: "Auto-generated" },
            { key: "date", label: "Transfer Date", type: "date", required: true },
            { key: "fromWarehouse", label: "From Warehouse", type: "select", required: true, options: warehouses },
            { key: "fromLocation", label: "From Location", type: "text" },
            { key: "toWarehouse", label: "To Warehouse", type: "select", required: true, options: warehouses },
            { key: "toLocation", label: "To Location", type: "text" },
            { key: "requestedBy", label: "Requested By", type: "text" },
            { key: "reason", label: "Transfer Reason", type: "text" },
            { key: "expectedDate", label: "Expected Date", type: "date" },
            { key: "remarks", label: "Remarks", type: "textarea", span: "full" },
          ],
        },
        {
          key: "items",
          label: "Items",
          fields: [
            {
              key: "items",
              label: "Items",
              type: "lineItems",
              span: "full",
              allowAddRemove: true,
              stockAware: true,
              columns: [
                { key: "code", label: "Item Code", type: "material-select" },
                { key: "name", label: "Item", type: "text", readOnly: true },
                { key: "available", label: "Available Qty", type: "available-stock", warehouseKey: "fromWarehouse" },
                { key: "batch", label: "Batch / Lot", type: "text" },
                { key: "qty", label: "Transfer Qty", type: "number", maxKey: "available" },
                { key: "unit", label: "Unit", type: "text", readOnly: true },
              ],
            },
          ],
        },
      ],
    },
    formActions: [
      { key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft" },
      { key: "submit", label: "Submit", kind: "outline", status: "Pending Approval", validate: true },
      { key: "approve", label: "Approve", kind: "outline", status: "In Transit", validate: true },
      { key: "receive", label: "Receive Transfer", kind: "primary", status: "Completed", validate: true, stockEffect: "transfer" },
    ],
  },

  "stock-adjustment": {
    label: "Stock Adjustment",
    singular: "Adjustment",
    icon: "SlidersHorizontal",
    description: "Correct inventory differences caused by damage, loss or data errors.",
    statLabel: "Total Adjustments",
    rows: adjustmentRows,
    list: {
      subtitle: "Correct inventory differences caused by damage, loss, data errors, etc.",
      searchPlaceholder: "Search adjustment number, item...",
      searchKeys: ["id", "item"],
      dateKey: "date",
      filters: [
        { key: "warehouse", label: "Warehouse", options: warehouses },
        { key: "type", label: "Adjustment Type", options: ["Increase", "Decrease"] },
        { key: "reason", label: "Reason", options: adjustmentReasons },
        { key: "status", label: "Status", options: ["Draft", "Pending Approval", "Posted"] },
      ],
      summary: [
        { label: "Total Adjustments", tone: "primary", compute: (rows) => rows.length },
        { label: "Pending Approval", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Pending Approval").length },
        { label: "Increases", tone: "success", compute: (rows) => rows.filter((r) => r.type === "Increase" && r.status === "Posted").length },
        { label: "Decreases", tone: "danger", compute: (rows) => rows.filter((r) => r.type === "Decrease" && r.status === "Posted").length },
      ],
      columns: [
        { key: "id", label: "Adjustment No", mono: true, link: true },
        { key: "date", label: "Date" },
        { key: "warehouse", label: "Warehouse" },
        { key: "item", label: "Item" },
        { key: "type", label: "Adjustment Type" },
        { key: "qty", label: "Quantity", align: "right", render: (row) => `${row.type === "Increase" ? "+" : "-"}${row.qty}` },
        { key: "reason", label: "Reason" },
        { key: "status", label: "Status", badge: true },
      ],
      rowActions: [
        { key: "view", label: "View", icon: "Eye" },
        { key: "edit", label: "Edit", icon: "Pencil", hideWhen: (row) => row.status === "Posted" },
        { key: "approve", label: "Approve & Post", icon: "Check", tone: "success", showWhen: (row) => row.status === "Pending Approval", setStatus: "Posted", stockEffect: "adjustment" },
        { key: "print", label: "Print", icon: "Printer", print: true },
      ],
    },
    form: {
      tabs: [
        {
          key: "info",
          label: "Adjustment Details",
          fields: [
            { key: "id", label: "Adjustment Number", type: "text", required: true, autoLabel: "Auto-generated" },
            { key: "date", label: "Adjustment Date", type: "date", required: true },
            { key: "warehouse", label: "Warehouse", type: "select", required: true, options: warehouses },
            { key: "location", label: "Location", type: "text" },
            { key: "type", label: "Adjustment Type", type: "select", required: true, options: ["Increase", "Decrease"] },
            { key: "code", label: "Item", type: "material-select-field", required: true },
            { key: "item", label: "Item Name", type: "text", readOnly: true },
            { key: "currentStock", label: "Current Stock", type: "stock-lookup" },
            { key: "qty", label: "Adjustment Quantity", type: "number", required: true },
            { key: "newStock", label: "New Stock", type: "adjustment-preview" },
            { key: "reason", label: "Reason", type: "select", required: true, options: adjustmentReasons },
            { key: "remarks", label: "Remarks", type: "textarea", span: "full" },
          ],
        },
      ],
    },
    formActions: [
      { key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft" },
      { key: "submit", label: "Submit for Approval", kind: "outline", status: "Pending Approval", validate: true },
      { key: "approve", label: "Approve & Post", kind: "primary", status: "Posted", validate: true, stockEffect: "adjustment" },
    ],
  },

  "stock-count": {
    label: "Stock Count",
    singular: "Count",
    icon: "ClipboardCheck",
    description: "Perform physical inventory counting and compare against system stock.",
    statLabel: "Total Counts",
    rows: countRows,
    list: {
      subtitle: "Perform physical inventory counting and compare physical stock with system stock.",
      searchPlaceholder: "Search count number, warehouse...",
      searchKeys: ["id", "warehouse"],
      dateKey: "date",
      filters: [
        { key: "warehouse", label: "Warehouse", options: warehouses },
        { key: "countType", label: "Count Type", options: countTypes },
        { key: "status", label: "Status", options: ["Draft", "In Progress", "Pending Review", "Approved", "Completed"] },
      ],
      summary: [
        { label: "Open Counts", tone: "warning", compute: (rows) => rows.filter((r) => ["Draft", "In Progress"].includes(r.status)).length },
        { label: "In Progress", tone: "primary", compute: (rows) => rows.filter((r) => r.status === "In Progress").length },
        { label: "Completed", tone: "success", compute: (rows) => rows.filter((r) => r.status === "Completed").length },
        {
          label: "Variance Found",
          tone: "danger",
          compute: (rows) => rows.filter((r) => r.items.some((i) => Number(i.physicalQty) !== Number(i.systemQty))).length,
        },
      ],
      columns: [
        { key: "id", label: "Count No", mono: true, link: true },
        { key: "date", label: "Count Date" },
        { key: "warehouse", label: "Warehouse" },
        { key: "location", label: "Location" },
        { key: "items", label: "Items", align: "right", render: (row) => row.items.length },
        { key: "systemQty", label: "System Qty", align: "right", render: (row) => row.items.reduce((s, i) => s + (Number(i.systemQty) || 0), 0) },
        { key: "physicalQty", label: "Counted Qty", align: "right", render: (row) => row.items.reduce((s, i) => s + (Number(i.physicalQty) || 0), 0) },
        {
          key: "variance",
          label: "Variance",
          align: "right",
          render: (row) => row.items.reduce((s, i) => s + ((Number(i.physicalQty) || 0) - (Number(i.systemQty) || 0)), 0),
        },
        { key: "status", label: "Status", badge: true },
      ],
      rowActions: [
        { key: "view", label: "View", icon: "Eye" },
        { key: "edit", label: "Edit", icon: "Pencil", hideWhen: (row) => ["Approved", "Completed"].includes(row.status) },
        { key: "print", label: "Print", icon: "Printer", print: true },
      ],
    },
    form: {
      tabs: [
        {
          key: "info",
          label: "Count Information",
          fields: [
            { key: "id", label: "Count Number", type: "text", required: true, autoLabel: "Auto-generated" },
            { key: "date", label: "Count Date", type: "date", required: true },
            { key: "warehouse", label: "Warehouse", type: "select", required: true, options: warehouses },
            { key: "location", label: "Location", type: "text" },
            { key: "countType", label: "Count Type", type: "select", options: countTypes },
            { key: "assignedTo", label: "Assigned To", type: "text" },
            { key: "supervisor", label: "Supervisor", type: "text" },
          ],
        },
        {
          key: "items",
          label: "Count Items",
          fields: [
            {
              key: "items",
              label: "Count Items",
              type: "lineItems",
              span: "full",
              allowAddRemove: true,
              variance: true,
              columns: [
                { key: "code", label: "Item Code", type: "material-select" },
                { key: "name", label: "Item", type: "text", readOnly: true },
                { key: "systemQty", label: "System Qty", type: "system-qty" },
                { key: "physicalQty", label: "Physical Qty", type: "number" },
                { key: "variance", label: "Variance", type: "variance" },
                { key: "unit", label: "Unit", type: "text", readOnly: true },
                { key: "batch", label: "Batch", type: "text" },
                { key: "remarks", label: "Remarks", type: "text" },
              ],
            },
          ],
        },
        {
          key: "approval",
          label: "Variance Approval",
          fields: [
            { key: "varianceReason", label: "Variance Reason", type: "select", options: adjustmentReasons },
            { key: "reviewedBy", label: "Reviewed By", type: "text" },
            { key: "approvalStatus", label: "Approval Status", type: "select", options: ["Pending", "Approved", "Rejected"] },
            { key: "approvalRemarks", label: "Approval Remarks", type: "textarea", span: "full" },
          ],
        },
      ],
    },
    formActions: [
      { key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft" },
      { key: "start", label: "Start Count", kind: "outline", status: "In Progress" },
      { key: "submit", label: "Submit for Review", kind: "outline", status: "Pending Review" },
      { key: "approve", label: "Approve Variance", kind: "outline", status: "Approved", validate: true },
      { key: "apply", label: "Apply Stock Adjustment", kind: "primary", status: "Completed", validate: true, createsAdjustment: true },
    ],
  },
};

export const stockEntityOrder = ["stock-in", "stock-out", "stock-transfer", "stock-adjustment", "stock-count"];
