import React, { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertOctagon, PackageX, Tags, TriangleAlert } from "lucide-react";
import { Badge, Metric, Panel } from "../ui.jsx";
import { money, number, ReportHeader, useInventoryItems } from "./reportUtils.jsx";

export function LowStockReport() {
  const items = useInventoryItems();
  const [search, setSearch] = useState("");

  const atRisk = useMemo(
    () => items.filter((item) => item.status === "Low Stock" || item.stock === 0).sort((a, b) => a.stock - b.stock),
    [items]
  );

  const lowStockCount = items.filter((item) => item.status === "Low Stock").length;
  const outOfStockCount = items.filter((item) => item.stock === 0).length;
  const valueAtRisk = atRisk.reduce((sum, item) => sum + item.value, 0);
  const categoriesAffected = new Set(atRisk.map((item) => item.category)).size;

  const chartData = atRisk.slice(0, 12).map((item) => ({ name: item.name, stock: item.stock, out: item.stock === 0 }));

  const filtered = atRisk.filter((item) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
  });

  return (
    <div>
      <ReportHeader icon={TriangleAlert} title="Low Stock" subtitle="Items flagged low or fully depleted — prioritize replenishment." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Low Stock Items" value={number.format(lowStockCount)} sub="Below comfortable levels" icon={TriangleAlert} tone="warning" />
        <Metric label="Out of Stock" value={number.format(outOfStockCount)} sub="Zero quantity on hand" icon={PackageX} tone="danger" />
        <Metric label="Value at Risk" value={money.format(valueAtRisk)} sub="Combined value of flagged items" icon={AlertOctagon} tone="danger" />
        <Metric label="Categories Affected" value={number.format(categoriesAffected)} sub="Need reorder attention" icon={Tags} tone="accent" />
      </section>

      <section className="mt-5">
        <Panel eyebrow="Lowest First" title="Stock on Hand — Flagged Items" accent>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Nothing is currently flagged low or out of stock.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="stock" name="Stock on Hand" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.out ? "var(--danger)" : "var(--warning)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </section>

      <section className="mt-5">
        <Panel title="Reorder Watchlist">
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item code or name..."
              className="w-full max-w-xs rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Code</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th className="text-right">Stock</th>
                  <th className="pr-4 text-right">Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={`${item.type}-${item.code}`} className={`border-b border-slate-100 ${item.stock === 0 ? "bg-red-50/40" : "bg-amber-50/40"}`}>
                    <td className="py-2.5 font-mono text-xs">{item.code}</td>
                    <td className="font-medium text-[var(--ink)]">{item.name}</td>
                    <td className="text-[var(--muted)]">{item.type}</td>
                    <td className="text-[var(--muted)]">{item.category}</td>
                    <td className="text-right font-semibold text-[var(--danger)]">
                      {number.format(item.stock)} {item.unit}
                    </td>
                    <td className="pr-4 text-right">{money.format(item.value)}</td>
                    <td>
                      <Badge>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-[var(--muted)]">
                      No flagged items match your search.
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
