import React from "react";
import { ArrowDownRight, ArrowUpRight, TriangleAlert } from "lucide-react";

const tones = {
  primary: "text-[var(--primary)] bg-blue-50",
  accent: "text-[var(--navy)] bg-slate-100",
  warning: "text-[var(--warning)] bg-amber-50",
  danger: "text-[var(--danger)] bg-red-50",
};

export function Metric({ label, value, sub, icon: Icon, tone = "primary", trend }) {
  return (
    <div className="rounded-md border border-t-4 border-[var(--line)] border-t-[var(--primary)] bg-white p-4">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
              trend.direction === "up" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {trend.direction === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
      {sub && <p className="mt-1 text-xs text-[var(--muted)]">{sub}</p>}
    </div>
  );
}

export function Panel({ title, eyebrow, accent = false, action, children }) {
  return (
    <section
      className={`rounded-md border bg-white p-4 ${
        accent ? "border-t-4 border-[var(--line)] border-t-[var(--primary)]" : "border-[var(--line)]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">{eyebrow}</p>
          )}
          <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const green = "bg-emerald-50 text-emerald-700 border-emerald-200";
const gray = "bg-slate-100 text-slate-600 border-slate-200";
const amber = "bg-amber-50 text-amber-700 border-amber-200";
const blue = "bg-blue-50 text-[var(--primary)] border-blue-200";
const red = "bg-red-50 text-red-700 border-red-200";

const badgeTones = {
  Active: green,
  Approved: green,
  Received: green,
  Completed: green,
  "Completed GRN": green,
  Converted: green,
  Returned: green,
  Accepted: green,
  Passed: green,
  Posted: green,
  Issued: green,
  Delivered: green,
  "Inspection Passed": green,
  "Credit Note Issued": green,
  "Approved for Credit": green,

  Inactive: gray,
  Draft: gray,
  Consumed: gray,
  Closed: gray,
  Obsolete: gray,
  Scheduled: gray,
  "Written Off": gray,

  "Low Stock": amber,
  "Pending Approval": amber,
  "Pending Inspection": amber,
  "Pending Review": amber,
  "Pending QC": amber,
  "Near Expiry": amber,
  Pending: amber,
  Paused: amber,
  Submitted: amber,
  "Ready for Dispatch": amber,
  Packed: amber,
  "Return Requested": amber,
  "Pickup Scheduled": amber,
  "Under Inspection": amber,

  Ordered: blue,
  "Partial Issue": blue,
  "Partially Received": blue,
  "Partially Accepted": blue,
  "Partially Passed": blue,
  "Partially Completed": blue,
  "In Transit": blue,
  "In Progress": blue,
  Released: blue,
  Reviewed: blue,
  "Partially Delivered": blue,
  "Partially Dispatched": blue,
  "Partially Invoiced": blue,
  "Partially Allocated": blue,
  Reserved: blue,
  "Vehicle Assigned": blue,
  "Full Issue": green,

  Expired: red,
  Blocked: red,
  Rejected: red,
  Failed: red,
  Cancelled: red,
  Discontinued: red,
  "On Hold": red,
  Overdue: red,
  Disputed: red,
  "Delivery Failed": red,
  "Returned to Sender": red,
  "Inspection Failed": red,
  "On Credit Hold": red,
  Blacklisted: red,
};

export function Badge({ children }) {
  const toneClass = badgeTones[children] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", tone = "danger", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-md border border-[var(--line)] bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
              tone === "danger" ? "bg-red-50 text-[var(--danger)]" : "bg-blue-50 text-[var(--primary)]"
            }`}
          >
            <TriangleAlert size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${
              tone === "danger" ? "bg-[var(--danger)] hover:bg-red-700" : "bg-[var(--primary)] hover:bg-[var(--primary-deep)]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
