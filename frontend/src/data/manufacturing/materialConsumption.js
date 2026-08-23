const statusOptions = ["Draft", "Submitted", "Reviewed", "Posted"];
const varianceReasons = ["Cutting Wastage", "Winding Trim Loss", "Handling Loss", "Measurement Rounding", "Quality Rejection", "Other"];

export const materialConsumptionRows = [
  {
    id: "MC-2026-0031",
    date: "2026-07-23",
    workOrder: "WO-2026-0081",
    productName: "Cooling Fan Assembly",
    productionBatch: "B-FAN-0725",
    plant: "Main Manufacturing Plant",
    department: "Production",
    productionLine: "Assembly Line 2",
    workCenter: "Assembly Line 2",
    supervisor: "Karan Mehta",
    operator: "Priya Nair",
    shift: "Shift A (6 AM - 2 PM)",
    remarks: "Consumption posted at run completion; minor cutting/trim wastage within tolerance.",
    items: [
      { code: "RM-2001", name: "Mild Steel Rod 12mm", issuedQty: 220, consumedQty: 210, returnedQty: 5, unit: "KG", unitCost: 68, varianceReason: "Cutting Wastage" },
      { code: "RM-2003", name: "Copper Wire 2.5mm", issuedQty: 180, consumedQty: 175, returnedQty: 3, unit: "MTR", unitCost: 95, varianceReason: "Winding Trim Loss" },
      { code: "RM-2006", name: "Rubber Compound", issuedQty: 30, consumedQty: 29, returnedQty: 1, unit: "KG", unitCost: 180, varianceReason: "Handling Loss" },
    ],
    status: "Posted",
    createdBy: "Karan Mehta",
    createdAt: "2026-07-23T17:30",
    updatedBy: "Anil Deshmukh",
    updatedAt: "2026-07-24T09:00",
  },
];

export const materialConsumptionEntity = {
  label: "Material Consumption",
  singular: "Consumption Entry",
  icon: "PackageCheck",
  description: "Record actual material usage against issued quantities and post variance.",
  statLabel: "Total Entries",
  rows: materialConsumptionRows,
  list: {
    subtitle: "Actual-vs-issued material usage, with automatic variance calculation and return-to-stock.",
    searchPlaceholder: "Search entry number, work order...",
    searchKeys: ["id", "workOrder"],
    dateKey: "date",
    filters: [
      { key: "workOrder", label: "Work Order", options: ["WO-2026-0081", "WO-2026-0089", "WO-2026-0093"] },
      { key: "status", label: "Status", options: statusOptions },
    ],
    summary: [
      { label: "Total Entries", tone: "primary", compute: (rows) => rows.length },
      { label: "Posted", tone: "success", compute: (rows) => rows.filter((r) => r.status === "Posted").length },
      { label: "Pending Review", tone: "warning", compute: (rows) => rows.filter((r) => ["Submitted", "Reviewed"].includes(r.status)).length },
      {
        label: "Avg. Variance %",
        tone: "accent",
        compute: (rows) => {
          const all = rows.flatMap((r) => r.items);
          if (!all.length) return "0%";
          const avg = all.reduce((s, i) => s + Math.abs((Number(i.issuedQty) || 0) - (Number(i.consumedQty) || 0) - (Number(i.returnedQty) || 0)) / (Number(i.issuedQty) || 1), 0) / all.length;
          return `${(avg * 100).toFixed(1)}%`;
        },
      },
    ],
    columns: [
      { key: "id", label: "Entry No", mono: true, link: true },
      { key: "date", label: "Date" },
      { key: "workOrder", label: "Work Order", mono: true },
      { key: "productName", label: "Product" },
      { key: "items", label: "Materials", render: (row) => row.items.map((i) => i.name).join(", ") },
      {
        key: "variance",
        label: "Total Variance",
        align: "right",
        render: (row) => row.items.reduce((s, i) => s + ((Number(i.issuedQty) || 0) - (Number(i.consumedQty) || 0) - (Number(i.returnedQty) || 0)), 0),
      },
      { key: "status", label: "Status", badge: true },
    ],
    rowActions: [
      { key: "view", label: "View", icon: "Eye" },
      { key: "edit", label: "Edit", icon: "Pencil", showWhen: (row) => ["Draft", "Submitted"].includes(row.status) },
      { key: "duplicate", label: "Duplicate", icon: "Copy" },
      { key: "print", label: "Print", icon: "Printer", print: true },
      { key: "delete", label: "Delete", icon: "Trash2", tone: "danger", showWhen: (row) => row.status === "Draft", remove: true, confirm: "Delete this draft entry?" },
    ],
  },
  form: {
    tabs: [
      {
        key: "info",
        label: "Entry Information",
        fields: [
          { key: "id", label: "Entry Number", type: "text", required: true, autoLabel: "Auto-generated" },
          { key: "date", label: "Entry Date", type: "date", required: true },
          { key: "workOrder", label: "Work Order", type: "work-order-select", required: true },
          { key: "productName", label: "Product", type: "text", readOnly: true },
          { key: "productionBatch", label: "Production Batch", type: "text", readOnly: true },
          { key: "plant", label: "Plant", type: "select", options: ["Main Manufacturing Plant"] },
          { key: "department", label: "Department", type: "select", options: ["Production", "Quality"] },
          { key: "productionLine", label: "Production Line", type: "text", readOnly: true },
          { key: "workCenter", label: "Work Center", type: "text" },
          { key: "supervisor", label: "Supervisor", type: "text" },
          { key: "operator", label: "Operator", type: "text" },
          { key: "shift", label: "Shift", type: "select", options: ["Shift A (6 AM - 2 PM)", "Shift B (2 PM - 10 PM)", "Shift C (10 PM - 6 AM)"] },
          { key: "remarks", label: "Remarks", type: "textarea", span: "full" },
        ],
      },
      {
        key: "items",
        label: "Materials",
        fields: [
          {
            key: "items",
            label: "Materials",
            type: "lineItems",
            span: "full",
            variance: true,
            columns: [
              { key: "code", label: "Material Code", type: "material-select" },
              { key: "name", label: "Material", type: "text", readOnly: true },
              { key: "issuedQty", label: "Issued Qty", type: "number", readOnly: true },
              { key: "consumedQty", label: "Consumed Qty", type: "number" },
              { key: "returnedQty", label: "Returned Qty", type: "number" },
              { key: "variance", label: "Variance", type: "consumption-variance" },
              { key: "unit", label: "Unit", type: "text", readOnly: true },
              { key: "unitCost", label: "Unit Cost", type: "number" },
              { key: "varianceReason", label: "Variance Reason", type: "select", options: varianceReasons },
            ],
          },
        ],
      },
    ],
  },
  formActions: [
    { key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft" },
    { key: "submit", label: "Submit", kind: "outline", status: "Submitted", validate: true },
    { key: "review", label: "Mark Reviewed", kind: "outline", status: "Reviewed" },
    { key: "post", label: "Post Consumption", kind: "primary", status: "Posted", validate: true, manufacturingEffect: "materialConsumption" },
  ],
};
