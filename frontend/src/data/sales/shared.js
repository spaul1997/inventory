// Shared lookups + pure calculation helpers for the Sales module. Reuses
// Master Management's product-item catalog and Stock Management's warehouse
// list rather than inventing parallel ones (see plan's reuse decision).
import { masterEntities } from "../masterManagement.js";
export { masterEntities };
export const warehouses = masterEntities.warehouse.list.rows.map((w) => w.name);

export const COMPANY_STATE = "Maharashtra";
export const COMPANY_GSTIN = "27AABCI1234F1Z9";
export const COMPANY_NAME = "IMS Industries Pvt Ltd";

export const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Chandigarh",
  "Puducherry", "Andaman and Nicobar Islands", "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep",
];

export const customerTypes = ["Individual", "Business", "Distributor", "Wholesaler", "Retailer", "Institutional"];
export const customerCategories = ["Premium", "Standard", "New", "Strategic"];
export const paymentTermsOptions = ["Advance", "Net 15", "Net 30", "Net 45", "Net 60", "Cash on Delivery"];
export const salesRoles = [
  "Sales Executive", "Sales Manager", "Warehouse Operator", "Dispatch Coordinator",
  "Accountant", "Finance Manager", "Customer Support Executive", "Operations Manager", "System Administrator",
];
export const transportModes = ["Road", "Rail", "Air", "Courier", "Own Vehicle"];
export const returnReasons = [
  "Damaged in Transit", "Defective Product", "Wrong Product Supplied", "Wrong Quantity Supplied",
  "Expired Product", "Quality Issue", "Customer Cancellation", "Duplicate Order",
  "Packaging Damage", "Product Not as Described", "Warranty Claim", "Delivery Rejection", "Other",
];
export const dispositions = ["Restock", "Repair", "Rework", "Replace", "Return to Vendor", "Scrap"];

export const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
export const money0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const number = new Intl.NumberFormat("en-IN");

export const today = () => new Date().toISOString().slice(0, 10);
export const now = () => new Date().toISOString().slice(0, 16);

/** Per-line GST split: CGST+SGST when intrastate, IGST when interstate. */
export function computeLineTax(line, isIntrastate) {
  const base = (Number(line.qty) || 0) * (Number(line.rate) || 0);
  const discountAmt = base * ((Number(line.discountPercent) || 0) / 100);
  const taxableValue = base - discountAmt;
  const gstRate = Number(line.gstRate) || 0;
  const cgstAmt = isIntrastate ? (taxableValue * gstRate) / 2 / 100 : 0;
  const sgstAmt = isIntrastate ? (taxableValue * gstRate) / 2 / 100 : 0;
  const igstAmt = isIntrastate ? 0 : (taxableValue * gstRate) / 100;
  const lineTotal = taxableValue + cgstAmt + sgstAmt + igstAmt;
  return { base, discountAmt, taxableValue, gstRate, cgstAmt, sgstAmt, igstAmt, lineTotal };
}

function sumBy(arr, key) {
  return arr.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
}

/** Order/invoice-level rollup. Freight/packing/other charges are added post-tax (documented simplification). */
export function computeOrderTotals(lines, { destinationState, freight = 0, packing = 0, other = 0 } = {}) {
  const isIntrastate = destinationState === COMPANY_STATE;
  const computed = (lines || []).filter((l) => l.productCode).map((l) => ({ ...l, ...computeLineTax(l, isIntrastate) }));
  const subtotal = sumBy(computed, "base");
  const totalDiscount = sumBy(computed, "discountAmt");
  const taxableTotal = sumBy(computed, "taxableValue");
  const totalCGST = sumBy(computed, "cgstAmt");
  const totalSGST = sumBy(computed, "sgstAmt");
  const totalIGST = sumBy(computed, "igstAmt");
  const freightNum = Number(freight) || 0;
  const packingNum = Number(packing) || 0;
  const otherNum = Number(other) || 0;
  const preRound = taxableTotal + totalCGST + totalSGST + totalIGST + freightNum + packingNum + otherNum;
  const grandTotal = Math.round(preRound);
  return {
    isIntrastate,
    lines: computed,
    subtotal,
    totalDiscount,
    taxableTotal,
    totalCGST,
    totalSGST,
    totalIGST,
    freight: freightNum,
    packing: packingNum,
    other: otherNum,
    roundOff: grandTotal - preRound,
    grandTotal,
    totalQty: sumBy(computed, "qty"),
  };
}

/**
 * Increments the trailing numeric run of the highest existing id/code,
 * preserving whatever prefix and zero-padding width that format already
 * uses. Shared across all 5 generic Sales entities (see ManufacturingForm.jsx
 * for the original single-entity version this generalizes).
 */
export function nextId(rows, idKey, fallbackId) {
  if (!rows || rows.length === 0) return fallbackId;
  let bestPrefix = "";
  let bestWidth = 0;
  let bestNum = 0;
  rows.forEach((row) => {
    const match = String(row[idKey] || "").match(/^(.*?)(\d+)$/);
    if (!match) return;
    const [, prefix, digits] = match;
    const num = parseInt(digits, 10);
    if (num > bestNum) {
      bestNum = num;
      bestPrefix = prefix;
      bestWidth = digits.length;
    }
  });
  if (!bestPrefix) return fallbackId;
  return `${bestPrefix}${String(bestNum + 1).padStart(bestWidth, "0")}`;
}

/**
 * Synthesizes a "done up to here" activity list from a linear status list +
 * the record's current status, so a skipped optional branch (e.g. On Hold)
 * never shows as "current" in WorkflowTimeline after the record has already
 * moved past it. See WorkOrderForm.jsx's timelineActivity for the original.
 */
export function timelineActivity(statusList, currentStatus) {
  const index = statusList.indexOf(currentStatus);
  if (index < 0) return [];
  return statusList.slice(0, index + 1).map((event) => ({ event }));
}
