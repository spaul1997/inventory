import React, { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Factory,
  IndianRupee,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Save,
  ShieldCheck,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { useToast } from "../components/Toast.jsx";
import { Metric, Panel } from "../components/ui.jsx";
import { useSpecialAdminActions, useSpecialAdminResource } from "../stores/SpecialAdminStore.jsx";

const money0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const number0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const initialCompanyForm = {
  businessName: "",
  ownerName: "",
  email: "",
  phone: "",
  address: "",
  gstNumber: "",
  maxUsers: "10",
  monthlyAmount: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminEmployeeCode: "",
  adminPassword: "",
  enabledModules: ["purchase", "sales", "manufacturing"],
  status: "active",
  subscriptionStatus: "trial",
};

function dateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createInitialPaymentForm() {
  const today = new Date();
  return {
    tenantId: "",
    amount: "",
    billingMonth: dateInputValue(today).slice(0, 7),
    paymentDate: dateInputValue(today),
    paymentMode: "bank",
    paymentStatus: "success",
    transactionId: "",
    notes: "",
  };
}

const companyModuleOptions = [
  { key: "purchase", label: "Purchase", description: "Purchase requests, orders, receipts and returns.", icon: ShoppingCart },
  { key: "sales", label: "Sales", description: "Customers, sales orders, dispatch and invoices.", icon: IndianRupee },
  { key: "manufacturing", label: "Manufacturing", description: "BOM, planning, work orders and production.", icon: Factory },
];

function formatStatus(value) {
  return String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatBillingDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function statusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (["active", "success", "paid"].includes(normalized)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["trial", "pending"].includes(normalized)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (["suspended", "failed", "expired", "cancelled"].includes(normalized)) return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(status)}`}>
      {formatStatus(status)}
    </span>
  );
}

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">{eyebrow}</p>
        <h2 className="text-2xl font-semibold text-[var(--ink)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      {message}
    </div>
  );
}

function TableEmpty({ loading, children, colSpan = 6 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-sm text-[var(--muted)]">
        {loading ? "Loading..." : children}
      </td>
    </tr>
  );
}

function SelectField({ label, value, onChange, options, required = false, disabled = false, placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{label}</span>
      <select
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder = "", autoComplete = "off", min, step }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        min={min}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function CompanyModuleSelector({ value = [], onChange }) {
  function toggle(moduleKey, checked) {
    onChange(checked ? [...new Set([...value, moduleKey])] : value.filter((item) => item !== moduleKey));
  }

  return (
    <section>
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-[var(--ink)]">Company Modules <span className="text-[var(--danger)]">*</span></h4>
        <p className="mt-0.5 text-xs text-[var(--muted)]">Select the business modules this company can access.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {companyModuleOptions.map(({ key, label, description, icon: Icon }) => {
          const checked = value.includes(key);
          return (
            <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${checked ? "border-blue-300 bg-blue-50" : "border-[var(--line)] bg-white hover:bg-slate-50"}`}>
              <input type="checkbox" checked={checked} onChange={(event) => toggle(key, event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ink)]"><Icon size={15} /> {label}</span>
                <span className="mt-1 block text-xs leading-4 text-[var(--muted)]">{description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function CompanyModal({ open, editing, values, error, saving, onChange, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-md border border-[var(--line)] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">{editing ? "Edit Company" : "Create Company"}</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {editing ? "Update company details, access, and account state." : "A Super Admin user will be created with this company."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--ink)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <section>
            <h4 className="mb-3 text-sm font-semibold text-[var(--ink)]">Company Details</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business Name" required value={values.businessName} onChange={(value) => onChange("businessName", value)} placeholder="Acme Retail Pvt Ltd" />
              <Field label="Owner Name" required value={values.ownerName} onChange={(value) => onChange("ownerName", value)} placeholder="Owner name" />
              <Field label="Company Email" required type="email" autoComplete="email" value={values.email} onChange={(value) => onChange("email", value)} placeholder="company@example.com" />
              <Field label="Company Phone" required autoComplete="tel" value={values.phone} onChange={(value) => onChange("phone", value)} placeholder="+91 99999 99999" />
              <Field label="Maximum Users" required type="number" min="1" step="1" value={values.maxUsers} onChange={(value) => onChange("maxUsers", value)} placeholder="10" />
              <Field label="Monthly Amount" required type="number" min="0.01" step="0.01" value={values.monthlyAmount} onChange={(value) => onChange("monthlyAmount", value)} placeholder="Enter monthly billing amount" />
              <Field label="GST Number" value={values.gstNumber} onChange={(value) => onChange("gstNumber", value)} placeholder="Optional" />
              <Field label="Address" value={values.address} onChange={(value) => onChange("address", value)} placeholder="Company address" />
            </div>
          </section>

          <CompanyModuleSelector value={values.enabledModules} onChange={(value) => onChange("enabledModules", value)} />

          {editing ? (
            <section>
              <h4 className="mb-3 text-sm font-semibold text-[var(--ink)]">Account State</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Company Status"
                  value={values.status}
                  onChange={(value) => onChange("status", value)}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "suspended", label: "Suspended" },
                  ]}
                />
                <SelectField
                  label="Subscription Status"
                  value={values.subscriptionStatus}
                  onChange={(value) => onChange("subscriptionStatus", value)}
                  options={[
                    { value: "trial", label: "Trial" },
                    { value: "active", label: "Active" },
                    { value: "expired", label: "Expired" },
                    { value: "cancelled", label: "Cancelled" },
                    { value: "suspended", label: "Suspended" },
                  ]}
                />
              </div>
            </section>
          ) : (
            <section>
              <h4 className="mb-3 text-sm font-semibold text-[var(--ink)]">Super Admin</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Admin Name" value={values.adminName} onChange={(value) => onChange("adminName", value)} placeholder="Defaults to owner name" />
                <Field label="Admin Email" type="email" autoComplete="email" value={values.adminEmail} onChange={(value) => onChange("adminEmail", value)} placeholder="Defaults to company email" />
                <Field label="Admin Phone" autoComplete="tel" value={values.adminPhone} onChange={(value) => onChange("adminPhone", value)} placeholder="Defaults to company phone" />
                <Field label="Employee Code" value={values.adminEmployeeCode} onChange={(value) => onChange("adminEmployeeCode", value)} placeholder="Auto-generated if blank" />
                <Field label="Initial Password" required type="password" autoComplete="new-password" value={values.adminPassword} onChange={(value) => onChange("adminPassword", value)} placeholder="Minimum 8 characters" />
              </div>
            </section>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--line)] bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save size={15} />
            {saving ? (editing ? "Updating..." : "Creating...") : (editing ? "Update Company" : "Create Company")}
          </button>
        </div>
      </form>
    </div>
  );
}

