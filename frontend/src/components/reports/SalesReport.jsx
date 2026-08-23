import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileText, IndianRupee, ShoppingBag, TrendingUp } from "lucide-react";
import { Badge, Panel } from "../ui.jsx";
import { categoryPalette, ReportHeader } from "./reportUtils.jsx";
import { money0, number } from "../../data/sales/shared.js";
import { computeOrderTotals } from "../../data/sales/shared.js";
import { SALES_ORDER_STATUSES } from "../../data/sales/salesOrders.js";
import { useSalesData } from "../sales/SalesDataContext.jsx";
import { DateRangeFilter, inDateRange, useDateRangeFilter, KpiRow, ReportActionsBar, filterSelectClass } from "./reportShared.jsx";

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const CLOSED_STATUSES = ["Draft", "Rejected", "Completed", "Cancelled"];

export function SalesReport() {
  const salesData = useSalesData();
  const orders = salesData.getRows("sales-order");

  const { preset, setPreset, custom, setCustom, range } = useDateRangeFilter("all");
  const [customerFilter, setCustomerFilter] = useState("");
  const [salespersonFilter, setSalespersonFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const derived = useMemo(() => orders.map((o) => ({ ...o, grandTotal: computeOrderTotals(o.items, o).grandTotal })), [orders]);

  const customers = [...new Set(derived.map((o) => o.customerName))].sort();
  const salespeople = [...new Set(derived.map((o) => o.salesperson))].filter(Boolean).sort();

  const filtered = derived.filter((o) => {
    if (!inDateRange(o.date, range)) return false;
    if (customerFilter && o.customerName !== customerFilter) return false;
    if (salespersonFilter && o.salesperson !== salespersonFilter) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    if (priorityFilter && o.priority !== priorityFilter) return false;
    return true;
  });

  const totalOrders = filtered.length;
  const totalValue = filtered.reduce((s, o) => s + o.grandTotal, 0);
  const avgValue = totalOrders ? totalValue / totalOrders : 0;
  const openCount = filtered.filter((o) => !CLOSED_STATUSES.includes(o.status)).length;

  const trend = useMemo(() => {
    const byDate = new Map();
    filtered.forEach((o) => {
      const entry = byDate.get(o.date) || { date: o.date, value: 0 };
      entry.value += o.grandTotal;
      byDate.set(o.date, entry);
    });
    return [...byDate.values()].sort((a, b) => new Date(a.date) - new Date(b.date)).map((e) => ({ ...e, label: dayLabel.format(new Date(e.date)) }));
  }, [filtered]);

  const byCustomer = useMemo(() => {
    const map = new Map();
    filtered.forEach((o) => {
      const entry = map.get(o.customerName) || { name: o.customerName, value: 0 };
      entry.value += o.grandTotal;
      map.set(o.customerName, entry);
    });
    return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 6);
  }, [filtered]);

  const columns = [
    { key: "id", label: "Order No" },
    { key: "date", label: "Order Date" },
    { key: "customerName", label: "Customer" },
    { key: "salesperson", label: "Salesperson" },
    { key: "items", label: "Items", render: (r) => r.items.length },
    { key: "grandTotal", label: "Order Total", render: (r) => r.grandTotal.toFixed(2) },
    { key: "status", label: "Status" },
  ];

  return (
    <div>
      <ReportHeader icon={ShoppingBag} title="Sales Report" subtitle="Order volume, value and pipeline status across every customer." />

      <div className="mb-4">
        <DateRangeFilter preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
      </div>

      <KpiRow
        items={[
          { label: "Total Orders", value: number.format(totalOrders), icon: FileText, tone: "primary" },
          { label: "Total Order Value", value: money0.format(totalValue), icon: IndianRupee, tone: "success" },
          { label: "Avg. Order Value", value: money0.format(avgValue), icon: TrendingUp, tone: "accent" },
          { label: "Open Orders", value: number.format(openCount), sub: "Not draft, rejected, completed or cancelled", icon: ShoppingBag, tone: "warning" },
        ]}
      />

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel eyebrow="Trend" title="Order Value Over Time" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="salesValueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => money0.format(v)} />
                <Area type="monotone" dataKey="value" name="Order Value" stroke="var(--primary)" strokeWidth={2} fill="url(#salesValueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Top Customers" title="Order Value by Customer" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCustomer} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => money0.format(v)} />
                <Bar dataKey="value" name="Order Value" radius={[4, 4, 0, 0]}>
                  {byCustomer.map((e, i) => (
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
          title="Sales Order Register"
          action={
            <ReportActionsBar
              reportKey="sales-report"
              reportLabel="Sales Report"
              columns={columns}
              rows={filtered}
              filters={{ customerFilter, salespersonFilter, statusFilter, priorityFilter }}
              onApplyView={(f) => {
                setCustomerFilter(f.customerFilter || "");
                setSalespersonFilter(f.salespersonFilter || "");
                setStatusFilter(f.statusFilter || "");
                setPriorityFilter(f.priorityFilter || "");
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
            <select value={salespersonFilter} onChange={(e) => setSalespersonFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Salesperson: All</option>
              {salespeople.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Status: All</option>
              {SALES_ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Priority: All</option>
              {["Low", "Normal", "High", "Urgent"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Order No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Salesperson</th>
                  <th className="text-right">Items</th>
                  <th className="text-right">Order Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-2.5">
                      <Link to={`/sales/sales-order/${o.id}/view`} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                        {o.id}
                      </Link>
                    </td>
                    <td>{o.date}</td>
                    <td>{o.customerName}</td>
                    <td className="text-[var(--muted)]">{o.salesperson}</td>
                    <td className="text-right">{o.items.length}</td>
                    <td className="text-right font-medium">{money0.format(o.grandTotal)}</td>
                    <td>
                      <Badge>{o.status}</Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-[var(--muted)]">
                      No orders match your filters.
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
