import React, { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeftRight, TrendingDown, TrendingUp, Waypoints } from "lucide-react";
import { materialByCode, warehouses } from "../../data/stockManagement.js";
import { Panel, Metric } from "../ui.jsx";
import { useStockData } from "../stock/StockDataContext.jsx";
import { number, ReportHeader } from "./reportUtils.jsx";

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

export function StockMovementReport() {
  const stockData = useStockData();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");

  const totalIn = stockData.movements.reduce((sum, m) => sum + (Number(m.qtyIn) || 0), 0);
  const totalOut = stockData.movements.reduce((sum, m) => sum + (Number(m.qtyOut) || 0), 0);

  const trend = useMemo(() => {
    const byDate = new Map();
    stockData.movements.forEach((m) => {
      const entry = byDate.get(m.date) || { date: m.date, in: 0, out: 0 };
      entry.in += Number(m.qtyIn) || 0;
      entry.out += Number(m.qtyOut) || 0;
      byDate.set(m.date, entry);
    });
    return [...byDate.values()]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((entry) => ({ ...entry, label: dayLabel.format(new Date(entry.date)) }));
  }, [stockData.movements]);

  const types = [...new Set(stockData.movements.map((m) => m.type))];

  const filtered = stockData.movements.filter((m) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const itemName = materialByCode(m.item)?.name || m.item;
      if (!itemName.toLowerCase().includes(q) && !m.reference.toLowerCase().includes(q)) return false;
    }
    if (typeFilter && m.type !== typeFilter) return false;
    if (warehouseFilter && m.warehouse !== warehouseFilter) return false;
    return true;
  });

  return (
    <div>
      <ReportHeader icon={ArrowLeftRight} title="Stock Movement" subtitle="Inbound vs outbound activity across every warehouse." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Movements" value={number.format(stockData.movements.length)} sub="Recorded transactions" icon={Waypoints} tone="primary" />
        <Metric label="Total Stock In" value={number.format(totalIn)} sub="Units received" icon={TrendingUp} tone="success" />
        <Metric label="Total Stock Out" value={number.format(totalOut)} sub="Units issued" icon={TrendingDown} tone="accent" />
        <Metric label="Net Change" value={`${totalIn - totalOut >= 0 ? "+" : ""}${number.format(totalIn - totalOut)}`} sub="In minus out" icon={ArrowLeftRight} tone={totalIn - totalOut >= 0 ? "success" : "danger"} />
      </section>

      <section className="mt-5">
        <Panel eyebrow="Trend" title="Stock In vs Stock Out" accent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="movementInFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="movementOutFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--navy)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--navy)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="in" name="Stock In" stroke="var(--primary)" strokeWidth={2} fill="url(#movementInFill)" />
                <Area type="monotone" dataKey="out" name="Stock Out" stroke="var(--navy)" strokeWidth={2} fill="url(#movementOutFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-5 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" /> Stock In
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--navy)]" /> Stock Out
            </span>
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel title="Movement Ledger">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item or reference..."
              className="min-w-[220px] flex-1 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
              <option value="">Type: All</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
              <option value="">Warehouse: All</option>
              {warehouses.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Warehouse</th>
                  <th className="text-right">In</th>
                  <th className="text-right">Out</th>
                  <th className="text-right">Balance</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="py-2.5">{m.date}</td>
                    <td>{m.type}</td>
                    <td>{materialByCode(m.item)?.name || m.item}</td>
                    <td>{m.warehouse}</td>
                    <td className="text-right text-emerald-700">{m.qtyIn || ""}</td>
                    <td className="text-right text-[var(--danger)]">{m.qtyOut || ""}</td>
                    <td className="text-right font-medium">{m.balance}</td>
                    <td className="font-mono text-xs">{m.reference}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-[var(--muted)]">
                      No movements match your filters.
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
