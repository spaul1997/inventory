// Config for the Purchase Management module. Mirrors the
// Master Management config pattern (list/form config driving generic
// renderers) but adds line-item tables, cross-document references, and
// status workflows. Reuses Master Management's supplier and Product / Item
// data so both modules stay consistent (materials procured here are the
// same items tracked in Master Management > Product / Item).
import { masterEntities } from "./masterManagement.js";

export const suppliers = masterEntities.supplier.list.rows.map((s) => s.name);
export const materials = masterEntities["product-item"].list.rows.map((m) => ({
  code: m.code,
  name: m.name,
  unit: m.unit,
  price: m.price,
}));
export const warehouses = masterEntities.warehouse.list.rows.map((w) => w.name);

function materialByCode(code) {
  return materials.find((m) => m.code === code);
}

export function lineTotal(item) {
  const qty = Number(item.qty) || 0;
  const price = Number(item.price) || 0;
  const discount = Number(item.discount) || 0;
  const tax = Number(item.tax) || 0;
  const base = qty * price * (1 - discount / 100);
  return base * (1 + tax / 100);
}

export function poTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  const discount = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0) * ((Number(item.discount) || 0) / 100), 0);
  const tax = items.reduce((sum, item) => {
    const base = (Number(item.qty) || 0) * (Number(item.price) || 0) * (1 - (Number(item.discount) || 0) / 100);
    return sum + base * ((Number(item.tax) || 0) / 100);
  }, 0);
  const grandTotal = subtotal - discount + tax;
  return { subtotal, discount, tax, grandTotal };
}

export function formatDisplayDate(value, { includeTime = false } = {}) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);

  if (!match) return text.replace(/\b(am|pm)\b/gi, (suffix) => suffix.toUpperCase());

  const [, year, month, day, hours, minutes] = match;
  if (hours === undefined || minutes === undefined) return `${day}-${month}-${year}${includeTime ? " 12:00 AM" : ""}`;

  const numericHours = Number(hours);
  const displayHours = String(numericHours % 12 || 12).padStart(2, "0");
  const meridiem = numericHours >= 12 ? "PM" : "AM";
  return `${day}-${month}-${year} ${displayHours}:${minutes} ${meridiem}`;
}

export const purchaseRequests = [];

export const purchaseOrders = [
  {
    id: "PO-2026-0045",
    refPR: "PR-2026-001",
    supplier: "Bharat Steel Corp",
    date: "2026-08-02",
    expectedDate: "2026-08-16",
    warehouse: "Raw Material Store",
    paymentTerms: "Net 30",
    deliveryTerms: "Ex-Works",
    items: [
      { code: "RM-2001", name: "Mild Steel Rod 12mm", qty: 500, unit: "KG", price: 68, discount: 0, tax: 5 },
      { code: "RM-2003", name: "Copper Wire 2.5mm", qty: 200, unit: "MTR", price: 95, discount: 2, tax: 12 },
    ],
    status: "Partially Received",
    preparedBy: "Anil Deshmukh",
    approvedBy: "Rajesh Kumar",
    approvalDate: "2026-08-03",
    activity: [
      { event: "Created", date: "2026-08-02", by: "Anil Deshmukh" },
      { event: "Submitted for Approval", date: "2026-08-02", by: "Anil Deshmukh" },
      { event: "Approved", date: "2026-08-03", by: "Rajesh Kumar" },
      { event: "Sent to Supplier", date: "2026-08-03", by: "System" },
      { event: "Partially Received", date: "2026-08-14", by: "Priya Nair" },
    ],
  },
  {
    id: "PO-2026-0046",
    refPR: "PR-2026-002",
    supplier: "Precision Bearings Ltd",
    date: "2026-08-06",
    expectedDate: "2026-08-21",
    warehouse: "Raw Material Store",
    paymentTerms: "Net 15",
    deliveryTerms: "FOB",
    items: [{ code: "RM-2005", name: "Stainless Steel Sheet 2mm", qty: 100, unit: "KG", price: 210, discount: 0, tax: 5 }],
    status: "Ordered",
    preparedBy: "Anil Deshmukh",
    approvedBy: "Rajesh Kumar",
    approvalDate: "2026-08-07",
    activity: [
      { event: "Created", date: "2026-08-06", by: "Anil Deshmukh" },
      { event: "Approved", date: "2026-08-07", by: "Rajesh Kumar" },
      { event: "Sent to Supplier", date: "2026-08-07", by: "System" },
    ],
  },
  {
    id: "PO-2026-0047",
    refPR: "",
    supplier: "Hydro Tech Industries",
    date: "2026-08-11",
    expectedDate: "2026-08-28",
    warehouse: "Raw Material Store",
    paymentTerms: "Net 30",
    deliveryTerms: "Ex-Works",
    items: [
      { code: "RM-2002", name: "ABS Plastic Granules", qty: 300, unit: "KG", price: 145, discount: 0, tax: 12 },
      { code: "RM-2004", name: "Industrial Adhesive", qty: 50, unit: "LTR", price: 620, discount: 0, tax: 18 },
      { code: "RM-2006", name: "Rubber Compound", qty: 80, unit: "KG", price: 180, discount: 0, tax: 12 },
    ],
    status: "Approved",
    preparedBy: "Karan Mehta",
    approvedBy: "Rajesh Kumar",
    approvalDate: "2026-08-12",
    activity: [
      { event: "Created", date: "2026-08-11", by: "Karan Mehta" },
      { event: "Approved", date: "2026-08-12", by: "Rajesh Kumar" },
    ],
  },
  {
    id: "PO-2026-0048",
    refPR: "",
    supplier: "Global Polymers Inc",
    date: "2026-08-13",
    expectedDate: "2026-08-27",
    warehouse: "Raw Material Store",
    paymentTerms: "Advance",
    deliveryTerms: "CIF",
    items: [
      { code: "RM-2002", name: "ABS Plastic Granules", qty: 200, unit: "KG", price: 145, discount: 0, tax: 12 },
      { code: "RM-2006", name: "Rubber Compound", qty: 100, unit: "KG", price: 180, discount: 0, tax: 12 },
    ],
    status: "Received",
    preparedBy: "Anil Deshmukh",
    approvedBy: "Rajesh Kumar",
    approvalDate: "2026-08-13",
    activity: [
      { event: "Created", date: "2026-08-13", by: "Anil Deshmukh" },
      { event: "Approved", date: "2026-08-13", by: "Rajesh Kumar" },
      { event: "Sent to Supplier", date: "2026-08-14", by: "System" },
      { event: "Received", date: "2026-08-20", by: "Priya Nair" },
    ],
  },
  {
    id: "PO-2026-0049",
    refPR: "",
    supplier: "ElectroParts Supply Co",
    date: "2026-08-15",
    expectedDate: "2026-09-02",
    warehouse: "Main Manufacturing Plant",
    paymentTerms: "Net 30",
    deliveryTerms: "Ex-Works",
    items: [{ code: "RM-2003", name: "Copper Wire 2.5mm", qty: 150, unit: "MTR", price: 95, discount: 0, tax: 12 }],
    status: "Pending Approval",
    preparedBy: "Sunita Rao",
    activity: [
      { event: "Created", date: "2026-08-15", by: "Sunita Rao" },
      { event: "Submitted for Approval", date: "2026-08-15", by: "Sunita Rao" },
    ],
  },
  {
    id: "PO-2026-0050",
    refPR: "",
    supplier: "Bharat Steel Corp",
    date: "2026-08-16",
    expectedDate: "2026-09-05",
    warehouse: "Raw Material Store",
    paymentTerms: "Net 30",
    deliveryTerms: "Ex-Works",
    items: [
      { code: "RM-2001", name: "Mild Steel Rod 12mm", qty: 300, unit: "KG", price: 68, discount: 0, tax: 5 },
      { code: "RM-2005", name: "Stainless Steel Sheet 2mm", qty: 100, unit: "KG", price: 210, discount: 0, tax: 5 },
    ],
    status: "Draft",
    preparedBy: "Anil Deshmukh",
    activity: [{ event: "Created", date: "2026-08-16", by: "Anil Deshmukh" }],
  },
];

