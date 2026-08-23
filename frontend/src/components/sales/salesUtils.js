import { useMemo } from "react";
import { useSalesData } from "./SalesDataContext.jsx";
import { computeOrderTotals } from "../../data/sales/shared.js";

const OPEN_INVOICE_STATUSES = ["Issued", "Partially Paid", "Overdue", "Disputed"];
const AGING_BUCKETS = ["0-30 days", "31-60 days", "61-90 days", "90+ days"];

function agingBucket(days) {
  if (days <= 30) return AGING_BUCKETS[0];
  if (days <= 60) return AGING_BUCKETS[1];
  if (days <= 90) return AGING_BUCKETS[2];
  return AGING_BUCKETS[3];
}

/**
 * Plain (non-hook) version so it can be called from inside a field renderer
 * (e.g. Sales Order's Credit & Approval panel), not just from a component's
 * top level. `useCustomerOutstanding` below just wraps this in useMemo.
 */
export function computeCustomerOutstanding(customerId, invoices, returns) {
  const rows = invoices
    .filter((inv) => inv.customerId === customerId && OPEN_INVOICE_STATUSES.includes(inv.status))
    .map((inv) => {
      const totals = computeOrderTotals(inv.items, inv);
      const paid = (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const balance = Math.max(0, totals.grandTotal - paid);
      const daysOverdue = inv.dueDate ? Math.max(0, Math.round((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
      return { invoiceId: inv.id, date: inv.date, dueDate: inv.dueDate, grandTotal: totals.grandTotal, paid, balance, daysOverdue, bucket: agingBucket(daysOverdue), status: inv.status };
    });

  const totalCreditNotes = returns.filter((r) => r.customerId === customerId && r.creditNoteAmount).reduce((sum, r) => sum + (Number(r.creditNoteAmount) || 0), 0);
  const totalBalance = rows.reduce((sum, r) => sum + r.balance, 0);
  const totalOutstanding = Math.max(0, totalBalance - totalCreditNotes);
  const buckets = AGING_BUCKETS.map((bucket) => ({ bucket, value: rows.filter((r) => r.bucket === bucket).reduce((sum, r) => sum + r.balance, 0) }));
  const payments = invoices
    .filter((inv) => inv.customerId === customerId)
    .flatMap((inv) => (inv.payments || []).map((p) => ({ ...p, invoiceId: inv.id })))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return { rows, totalOutstanding, totalCreditNotes, buckets, payments, openInvoiceCount: rows.length };
}

/** Derived, not stored — mirrors useManufacturingWip()'s precedent. */
export function useCustomerOutstanding(customerId) {
  const salesData = useSalesData();
  const invoices = salesData.getRows("sales-invoice");
  const returns = salesData.getRows("sales-return");
  return useMemo(() => computeCustomerOutstanding(customerId, invoices, returns), [customerId, invoices, returns]);
}
