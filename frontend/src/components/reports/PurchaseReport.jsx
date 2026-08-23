import React, { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock, PackageCheck, ShoppingCart, Wallet } from "lucide-react";
import { poTotals } from "../../data/purchaseManagement.js";
import { Badge, Metric, Panel } from "../ui.jsx";
import { usePurchaseData } from "../purchase/PurchaseDataContext.jsx";
import { categoryPalette, money, number, ReportHeader } from "./reportUtils.jsx";

export function PurchaseReport() {
  const purchaseData = usePurchaseData();
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const orders = useMemo(
    () => purchaseData.getRows("purchase-order").map((po) => ({ ...po, amount: poTotals(po.items).grandTotal })),
    [purchaseData]
  );

  const totalValue = orders.reduce((sum, po) => sum + po.amount, 0);
  const pendingApproval = orders.filter((po) => po.status === "Pending Approval").length;
  const received = orders.filter((po) => po.status === "Received").length;

  const suppliers = [...new Set(orders.map((po) => po.supplier))];
  const statuses = [...new Set(orders.map((po) => po.status))];

  const bySupplier = useMemo(() => {
    const map = new Map();
    orders.forEach((po) => {
      const entry = map.get(po.supplier) || { supplier: po.supplier, value: 0, orders: 0 };
      entry.value += po.amount;
      entry.orders += 1;
      map.set(po.supplier, entry);
    });
    return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 8);
  }, [orders]);

  const byStatus = useMemo(() => {
    const map = new Map();
    orders.forEach((po) => {
      map.set(po.status, (map.get(po.status) || 0) + 1);
    });
    return [...map.entries()].map(([status, count]) => ({ status, count }));
  }, [orders]);

  const filtered = orders
    .filter((po) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!po.id.toLowerCase().includes(q) && !po.supplier.toLowerCase().includes(q)) return false;
      }
      if (supplierFilter && po.supplier !== supplierFilter) return false;
      if (statusFilter && po.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <ReportHeader icon={ShoppingCart} title="Purchase Report" subtitle="Procurement value and order status across all suppliers." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Purchase Orders" value={number.format(orders.length)} sub={`Across ${suppliers.length} suppliers`} icon={ShoppingCart} tone="primary" />
        <Metric label="Total PO Value" value={money.format(totalValue)} sub="All orders, all statuses" icon={Wallet} tone="success" />
        <Metric label="Pending Approval" value={number.format(pendingApproval)} sub="Awaiting sign-off" icon={Clock} tone="warning" />
        <Metric label="Fully Received" value={number.format(received)} sub="Closed out orders" icon={PackageCheck} tone="accent" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel eyebrow="Top Suppliers" title="PO Value by Supplier" accent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySupplier} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="supplier" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => money.format(value)} />
                <Bar dataKey="value" name="PO Value" radius={[4, 4, 0, 0]}>
                  {bySupplier.map((entry, index) => (
                    <Cell key={entry.supplier} fill={categoryPalette[index % categoryPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel eyebrow="Status" title="Order Status Mix" accent>
          <div className="flex flex-col items-center">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={byStatus} dataKey="count" nameKey="status" innerRadius={50} outerRadius={78} paddingAngle={2}>
                    {byStatus.map((entry, index) => (
                      <Cell key={entry.status} fill={categoryPalette[index % categoryPalette.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {byStatus.map((entry, index) => (
                <span key={entry.status} className="flex items-center gap-1.5 truncate text-[var(--ink)]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }} />
                  <span className="truncate">{entry.status}</span>
                </span>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel title="Purchase Orders">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO number or supplier..."
              className="min-w-[220px] flex-1 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            />
            <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
              <option value="">Supplier: All</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
              <option value="">Status: All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">PO Number</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Warehouse</th>
                  <th className="text-right">Items</th>
                  <th className="pr-4 text-right">Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((po) => (
                  <tr key={po.id} className="border-b border-slate-100">
                    <td className="py-2.5 font-mono text-xs">{po.id}</td>
                    <td className="font-medium text-[var(--ink)]">{po.supplier}</td>
                    <td>{po.date}</td>
                    <td>{po.warehouse}</td>
                    <td className="text-right">{po.items.length}</td>
                    <td className="pr-4 text-right font-medium">{money.format(po.amount)}</td>
                    <td>
                      <Badge>{po.status}</Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-[var(--muted)]">
                      No purchase orders match your filters.
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
