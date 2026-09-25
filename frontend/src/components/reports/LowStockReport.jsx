import React from "react";
import { AlertOctagon, PackageX, Tags, TriangleAlert } from "lucide-react";
import { Badge, Metric, Panel } from "../ui.jsx";
import { InventoryReportFilters } from "./InventoryReportFilters.jsx";
import { useInventoryReport } from "./useInventoryReport.js";
import { money, number, ReportHeader } from "./reportUtils.jsx";

export function LowStockReport() {
  const report = useInventoryReport("low-stock");
  const items = report.rows;
  const summary = report.summary;
  return (
    <div>
      <ReportHeader icon={TriangleAlert} title="Low Stock" subtitle="Live low-stock and depleted items that need replenishment." />
      <InventoryReportFilters report={report} fields={["search", "warehouse", "category", "itemType", "status", "stockRange", "valueRange"]} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric compact label="Low Stock Items" value={number.format(summary.lowStockCount || 0)} sub="At or below reorder level" icon={TriangleAlert} tone="warning" />
        <Metric compact label="Out of Stock" value={number.format(summary.outOfStockCount || 0)} sub="Zero quantity on hand" icon={PackageX} tone="danger" />
        <Metric compact label="Value at Risk" value={money.format(summary.totalValue || 0)} sub="Filtered flagged stock value" icon={AlertOctagon} tone="danger" />
        <Metric compact label="Categories Affected" value={number.format(summary.categoryCount || 0)} sub="Need reorder attention" icon={Tags} tone="accent" />
      </section>

      <section className="mt-5">
        <Panel title="Reorder Watchlist">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr><th className="py-2">Code</th><th>Item</th><th>Category</th><th>Warehouse</th><th className="text-right">Stock</th><th className="text-right">Minimum</th><th className="pr-4 text-right">Value</th><th>Status</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.code} className={`border-b border-slate-100 ${item.status === "Out of Stock" ? "bg-red-50/40" : "bg-amber-50/40"}`}>
                    <td className="py-2.5 font-mono text-xs">{item.code}</td><td className="font-medium text-[var(--ink)]">{item.name}</td><td className="text-[var(--muted)]">{item.category}</td><td className="max-w-[190px] truncate text-[var(--muted)]" title={item.warehouse}>{item.warehouse}</td>
                    <td className="text-right font-semibold text-[var(--danger)]">{number.format(item.stock)} {item.unit}</td><td className="text-right">{number.format(item.minimumStock)} {item.unit}</td><td className="pr-4 text-right">{money.format(item.value)}</td><td><Badge>{item.status}</Badge></td>
                  </tr>
                ))}
                {!report.loading && items.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-sm text-[var(--muted)]">No flagged items match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  );
}
