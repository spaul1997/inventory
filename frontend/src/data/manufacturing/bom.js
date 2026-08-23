// Bill of Materials — bespoke screen (BomForm.jsx), so this file holds only
// list config + demo rows + the shared costing formula (also used by Work
// Order's standard-cost baseline). Single-level BOM: material lines are raw
// materials only, no nested sub-assembly BOMs (see plan's scope decision).
import { materialByCode } from "./shared.js";

export const BOM_STATUSES = ["Draft", "Pending Approval", "Approved", "Active", "Obsolete"];

export function computeBomCosting(bom) {
  const batchSize = Number(bom.batchSize) || 0;
  const materialCost = (bom.materialLines || []).reduce((sum, line) => {
    const unitCost = Number(line.unitCost ?? materialByCode(line.code)?.price) || 0;
    return sum + (Number(line.qtyPerUnit) || 0) * batchSize * unitCost;
  }, 0);
  const laborMachineCost = (bom.operationLines || []).reduce((sum, op) => {
    const hours = ((Number(op.standardTimeMins) || 0) * batchSize) / 60;
    return sum + hours * ((Number(op.laborRatePerHour) || 0) + (Number(op.machineRatePerHour) || 0));
  }, 0);
  const subtotal = materialCost + laborMachineCost;
  const overheadCost = (subtotal * (Number(bom.overheadPercent) || 0)) / 100;
  const wastageCost = (materialCost * (Number(bom.wastagePercent) || 0)) / 100;
  const totalBatchCost = subtotal + overheadCost + wastageCost;
  const costPerUnit = batchSize ? totalBatchCost / batchSize : 0;
  return { materialCost, laborMachineCost, subtotal, overheadCost, wastageCost, totalBatchCost, costPerUnit };
}