export const goodsReceipts = [
  {
    id: "GRN-2026-0032",
    refPO: "PO-2026-0045",
    supplier: "Bharat Steel Corp",
    date: "2026-08-14",
    warehouse: "Raw Material Store",
    receivedBy: "Priya Nair",
    vehicleNumber: "MH-12-AB-4521",
    challanNumber: "DC-88213",
    invoiceNumber: "INV-BSC-3301",
    items: [
      { code: "RM-2001", name: "Mild Steel Rod 12mm", orderedQty: 500, receivedQty: 500, acceptedQty: 480, rejectedQty: 20, unit: "KG", batch: "B-0821-01", expiry: "" },
    ],
    inspectionRequired: true,
    qualityStatus: "Partially Passed",
    inspectedBy: "Sunita Rao",
    inspectionDate: "2026-08-14",
    inspectionRemarks: "20kg surface rust — rejected.",
    status: "Completed",
    stockUpdated: true,
    activity: [
      { event: "Created", date: "2026-08-14", by: "Priya Nair" },
      { event: "Submitted for Inspection", date: "2026-08-14", by: "Priya Nair" },
      { event: "Inspection Completed", date: "2026-08-14", by: "Sunita Rao" },
      { event: "Stock Updated", date: "2026-08-14", by: "System" },
    ],
  },
  {
    id: "GRN-2026-0033",
    refPO: "PO-2026-0048",
    supplier: "Global Polymers Inc",
    date: "2026-08-20",
    warehouse: "Raw Material Store",
    receivedBy: "Priya Nair",
    vehicleNumber: "MH-14-CD-7789",
    challanNumber: "DC-55102",
    invoiceNumber: "INV-GPI-1187",
    items: [
      { code: "RM-2002", name: "ABS Plastic Granules", orderedQty: 200, receivedQty: 200, acceptedQty: 200, rejectedQty: 0, unit: "KG", batch: "B-0820-04", expiry: "" },
      { code: "RM-2006", name: "Rubber Compound", orderedQty: 100, receivedQty: 100, acceptedQty: 92, rejectedQty: 8, unit: "KG", batch: "B-0820-05", expiry: "2027-08-20" },
    ],
    inspectionRequired: true,
    qualityStatus: "Partially Passed",
    inspectedBy: "Sunita Rao",
    inspectionDate: "2026-08-20",
    inspectionRemarks: "8kg rubber compound below hardness spec.",
    status: "Completed",
    stockUpdated: true,
    activity: [
      { event: "Created", date: "2026-08-20", by: "Priya Nair" },
      { event: "Inspection Completed", date: "2026-08-20", by: "Sunita Rao" },
      { event: "Stock Updated", date: "2026-08-20", by: "System" },
    ],
  },
  {
    id: "GRN-2026-0034",
    refPO: "PO-2026-0046",
    supplier: "Precision Bearings Ltd",
    date: "2026-08-21",
    warehouse: "Raw Material Store",
    receivedBy: "Priya Nair",
    vehicleNumber: "MH-12-EF-3390",
    challanNumber: "DC-90344",
    invoiceNumber: "INV-PBL-2245",
    items: [
      { code: "RM-2005", name: "Stainless Steel Sheet 2mm", orderedQty: 100, receivedQty: 100, acceptedQty: 0, rejectedQty: 0, unit: "KG", batch: "B-0821-09", expiry: "" },
    ],
    inspectionRequired: true,
    qualityStatus: "Pending",
    inspectedBy: "",
    inspectionDate: "",
    inspectionRemarks: "",
    status: "Pending Inspection",
    stockUpdated: false,
    activity: [
      { event: "Created", date: "2026-08-21", by: "Priya Nair" },
      { event: "Submitted for Inspection", date: "2026-08-21", by: "Priya Nair" },
    ],
  },
];

