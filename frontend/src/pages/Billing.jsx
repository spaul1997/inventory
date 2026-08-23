import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, Download, Receipt, Users } from "lucide-react";
import { useToast } from "../components/Toast.jsx";
import { Badge, Metric, Panel } from "../components/ui.jsx";

const money0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const invoices = [
  { id: "INV-B-2026-008", date: "2026-08-01", amount: 24999, status: "Paid" },
  { id: "INV-B-2026-007", date: "2026-07-01", amount: 24999, status: "Paid" },
  { id: "INV-B-2026-006", date: "2026-06-01", amount: 24999, status: "Paid" },
  { id: "INV-B-2026-005", date: "2026-05-01", amount: 19999, status: "Paid" },
];

export default function Billing() {
  const showToast = useToast();

  function handleDemoAction(message) {
    showToast(message);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/dashboard" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--primary)]">
        <ArrowLeft size={15} />
        Back to Dashboard
      </Link>

      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Demo billing data — this application isn't connected to a live payment processor, so plan changes and payment methods here aren't wired to anything real.
      </div>

      <div className="space-y-5">
        <Panel
          eyebrow="Subscription"
          title="Business Plan"
          accent
          action={
            <button type="button" onClick={() => handleDemoAction("Plan changes aren't wired to a live billing system in this demo.")} className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-slate-50">
              Change Plan
            </button>
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-2xl font-semibold text-[var(--ink)]">
                {money0.format(24999)}
                <span className="text-sm font-normal text-[var(--muted)]">/ month</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 size={15} />
                Active — renews on 2026-09-01
              </p>
            </div>
            <Badge>Active</Badge>
          </div>
        </Panel>

        <section className="grid gap-4 sm:grid-cols-3">
          <Metric label="Active Users" value="18 / 25" sub="Seats used" icon={Users} tone="primary" />
          <Metric label="Storage Used" value="4.2 GB / 20 GB" sub="Attachments & documents" icon={Receipt} tone="accent" />
          <Metric label="Next Invoice" value={money0.format(24999)} sub="Due 2026-09-01" icon={CreditCard} tone="warning" />
        </section>

        <Panel
          eyebrow="Payment"
          title="Payment Method"
          accent
          action={
            <button type="button" onClick={() => handleDemoAction("Payment method updates aren't wired to a live billing system in this demo.")} className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-slate-50">
              Update
            </button>
          }
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-14 items-center justify-center rounded-md bg-slate-100 text-[var(--muted)]">
              <CreditCard size={18} />
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">Visa ending in 4242</p>
              <p className="text-xs text-[var(--muted)]">Expires 08/2028</p>
            </div>
          </div>
        </Panel>

        <Panel title="Invoice History">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Invoice</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th className="text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100">
                    <td className="py-2.5 font-mono text-xs">{inv.id}</td>
                    <td>{inv.date}</td>
                    <td className="text-right">{money0.format(inv.amount)}</td>
                    <td>
                      <Badge>{inv.status}</Badge>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleDemoAction("Demo invoice — no live billing system to generate a real PDF from yet.")}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                      >
                        <Download size={13} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