export const bomRows = [
  {
    id: "BOM-FAN-085",
    name: "Cooling Fan Assembly — Standard",
    product: "FG-3001",
    productName: "Cooling Fan Assembly",
    version: 2,
    revisionNumber: "R2",
    isDefault: true,
    batchSize: 200,
    uom: "PCS",
    effectiveDate: "2026-07-01",
    effectiveEndDate: "",
    plant: "Main Manufacturing Plant",
    productionLine: "Assembly Line 2",
    overheadPercent: 8,
    wastagePercent: 2,
    overheadMethod: "% of Prime Cost",
    status: "Active",
    preparedBy: "Karan Mehta",
    approvedBy: "Anil Deshmukh",
    approvalDate: "2026-07-02",
    notes: "Current production standard. Supersedes R1 after motor-winding gauge change.",
    materialLines: [
      { code: "RM-2001", name: "Mild Steel Rod 12mm", category: "Metals", qtyPerUnit: 1.1, unit: "KG", unitCost: 68, wastagePercent: 2, issueMethod: "Manual", consumptionStage: "Assembly", remarks: "Motor mount bracket" },
      { code: "RM-2003", name: "Copper Wire 2.5mm", category: "Metals", qtyPerUnit: 1.2, unit: "MTR", unitCost: 95, wastagePercent: 3, issueMethod: "Manual", consumptionStage: "Winding", remarks: "Motor winding" },
      { code: "RM-2006", name: "Rubber Compound", category: "Polymers", qtyPerUnit: 0.15, unit: "KG", unitCost: 180, wastagePercent: 1, issueMethod: "Manual", consumptionStage: "Assembly", remarks: "Vibration mount / gasket" },
    ],
    operationLines: [
      { seq: 1, operationName: "Motor Winding", workCenter: "Assembly Line 2", machine: "Assembly Rig AR-1", department: "Production", setupTimeMins: 5, standardTimeMins: 6, laborCount: 1, laborRatePerHour: 150, machineRatePerHour: 100, expectedOutput: 200, qualityCheckpoint: false, instructions: "Wind copper coil to spec, verify resistance." },
      { seq: 2, operationName: "Assembly", workCenter: "Assembly Line 2", machine: "Assembly Rig AR-1", department: "Production", setupTimeMins: 5, standardTimeMins: 4, laborCount: 2, laborRatePerHour: 150, machineRatePerHour: 50, expectedOutput: 200, qualityCheckpoint: false, instructions: "Fit bracket, mount motor, secure gasket." },
      { seq: 3, operationName: "Functional Testing", workCenter: "Quality Inspection Bay", machine: "", department: "Quality", setupTimeMins: 2, standardTimeMins: 2, laborCount: 1, laborRatePerHour: 180, machineRatePerHour: 0, expectedOutput: 200, qualityCheckpoint: true, instructions: "Run at rated voltage for 60s, check RPM and noise." },
    ],
    activity: [
      { event: "Draft", date: "2026-06-20", by: "Karan Mehta" },
      { event: "Pending Approval", date: "2026-06-28", by: "Karan Mehta" },
      { event: "Approved", date: "2026-07-02", by: "Anil Deshmukh" },
      { event: "Active", date: "2026-07-02", by: "Anil Deshmukh" },
    ],
  },
  {
    id: "BOM-FAN-085-R1",
    name: "Cooling Fan Assembly — Standard",
    product: "FG-3001",
    productName: "Cooling Fan Assembly",
    version: 1,
    revisionNumber: "R1",
    isDefault: false,
    batchSize: 200,
    uom: "PCS",
    effectiveDate: "2026-01-15",
    effectiveEndDate: "2026-06-30",
    plant: "Main Manufacturing Plant",
    productionLine: "Assembly Line 2",
    overheadPercent: 8,
    wastagePercent: 2,
    overheadMethod: "% of Prime Cost",
    status: "Obsolete",
    preparedBy: "Karan Mehta",
    approvedBy: "Anil Deshmukh",
    approvalDate: "2026-01-18",
    notes: "Superseded by R2 (thicker winding gauge for improved motor life).",
    materialLines: [
      { code: "RM-2001", name: "Mild Steel Rod 12mm", category: "Metals", qtyPerUnit: 1.1, unit: "KG", unitCost: 68, wastagePercent: 2, issueMethod: "Manual", consumptionStage: "Assembly", remarks: "Motor mount bracket" },
      { code: "RM-2003", name: "Copper Wire 2.5mm", category: "Metals", qtyPerUnit: 0.9, unit: "MTR", unitCost: 95, wastagePercent: 3, issueMethod: "Manual", consumptionStage: "Winding", remarks: "Motor winding (thinner gauge)" },
      { code: "RM-2006", name: "Rubber Compound", category: "Polymers", qtyPerUnit: 0.15, unit: "KG", unitCost: 180, wastagePercent: 1, issueMethod: "Manual", consumptionStage: "Assembly", remarks: "Vibration mount / gasket" },
    ],
    operationLines: [
      { seq: 1, operationName: "Motor Winding", workCenter: "Assembly Line 2", machine: "Assembly Rig AR-1", department: "Production", setupTimeMins: 5, standardTimeMins: 5, laborCount: 1, laborRatePerHour: 150, machineRatePerHour: 100, expectedOutput: 200, qualityCheckpoint: false, instructions: "Wind copper coil to spec." },
      { seq: 2, operationName: "Assembly", workCenter: "Assembly Line 2", machine: "Assembly Rig AR-1", department: "Production", setupTimeMins: 5, standardTimeMins: 4, laborCount: 2, laborRatePerHour: 150, machineRatePerHour: 50, expectedOutput: 200, qualityCheckpoint: false, instructions: "Fit bracket, mount motor, secure gasket." },
      { seq: 3, operationName: "Functional Testing", workCenter: "Quality Inspection Bay", machine: "", department: "Quality", setupTimeMins: 2, standardTimeMins: 2, laborCount: 1, laborRatePerHour: 180, machineRatePerHour: 0, expectedOutput: 200, qualityCheckpoint: true, instructions: "Run at rated voltage for 60s." },
    ],
    activity: [
      { event: "Draft", date: "2026-01-10", by: "Karan Mehta" },
      { event: "Approved", date: "2026-01-18", by: "Anil Deshmukh" },
      { event: "Active", date: "2026-01-18", by: "Anil Deshmukh" },
      { event: "Obsolete", date: "2026-07-02", by: "Anil Deshmukh" },
    ],
  },
  {
    id: "BOM-CYL-050",
    name: "Hydraulic Cylinder 50mm — Standard",
    product: "FG-3002",
    productName: "Hydraulic Cylinder 50mm",
    version: 1,
    revisionNumber: "R1",
    isDefault: true,
    batchSize: 50,
    uom: "PCS",
    effectiveDate: "2026-05-20",
    effectiveEndDate: "",
    plant: "Main Manufacturing Plant",
    productionLine: "Assembly Line 1",
    overheadPercent: 10,
    wastagePercent: 3,
    overheadMethod: "% of Prime Cost",
    status: "Active",
    preparedBy: "Anil Deshmukh",
    approvedBy: "Rajesh Kumar",
    approvalDate: "2026-05-22",
    notes: "Standard 50mm bore, double-acting cylinder.",
    materialLines: [
      { code: "RM-2005", name: "Stainless Steel Sheet 2mm", category: "Metals", qtyPerUnit: 3.5, unit: "KG", unitCost: 210, wastagePercent: 4, issueMethod: "Manual", consumptionStage: "Machining", remarks: "Barrel + end caps" },
      { code: "RM-2001", name: "Mild Steel Rod 12mm", category: "Metals", qtyPerUnit: 1.2, unit: "KG", unitCost: 68, wastagePercent: 2, issueMethod: "Manual", consumptionStage: "Machining", remarks: "Piston rod" },
      { code: "RM-2004", name: "Industrial Adhesive", category: "Chemicals", qtyPerUnit: 0.08, unit: "LTR", unitCost: 620, wastagePercent: 5, issueMethod: "Manual", consumptionStage: "Assembly", remarks: "Seal bonding" },
    ],
    operationLines: [
      { seq: 1, operationName: "Machining", workCenter: "CNC Machining Center", machine: "CNC-01", department: "Production", setupTimeMins: 15, standardTimeMins: 25, laborCount: 1, laborRatePerHour: 200, machineRatePerHour: 350, expectedOutput: 50, qualityCheckpoint: false, instructions: "Turn barrel and piston rod to tolerance." },
      { seq: 2, operationName: "Welding", workCenter: "Welding Station", machine: "Welding Robot WR-4", department: "Production", setupTimeMins: 10, standardTimeMins: 15, laborCount: 1, laborRatePerHour: 220, machineRatePerHour: 180, expectedOutput: 50, qualityCheckpoint: false, instructions: "Weld end caps, pressure-test seam." },
      { seq: 3, operationName: "Assembly & Testing", workCenter: "Assembly Line 1", machine: "Hydraulic Press HP-2", department: "Quality", setupTimeMins: 10, standardTimeMins: 10, laborCount: 2, laborRatePerHour: 180, machineRatePerHour: 40, expectedOutput: 50, qualityCheckpoint: true, instructions: "Assemble, seat seals, pressure-test at 1.5x rated." },
    ],
    activity: [
      { event: "Draft", date: "2026-05-12", by: "Anil Deshmukh" },
      { event: "Pending Approval", date: "2026-05-20", by: "Anil Deshmukh" },
      { event: "Approved", date: "2026-05-22", by: "Rajesh Kumar" },
      { event: "Active", date: "2026-05-22", by: "Rajesh Kumar" },
    ],
  },
  {
    id: "BOM-CPE-120",
    name: "Control Panel Enclosure — Standard",
    product: "FG-3003",
    productName: "Control Panel Enclosure",
    version: 1,
    revisionNumber: "R1",
    isDefault: true,
    batchSize: 30,
    uom: "PCS",
    effectiveDate: "2026-08-10",
    effectiveEndDate: "",
    plant: "Main Manufacturing Plant",
    productionLine: "Assembly Line 1",
    overheadPercent: 8,
    wastagePercent: 2.5,
    overheadMethod: "% of Prime Cost",
    status: "Draft",
    preparedBy: "Rajesh Kumar",
    approvedBy: "",
    approvalDate: "",
    notes: "New product onboarding — pending costing review before submission.",
    materialLines: [
      { code: "RM-2002", name: "ABS Plastic Granules", category: "Polymers", qtyPerUnit: 0.6, unit: "KG", unitCost: 145, wastagePercent: 3, issueMethod: "Manual", consumptionStage: "Molding", remarks: "Gland plate & fittings" },
      { code: "RM-2005", name: "Stainless Steel Sheet 2mm", category: "Metals", qtyPerUnit: 4, unit: "KG", unitCost: 210, wastagePercent: 4, issueMethod: "Manual", consumptionStage: "Cutting", remarks: "Enclosure shell" },
      { code: "RM-2003", name: "Copper Wire 2.5mm", category: "Metals", qtyPerUnit: 2, unit: "MTR", unitCost: 95, wastagePercent: 3, issueMethod: "Manual", consumptionStage: "Assembly", remarks: "Internal wiring" },
    ],
    operationLines: [
      { seq: 1, operationName: "Sheet Cutting", workCenter: "CNC Machining Center", machine: "CNC-01", department: "Production", setupTimeMins: 10, standardTimeMins: 12, laborCount: 1, laborRatePerHour: 200, machineRatePerHour: 300, expectedOutput: 30, qualityCheckpoint: false, instructions: "Laser-cut enclosure panels to drawing." },
      { seq: 2, operationName: "Assembly & Wiring", workCenter: "Assembly Line 1", machine: "Assembly Rig AR-1", department: "Production", setupTimeMins: 10, standardTimeMins: 20, laborCount: 2, laborRatePerHour: 180, machineRatePerHour: 40, expectedOutput: 30, qualityCheckpoint: false, instructions: "Assemble shell, fit cooling fan assembly and gland plate, wire internals." },
      { seq: 3, operationName: "Final QC", workCenter: "Quality Inspection Bay", machine: "", department: "Quality", setupTimeMins: 5, standardTimeMins: 5, laborCount: 1, laborRatePerHour: 180, machineRatePerHour: 0, expectedOutput: 30, qualityCheckpoint: true, instructions: "IP rating check, continuity test." },
    ],
    activity: [{ event: "Draft", date: "2026-08-10", by: "Rajesh Kumar" }],
  },
];

