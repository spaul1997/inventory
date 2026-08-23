import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Boxes, Layers, PackageCheck, TriangleAlert } from "lucide-react";
import { Badge, Metric, Panel } from "../ui.jsx";
import { categoryPalette, groupByCategory, money, number, ReportHeader, useInventoryItems } from "./reportUtils.jsx";

export function CurrentStockReport() {
  const items = useInventoryItems();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const categories = [...new Set(items.map((item) => item.category))].sort();

  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  const activeCount = items.filter((item) => item.status === "Active").length;
  const lowStockCount = items.filter((item) => item.status === "Low Stock").length;

  const categoryBreakdown = useMemo(() => groupByCategory(items).slice(0, 8), [items]);
  const typeBreakdown = useMemo(() => {
    const products = items.filter((item) => item.type === "Product").reduce((sum, item) => sum + item.value, 0);
    const materials = items.filter((item) => item.type === "Raw Material").reduce((sum, item) => sum + item.value, 0);
    return [
      { name: "Products", value: products },
      { name: "Raw Materials", value: materials },
    ];
  }, [items]);

  const filtered = items
    .filter((item) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!item.code.toLowerCase().includes(q) && !item.name.toLowerCase().includes(q)) return false;
      }
      if (typeFilter && item.type !== typeFilter) return false;
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      <ReportHeader icon={Boxes} title="Current Stock" subtitle="Live stock on hand across products and raw materials." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total SKUs" value={number.format(items.length)} sub={`${categories.length} categories`} icon={Layers} tone="primary" />
        <Metric label="Total Stock Value" value={money.format(totalValue)} sub="At current unit price" icon={PackageCheck} tone="success" />
        <Metric label="Active Items" value={number.format(activeCount)} sub={`${Math.round((activeCount / (items.length || 1)) * 100)}% of catalog`} icon={Boxes} tone="accent" />
        <Metric label="Low Stock Items" value={number.format(lowStockCount)} sub="Flagged in master data" icon={TriangleAlert} tone="warning" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel eyebrow="By Category" title="Stock Value by Category" accent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => money.format(value)} />
                <Bar dataKey="value" name="Stock Value" radius={[4, 4, 0, 0]}>
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={entry.category} fill={categoryPalette[index % categoryPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel eyebrow="Split" title="Products vs Raw Materials" accent>
          <div className="flex flex-col items-center">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip formatter={(value) => money.format(value)} />
                  <Pie data={typeBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                    {typeBreakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={categoryPalette[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex items-center gap-5 text-sm text-[var(--muted)]">
              {typeBreakdown.map((entry, index) => (
                <span key={entry.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryPalette[index] }} />
                  {entry.name}
                </span>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel title="Stock Register">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item code or name..."
              className="min-w-[220px] flex-1 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
              <option value="">Type: All</option>
              <option value="Product">Product</option>
              <option value="Raw Material">Raw Material</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
              <option value="">Category: All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
              <option value="">Status: All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Low Stock">Low Stock</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Code</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Unit Price</th>
                  <th className="pr-4 text-right">Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={`${item.type}-${item.code}`} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-2.5 font-mono text-xs">{item.code}</td>
                    <td>
                      {item.type === "Raw Material" ? (
                        <Link to={`/stock-management/item/${item.code}`} className="font-medium text-[var(--primary)] hover:underline">
                          {item.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-[var(--ink)]">{item.name}</span>
                      )}
                    </td>
                    <td className="text-[var(--muted)]">{item.type}</td>
                    <td className="text-[var(--muted)]">{item.category}</td>
                    <td className="text-right">
                      {number.format(item.stock)} {item.unit}
                    </td>
                    <td className="text-right">{money.format(item.price)}</td>
                    <td className="pr-4 text-right font-medium">{money.format(item.value)}</td>
                    <td>
                      <Badge>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-[var(--muted)]">
                      No items match your filters.
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
