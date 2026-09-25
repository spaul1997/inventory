import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Layers, Scale, Tags, Wallet } from "lucide-react";
import { Badge, Metric, Panel } from "../ui.jsx";
import { InventoryReportFilters } from "./InventoryReportFilters.jsx";
import { useInventoryReport } from "./useInventoryReport.js";
import { categoryPalette, groupByCategory, money, number, ReportHeader } from "./reportUtils.jsx";

export function StockValuationReport() {
  const report = useInventoryReport("stock-valuation");
  const items = report.rows;
  const summary = report.summary;
  const categoryBreakdown = useMemo(() => groupByCategory(items), [items]);
  const topCategory = categoryBreakdown[0];
  const topItems = useMemo(() => items.slice(0, 8).map((item) => ({ name: item.name, value: item.value })), [items]);

  return (
    <div>
      <ReportHeader icon={Scale} title="Stock Valuation" subtitle="Live inventory value at current unit cost, by item, warehouse, and category." />
      <InventoryReportFilters report={report} fields={["search", "warehouse", "category", "itemType", "status", "stockRange", "valueRange"]} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric compact label="Total Stock Value" value={money.format(summary.totalValue || 0)} sub={`${number.format(summary.totalItems || 0)} SKUs with stock`} icon={Wallet} tone="primary" />
        <Metric compact label="Top Category" value={topCategory?.category || "—"} sub={topCategory ? money.format(topCategory.value) : "No valued stock"} icon={Tags} tone="accent" />
        <Metric compact label="Avg. Value per SKU" value={money.format(summary.averageValue || 0)} sub="Across filtered items" icon={Layers} tone="success" />
        <Metric compact label="Categories" value={number.format(summary.categoryCount || 0)} sub="Contributing to valuation" icon={Scale} tone="warning" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <Panel eyebrow="By Category" title="Valuation Split" accent>
          <div className="flex flex-col items-center">
            <div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Tooltip formatter={(value) => money.format(value)} /><Pie data={categoryBreakdown} dataKey="value" nameKey="category" innerRadius={55} outerRadius={80} paddingAngle={2}>{categoryBreakdown.map((entry, index) => <Cell key={entry.category} fill={categoryPalette[index % categoryPalette.length]} />)}</Pie></PieChart></ResponsiveContainer></div>
            <div className="mt-2 grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm">{categoryBreakdown.map((entry, index) => <span key={entry.category} className="flex items-center gap-1.5 truncate text-[var(--ink)]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }} /><span className="truncate">{entry.category}</span></span>)}</div>
          </div>
        </Panel>

        <Panel eyebrow="Highest Value" title="Top 8 Items by Value" accent>
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={topItems} layout="vertical" margin={{ left: 24, right: 16 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} /><Tooltip formatter={(value) => money.format(value)} /><Bar dataKey="value" name="Value" radius={[0, 4, 4, 0]} fill="var(--primary)" /></BarChart></ResponsiveContainer></div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel title="Valuation Register">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]"><tr><th className="py-2">Code</th><th>Item</th><th>Category</th><th>Warehouse</th><th className="text-right">Qty</th><th className="text-right">Unit Price</th><th className="pr-4 text-right">Total Value</th><th>Status</th></tr></thead>
              <tbody>
                {items.map((item) => <tr key={item.code} className="border-b border-slate-100"><td className="py-2.5 font-mono text-xs">{item.code}</td><td className="font-medium text-[var(--ink)]">{item.name}</td><td className="text-[var(--muted)]">{item.category}</td><td className="max-w-[190px] truncate text-[var(--muted)]" title={item.warehouse}>{item.warehouse}</td><td className="text-right">{number.format(item.stock)} {item.unit}</td><td className="text-right">{money.format(item.price)}</td><td className="pr-4 text-right font-semibold">{money.format(item.value)}</td><td><Badge>{item.status}</Badge></td></tr>)}
                {!report.loading && items.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-sm text-[var(--muted)]">No valued items match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  );
}
