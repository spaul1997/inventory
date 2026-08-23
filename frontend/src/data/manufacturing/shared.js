// Shared lookups for the Manufacturing module. Raw-material/warehouse data is
// NOT duplicated here — it's re-exported straight from Stock Management so
// BOM lines, Material Issue and Material Consumption stay consistent with
// the same materials/warehouses the rest of the app already uses.
import { materials, materialByCode, warehouses } from "../stockManagement.js";

export { materials, materialByCode, warehouses };

export const workCenters = [
  "Assembly Line 1",
  "Assembly Line 2",
  "Welding Station",
  "CNC Machining Center",
  "Injection Molding Bay",
  "Packaging Line",
  "Quality Inspection Bay",
];

export const machines = [
  "CNC-01",
  "Welding Robot WR-4",
  "Injection Molder IM-2",
  "Assembly Rig AR-1",
  "Packaging Machine PKM-3",
  "Hydraulic Press HP-2",
];

export const operators = ["Priya Nair", "Karan Mehta", "Anil Deshmukh", "Sunita Rao", "Rajesh Kumar", "Meera Iyer"];

export const shifts = ["Shift A (6 AM - 2 PM)", "Shift B (2 PM - 10 PM)", "Shift C (10 PM - 6 AM)"];

export const scrapReasons = ["QC Rejection", "Machine Fault", "Material Defect", "Operator Error", "Design Change", "Handling Damage"];

export const downtimeReasons = ["Machine Breakdown", "Material Shortage", "Power Outage", "Changeover / Setup", "Quality Hold", "Operator Unavailable"];

export const dispositions = ["Scrap", "Rework", "Return to Vendor"];

export const priorities = ["Low", "Normal", "High", "Urgent"];

export const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
export const money0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const number = new Intl.NumberFormat("en-IN");

export const today = () => new Date().toISOString().slice(0, 10);
export const now = () => new Date().toISOString().slice(0, 16);
