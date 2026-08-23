import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Clock3, Truck, TriangleAlert } from "lucide-react";
import { Badge, Panel } from "../ui.jsx";
import { categoryPalette, ReportHeader } from "./reportUtils.jsx";
import { number } from "../../data/sales/shared.js";
import { DISPATCH_STATUSES } from "../../data/sales/dispatches.js";
import { useSalesData } from "../sales/SalesDataContext.jsx";
import { DateRangeFilter, inDateRange, useDateRangeFilter, KpiRow, ReportActionsBar, filterSelectClass } from "./reportShared.jsx";

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const DELIVERED_STATUSES = ["Delivered", "Partially Delivered"];
const FAILED_STATUSES = ["Delivery Failed", "Returned to Sender"];

export function DispatchReport() {
  const salesData = useSalesData();
  const dispatches = salesData.getRows("delivery-dispatch");

  const { preset, setPreset, custom, setCustom, range } = useDateRangeFilter("all");
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [transporterFilter, setTransporterFilter] = useState("");

  const derived = useMemo(
    () =>
      dispatches.map((d) => ({
        ...d,
        dispatchQty: (d.items || []).reduce((s, i) => s + (Number(i.dispatchQty) || 0), 0),
        onTime: d.actualDeliveryDate && d.expectedDeliveryDate ? d.actualDeliveryDate <= d.expectedDeliveryDate : null,
      })),
    [dispatches]
  );

  const customers = [...new Set(derived.map((d) => d.customerName))].sort();
  const transporters = [...new Set(derived.map((d) => d.transporterName))].filter(Boolean).sort();

  const filtered = derived.filter((d) => {
    if (!inDateRange(d.date, range)) return false;
    if (customerFilter && d.customerName !== customerFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (transporterFilter && d.transporterName !== transporterFilter) return false;
    return true;
  });

  const totalDispatches = filtered.length;
  const totalQty = filtered.reduce((s, d) => s + d.dispatchQty, 0);
  const deliveredCount = filtered.filter((d) => DELIVERED_STATUSES.includes(d.status)).length;
  const failedCount = filtered.filter((d) => FAILED_STATUSES.includes(d.status)).length;
  const onTimeEligible = filtered.filter((d) => d.onTime !== null);
  const onTimePct = onTimeEligible.length ? (onTimeEligible.filter((d) => d.onTime).length / onTimeEligible.length) * 100 : 100;

  const trend = useMemo(() => {
    const byDate = new Map();
    filtered.forEach((d) => {
      const entry = byDate.get(d.date) || { date: d.date, qty: 0 };
      entry.qty += d.dispatchQty;
      byDate.set(d.date, entry);
    });
    return [...byDate.values()].sort((a, b) => new Date(a.date) - new Date(b.date)).map((e) => ({ ...e, label: dayLabel.format(new Date(e.date)) }));
  }, [filtered]);

  const statusBreakdown = useMemo(() => {
    const map = new Map();
    filtered.forEach((d) => {
      const entry = map.get(d.status) || { name: d.status, value: 0 };
      entry.value += 1;
      map.set(d.status, entry);
    });
    return [...map.values()];
  }, [filtered]);

  const columns = [
    { key: "id", label: "Dispatch No" },
    { key: "date", label: "Date" },
    { key: "customerName", label: "Customer" },
    { key: "salesOrderId", label: "Sales Order" },
    { key: "vehicleNumber", label: "Vehicle No" },
    { key: "dispatchQty", label: "Qty" },
    { key: "expectedDeliveryDate", label: "Expected Delivery" },
    { key: "actualDeliveryDate", label: "Actual Delivery" },
    { key: "status", label: "Status" },
  ];

  return (
    <div>
      <ReportHeader icon={Truck} title="Dispatch Report" subtitle="Dispatch volume, transport and on-time delivery performance." />

      <div className="mb-4">
        <DateRangeFilter preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
      </div>

      <KpiRow
        items={[
          { label: "Total Dispatches", value: number.format(totalDispatches), icon: Truck, tone: "primary" },
          { label: "Total Dispatched Qty", value: number.format(totalQty), icon: Truck, tone: "accent" },
          { label: "On-Time Delivery", value: `${onTimePct.toFixed(1)}%`, icon: CheckCircle2, tone: onTimePct >= 90 ? "success" : "warning" },
          { label: "Delivered / Failed", value: `${number.format(deliveredCount)} / ${number.format(failedCount)}`, icon: failedCount > 0 ? TriangleAlert : Clock3, tone: failedCount > 0 ? "danger" : "success" },
        ]}
      />

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel eyebrow="Trend" title="Dispatch Volume Over Time" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="dispatchQtyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="qty" name="Dispatch Qty" stroke="var(--primary)" strokeWidth={2} fill="url(#dispatchQtyFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Status" title="Dispatch Status Split" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {statusBreakdown.map((e, i) => (
                    <Cell key={e.name} fill={categoryPalette[i % categoryPalette.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel
          title="Dispatch Register"
          action={
            <ReportActionsBar
              reportKey="dispatch-report"
              reportLabel="Dispatch Report"
              columns={columns}
              rows={filtered}
              filters={{ customerFilter, statusFilter, transporterFilter }}
              onApplyView={(f) => {
                setCustomerFilter(f.customerFilter || "");
                setStatusFilter(f.statusFilter || "");
                setTransporterFilter(f.transporterFilter || "");
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
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Status: All</option>
              {DISPATCH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select value={transporterFilter} onChange={(e) => setTransporterFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Transporter: All</option>
              {transporters.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Dispatch No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Sales Order</th>
                  <th>Vehicle No</th>
                  <th className="text-right">Qty</th>
                  <th>Expected Delivery</th>
                  <th>Actual Delivery</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-2.5">
                      <Link to={`/sales/delivery-dispatch/${d.id}/view`} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                        {d.id}
                      </Link>
                    </td>
                    <td>{d.date}</td>
                    <td>{d.customerName}</td>
                    <td>
                      <Link to={`/sales/sales-order/${d.salesOrderId}/view`} className="font-mono text-xs text-[var(--primary)] hover:underline">
                        {d.salesOrderId}
                      </Link>
                    </td>
                    <td className="text-[var(--muted)]">{d.vehicleNumber}</td>
                    <td className="text-right">{d.dispatchQty}</td>
                    <td>{d.expectedDeliveryDate}</td>
                    <td className={d.onTime === false ? "text-[var(--danger)]" : ""}>{d.actualDeliveryDate || "—"}</td>
                    <td>
                      <Badge>{d.status}</Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-[var(--muted)]">
                      No dispatches match your filters.
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
