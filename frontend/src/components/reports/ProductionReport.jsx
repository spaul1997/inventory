import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, ClipboardList, Factory, TrendingUp } from "lucide-react";
import { Badge, Panel } from "../ui.jsx";
import { categoryPalette, ReportHeader } from "./reportUtils.jsx";
import { money0, number } from "../../data/manufacturing/shared.js";
import { WORK_ORDER_STATUSES } from "../../data/manufacturing/workOrders.js";
import { useManufacturingData } from "../manufacturing/ManufacturingDataContext.jsx";
import { computeActualCost } from "../manufacturing/manufacturingUtils.js";
import { DateRangeFilter, inDateRange, useDateRangeFilter, KpiRow, ReportActionsBar, filterSelectClass } from "./reportShared.jsx";

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const OPEN_STATUSES = ["Released", "In Progress", "On Hold", "Partially Completed"];

export function ProductionReport() {
  const manufacturingData = useManufacturingData();
  const workOrders = manufacturingData.getRows("work-order");
  const processRows = manufacturingData.getRows("production-process");
  const fgRows = manufacturingData.getRows("finished-goods");

  const { preset, setPreset, custom, setCustom, range } = useDateRangeFilter("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  const derived = useMemo(
    () =>
      workOrders.map((wo) => {
        const processForWo = processRows.filter((p) => p.workOrder === wo.id);
        const fgForWo = fgRows.filter((fg) => fg.workOrder === wo.id);
        const actualQty = fgForWo.reduce((s, fg) => s + fg.items.reduce((x, i) => x + (Number(i.qtyReceived) || 0), 0), 0);
        const rejectedQty = fgForWo.reduce((s, fg) => s + fg.items.reduce((x, i) => x + (Number(i.qtyRejectedQC) || 0), 0), 0);
        const runningMins = processForWo.reduce((s, p) => s + (Number(p.runningTimeMins) || 0) + (Number(p.setupTimeMins) || 0), 0);
        const cost = computeActualCost(wo, manufacturingData);
        return { ...wo, actualQty, rejectedQty, cycleHrs: runningMins / 60, costVariance: cost.variance };
      }),
    [workOrders, processRows, fgRows, manufacturingData]
  );

  const lines = [...new Set(derived.map((r) => r.productionLine))].filter(Boolean).sort();
  const products = [...new Set(derived.map((r) => r.productName))].sort();

  const filtered = derived.filter((r) => {
    if (!inDateRange(r.date, range)) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (lineFilter && r.productionLine !== lineFilter) return false;
    if (productFilter && r.productName !== productFilter) return false;
    return true;
  });

  const totalPlanned = filtered.reduce((s, r) => s + (Number(r.plannedQty) || 0), 0);
  const totalActual = filtered.reduce((s, r) => s + r.actualQty, 0);
  const completedCount = filtered.filter((r) => ["Completed", "Closed"].includes(r.status)).length;
  const openCount = filtered.filter((r) => OPEN_STATUSES.includes(r.status)).length;
  const avgCycle = filtered.length ? filtered.reduce((s, r) => s + r.cycleHrs, 0) / filtered.length : 0;
  const totalVariance = filtered.reduce((s, r) => s + r.costVariance, 0);

  const trend = useMemo(() => {
    return [...filtered]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((r) => ({ label: dayLabel.format(new Date(r.date)), planned: Number(r.plannedQty) || 0, actual: r.actualQty }));
  }, [filtered]);

  const statusBreakdown = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const entry = map.get(r.status) || { name: r.status, value: 0 };
      entry.value += 1;
      map.set(r.status, entry);
    });
    return [...map.values()];
  }, [filtered]);

  const columns = [
    { key: "id", label: "Work Order No" },
    { key: "productName", label: "Product" },
    { key: "plannedQty", label: "Planned Qty" },
    { key: "actualQty", label: "Actual Qty" },
    { key: "status", label: "Status" },
    { key: "plannedEnd", label: "Planned End", render: (r) => (r.plannedEnd || "").slice(0, 10) },
    { key: "cycleHrs", label: "Cycle Time (hrs)", render: (r) => r.cycleHrs.toFixed(1) },
    { key: "costVariance", label: "Cost Variance", render: (r) => r.costVariance.toFixed(2) },
  ];

  return (
    <div>
      <ReportHeader icon={Factory} title="Production Report" subtitle="Planned vs actual output, cycle time and cost variance across work orders." />

      <div className="mb-4">
        <DateRangeFilter preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
      </div>

      <KpiRow
        items={[
          { label: "Total Work Orders", value: number.format(filtered.length), icon: ClipboardList, tone: "primary" },
          { label: "Completed / Closed", value: number.format(completedCount), icon: CheckCircle2, tone: "success" },
          { label: "In Progress / On Hold", value: number.format(openCount), icon: Factory, tone: "accent" },
          { label: "Planned vs Actual Qty", value: `${number.format(totalActual)} / ${number.format(totalPlanned)}`, sub: "Actual / Planned", icon: TrendingUp, tone: "warning" },
        ]}
      />
      <div className="mt-4">
        <KpiRow
          items={[
            { label: "Avg. Cycle Time", value: `${avgCycle.toFixed(1)} hrs`, icon: Factory, tone: "accent" },
            { label: "Total Cost Variance", value: money0.format(totalVariance), sub: totalVariance > 0 ? "Over standard cost" : "At or under standard cost", icon: TrendingUp, tone: totalVariance > 0 ? "danger" : "success" },
          ]}
        />
      </div>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel eyebrow="Trend" title="Planned vs Actual Output" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="planned" name="Planned Qty" fill="var(--navy)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual Qty" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-5 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--navy)]" /> Planned Qty
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" /> Actual Qty
            </span>
          </div>
        </Panel>
        <Panel eyebrow="Status" title="Work Order Status Split" accent>
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
          title="Work Order Register"
          action={
            <ReportActionsBar
              reportKey="production-report"
              reportLabel="Production Report"
              columns={columns}
              rows={filtered}
              filters={{ statusFilter, lineFilter, productFilter }}
              onApplyView={(f) => {
                setStatusFilter(f.statusFilter || "");
                setLineFilter(f.lineFilter || "");
                setProductFilter(f.productFilter || "");
              }}
            />
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Status: All</option>
              {WORK_ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select value={lineFilter} onChange={(e) => setLineFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Line: All</option>
              {lines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Product: All</option>
              {products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Work Order No</th>
                  <th>Product</th>
                  <th className="text-right">Planned Qty</th>
                  <th className="text-right">Actual Qty</th>
                  <th>Status</th>
                  <th>Planned End</th>
                  <th className="text-right">Cycle Time</th>
                  <th className="text-right">Cost Variance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-2.5">
                      <Link to={`/manufacturing/work-order/${r.id}/view`} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                        {r.id}
                      </Link>
                    </td>
                    <td>{r.productName}</td>
                    <td className="text-right">
                      {r.plannedQty} {r.uom}
                    </td>
                    <td className="text-right">
                      {r.actualQty} {r.uom}
                    </td>
                    <td>
                      <Badge>{r.status}</Badge>
                    </td>
                    <td>{(r.plannedEnd || "").slice(0, 10)}</td>
                    <td className="text-right">{r.cycleHrs.toFixed(1)} hrs</td>
                    <td className={`text-right font-medium ${r.costVariance > 0 ? "text-[var(--danger)]" : "text-emerald-700"}`}>{money0.format(r.costVariance)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-[var(--muted)]">
                      No work orders match your filters.
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