export const purchaseIssues = [];

export const purchaseReturns = [
  {
    id: "RET-2026-011",
    refGRN: "GRN-2026-0032",
    refPO: "PO-2026-0045",
    supplier: "Bharat Steel Corp",
    date: "2026-08-15",
    warehouse: "Raw Material Store",
    reason: "Damaged",
    items: [
      { code: "RM-2001", name: "Mild Steel Rod 12mm", receivedQty: 500, availableQty: 480, returnQty: 20, unit: "KG", price: 68, batch: "B-0821-01", reason: "Surface rust damage" },
    ],
    creditNoteNumber: "",
    transportDetails: "Return via supplier pickup",
    status: "Approved",
    stockDeducted: true,
    approvedBy: "Anil Deshmukh",
    approvalDate: "2026-08-16",
    activity: [
      { event: "Created", date: "2026-08-15", by: "Priya Nair" },
      { event: "Submitted for Approval", date: "2026-08-15", by: "Priya Nair" },
      { event: "Approved", date: "2026-08-16", by: "Anil Deshmukh" },
      { event: "Stock Deducted", date: "2026-08-16", by: "System" },
    ],
  },
  {
    id: "RET-2026-012",
    refGRN: "GRN-2026-0033",
    refPO: "PO-2026-0048",
    supplier: "Global Polymers Inc",
    date: "2026-08-21",
    warehouse: "Raw Material Store",
    reason: "Quality Rejection",
    items: [
      { code: "RM-2006", name: "Rubber Compound", receivedQty: 100, availableQty: 92, returnQty: 8, unit: "KG", price: 180, batch: "B-0820-05", reason: "Below hardness spec" },
    ],
    creditNoteNumber: "",
    transportDetails: "",
    status: "Pending Approval",
    stockDeducted: false,
    activity: [
      { event: "Created", date: "2026-08-21", by: "Priya Nair" },
      { event: "Submitted for Approval", date: "2026-08-21", by: "Priya Nair" },
    ],
  },
];

export { materialByCode };

const PR_STATUSES = ["Draft", "Pending Approval", "Approved", "Partial Issue", "Full Issue", "Rejected", "Received", "Cancelled"];
const PO_STATUSES = ["Draft", "Pending Approval", "Approved", "Rejected", "Ordered", "Partially Received", "Completed GRN", "Received", "Cancelled", "Returned"];
const GRN_STATUSES = ["Draft", "Pending Inspection", "Accepted", "Partially Accepted", "Rejected", "Completed"];
const GRN_INSPECTION_COMPLETE_STATUSES = ["Passed", "Failed", "Partially Passed"];
const ISSUE_STATUSES = ["Issue Incomplete", "Issue Complete", "Cancelled"];
const ISSUE_TYPES = ["Production", "Department", "Project", "Other"];
const RETURN_STATUSES = ["Draft", "Pending Approval", "Approved", "Rejected", "Returned", "Cancelled"];
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const RETURN_REASONS = ["Damaged", "Defective", "Wrong Material", "Excess Quantity", "Quality Rejection", "Expired", "Other"];
const materialColumn = { key: "code", label: "Item Name", type: "material-select" };
const nameColumn = { key: "name", label: "Material", type: "text", readOnly: true };
const unitColumn = { key: "unit", label: "Unit", type: "text", readOnly: true };

