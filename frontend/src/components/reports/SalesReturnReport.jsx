import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IndianRupee, PackageX, RotateCcw, Undo2 } from "lucide-react";
import { Badge, Panel } from "../ui.jsx";
import { categoryPalette, ReportHeader } from "./reportUtils.jsx";
import { money0, number, returnReasons, dispositions } from "../../data/sales/shared.js";
import { RETURN_STATUSES } from "../../data/sales/returns.js";
import { useSalesData } from "../sales/SalesDataContext.jsx";
import { DateRangeFilter, inDateRange, useDateRangeFilter, KpiRow, ReportActionsBar, filterSelectClass } from "./reportShared.jsx";

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

export function SalesReturnReport() {
  const salesData = useSalesData();
  const returns = salesData.getRows("sales-return");

  const { preset, setPreset, custom, setCustom, range } = useDateRangeFilter("all");
  const [customerFilter, setCustomerFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const derived = useMemo(
    () => returns.map((r) => ({ ...r, returnQty: (r.items || []).reduce((s, i) => s + (Number(i.returnQty) || 0), 0) })),
    [returns]
  );

  const customers = [...new Set(derived.map((r) => r.customerName))].sort();

  const filtered = derived.filter((r) => {
    if (!inDateRange(r.date, range)) return false;
    if (customerFilter && r.customerName !== customerFilter) return false;
    if (reasonFilter && r.returnReason !== reasonFilter) return false;
    if (dispositionFilter && r.disposition !== dispositionFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const totalReturns = filtered.length;
  const totalQty = filtered.reduce((s, r) => s + r.returnQty, 0);
  const totalCreditValue = filtered.reduce((s, r) => s + (Number(r.creditNoteAmount) || 0), 0);

  const reasonCounts = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const entry = map.get(r.returnReason) || { name: r.returnReason, count: 0 };
      entry.count += 1;
      map.set(r.returnReason, entry);
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [filtered]);
  const topReason = reasonCounts[0]?.name || "—";

  const trend = useMemo(() => {
    const byDate = new Map();
    filtered.forEach((r) => {
      const entry = byDate.get(r.date) || { date: r.date, qty: 0 };
      entry.qty += r.returnQty;
      byDate.set(r.date, entry);
    });
    return [...byDate.values()].sort((a, b) => new Date(a.date) - new Date(b.date)).map((e) => ({ ...e, label: dayLabel.format(new Date(e.date)) }));
  }, [filtered]);

  const columns = [
    { key: "id", label: "Return No" },
    { key: "date", label: "Date" },
    { key: "customerName", label: "Customer" },
    { key: "invoiceId", label: "Invoice" },
    { key: "returnQty", label: "Return Qty" },
    { key: "returnReason", label: "Reason" },
    { key: "disposition", label: "Disposition" },
    { key: "status", label: "Status" },
    { key: "creditNoteAmount", label: "Credit Note Amount", render: (r) => (Number(r.creditNoteAmount) || 0).toFixed(2) },
  ];

  return (
    <div>
      <ReportHeader icon={Undo2} title="Sales Return Report" subtitle="Return volume, reasons, disposition and credit-note value by customer." />

      <div className="mb-4">
        <DateRangeFilter preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
      </div>

      <KpiRow
        items={[
          { label: "Total Returns", value: number.format(totalReturns), icon: Undo2, tone: "primary" },
          { label: "Total Return Qty", value: number.format(totalQty), icon: PackageX, tone: "accent" },
          { label: "Total Credit Value", value: money0.format(totalCreditValue), icon: IndianRupee, tone: "warning" },
          { label: "Top Return Reason", value: topReason, icon: RotateCcw, tone: "danger" },
        ]}
      />

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel eyebrow="Trend" title="Returns Over Time" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="qty" name="Return Qty" fill="var(--danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="By Reason" title="Returns by Reason" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonCounts} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" name="Returns" radius={[0, 4, 4, 0]}>
                  {reasonCounts.map((e, i) => (
                    <Cell key={e.name} fill={categoryPalette[i % categoryPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel
          title="Sales Return Register"
          action={
            <ReportActionsBar
              reportKey="sales-return-report"
              reportLabel="Sales Return Report"
              columns={columns}
              rows={filtered}
              filters={{ customerFilter, reasonFilter, dispositionFilter, statusFilter }}
              onApplyView={(f) => {
                setCustomerFilter(f.customerFilter || "");
                setReasonFilter(f.reasonFilter || "");
                setDispositionFilter(f.dispositionFilter || "");
                setStatusFilter(f.statusFilter || "");
              }}
            />
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Customer: All</option>
              {customers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Reason: All</option>
              {returnReasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select value={dispositionFilter} onChange={(e) => setDispositionFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Disposition: All</option>
              {dispositions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Status: All</option>
              {RETURN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Return No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Invoice</th>
                  <th className="text-right">Return Qty</th>
                  <th>Reason</th>
                  <th>Disposition</th>
                  <th>Status</th>
                  <th className="text-right">Credit Note</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-2.5">
                      <Link to={`/sales/sales-return/${r.id}/view`} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                        {r.id}
                      </Link>
                    </td>
                    <td>{r.date}</td>
                    <td>{r.customerName}</td>
                    <td>
                      <Link to={`/sales/sales-invoice/${r.invoiceId}/view`} className="font-mono text-xs text-[var(--primary)] hover:underline">
                        {r.invoiceId}
                      </Link>
                    </td>
                    <td className="text-right">{r.returnQty}</td>
                    <td className="text-[var(--muted)]">{r.returnReason}</td>
                    <td>{r.disposition}</td>
                    <td>
                      <Badge>{r.status}</Badge>
                    </td>
                    <td className="text-right font-medium">{money0.format(Number(r.creditNoteAmount) || 0)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-[var(--muted)]">
                      No returns match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  );
}