function PaymentModal({ open, values, companies, error, saving, onChange, onClose, onSubmit }) {
  if (!open) return null;

  const canCreate = companies.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-md border border-[var(--line)] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">Create Monthly Payment</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">Create a company subscription payment and printable invoice.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--ink)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Company"
              value={values.tenantId}
              onChange={(value) => onChange("tenantId", value)}
              required
              disabled={!companies.length}
              placeholder="Select company"
              options={companies.map((company) => ({
                value: String(company._id),
                label: `${company.businessName}${company.status !== "active" ? ` (${formatStatus(company.status)})` : ""}`,
              }))}
            />
            <Field
              label="Invoice Amount"
              required
              type="number"
              min="0.01"
              step="0.01"
              value={values.amount}
              onChange={(value) => onChange("amount", value)}
              placeholder="Enter monthly amount"
            />
            <Field label="Billing Month" required type="month" value={values.billingMonth} onChange={(value) => onChange("billingMonth", value)} />
            <Field label="Payment Date" required type="date" value={values.paymentDate} onChange={(value) => onChange("paymentDate", value)} />
            <SelectField
              label="Payment Mode"
              value={values.paymentMode}
              onChange={(value) => onChange("paymentMode", value)}
              options={[
                { value: "cash", label: "Cash" },
                { value: "bank", label: "Bank Transfer" },
                { value: "upi", label: "UPI" },
                { value: "card", label: "Card" },
                { value: "razorpay", label: "Razorpay" },
                { value: "stripe", label: "Stripe" },
                { value: "other", label: "Other" },
              ]}
            />
            <SelectField
              label="Payment Status"
              value={values.paymentStatus}
              onChange={(value) => onChange("paymentStatus", value)}
              options={[
                { value: "success", label: "Successful" },
                { value: "pending", label: "Pending" },
                { value: "failed", label: "Failed" },
              ]}
            />
            <Field label="Transaction ID" value={values.transactionId} onChange={(value) => onChange("transactionId", value)} placeholder="Optional reference" />
            <Field label="Notes" value={values.notes} onChange={(value) => onChange("notes", value)} placeholder="Optional payment note" />
          </div>

          {!canCreate && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              Create a company before recording a payment.
            </div>
          )}
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--line)] bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !canCreate}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={15} /> {saving ? "Creating..." : "Create Payment & Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}

function paymentInvoiceNumber(payment) {
  return payment?.invoiceNumber || `SINV-${String(payment?._id || "").slice(-8).toUpperCase()}`;
}

function PaymentInvoiceModal({
  payment,
  statusValue,
  statusError,
  savingStatus,
  onStatusChange,
  onStatusUpdate,
  onClose,
  onPrint,
}) {
  if (!payment) return null;

  const company = payment.tenantId || {};
  const subscription = payment.subscriptionId || {};

  return (
    <div className="subscription-invoice-modal fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="subscription-invoice-controls mb-3 rounded-md bg-white p-3 shadow-xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Payment Status</span>
                <select
                  value={statusValue}
                  disabled={savingStatus}
                  onChange={(event) => onStatusChange(event.target.value)}
                  className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="success">Successful</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </label>
              <button
                type="button"
                onClick={onStatusUpdate}
                disabled={savingStatus || statusValue === payment.paymentStatus}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={15} /> {savingStatus ? "Updating..." : "Update Status"}
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={savingStatus} onClick={onClose} className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">Close</button>
              <button type="button" disabled={savingStatus} onClick={onPrint} className="inline-flex items-center gap-2 rounded-md bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                <Printer size={15} /> Print Invoice
              </button>
            </div>
          </div>
          {statusError && <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{statusError}</div>}
        </div>

        <article className="subscription-invoice-print-area rounded-md bg-white p-8 text-[var(--ink)] shadow-xl">
          <div className="flex items-start justify-between gap-6 border-b-2 border-[var(--ink)] pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">IMS Control Center</p>
              <h1 className="mt-1 text-2xl font-bold">Monthly Subscription Invoice</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">Software subscription billing receipt</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-mono font-semibold">{paymentInvoiceNumber(payment)}</p>
              <p className="mt-1 text-[var(--muted)]">Issued {formatDate(payment.paymentDate)}</p>
              <div className="mt-2"><StatusPill status={payment.paymentStatus} /></div>
            </div>
          </div>

          <section className="grid gap-6 border-b border-[var(--line)] py-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Billed To</p>
              <p className="mt-2 text-base font-semibold">{company.businessName || "-"}</p>
              {company.ownerName && <p className="mt-1 text-sm">{company.ownerName}</p>}
              {company.address && <p className="mt-1 text-sm text-[var(--muted)]">{company.address}</p>}
              <p className="mt-1 text-sm text-[var(--muted)]">{[company.email, company.phone].filter(Boolean).join(" · ")}</p>
              {company.gstNumber && <p className="mt-1 text-sm text-[var(--muted)]">GST: {company.gstNumber}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Billing Details</p>
              <p className="mt-2 text-sm"><span className="text-[var(--muted)]">Cycle:</span> Monthly</p>
              <p className="mt-1 text-sm"><span className="text-[var(--muted)]">Period:</span> {formatBillingDate(subscription.startDate)} – {formatBillingDate(subscription.endDate)}</p>
              <p className="mt-1 text-sm"><span className="text-[var(--muted)]">Mode:</span> {formatStatus(payment.paymentMode)}</p>
              <p className="mt-1 text-sm"><span className="text-[var(--muted)]">Transaction:</span> {payment.transactionId || "-"}</p>
            </div>
          </section>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-xs uppercase text-[var(--muted)]">
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5 text-center">Qty</th>
                <th className="px-3 py-2.5 text-right">Rate</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--line)]">
                <td className="px-3 py-4">
                  <p className="font-semibold">Monthly Subscription</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Monthly SaaS subscription · {formatBillingDate(subscription.startDate)} to {formatBillingDate(subscription.endDate)}</p>
                </td>
                <td className="px-3 py-4 text-center">1</td>
                <td className="px-3 py-4 text-right">{money0.format(payment.amount || 0)}</td>
                <td className="px-3 py-4 text-right font-semibold">{money0.format(payment.amount || 0)}</td>
              </tr>
            </tbody>
          </table>

          <div className="ml-auto mt-5 w-full max-w-xs border-t-2 border-[var(--ink)] pt-3">
            <div className="flex items-center justify-between text-base font-bold">
              <span>Total</span>
              <span>{money0.format(payment.amount || 0)}</span>
            </div>
          </div>

          {payment.notes && <p className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-sm text-[var(--muted)]"><span className="font-semibold text-[var(--ink)]">Notes:</span> {payment.notes}</p>}
          <footer className="mt-8 border-t border-[var(--line)] pt-4 text-center text-xs text-[var(--muted)]">
            This is a system-generated monthly subscription invoice.
          </footer>
        </article>
      </div>
    </div>
  );
}

export function SpecialAdminDashboard() {
  const { data, loading, error } = useSpecialAdminResource("dashboard");
  const summary = data.summary || {};
  const recentCompanies = data.recentCompanies || [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Special Admin"
        title="SaaS Dashboard"
        description="Company, subscription, and payment status from the backend."
      />
      <ErrorBanner message={error} />

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Companies" value={number0.format(summary.totalCompanies || 0)} sub="Total registered" icon={Building2} />
        <Metric label="Active Companies" value={number0.format(summary.activeCompanies || 0)} sub="Status active" icon={CheckCircle2} tone="accent" />
        <Metric label="Trial Companies" value={number0.format(summary.trialCompanies || 0)} sub="Subscription trial" icon={Clock} tone="warning" />
        <Metric label="Revenue" value={money0.format(summary.totalRevenue || 0)} sub={`${summary.paymentCount || 0} successful payments`} icon={IndianRupee} tone="primary" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Panel title="Subscription Snapshot" accent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-[var(--line)] p-3">
              <p className="text-xs text-[var(--muted)]">Active subscriptions</p>
              <p className="mt-2 text-xl font-semibold text-[var(--ink)]">{summary.activeSubscriptions || 0}</p>
            </div>
            <div className="rounded-md border border-[var(--line)] p-3">
              <p className="text-xs text-[var(--muted)]">Pending payments</p>
              <p className="mt-2 text-xl font-semibold text-[var(--ink)]">{summary.pendingPayments || 0}</p>
            </div>
            <div className="rounded-md border border-[var(--line)] p-3">
              <p className="text-xs text-[var(--muted)]">Suspended companies</p>
              <p className="mt-2 text-xl font-semibold text-[var(--ink)]">{summary.suspendedCompanies || 0}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Recent Companies">
          <div className="space-y-2">
            {recentCompanies.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--muted)]">
                {loading ? "Loading..." : "No companies found."}
              </p>
            )}
            {recentCompanies.map((company) => (
              <div key={company._id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ink)]">{company.businessName}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{company.ownerName || company.email}</p>
                </div>
                <StatusPill status={company.subscriptionStatus} />
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

export function SpecialAdminCompany() {
  const showToast = useToast();
  const { data, loading, error } = useSpecialAdminResource("companies");
  const { createCompany, updateCompany } = useSpecialAdminActions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formValues, setFormValues] = useState(initialCompanyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const companies = data.companies || [];
  const activeCompanies = useMemo(() => companies.filter((company) => company.status === "active").length, [companies]);

  function setField(key, value) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingCompany(null);
    setFormError("");
    setFormValues(initialCompanyForm);
  }

  function openCreateModal() {
    setEditingCompany(null);
    setFormError("");
    setFormValues(initialCompanyForm);
    setModalOpen(true);
  }

  function openEditModal(company) {
    setEditingCompany(company);
    setFormError("");
    setFormValues({
      ...initialCompanyForm,
      businessName: company.businessName || "",
      ownerName: company.ownerName || "",
      email: company.email || "",
      phone: company.phone || "",
      address: company.address || "",
      gstNumber: company.gstNumber || "",
      maxUsers: String(company.maxUsers || 10),
      monthlyAmount: company.monthlyAmount > 0 ? String(company.monthlyAmount) : "",
      enabledModules: company.enabledModules || initialCompanyForm.enabledModules,
      status: company.status || "active",
      subscriptionStatus: company.subscriptionStatus || "trial",
    });
    setModalOpen(true);
  }

  async function handleSaveCompany(event) {
    event.preventDefault();
    setFormError("");

    if (!formValues.enabledModules.length) {
      setFormError("Select at least one company module.");
      return;
    }

    if (!Number.isInteger(Number(formValues.maxUsers)) || Number(formValues.maxUsers) < 1) {
      setFormError("Maximum users must be a whole number greater than zero.");
      return;
    }

    if (!Number.isFinite(Number(formValues.monthlyAmount)) || Number(formValues.monthlyAmount) <= 0) {
      setFormError("Monthly amount must be greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const result = editingCompany
        ? await updateCompany(editingCompany._id, formValues)
        : await createCompany(formValues);
      showToast(editingCompany
        ? `Updated ${result.company.businessName}.`
        : `Created ${result.company.businessName} and Super Admin ${result.superAdmin.employeeCode}.`);
      setModalOpen(false);
      setEditingCompany(null);
      setFormError("");
      setFormValues(initialCompanyForm);
    } catch (err) {
      setFormError(err.message || `Unable to ${editingCompany ? "update" : "create"} company.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Special Admin"
        title="Company"
        description="Registered companies and their subscription state."
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]"
          >
            <Plus size={16} />
            Create Company
          </button>
        }
      />
      <ErrorBanner message={error} />

      <CompanyModal
        open={modalOpen}
        editing={Boolean(editingCompany)}
        values={formValues}
        error={formError}
        saving={saving}
        onChange={setField}
        onClose={closeModal}
        onSubmit={handleSaveCompany}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Total Companies" value={number0.format(companies.length)} sub="Loaded from backend" icon={Building2} />
        <Metric label="Active" value={number0.format(activeCompanies)} sub="Company status active" icon={ShieldCheck} tone="accent" />
        <Metric label="Trial" value={number0.format(companies.filter((company) => company.subscriptionStatus === "trial").length)} sub="Subscription status trial" icon={Users} tone="warning" />
      </section>

      <Panel title="Company List" accent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="py-2">Company</th>
                <th>Owner</th>
                <th>Contact</th>
                <th>Max Users</th>
                <th>Monthly Amount</th>
                <th>GST</th>
                <th>Status</th>
                <th>Subscription</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 && <TableEmpty loading={loading} colSpan={9}>No companies found.</TableEmpty>}
              {companies.map((company) => (
                <tr key={company._id} className="border-b border-slate-100">
                  <td className="py-2.5">
                    <p className="font-semibold text-[var(--ink)]">{company.businessName}</p>
                    <p className="mt-0.5 text-xs text-[var(--primary)]">
                      {(company.enabledModules || ["purchase", "sales", "manufacturing"])
                        .map((moduleKey) => formatStatus(moduleKey))
                        .join(" · ")}
                    </p>
                    <p className="text-xs text-[var(--muted)]">Created {formatDate(company.createdAt)}</p>
                  </td>
                  <td>{company.ownerName || "-"}</td>
                  <td>
                    <p>{company.email || "-"}</p>
                    <p className="text-xs text-[var(--muted)]">{company.phone || "-"}</p>
                  </td>
                  <td>{number0.format(company.maxUsers || 10)}</td>
                  <td className="font-semibold text-[var(--ink)]">{money0.format(company.monthlyAmount || 0)}</td>
                  <td>{company.gstNumber || "-"}</td>
                  <td><StatusPill status={company.status} /></td>
                  <td><StatusPill status={company.subscriptionStatus} /></td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => openEditModal(company)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:border-blue-200 hover:bg-blue-50 hover:text-[var(--primary)]"
                      aria-label={`Edit ${company.businessName}`}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export function SpecialAdminPayment() {
  const { data, loading, error } = useSpecialAdminResource("payments");
  const { createPayment, updatePaymentStatus } = useSpecialAdminActions();
  const showToast = useToast();
  const payments = data.payments || [];
  const companies = data.companies || [];
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState(createInitialPaymentForm);
  const [paymentError, setPaymentError] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [invoicePayment, setInvoicePayment] = useState(null);
  const [invoiceStatus, setInvoiceStatus] = useState("success");
  const [invoiceStatusError, setInvoiceStatusError] = useState("");
  const [savingInvoiceStatus, setSavingInvoiceStatus] = useState(false);
  const successfulTotal = useMemo(
    () => payments.filter((payment) => payment.paymentStatus === "success").reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    [payments]
  );
  const pendingCount = useMemo(() => payments.filter((payment) => payment.paymentStatus === "pending").length, [payments]);

  function companyMonthlyAmount(companyId) {
    const company = companies.find((item) => String(item._id) === String(companyId));
    const amount = Number(company?.monthlyAmount);
    return Number.isFinite(amount) && amount > 0 ? String(amount) : "";
  }

  function openPaymentModal() {
    const tenantId = String(companies[0]?._id || "");
    setPaymentForm({
      ...createInitialPaymentForm(),
      tenantId,
      amount: companyMonthlyAmount(tenantId),
    });
    setPaymentError("");
    setPaymentModalOpen(true);
  }

  function closePaymentModal() {
    if (savingPayment) return;
    setPaymentModalOpen(false);
    setPaymentError("");
  }

  function setPaymentField(key, value) {
    setPaymentForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "tenantId" ? { amount: companyMonthlyAmount(value) } : {}),
    }));
  }

  async function handleCreatePayment(event) {
    event.preventDefault();
    setPaymentError("");
    setSavingPayment(true);

    try {
      const result = await createPayment(paymentForm);
      setPaymentModalOpen(false);
      setPaymentForm(createInitialPaymentForm());
      openPaymentInvoice(result.payment);
      showToast(`Created payment invoice ${paymentInvoiceNumber(result.payment)}.`);
    } catch (requestError) {
      setPaymentError(requestError.message || "Unable to create payment.");
    } finally {
      setSavingPayment(false);
    }
  }

  function openPaymentInvoice(payment) {
    setInvoicePayment(payment);
    setInvoiceStatus(payment.paymentStatus || "pending");
    setInvoiceStatusError("");
  }

  function closePaymentInvoice() {
    if (savingInvoiceStatus) return;
    setInvoicePayment(null);
    setInvoiceStatusError("");
  }

  async function handleUpdatePaymentStatus() {
    if (!invoicePayment || invoiceStatus === invoicePayment.paymentStatus) return;

    setInvoiceStatusError("");
    setSavingInvoiceStatus(true);

    try {
      const result = await updatePaymentStatus(invoicePayment._id, invoiceStatus);
      setInvoicePayment(result.payment);
      setInvoiceStatus(result.payment.paymentStatus);
      showToast(`Updated ${paymentInvoiceNumber(result.payment)} to ${formatStatus(result.payment.paymentStatus)}.`);
    } catch (requestError) {
      setInvoiceStatusError(requestError.message || "Unable to update payment status.");
    } finally {
      setSavingInvoiceStatus(false);
    }
  }

  function printInvoice() {
    document.body.classList.add("subscription-invoice-only-print");
    window.addEventListener(
      "afterprint",
      () => document.body.classList.remove("subscription-invoice-only-print"),
      { once: true }
    );
    window.print();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Special Admin"
        title="Payment"
        description="Company-wise monthly subscriptions, payments, and invoices."
        action={
          <button
            type="button"
            onClick={openPaymentModal}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]"
          >
            <Plus size={16} /> Create Payment
          </button>
        }
      />
      <ErrorBanner message={error} />

      <PaymentModal
        open={paymentModalOpen}
        values={paymentForm}
        companies={companies}
        error={paymentError}
        saving={savingPayment}
        onChange={setPaymentField}
        onClose={closePaymentModal}
        onSubmit={handleCreatePayment}
      />
      <PaymentInvoiceModal
        payment={invoicePayment}
        statusValue={invoiceStatus}
        statusError={invoiceStatusError}
        savingStatus={savingInvoiceStatus}
        onStatusChange={(value) => {
          setInvoiceStatus(value);
          setInvoiceStatusError("");
        }}
        onStatusUpdate={handleUpdatePaymentStatus}
        onClose={closePaymentInvoice}
        onPrint={printInvoice}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Successful Revenue" value={money0.format(successfulTotal)} sub="From loaded payments" icon={IndianRupee} />
        <Metric label="Payment Records" value={number0.format(payments.length)} sub="Latest 200 entries" icon={ReceiptText} tone="accent" />
        <Metric label="Pending" value={number0.format(pendingCount)} sub="Awaiting confirmation" icon={CreditCard} tone="warning" />
      </section>

      <Panel title="Payment List" accent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="py-2">Date</th>
                <th>Invoice</th>
                <th>Company</th>
                <th>Mode</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && <TableEmpty loading={loading} colSpan={7}>No payments found.</TableEmpty>}
              {payments.map((payment) => (
                <tr key={payment._id} className="border-b border-slate-100">
                  <td className="py-2.5">{formatDate(payment.paymentDate)}</td>
                  <td className="font-mono text-xs font-semibold text-[var(--ink)]">{paymentInvoiceNumber(payment)}</td>
                  <td>
                    <p className="font-semibold text-[var(--ink)]">{payment.tenantId?.businessName || "-"}</p>
                    <p className="text-xs text-[var(--muted)]">{payment.tenantId?.email || ""}</p>
                  </td>
                  <td>{formatStatus(payment.paymentMode)}</td>
                  <td><StatusPill status={payment.paymentStatus} /></td>
                  <td className="text-right font-semibold text-[var(--ink)]">{money0.format(payment.amount || 0)}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => openPaymentInvoice(payment)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:border-blue-200 hover:bg-blue-50 hover:text-[var(--primary)]"
                      aria-label={`View invoice ${paymentInvoiceNumber(payment)}`}
                    >
                      <ReceiptText size={13} /> Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
