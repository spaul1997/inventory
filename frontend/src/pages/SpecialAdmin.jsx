import React, { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  IndianRupee,
  Plus,
  ReceiptText,
  Save,
  ShieldCheck,
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
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminEmployeeCode: "",
  adminPassword: "",
};

function formatStatus(value) {
  return String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
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

function TableEmpty({ loading, children }) {
  return (
    <tr>
      <td colSpan={6} className="py-8 text-center text-sm text-[var(--muted)]">
        {loading ? "Loading..." : children}
      </td>
    </tr>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder = "", autoComplete = "off" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function TextareaField({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function CreateCompanyModal({ open, values, error, saving, onChange, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-md border border-[var(--line)] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">Create Company</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">A Super Admin user will be created with this company.</p>
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
              <Field label="GST Number" value={values.gstNumber} onChange={(value) => onChange("gstNumber", value)} placeholder="Optional" />
              <TextareaField label="Address" value={values.address} onChange={(value) => onChange("address", value)} placeholder="Company address" />
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold text-[var(--ink)]">Super Admin</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Admin Name" value={values.adminName} onChange={(value) => onChange("adminName", value)} placeholder="Defaults to owner name" />
              <Field label="Admin Email" type="email" autoComplete="email" value={values.adminEmail} onChange={(value) => onChange("adminEmail", value)} placeholder="Defaults to company email" />
              <Field label="Admin Phone" autoComplete="tel" value={values.adminPhone} onChange={(value) => onChange("adminPhone", value)} placeholder="Defaults to company phone" />
              <Field label="Employee Code" value={values.adminEmployeeCode} onChange={(value) => onChange("adminEmployeeCode", value)} placeholder="Auto-generated if blank" />
              <Field label="Initial Password" required type="password" autoComplete="new-password" value={values.adminPassword} onChange={(value) => onChange("adminPassword", value)} placeholder="Minimum 8 characters" />
            </div>
          </section>

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
            {saving ? "Creating..." : "Create Company"}
          </button>
        </div>
      </form>
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
  const { createCompany } = useSpecialAdminActions();
  const [modalOpen, setModalOpen] = useState(false);
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
    setFormError("");
    setFormValues(initialCompanyForm);
  }

  async function handleCreateCompany(event) {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    try {
      const result = await createCompany(formValues);
      showToast(`Created ${result.company.businessName} and Super Admin ${result.superAdmin.employeeCode}.`);
      setModalOpen(false);
      setFormError("");
      setFormValues(initialCompanyForm);
    } catch (err) {
      setFormError(err.message || "Unable to create company.");
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
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]"
          >
            <Plus size={16} />
            Create Company
          </button>
        }
      />
      <ErrorBanner message={error} />

      <CreateCompanyModal
        open={modalOpen}
        values={formValues}
        error={formError}
        saving={saving}
        onChange={setField}
        onClose={closeModal}
        onSubmit={handleCreateCompany}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Total Companies" value={number0.format(companies.length)} sub="Loaded from backend" icon={Building2} />
        <Metric label="Active" value={number0.format(activeCompanies)} sub="Company status active" icon={ShieldCheck} tone="accent" />
        <Metric label="Trial" value={number0.format(companies.filter((company) => company.subscriptionStatus === "trial").length)} sub="Subscription status trial" icon={Users} tone="warning" />
      </section>

      <Panel title="Company List" accent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="py-2">Company</th>
                <th>Owner</th>
                <th>Contact</th>
                <th>GST</th>
                <th>Status</th>
                <th>Subscription</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 && <TableEmpty loading={loading}>No companies found.</TableEmpty>}
              {companies.map((company) => (
                <tr key={company._id} className="border-b border-slate-100">
                  <td className="py-2.5">
                    <p className="font-semibold text-[var(--ink)]">{company.businessName}</p>
                    <p className="text-xs text-[var(--muted)]">Created {formatDate(company.createdAt)}</p>
                  </td>
                  <td>{company.ownerName || "-"}</td>
                  <td>
                    <p>{company.email || "-"}</p>
                    <p className="text-xs text-[var(--muted)]">{company.phone || "-"}</p>
                  </td>
                  <td>{company.gstNumber || "-"}</td>
                  <td><StatusPill status={company.status} /></td>
                  <td><StatusPill status={company.subscriptionStatus} /></td>
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
  const payments = data.payments || [];
  const successfulTotal = useMemo(
    () => payments.filter((payment) => payment.paymentStatus === "success").reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    [payments]
  );
  const pendingCount = useMemo(() => payments.filter((payment) => payment.paymentStatus === "pending").length, [payments]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Special Admin"
        title="Payment"
        description="SaaS payments received from companies."
      />
      <ErrorBanner message={error} />

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Successful Revenue" value={money0.format(successfulTotal)} sub="From loaded payments" icon={IndianRupee} />
        <Metric label="Payment Records" value={number0.format(payments.length)} sub="Latest 200 entries" icon={ReceiptText} tone="accent" />
        <Metric label="Pending" value={number0.format(pendingCount)} sub="Awaiting confirmation" icon={CreditCard} tone="warning" />
      </section>

      <Panel title="Payment List" accent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="py-2">Date</th>
                <th>Company</th>
                <th>Plan</th>
                <th>Mode</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && <TableEmpty loading={loading}>No payments found.</TableEmpty>}
              {payments.map((payment) => (
                <tr key={payment._id} className="border-b border-slate-100">
                  <td className="py-2.5">{formatDate(payment.paymentDate)}</td>
                  <td>
                    <p className="font-semibold text-[var(--ink)]">{payment.tenantId?.businessName || "-"}</p>
                    <p className="text-xs text-[var(--muted)]">{payment.tenantId?.email || ""}</p>
                  </td>
                  <td>{payment.planId?.planName || payment.planId?.planCode || "-"}</td>
                  <td>{formatStatus(payment.paymentMode)}</td>
                  <td><StatusPill status={payment.paymentStatus} /></td>
                  <td className="text-right font-semibold text-[var(--ink)]">{money0.format(payment.amount || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
