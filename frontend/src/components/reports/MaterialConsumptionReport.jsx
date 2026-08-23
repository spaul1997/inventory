import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, PackageCheck, PackageMinus, Undo2 } from "lucide-react";
import { Badge, Panel } from "../ui.jsx";
import { categoryPalette, ReportHeader } from "./reportUtils.jsx";
import { money0, number } from "../../data/manufacturing/shared.js";
import { useManufacturingData } from "../manufacturing/ManufacturingDataContext.jsx";
import { DateRangeFilter, inDateRange, useDateRangeFilter, KpiRow, ReportActionsBar, filterSelectClass } from "./reportShared.jsx";

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const STATUS_OPTIONS = ["Draft", "Submitted", "Reviewed", "Posted"];

export function MaterialConsumptionReport() {
  const manufacturingData = useManufacturingData();
  const entries = manufacturingData.getRows("material-consumption");

  const { preset, setPreset, custom, setCustom, range } = useDateRangeFilter("all");
  const [workOrderFilter, setWorkOrderFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const flatRows = useMemo(
    () =>
      entries.flatMap((entry) =>
        (entry.items || []).map((item, idx) => {
          const variance = (Number(item.issuedQty) || 0) - (Number(item.consumedQty) || 0) - (Number(item.returnedQty) || 0);
          return {
            key: `${entry.id}-${idx}`,
            entryId: entry.id,
            date: entry.date,
            workOrder: entry.workOrder,
            productName: entry.productName,
            status: entry.status,
            material: item.name,
            issuedQty: Number(item.issuedQty) || 0,
            consumedQty: Number(item.consumedQty) || 0,
            returnedQty: Number(item.returnedQty) || 0,
            variance,
            unitCost: Number(item.unitCost) || 0,
            value: (Number(item.consumedQty) || 0) * (Number(item.unitCost) || 0),
            varianceReason: item.varianceReason,
          };
        })
      ),
    [entries]
  );

  const workOrders = [...new Set(entries.map((e) => e.workOrder))].sort();
  const materials = [...new Set(flatRows.map((r) => r.material))].sort();

  const filtered = flatRows.filter((r) => {
    if (!inDateRange(r.date, range)) return false;
    if (workOrderFilter && r.workOrder !== workOrderFilter) return false;
    if (materialFilter && r.material !== materialFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const totalIssued = filtered.reduce((s, r) => s + r.issuedQty, 0);
  const totalConsumed = filtered.reduce((s, r) => s + r.consumedQty, 0);
  const totalReturned = filtered.reduce((s, r) => s + r.returnedQty, 0);
  const totalValue = filtered.reduce((s, r) => s + r.value, 0);
  const avgVariancePct = filtered.length ? filtered.reduce((s, r) => s + Math.abs(r.variance) / (r.issuedQty || 1), 0) / filtered.length : 0;

  const trend = useMemo(() => {
    const byDate = new Map();
    filtered.forEach((r) => {
      const entry = byDate.get(r.date) || { date: r.date, value: 0, variance: 0 };
      entry.value += r.value;
      entry.variance += r.variance;
      byDate.set(r.date, entry);
    });
    return [...byDate.values()].sort((a, b) => new Date(a.date) - new Date(b.date)).map((e) => ({ ...e, label: dayLabel.format(new Date(e.date)) }));
  }, [filtered]);

  const topByVariance = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const entry = map.get(r.material) || { name: r.material, variance: 0 };
      entry.variance += Math.abs(r.variance);
      map.set(r.material, entry);
    });
    return [...map.values()].sort((a, b) => b.variance - a.variance).slice(0, 6);
  }, [filtered]);

  const columns = [
    { key: "entryId", label: "Entry No" },
    { key: "workOrder", label: "Work Order" },
    { key: "material", label: "Material" },
    { key: "issuedQty", label: "Issued Qty" },
    { key: "consumedQty", label: "Consumed Qty" },
    { key: "returnedQty", label: "Returned Qty" },
    { key: "variance", label: "Variance" },
    { key: "value", label: "Value", render: (r) => r.value.toFixed(2) },
    { key: "varianceReason", label: "Variance Reason" },
  ];

  return (
    <div>
      <ReportHeader icon={PackageMinus} title="Material Consumption Report" subtitle="Actual-vs-issued material usage, variance and consumption value by work order." />

      <div className="mb-4">
        <DateRangeFilter preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
      </div>

      <KpiRow
        items={[
          { label: "Total Issued Qty", value: number.format(totalIssued), icon: PackageMinus, tone: "primary" },
          { label: "Total Consumed Qty", value: number.format(totalConsumed), icon: PackageCheck, tone: "success" },
          { label: "Total Returned Qty", value: number.format(totalReturned), icon: Undo2, tone: "accent" },
          { label: "Avg. Variance %", value: `${(avgVariancePct * 100).toFixed(1)}%`, sub: `Total value ${money0.format(totalValue)}`, icon: AlertTriangle, tone: "warning" },
        ]}
      />

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel eyebrow="Trend" title="Consumption Value & Variance" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => money0.format(v)} />
                <Bar dataKey="value" name="Consumption Value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Top Variance" title="Materials by Variance Qty" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topByVariance} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="variance" name="Variance Qty" radius={[0, 4, 4, 0]}>
                  {topByVariance.map((e, i) => (
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
          title="Consumption Ledger"
          action={
            <ReportActionsBar
              reportKey="material-consumption-report"
              reportLabel="Material Consumption Report"
              columns={columns}
              rows={filtered}
              filters={{ workOrderFilter, materialFilter, statusFilter }}
              onApplyView={(f) => {
                setWorkOrderFilter(f.workOrderFilter || "");
                setMaterialFilter(f.materialFilter || "");
                setStatusFilter(f.statusFilter || "");
              }}
            />
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select value={workOrderFilter} onChange={(e) => setWorkOrderFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Work Order: All</option>
              {workOrders.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <select value={materialFilter} onChange={(e) => setMaterialFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Material: All</option>
              {materials.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Status: All</option>
              {STATUS_OPTIONS.map((s) => (
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
                  <th className="py-2">Entry No</th>
                  <th>Work Order</th>
                  <th>Material</th>
                  <th className="text-right">Issued</th>
                  <th className="text-right">Consumed</th>
                  <th className="text-right">Returned</th>
                  <th className="text-right">Variance</th>
                  <th className="text-right">Value</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.key} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-2.5">
                      <Link to={`/manufacturing/material-consumption/${r.entryId}/view`} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                        {r.entryId}
                      </Link>
                    </td>
                    <td className="font-mono text-xs">{r.workOrder}</td>
                    <td>{r.material}</td>
                    <td className="text-right">{r.issuedQty}</td>
                    <td className="text-right">{r.consumedQty}</td>
                    <td className="text-right">{r.returnedQty}</td>
                    <td className={`text-right ${r.variance !== 0 ? "text-[var(--danger)]" : ""}`}>{r.variance}</td>
                    <td className="text-right font-medium">{money0.format(r.value)}</td>
                    <td className="text-[var(--muted)]">{r.varianceReason}</td>
                    <td>
                      <Badge>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-[var(--muted)]">
                      No consumption entries match your filters.
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
