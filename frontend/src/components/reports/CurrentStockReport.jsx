import React from "react";
import { Link } from "react-router-dom";
import { Boxes, Layers, PackageCheck, TriangleAlert } from "lucide-react";
import { Badge, Metric, Panel } from "../ui.jsx";
import { InventoryReportFilters } from "./InventoryReportFilters.jsx";
import { useInventoryReport } from "./useInventoryReport.js";
import { money, number, ReportHeader } from "./reportUtils.jsx";

export function CurrentStockReport() {
  const report = useInventoryReport("current-stock");
  const items = report.rows;
  const summary = report.summary;

  return (
    <div>
      <ReportHeader icon={Boxes} title="Current Stock" subtitle="Live stock on hand from product masters and warehouse balances." />
      <InventoryReportFilters report={report} fields={["search", "warehouse", "category", "itemType", "status", "stockRange", "valueRange"]} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric compact label="Total SKUs" value={number.format(summary.totalItems || 0)} sub={`${number.format(summary.categoryCount || 0)} categories`} icon={Layers} tone="primary" />
        <Metric compact label="Total Stock Value" value={money.format(summary.totalValue || 0)} sub="Filtered inventory value" icon={PackageCheck} tone="success" />
        <Metric compact label="Active Items" value={number.format(summary.activeCount || 0)} sub="Available catalog items" icon={Boxes} tone="accent" />
        <Metric compact label="Low / Out of Stock" value={number.format((summary.lowStockCount || 0) + (summary.outOfStockCount || 0))} sub="Need replenishment attention" icon={TriangleAlert} tone="warning" />
      </section>

      <section className="mt-5">
        <Panel title="Stock Register">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr><th className="py-2">Code</th><th>Item</th><th>Type</th><th>Category</th><th>Warehouse</th><th className="text-right">Stock</th><th className="text-right">Unit Price</th><th className="pr-4 text-right">Value</th><th>Status</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.code} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-2.5 font-mono text-xs">{item.code}</td>
                    <td>{item.type === "Raw Material" ? <Link to={`/stock-management/item/${item.code}`} className="font-medium text-[var(--primary)] hover:underline">{item.name}</Link> : <span className="font-medium text-[var(--ink)]">{item.name}</span>}</td>
                    <td className="text-[var(--muted)]">{item.type}</td>
                    <td className="text-[var(--muted)]">{item.category}</td>
                    <td className="max-w-[180px] truncate text-[var(--muted)]" title={item.warehouse}>{item.warehouse}</td>
                    <td className="text-right">{number.format(item.stock)} {item.unit}</td>
                    <td className="text-right">{money.format(item.price)}</td>
                    <td className="pr-4 text-right font-medium">{money.format(item.value)}</td>
                    <td><Badge>{item.status}</Badge></td>
                  </tr>
                ))}
                {!report.loading && items.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-sm text-[var(--muted)]">No items match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  );
}