export const purchaseEntities = {
  "purchase-request": {
    label: "Purchase Request",
    singular: "Request",
    icon: "FileText",
    description: "Create and manage internal requests for purchasing materials.",
    statLabel: "Total Requests",
    rows: purchaseRequests,
    list: {
      subtitle: "Create and manage internal requests for purchasing materials.",
      searchPlaceholder: "Search request number, requester, material...",
      searchKeys: ["id", "requestedBy"],
      dateKey: "date",
      filters: [
        { key: "status", label: "Status", options: PR_STATUSES },
        { key: "department", label: "Department", optionsFrom: "department" },
        { key: "priority", label: "Priority", options: PRIORITIES },
      ],
      summary: [
        { label: "Total Requests", tone: "primary", compute: (rows) => rows.length },
        { label: "Pending Approval", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Pending Approval").length },
        { label: "Approved", tone: "success", compute: (rows) => rows.filter((r) => r.status === "Approved").length },
        { label: "Rejected", tone: "danger", compute: (rows) => rows.filter((r) => r.status === "Rejected").length },
        { label: "Received", tone: "accent", compute: (rows) => rows.filter((r) => r.status === "Received").length },
      ],
      columns: [
        { key: "id", label: "Request No", mono: true },
        { key: "date", label: "Request Date & Time" },
        { key: "requestedBy", label: "Requested By" },
        { key: "department", label: "Department" },
        { key: "requiredDate", label: "Required Date" },
        { key: "items", label: "Items", align: "right", render: (row) => row.items.length },
        { key: "priority", label: "Priority" },
        { key: "status", label: "Status", badge: true },
      ],
      rowActions: [
        { key: "view", label: "View", icon: "Eye" },
        { key: "edit", label: "Edit", icon: "Pencil", hideWhen: (row) => ["Approved", "Partial Issue", "Full Issue", "Rejected", "Received", "Cancelled"].includes(row.status) },
        { key: "approve", label: "Approve", icon: "Check", tone: "success", showWhen: (row) => row.status === "Pending Approval", setStatus: "Approved", approvalAction: "approve", confirm: "Approve this purchase request?" },
        { key: "reject", label: "Reject", icon: "X", tone: "danger", showWhen: (row) => row.status === "Pending Approval", setStatus: "Rejected", approvalAction: "reject", requiresReason: true },
        { key: "receive", label: "Received", icon: "PackageCheck", tone: "success", showWhen: (row) => ["Approved", "Full Issue"].includes(row.status), setStatus: "Received" },
        { key: "convert", label: "Convert to PO", icon: "ArrowRightCircle", showWhen: (row) => row.status === "Approved", convertsTo: "purchase-order" },
        { key: "issue", label: "Purchase Issue", icon: "Send", showWhen: (row) => ["Approved", "Partial Issue"].includes(row.status), convertsTo: "purchase-issue" },
        { key: "print", label: "Print", icon: "Printer", print: true },
      ],
    },
    form: {
      tabs: [
        {
          key: "basic",
          label: "Basic Information",
          fields: [
            { key: "date", label: "Request Date & Time", type: "datetime-local", required: true, span: "quarter" },
            { key: "department", label: "Department", type: "select", required: true, optionsFrom: "department", searchable: true, span: "quarter" },
            { key: "requiredDate", label: "Required Date", type: "date", span: "quarter" },
            { key: "priority", label: "Priority", type: "select", options: PRIORITIES, span: "quarter" },
          ],
        },
        {
          key: "items",
          label: "Material Items",
          fields: [
            {
              key: "items",
              label: "Material Items",
              type: "lineItems",
              span: "full",
              allowAddRemove: true,
              totals: "request",
              columns: [
                materialColumn,
                { key: "qty", label: "Required Qty", type: "number" },
                unitColumn,
                { key: "total", label: "Total Price", type: "computed-line-total" },
                { key: "remarks", label: "Remarks", type: "text" },
              ],
            },
            { key: "purpose", label: "Purpose / Reason", type: "textarea", span: "half" },
            { key: "internalNotes", label: "Notes", type: "textarea", span: "half" },
          ],
        },
        {
          key: "approval",
          label: "Approval",
          fields: [
            { key: "approvedBy", label: "Approved By", type: "text", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.approvedBy) },
            { key: "approvalDate", label: "Approval Date", type: "date", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.approvalDate) },
            { key: "rejectedBy", label: "Rejected By", type: "text", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.rejectedBy) },
            { key: "rejectionDate", label: "Rejection Date", type: "date", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.rejectionDate) },
            { key: "rejectionReason", label: "Rejection Reason", type: "textarea", readOnly: true, span: "full", showWhen: (row) => Boolean(row.rejectionReason) },
            { key: "receivedBy", label: "Received By", type: "text", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.receivedBy) },
            { key: "receivedDate", label: "Received Date", type: "date", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.receivedDate) },
          ],
        },
      ],
    },
    formActions: [
      { key: "cancel", label: "Cancel", kind: "ghost" },
      { key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft", showWhen: (row) => row.status === "Draft" },
      { key: "submit", label: "Submit for Approval", kind: "primary", status: "Pending Approval", validate: true, showWhen: (row) => row.status === "Draft" },
      { key: "approve", label: "Approve", kind: "primary", tone: "success", status: "Approved", validate: true, showWhen: (row) => row.status === "Pending Approval", approvalAction: "approve", confirm: "Approve this purchase request?" },
      { key: "reject", label: "Reject", kind: "outline", tone: "danger", status: "Rejected", showWhen: (row) => row.status === "Pending Approval", approvalAction: "reject", requiresReason: true },
    ],
  },

  "purchase-order": {
    label: "Purchase Order",
    singular: "Purchase Order",
    icon: "ShoppingCart",
    description: "Manage supplier purchase orders and procurement commitments.",
    statLabel: "Total POs",
    rows: purchaseOrders,
    list: {
      subtitle: "Manage supplier purchase orders and procurement commitments.",
      searchPlaceholder: "Search PO number, supplier...",
      searchKeys: ["id", "supplier"],
      dateKey: "date",
      filters: [
        { key: "supplier", label: "Supplier", optionsFrom: "supplier" },
        { key: "status", label: "Status", options: PO_STATUSES },
        { key: "warehouse", label: "Warehouse", optionsFrom: "warehouse" },
      ],
      summary: [
        { label: "Total POs", tone: "primary", compute: (rows) => rows.length },
        { label: "Pending Approval", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Pending Approval").length },
        { label: "Open Orders", tone: "accent", compute: (rows) => rows.filter((r) => ["Ordered", "Approved"].includes(r.status)).length },
        { label: "Partially Received", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Partially Received").length },
        { label: "Completed GRN", tone: "success", compute: (rows) => rows.filter((r) => ["Completed GRN", "Received"].includes(r.status)).length },
        { label: "Cancelled", tone: "danger", compute: (rows) => rows.filter((r) => r.status === "Cancelled").length },
      ],
      columns: [
        { key: "id", label: "PO Number", mono: true, link: true },
        { key: "supplier", label: "Supplier" },
        { key: "date", label: "PO Date & Time" },
        { key: "expectedDate", label: "Expected Date" },
        { key: "amount", label: "Total Amount", align: "right", money: true, render: (row) => poTotals(row.items).grandTotal },
        { key: "status", label: "Status", badge: true },
      ],
      rowActions: [
        { key: "view", label: "View", icon: "Eye" },
        { key: "edit", label: "Edit", icon: "Pencil", hideWhen: (row) => ["Approved", "Rejected", "Ordered", "Partially Received", "Completed GRN", "Received", "Cancelled", "Returned"].includes(row.status) },
        { key: "print", label: "Print", icon: "Printer", print: true },
        { key: "approve", label: "Approve", icon: "Check", tone: "success", showWhen: (row) => row.status === "Pending Approval", setStatus: "Approved", approvalAction: "approve", confirm: "Approve this purchase order?" },
        { key: "reject", label: "Reject", icon: "X", tone: "danger", showWhen: (row) => row.status === "Pending Approval", setStatus: "Rejected", approvalAction: "reject", requiresReason: true },
        { key: "send", label: "Send to Supplier", icon: "Send", showWhen: (row) => row.status === "Approved", setStatus: "Ordered" },
        { key: "receive", label: "Receive", icon: "PackageCheck", showWhen: (row) => ["Ordered", "Partially Received"].includes(row.status), convertsTo: "goods-receipt" },
        { key: "cancel", label: "Cancel", icon: "Ban", tone: "danger", hideWhen: (row) => ["Approved", "Rejected", "Completed GRN", "Received", "Cancelled"].includes(row.status), setStatus: "Cancelled", confirm: "Cancel this purchase order?" },
      ],
    },
    form: {
      tabs: [
        {
          key: "order",
          label: "Order Information",
          fields: [
            { key: "date", label: "PO Date & Time", type: "datetime-local", required: true, span: "quarter" },
            { key: "supplier", label: "Supplier", type: "select", required: true, optionsFrom: "supplier", span: "quarter" },
            { key: "expectedDate", label: "Expected Delivery Date", type: "date", span: "quarter" },
            { key: "refPR", label: "Purchase Request", type: "select", searchable: true, multiple: true, optionsFromPurchase: "purchase-request", optionStatuses: ["Approved"], span: "quarter" },
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
              totals: true,
              columns: [
                materialColumn,
                { key: "qty", label: "Qty", type: "number" },
                unitColumn,
                { key: "price", label: "Unit Price", type: "number" },
                { key: "discount", label: "Discount %", type: "number" },
                { key: "tax", label: "Tax %", type: "number" },
                { key: "total", label: "Total", type: "computed-line-total" },
              ],
            },
          ],
        },
        {
          key: "delivery",
          label: "Delivery Information",
          fields: [
            { key: "warehouse", label: "Warehouse", type: "select", searchable: true, optionsFrom: "warehouse", span: "half" },
            { key: "deliveryNote", label: "Note", type: "textarea", span: "half", fillHeight: true },
          ],
        },
        {
          key: "approval",
          label: "Approval",
          fields: [
            { key: "preparedBy", label: "Prepared By", type: "text", readOnly: true },
            { key: "approvedBy", label: "Approved By", type: "text", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.approvedBy) },
            { key: "approvalDate", label: "Approval Date", type: "date", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.approvalDate) },
            { key: "rejectedBy", label: "Rejected By", type: "text", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.rejectedBy) },
            { key: "rejectionDate", label: "Rejection Date", type: "date", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.rejectionDate) },
            { key: "rejectionReason", label: "Rejection Reason", type: "textarea", readOnly: true, span: "full", showWhen: (row) => Boolean(row.rejectionReason) },
            { key: "receivedBy", label: "Received By", type: "text", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.receivedBy) },
            { key: "receivedDate", label: "Received Date", type: "date", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.receivedDate) },
          ],
        },
      ],
    },
    formActions: [
      { key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft", showWhen: (row) => row.status === "Draft" },
      { key: "submit", label: "Submit for Approval", kind: "outline", status: "Pending Approval", validate: true, showWhen: (row) => row.status === "Draft" },
      { key: "approve", label: "Approve", kind: "primary", tone: "success", status: "Approved", validate: true, showWhen: (row) => row.status === "Pending Approval", approvalAction: "approve", confirm: "Approve this purchase order?" },
      { key: "reject", label: "Reject", kind: "outline", tone: "danger", status: "Rejected", showWhen: (row) => row.status === "Pending Approval", approvalAction: "reject", requiresReason: true },
      { key: "print", label: "Print PO", kind: "outline", print: true },
      { key: "send", label: "Send to Supplier", kind: "primary", status: "Ordered", validate: true, showWhen: (row) => row.status === "Approved" },
    ],
  },

  "goods-receipt": {
    label: "Goods Receipt",
    singular: "Goods Receipt",
    icon: "PackageCheck",
    description: "Record materials physically received from suppliers and update inventory.",
    statLabel: "Total Receipts",
    rows: goodsReceipts,
    list: {
      subtitle: "Record materials physically received from suppliers and update inventory.",
      searchPlaceholder: "Search GRN number, PO number, supplier...",
      searchKeys: ["id", "refPO", "supplier"],
      dateKey: "date",
      filters: [
        { key: "supplier", label: "Supplier", optionsFrom: "supplier" },
        { key: "warehouse", label: "Warehouse", optionsFrom: "warehouse" },
        { key: "status", label: "Status", options: GRN_STATUSES },
      ],
      summary: [
        { label: "Pending Receipts", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Pending Inspection").length },
        { label: "Partially Accepted", tone: "warning", compute: (rows) => rows.filter((r) => r.items.some((i) => i.rejectedQty > 0)).length },
        { label: "Completed", tone: "success", compute: (rows) => rows.filter((r) => r.status === "Completed").length },
        {
          label: "Rejected Qty (units)",
          tone: "danger",
          compute: (rows) => rows.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (Number(i.rejectedQty) || 0), 0), 0),
        },
        {
          label: "Total Received Value",
          tone: "primary",
          compute: (rows) =>
            new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
              rows.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (Number(i.acceptedQty) || 0) * (materialByCode(i.code)?.price || 0), 0), 0)
            ),
        },
      ],
      columns: [
        { key: "id", label: "GRN Number", mono: true, link: true },
        { key: "refPO", label: "PO Number", mono: true },
        { key: "supplier", label: "Supplier" },
        { key: "date", label: "Receipt Date & Time" },
        { key: "warehouse", label: "Warehouse" },
        { key: "items", label: "Items", align: "right", render: (row) => row.items.length },
        { key: "status", label: "Status", badge: true },
      ],
      rowActions: [
        { key: "view", label: "View", icon: "Eye" },
        { key: "edit", label: "Edit", icon: "Pencil", hideWhen: (row) => row.status === "Completed" },
        { key: "delete", label: "Delete", icon: "Trash2", tone: "danger", showWhen: (row) => row.status === "Draft", delete: true, confirm: "Delete this draft goods receipt?" },
        { key: "print", label: "Print", icon: "Printer", print: true },
      ],
    },
    form: {
      tabs: [
        {
          key: "receipt",
          label: "Receipt Information",
          fields: [
            { key: "date", label: "Receipt Date & Time", type: "datetime-local", required: true },
            { key: "refPO", label: "Purchase Order", type: "select", required: true, searchable: true, optionsFromPurchase: "purchase-order", optionStatuses: ["Approved", "Ordered", "Partially Received"] },
            { key: "supplier", label: "Supplier", type: "select", required: true, searchable: true, optionsFrom: "supplier" },
            { key: "warehouse", label: "Warehouse", type: "select", required: true, searchable: true, optionsFrom: "warehouse" },
            { key: "challanNumber", label: "Delivery Challan Number", type: "text" },
            { key: "invoiceNumber", label: "Supplier Invoice Number", type: "text" },
          ],
        },
        {
          key: "items",
          label: "Received Items",
          fields: [
            {
              key: "items",
              label: "Received Items",
              type: "lineItems",
              span: "full",
              allowAddRemove: false,
              allowRemoveRows: true,
              minRows: 1,
              requirePositiveQuantityKey: "receivedQty",
              headerTone: "teal",
              compactRows: true,
              minWidth: "1140px",
              columns: [
                { ...materialColumn, label: "Item", readOnly: true, required: true, width: "170px" },
                { key: "batch", label: "Batch No", type: "text", width: "80px" },
                { key: "location", label: "Location", type: "line-select", optionsFrom: "stock-location", dependsOn: "warehouse", width: "110px" },
                { key: "expiry", label: "Exp. Date", type: "date", width: "120px" },
                { key: "orderedQty", label: "Order Qty", type: "number", readOnly: true, required: true, width: "58px" },
                { key: "receivedQty", label: "Receive Qty", type: "number", required: true, syncQuantity: true, width: "66px" },
                { key: "unit", label: "Unit", type: "text", readOnly: true, required: true, width: "70px" },
                { key: "testQty", label: "Test QTY", type: "number", width: "70px" },
                { key: "mrp", label: "MRP/QTY", type: "number", width: "80px" },
                { key: "rate", label: "Rate/QTY", type: "number", required: true, width: "80px" },
                { key: "netAmount", label: "Net Amt.", type: "computed-grn-net", required: true, width: "90px" },
                { key: "discountAmount", label: "Dis (₹)", type: "number", min: 0, width: "76px" },
                { key: "gst", label: "GST (%)", type: "number", min: 0, width: "62px" },
                { key: "amount", label: "Amount", type: "computed-grn-amount", required: true, width: "90px" },
              ],
            },
          ],
        },
        {
          key: "quality",
          label: "Quality Inspection",
          compact: true,
          fields: [
            { key: "inspectionRequired", label: "Inspection Required", type: "toggle", labelOutside: true, span: "quarter" },
            { key: "qualityStatus", label: "Quality Status", type: "select", options: ["Pending", "Passed", "Failed", "Partially Passed"], span: "quarter", disabledWhen: (row) => !row.inspectionRequired },
            { key: "inspectedBy", label: "Inspector", type: "text", span: "quarter", disabledWhen: (row) => !row.inspectionRequired },
            { key: "inspectionDate", label: "Inspection Date", type: "date", span: "quarter", disabledWhen: (row) => !row.inspectionRequired },
            { key: "inspectionRemarks", label: "Inspection Remarks", type: "textarea", rows: 2, span: "full", disabledWhen: (row) => !row.inspectionRequired },
          ],
        },
        {
          key: "documents",
          label: "Documents",
          fields: [
            { key: "challanDoc", label: "Delivery Challan", type: "file" },
            { key: "invoiceDoc", label: "Supplier Invoice", type: "file" },
            { key: "inspectionDoc", label: "Inspection Report", type: "file" },
          ],
        },
      ],
    },
    formActions: [
      { key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft", validate: true, showWhen: (row) => row.status === "Draft" && !row.stockUpdated },
      { key: "submit", label: "Submit for Inspection", kind: "outline", status: "Pending Inspection", validate: true, showWhen: (row) => row.inspectionRequired && row.status === "Draft" && !row.stockUpdated, activityEvent: "Submitted for Inspection" },
      { key: "stockUpdate", label: "Save & Stock Update", kind: "primary", status: "Completed", validate: true, updatesStock: "increase", showWhen: (row) => !row.stockUpdated && (!row.inspectionRequired || GRN_INSPECTION_COMPLETE_STATUSES.includes(row.qualityStatus)), activityEvent: "Stock Updated", confirm: "Save this GRN and update stock?" },
      { key: "print", label: "Print GRN", kind: "outline", print: true },
    ],
  },

  "purchase-issue": {
    label: "Purchase Issue",
    singular: "Purchase Issue",
    icon: "FileText",
    description: "Issue requested purchase materials from available stock.",
    statLabel: "Total Issues",
    rows: purchaseIssues,
    list: {
      subtitle: "Issue purchase materials against approved requisitions.",
      searchPlaceholder: "Search issue number, requisition number, department...",
      searchKeys: ["id", "requisitionNo", "department"],
      dateKey: "date",
      filters: [
        { key: "department", label: "Department", optionsFrom: "department" },
        { key: "status", label: "Status", options: ISSUE_STATUSES },
      ],
      summary: [
        { label: "Incomplete Issues", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Issue Incomplete").length },
        { label: "Complete Issues", tone: "success", compute: (rows) => rows.filter((r) => ["Issue Complete", "Issued"].includes(r.status)).length },
        {
          label: "Total Issue Value",
          tone: "primary",
          compute: (rows) =>
            new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
              rows.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (Number(i.issueQty ?? i.qty) || 0) * (Number(i.price) || 0), 0), 0)
            ),
        },
      ],
      columns: [
        { key: "id", label: "Issue No", mono: true, link: true },
        { key: "requisitionNo", label: "Requisition No", mono: true },
        { key: "date", label: "DATE & TIME" },
        { key: "department", label: "Department" },
        { key: "status", label: "Status", badge: true },
      ],
      rowActions: [
        { key: "view", label: "View", icon: "Eye" },
        { key: "edit", label: "Edit", icon: "Pencil", hideWhen: (row) => ["Issue Complete", "Issued", "Cancelled"].includes(row.status) },
        { key: "print", label: "Print", icon: "Printer", print: true },
      ],
    },
    form: {
      tabs: [
        {
          key: "issue",
          label: "Issue Information",
          fields: [
            { key: "date", label: "DATE & TIME", type: "text", required: true, uppercase: true, span: "quarter" },
            { key: "department", label: "Department", type: "select", required: true, searchable: true, optionsFrom: "department", span: "quarter", placeholder: "Select One....." },
            { key: "requisitionNo", label: "Requisition No", type: "select", required: true, searchable: true, optionsFromPurchase: "purchase-request", optionStatuses: ["Approved", "Partial Issue"], span: "quarter", placeholder: "Select Requisition" },
          ],
        },
        {
          key: "items",
          label: "Material Items",
          fields: [
            {
              key: "items",
              label: "Material Items",
              type: "lineItems",
              span: "full",
              allowAddRemove: false,
              totals: "issue",
              defaultRow: { issueQty: 0, remarks: "" },
              requirePositiveQuantityKey: "issueQty",
              requirePositiveQuantityMessage: "At least one item must have an issue quantity.",
              columns: [
                { ...materialColumn, readOnly: true },
                { key: "requestedQty", label: "Requested Qty", type: "number", readOnly: true },
                { key: "previouslyIssuedQty", label: "Already Issued", type: "number", readOnly: true },
                { key: "remainingQty", label: "Remaining Qty", type: "number", readOnly: true },
                { key: "availableQty", label: "Available Stock", type: "number", readOnly: true },
                { key: "issueQty", label: "Issue Qty", type: "number", maxKey: "maxIssueQty" },
                unitColumn,
                { key: "total", label: "Total Price", type: "computed-line-total" },
                { key: "remarks", label: "Remarks", type: "text" },
              ],
            },
          ],
        },
        {
          key: "details",
          label: "Issue Details",
          fields: [
            { key: "note", label: "Note", type: "textarea", span: "half", rows: 3 },
          ],
        },
        {
          key: "approval",
          label: "Approval",
          fields: [
            { key: "requestedBy", label: "Requested By", type: "text", readOnly: true },
            { key: "approvedBy", label: "Approved By", type: "text", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.approvedBy) },
            { key: "approvalDate", label: "Approval Date", type: "date", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.approvalDate) },
            { key: "issuedBy", label: "Issued By", type: "text", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.issuedBy) },
            { key: "issuedDate", label: "Issued Date", type: "date", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.issuedDate) },
            { key: "rejectedBy", label: "Rejected By", type: "text", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.rejectedBy) },
            { key: "rejectionDate", label: "Rejection Date", type: "date", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.rejectionDate) },
            { key: "rejectionReason", label: "Rejection Reason", type: "textarea", readOnly: true, span: "full", showWhen: (row) => Boolean(row.rejectionReason) },
          ],
        },
      ],
    },
    formActions: [
      { key: "save", label: "Save", kind: "outline", status: "Issue Incomplete", validate: true, showWhen: (row) => row.status !== "Issue Complete" && !row.stockUpdated },
      { key: "issue", label: "Save & Issue", kind: "primary", status: "Issue Complete", validate: true, updatesStock: "decrease", showWhen: (row) => row.status !== "Issue Complete" && !row.stockUpdated, activityEvent: "Stock Issued" },
    ],
  },

  "purchase-return": {
    label: "Purchase Return",
    singular: "Return",
    icon: "Undo2",
    description: "Return defective, excess or incorrect materials back to the supplier.",
    statLabel: "Total Returns",
    rows: purchaseReturns,
    list: {
      subtitle: "Return defective, excess or incorrect materials back to the supplier.",
      searchPlaceholder: "Search return number, supplier...",
      searchKeys: ["id", "supplier"],
      dateKey: "date",
      filters: [
        { key: "supplier", label: "Supplier", optionsFrom: "supplier" },
        { key: "warehouse", label: "Warehouse", optionsFrom: "warehouse" },
        { key: "status", label: "Status", options: RETURN_STATUSES },
        { key: "reason", label: "Reason", options: RETURN_REASONS },
      ],
      summary: [
        { label: "Pending Returns", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Pending Approval").length },
        { label: "Approved Returns", tone: "accent", compute: (rows) => rows.filter((r) => r.status === "Approved").length },
        { label: "Completed Returns", tone: "success", compute: (rows) => rows.filter((r) => r.status === "Returned").length },
        {
          label: "Total Return Value",
          tone: "danger",
          compute: (rows) =>
            new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
              rows.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (Number(i.returnQty) || 0) * (Number(i.price) || 0), 0), 0)
            ),
        },
      ],
      columns: [
        { key: "id", label: "Return No", mono: true, link: true },
        { key: "supplier", label: "Supplier" },
        { key: "refGRN", label: "GRN / PO No", mono: true, render: (row) => row.refGRN || row.refPO },
        { key: "date", label: "Return Date" },
        { key: "reason", label: "Reason" },
        { key: "status", label: "Status", badge: true },
      ],
      rowActions: [
        { key: "view", label: "View", icon: "Eye" },
        { key: "edit", label: "Edit", icon: "Pencil", hideWhen: (row) => ["Approved", "Rejected", "Returned", "Cancelled"].includes(row.status) },
        { key: "approve", label: "Approve Return", icon: "Check", tone: "success", showWhen: (row) => row.status === "Pending Approval", setStatus: "Approved", approvalAction: "approve" },
        { key: "reject", label: "Reject Return", icon: "X", tone: "danger", showWhen: (row) => row.status === "Pending Approval", setStatus: "Rejected", approvalAction: "reject", requiresReason: true },
        { key: "print", label: "Print", icon: "Printer", print: true },
      ],
    },
    form: {
      tabs: [
        {
          key: "return",
          label: "Return Information",
          compact: true,
          fields: [
            { key: "id", label: "Return Number", type: "text", required: true, autoLabel: "Auto-generated", span: "quarter" },
            { key: "date", label: "Return Date", type: "date", required: true, span: "quarter" },
            { key: "supplier", label: "Supplier", type: "select", required: true, searchable: true, optionsFrom: "supplier", span: "quarter" },
            { key: "refGRN", label: "Reference GRN", type: "select", required: true, searchable: true, optionsFromPurchase: "goods-receipt", span: "quarter" },
            { key: "refPO", label: "Reference PO", type: "text", readOnly: true, span: "quarter" },
            { key: "warehouse", label: "Warehouse", type: "select", searchable: true, optionsFrom: "warehouse", span: "quarter" },
            { key: "reason", label: "Return Reason", type: "select", options: RETURN_REASONS, span: "quarter" },
          ],
        },
        {
          key: "items",
          label: "Return Items",
          fields: [
            {
              key: "items",
              label: "Return Items",
              type: "lineItems",
              span: "full",
              allowAddRemove: false,
              totals: "return",
              requirePositiveQuantityKey: "returnQty",
              requirePositiveQuantityMessage: "At least one item must have a return quantity.",
              columns: [
                { ...materialColumn, readOnly: true },
                nameColumn,
                { key: "receivedQty", label: "Received Qty", type: "number", readOnly: true },
                { key: "availableQty", label: "Available Qty", type: "number", readOnly: true },
                { key: "returnQty", label: "Return Qty", type: "number", min: 0, maxKey: "availableQty" },
                unitColumn,
                { key: "batch", label: "Batch No", type: "text", readOnly: true },
                { key: "reason", label: "Reason", type: "text" },
              ],
            },
          ],
        },
        {
          key: "details",
          label: "Return Details",
          fields: [
            { key: "returnRemarks", label: "Return Remarks", type: "textarea", span: "full" },
            { key: "creditNoteNumber", label: "Supplier Credit Note Number", type: "text" },
            { key: "transportDetails", label: "Transport Details", type: "text" },
            { key: "attachment", label: "Attachment", type: "file" },
          ],
        },
        {
          key: "approval",
          label: "Approval",
          fields: [
            { key: "requestedBy", label: "Requested By", type: "text", readOnly: true },
            { key: "approvedBy", label: "Approved By", type: "text", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.approvedBy) },
            { key: "approvalDate", label: "Approval Date", type: "date", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.approvalDate) },
            { key: "rejectedBy", label: "Rejected By", type: "text", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.rejectedBy) },
            { key: "rejectionDate", label: "Rejection Date", type: "date", readOnly: true, autoLabel: "Auto-updated", showWhen: (row) => Boolean(row.rejectionDate) },
            { key: "rejectionReason", label: "Rejection Reason", type: "textarea", readOnly: true, span: "full", showWhen: (row) => Boolean(row.rejectionReason) },
          ],
        },
      ],
    },
    formActions: [
      { key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft", showWhen: (row) => row.status === "Draft" },
      { key: "submit", label: "Submit for Approval", kind: "outline", status: "Pending Approval", validate: true, showWhen: (row) => row.status === "Draft" },
      { key: "approve", label: "Approve Return", kind: "primary", status: "Approved", validate: true, showWhen: (row) => row.status === "Pending Approval", approvalAction: "approve" },
      { key: "reject", label: "Reject Return", kind: "outline", tone: "danger", status: "Rejected", showWhen: (row) => row.status === "Pending Approval", approvalAction: "reject", requiresReason: true },
      { key: "complete", label: "Complete Return", kind: "primary", status: "Returned", validate: true, updatesStock: "decrease", showWhen: (row) => row.status === "Approved" },
      { key: "print", label: "Print Return", kind: "outline", print: true },
    ],
  },
};

export const purchaseEntityOrder = ["purchase-request", "purchase-order", "goods-receipt", "purchase-issue", "purchase-return"];