export const bomEntity = {
  label: "Bill of Materials (BOM)",
  singular: "BOM",
  icon: "ListTree",
  description: "Define, cost and version-control production recipes for every manufactured product.",
  statLabel: "Total BOMs",
  rows: bomRows,
  list: {
    subtitle: "Multi-level costing, routing and version control for every manufactured product.",
    searchPlaceholder: "Search BOM number, product name...",
    searchKeys: ["id", "productName"],
    filters: [
      { key: "status", label: "Status", options: BOM_STATUSES },
      { key: "plant", label: "Plant", options: ["Main Manufacturing Plant"] },
    ],
    summary: [
      { label: "Total BOMs", tone: "primary", compute: (rows) => rows.length },
      { label: "Active", tone: "success", compute: (rows) => rows.filter((r) => r.status === "Active").length },
      { label: "Pending Approval", tone: "warning", compute: (rows) => rows.filter((r) => r.status === "Pending Approval").length },
      { label: "Draft", tone: "muted", compute: (rows) => rows.filter((r) => r.status === "Draft").length },
    ],
    columns: [
      { key: "id", label: "BOM Number", mono: true, link: true },
      { key: "productName", label: "Product" },
      { key: "version", label: "Version", render: (row) => `${row.revisionNumber}${row.isDefault ? " (Default)" : ""}` },
      { key: "batchSize", label: "Batch Size", align: "right", render: (row) => `${row.batchSize} ${row.uom}` },
      { key: "costPerUnit", label: "Cost / Unit", align: "right", render: (row) => computeBomCosting(row).costPerUnit.toFixed(2) },
      { key: "effectiveDate", label: "Effective Date" },
      { key: "status", label: "Status", badge: true },
    ],
    rowActions: [
      { key: "view", label: "View", icon: "Eye" },
      { key: "edit", label: "Edit", icon: "Pencil", hideWhen: (row) => !["Draft", "Pending Approval"].includes(row.status) },
      { key: "duplicate", label: "Clone New Version", icon: "Copy" },
      { key: "submit", label: "Submit for Approval", icon: "Send", showWhen: (row) => row.status === "Draft", setStatus: "Pending Approval" },
      { key: "approve", label: "Approve", icon: "Check", tone: "success", showWhen: (row) => row.status === "Pending Approval", setStatus: "Approved" },
      { key: "activate", label: "Activate", icon: "PackageCheck", tone: "success", showWhen: (row) => row.status === "Approved", bomEffect: "activate" },
      { key: "obsolete", label: "Discontinue Version", icon: "Ban", tone: "danger", showWhen: (row) => row.status === "Active", setStatus: "Obsolete", confirm: "Discontinue this BOM version?" },
      { key: "print", label: "Print", icon: "Printer", print: true },
      { key: "delete", label: "Delete", icon: "Trash2", tone: "danger", showWhen: (row) => row.status === "Draft", remove: true, confirm: "Delete this draft BOM?" },
    ],
  },
};
