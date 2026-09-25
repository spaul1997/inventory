import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock, PackageCheck, ShoppingCart, Wallet } from "lucide-react";
import { Badge, Metric, Panel } from "../ui.jsx";
import { InventoryReportFilters } from "./InventoryReportFilters.jsx";
import { useInventoryReport } from "./useInventoryReport.js";
import { categoryPalette, money, number, ReportHeader } from "./reportUtils.jsx";

export function PurchaseReport() {
  const report = useInventoryReport("purchase-report");
  const orders = report.rows;
  const summary = report.summary;

  const bySupplier = useMemo(() => {
    const grouped = new Map();
    orders.forEach((order) => {
      const entry = grouped.get(order.supplier) || { supplier: order.supplier, value: 0, orders: 0 };
      entry.value += order.amount;
      entry.orders += 1;
      grouped.set(order.supplier, entry);
    });
    return [...grouped.values()].sort((left, right) => right.value - left.value).slice(0, 8);
  }, [orders]);

  const byStatus = useMemo(() => {
    const grouped = new Map();
    orders.forEach((order) => grouped.set(order.status, (grouped.get(order.status) || 0) + 1));
    return [...grouped.entries()].map(([status, count]) => ({ status, count }));
  }, [orders]);

  return (
    <div>
      <ReportHeader icon={ShoppingCart} title="Purchase Report" subtitle="Live purchase orders and procurement value from the purchase database." />
      <InventoryReportFilters compactRows report={report} fields={["search", "date", "supplier", "warehouse", "status", "qtyRange", "valueRange"]} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric compact label="Total Purchase Orders" value={number.format(summary.totalOrders || 0)} sub={`Across ${number.format(summary.supplierCount || 0)} suppliers`} icon={ShoppingCart} tone="primary" />
        <Metric compact label="Total PO Value" value={money.format(summary.totalValue || 0)} sub="Filtered order value" icon={Wallet} tone="success" />
        <Metric compact label="Pending Approval" value={number.format(summary.pendingApproval || 0)} sub="Awaiting sign-off" icon={Clock} tone="warning" />
        <Metric compact label="Fully Received" value={number.format(summary.received || 0)} sub="Closed out orders" icon={PackageCheck} tone="accent" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel eyebrow="Top Suppliers" title="PO Value by Supplier" accent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySupplier} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="supplier" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} /><YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><Tooltip formatter={(value) => money.format(value)} />
                <Bar dataKey="value" name="PO Value" radius={[4, 4, 0, 0]}>{bySupplier.map((entry, index) => <Cell key={entry.supplier} fill={categoryPalette[index % categoryPalette.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel eyebrow="Status" title="Order Status Mix" accent>
          <div className="flex flex-col items-center">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Tooltip /><Pie data={byStatus} dataKey="count" nameKey="status" innerRadius={50} outerRadius={78} paddingAngle={2}>{byStatus.map((entry, index) => <Cell key={entry.status} fill={categoryPalette[index % categoryPalette.length]} />)}</Pie></PieChart></ResponsiveContainer>
            </div>
            <div className="mt-1 grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm">{byStatus.map((entry, index) => <span key={entry.status} className="flex items-center gap-1.5 truncate text-[var(--ink)]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }} /><span className="truncate">{entry.status}</span></span>)}</div>
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel title="Purchase Orders">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]"><tr><th className="py-2">PO Number</th><th>Supplier</th><th>Date</th><th>Warehouse</th><th className="text-right">Items</th><th className="text-right">Quantity</th><th className="pr-4 text-right">Value</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map((order) => <tr key={order.id} className="border-b border-slate-100"><td className="py-2.5 font-mono text-xs">{order.id}</td><td className="font-medium text-[var(--ink)]">{order.supplier}</td><td>{order.date}</td><td>{order.warehouse}</td><td className="text-right">{number.format(order.itemsCount)}</td><td className="text-right">{number.format(order.totalQty)}</td><td className="pr-4 text-right font-medium">{money.format(order.amount)}</td><td><Badge>{order.status}</Badge></td></tr>)}
                {!report.loading && orders.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-sm text-[var(--muted)]">No purchase orders match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  );
}
