const stages = ["Material Issue", "Production Process", "Finished Goods QC"];
const scrapCategories = ["Raw Material", "WIP", "Finished Goods"];
const scrapReasons = ["QC Rejection", "Machine Fault", "Material Defect", "Operator Error", "Design Change", "Handling Damage"];
const disposalMethods = ["Scrap Sale", "Internal Rework", "Return to Vendor", "Waste Disposal"];
const dispositions = ["Scrap", "Rework", "Return to Vendor"];
const statusOptions = ["Draft", "Pending Approval", "Approved"];

export const scrapRows = [
  {
    id: "SCR-2026-0007",
    date: "2026-07-23",
    workOrder: "WO-2026-0081",
    productionProcess: "PROC-2026-101",
    productName: "Cooling Fan Assembly",
    productionBatch: "B-FAN-0725",
    plant: "Main Manufacturing Plant",
    department: "Production",
    productionLine: "Assembly Line 2",
    machine: "Assembly Rig AR-1",
    shift: "Shift A (6 AM - 2 PM)",
    supervisor: "Karan Mehta",
    operator: "Priya Nair",
    stage: "Finished Goods QC",
    scrapCategory: "Finished Goods",
    scrapReason: "QC Rejection",
    disposalMethod: "Waste Disposal",
    notes: "2 units failed final functional test (motor noise out of spec) after passing in-process assembly.",
    items: [
      {
        component: "FG-3001",
        componentName: "Cooling Fan Assembly",
        scrapType: "Finished Goods",
        qty: 2,
        unit: "PCS",
        batchNo: "B-FAN-0725",
        productionStage: "Final QC",
        reasonCode: "QC Rejection",
        rootCause: "Motor noise exceeded acceptable threshold during functional test.",
        recoverableQty: 0,
        nonRecoverableQty: 2,
        reworkableQty: 0,
        unitCost: 249.4,
        disposalCost: 50,
        disposition: "Scrap",
        responsiblePerson: "Priya Nair",
        correctiveAction: "Re-inspect motor winding batch B-0610-03 for tolerance drift.",
        preventiveAction: "Add in-process noise check after Motor Winding operation.",
      },
    ],
    status: "Approved",
    createdBy: "Karan Mehta",
    createdAt: "2026-07-23T18:15",
    updatedBy: "Anil Deshmukh",
    updatedAt: "2026-07-24T09:45",
  },
];

