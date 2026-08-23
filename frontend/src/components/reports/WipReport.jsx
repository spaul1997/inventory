import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Boxes, Clock3, Layers, PackageSearch } from "lucide-react";
import { Badge, Panel } from "../ui.jsx";
import { categoryPalette, ReportHeader } from "./reportUtils.jsx";
import { money0, number } from "../../data/manufacturing/shared.js";
import { useManufacturingWip } from "../manufacturing/manufacturingUtils.js";
import { KpiRow, ReportActionsBar, filterSelectClass } from "./reportShared.jsx";

const AGING_ORDER = ["0-7 days", "8-14 days", "15-30 days", "30+ days"];

export function WipReport() {
  const wip = useManufacturingWip();
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");

  const statuses = [...new Set(wip.map((w) => w.status))];
  const products = [...new Set(wip.map((w) => w.product))].sort();
  const lines = [...new Set(wip.map((w) => w.productionLine))].filter(Boolean).sort();

  const filtered = wip.filter((w) => {
    if (statusFilter && w.status !== statusFilter) return false;
    if (productFilter && w.product !== productFilter) return false;
    if (lineFilter && w.productionLine !== lineFilter) return false;
    return true;
  });

  const totalWipValue = filtered.reduce((s, w) => s + w.wipValue, 0);
  const totalWipQty = filtered.reduce((s, w) => s + w.wipQty, 0);
  const oldestDays = filtered.reduce((max, w) => Math.max(max, w.daysInWip), 0);

  const agingBreakdown = useMemo(() => {
    const map = new Map(AGING_ORDER.map((k) => [k, { bucket: k, value: 0 }]));
    filtered.forEach((w) => {
      const entry = map.get(w.agingBucket) || { bucket: w.agingBucket, value: 0 };
      entry.value += w.wipValue;
      map.set(w.agingBucket, entry);
    });
    return [...map.values()];
  }, [filtered]);

  const byProduct = useMemo(() => {
    const map = new Map();
    filtered.forEach((w) => {
      const entry = map.get(w.product) || { name: w.product, value: 0 };
      entry.value += w.wipValue;
      map.set(w.product, entry);
    });
    return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 6);
  }, [filtered]);

  const columns = [
    { key: "workOrder", label: "Work Order" },
    { key: "product", label: "Product" },
    { key: "productionLine", label: "Line" },
    { key: "status", label: "Status" },
    { key: "wipQty", label: "WIP Qty" },
    { key: "wipValue", label: "WIP Value", render: (r) => r.wipValue.toFixed(2) },
    { key: "daysInWip", label: "Days in WIP" },
    { key: "agingBucket", label: "Aging Bucket" },
  ];

  return (
    <div>
      <ReportHeader icon={Layers} title="WIP Report" subtitle="Work-in-progress quantity, value and aging across active work orders — a live snapshot, not a date-ranged history." />

      <KpiRow
        items={[
          { label: "Total WIP Value", value: money0.format(totalWipValue), icon: PackageSearch, tone: "primary" },
          { label: "Total WIP Qty", value: number.format(totalWipQty), icon: Boxes, tone: "accent" },
          { label: "Active Work Orders", value: number.format(filtered.length), icon: Layers, tone: "success" },
          { label: "Oldest WIP Age", value: `${oldestDays} days`, icon: Clock3, tone: oldestDays > 14 ? "danger" : "warning" },
        ]}
      />

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Panel eyebrow="Aging" title="WIP Value by Aging Bucket" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => money0.format(v)} />
                <Bar dataKey="value" name="WIP Value" radius={[4, 4, 0, 0]}>
                  {agingBreakdown.map((e, i) => (
                    <Cell key={e.bucket} fill={categoryPalette[i % categoryPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="By Product" title="WIP Value by Product" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(v) => money0.format(v)} />
                <Pie data={byProduct} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {byProduct.map((e, i) => (
                    <Cell key={e.name} fill={categoryPalette[i % categoryPalette.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
            {byProduct.map((e, i) => (
              <span key={e.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryPalette[i % categoryPalette.length] }} />
                {e.name}
              </span>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel
          title="WIP Register"
          action={
            <ReportActionsBar
              reportKey="wip-report"
              reportLabel="WIP Report"
              columns={columns}
              rows={filtered}
              filters={{ statusFilter, productFilter, lineFilter }}
              onApplyView={(f) => {
                setStatusFilter(f.statusFilter || "");
                setProductFilter(f.productFilter || "");
                setLineFilter(f.lineFilter || "");
              }}
            />
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Status: All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
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
            <select value={lineFilter} onChange={(e) => setLineFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Line: All</option>
              {lines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Work Order</th>
                  <th>Product</th>
                  <th>Line</th>
                  <th>Status</th>
                  <th className="text-right">WIP Qty</th>
                  <th className="text-right">WIP Value</th>
                  <th className="text-right">Days in WIP</th>
                  <th>Aging Bucket</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.workOrder} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-2.5">
                      <Link to={`/manufacturing/work-order/${w.workOrder}/view`} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                        {w.workOrder}
                      </Link>
                    </td>
                    <td>{w.product}</td>
                    <td className="text-[var(--muted)]">{w.productionLine}</td>
                    <td>
                      <Badge>{w.status}</Badge>
                    </td>
                    <td className="text-right">{number.format(w.wipQty)}</td>
                    <td className="text-right font-medium">{money0.format(w.wipValue)}</td>
                    <td className="text-right">{w.daysInWip}</td>
                    <td className="text-[var(--muted)]">{w.agingBucket}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-[var(--muted)]">
                      No work-in-progress matches your filters.
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