export const scrapEntity = {
  label: "Scrap / Wastage",
  singular: "Scrap Entry",
  icon: "Trash2",
  description: "Log scrap and wastage with recoverable/non-recoverable tracking and root-cause analysis.",
  statLabel: "Total Scrap Entries",
  rows: scrapRows,
  list: {
    subtitle: "Track scrap and wastage against work orders, with disposition and root-cause tracking.",
    searchPlaceholder: "Search entry number, work order...",
    searchKeys: ["id", "workOrder"],
    dateKey: "date",
    filters: [
      { key: "workOrder", label: "Work Order", options: ["WO-2026-0081", "WO-2026-0089", "WO-2026-0093"] },
      { key: "stage", label: "Stage", options: stages },
      { key: "scrapReason", label: "Reason", options: scrapReasons },
      { key: "status", label: "Status", options: statusOptions },
    ],
    summary: [
      { label: "Total Entries", tone: "primary", compute: (rows) => rows.length },
      { label: "Pending Approval", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Pending Approval").length },
      { label: "Approved", tone: "success", compute: (rows) => rows.filter((r) => r.status === "Approved").length },
      {
        label: "Total Scrap Value",
        tone: "danger",
        compute: (rows) =>
          new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
            rows.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0), 0)
          ),
      },
    ],
    columns: [
      { key: "id", label: "Entry No", mono: true, link: true },
      { key: "date", label: "Date" },
      { key: "workOrder", label: "Work Order", mono: true },
      { key: "stage", label: "Stage" },
      { key: "items", label: "Component(s)", render: (row) => row.items.map((i) => `${i.componentName} (${i.qty})`).join(", ") },
      { key: "scrapReason", label: "Reason" },
      { key: "status", label: "Status", badge: true },
    ],
    rowActions: [
      { key: "view", label: "View", icon: "Eye" },
      { key: "edit", label: "Edit", icon: "Pencil", showWhen: (row) => row.status === "Draft" },
      { key: "duplicate", label: "Duplicate", icon: "Copy" },
      { key: "print", label: "Print", icon: "Printer", print: true },
      { key: "delete", label: "Delete", icon: "Trash2", tone: "danger", showWhen: (row) => row.status === "Draft", remove: true, confirm: "Delete this draft scrap entry?" },
    ],
  },
  form: {
    tabs: [
      {
        key: "info",
        label: "Scrap Entry",
        fields: [
          { key: "id", label: "Entry Number", type: "text", required: true, autoLabel: "Auto-generated" },
          { key: "date", label: "Entry Date", type: "date", required: true },
          { key: "workOrder", label: "Work Order", type: "work-order-select", required: true },
          { key: "productionProcess", label: "Production Process Entry", type: "text" },
          { key: "productionBatch", label: "Production Batch", type: "text", readOnly: true },
          { key: "department", label: "Department", type: "select", options: ["Production", "Quality"] },
          { key: "productionLine", label: "Production Line", type: "text" },
          { key: "machine", label: "Machine", type: "select", options: ["CNC-01", "Welding Robot WR-4", "Injection Molder IM-2", "Assembly Rig AR-1", "Packaging Machine PKM-3", "Hydraulic Press HP-2"] },
          { key: "shift", label: "Shift", type: "select", options: ["Shift A (6 AM - 2 PM)", "Shift B (2 PM - 10 PM)", "Shift C (10 PM - 6 AM)"] },
          { key: "supervisor", label: "Supervisor", type: "text" },
          { key: "operator", label: "Operator", type: "text" },
          { key: "stage", label: "Production Stage", type: "select", options: stages },
          { key: "scrapCategory", label: "Scrap Category", type: "select", options: scrapCategories },
          { key: "scrapReason", label: "Scrap Reason", type: "select", options: scrapReasons },
          { key: "disposalMethod", label: "Disposal Method", type: "select", options: disposalMethods },
          { key: "notes", label: "Notes", type: "textarea", span: "full" },
        ],
      },
      {
        key: "items",
        label: "Scrap Lines",
        fields: [
          {
            key: "items",
            label: "Scrap Lines",
            type: "lineItems",
            span: "full",
            allowAddRemove: true,
            totals: "manufacturing",
            columns: [
              { key: "component", label: "Material / Product Code", type: "scrap-component-select" },
              { key: "componentName", label: "Name", type: "text", readOnly: true },
              { key: "qty", label: "Quantity", type: "number" },
              { key: "unit", label: "Unit", type: "text", readOnly: true },
              { key: "batchNo", label: "Batch No", type: "text" },
              { key: "recoverableQty", label: "Recoverable Qty", type: "number" },
              { key: "nonRecoverableQty", label: "Non-Recoverable Qty", type: "number" },
              { key: "reworkableQty", label: "Reworkable Qty", type: "number" },
              { key: "unitCost", label: "Unit Cost", type: "number" },
              { key: "total", label: "Scrap Value", type: "computed-total-fg" },
              { key: "disposition", label: "Disposition", type: "select", options: dispositions },
              { key: "responsiblePerson", label: "Responsible Person", type: "text" },
            ],
          },
        ],
      },
    ],
  },
  formActions: [
    { key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft" },
    { key: "submit", label: "Submit for Approval", kind: "outline", status: "Pending Approval", validate: true },
    { key: "approve", label: "Approve", kind: "primary", status: "Approved", validate: true },
  ],
};
