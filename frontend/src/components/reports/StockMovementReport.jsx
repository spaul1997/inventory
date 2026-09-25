import React, { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeftRight, TrendingDown, TrendingUp, Waypoints } from "lucide-react";
import { Metric, Panel } from "../ui.jsx";
import { InventoryReportFilters } from "./InventoryReportFilters.jsx";
import { useInventoryReport } from "./useInventoryReport.js";
import { number, ReportHeader } from "./reportUtils.jsx";

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

function shortDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dayLabel.format(parsed);
}

export function StockMovementReport() {
  const report = useInventoryReport("stock-movement");
  const movements = report.rows;
  const summary = report.summary;

  const trend = useMemo(() => {
    const byDate = new Map();
    movements.forEach((movement) => {
      const entry = byDate.get(movement.date) || { date: movement.date, in: 0, out: 0 };
      entry.in += Number(movement.qtyIn) || 0;
      entry.out += Number(movement.qtyOut) || 0;
      byDate.set(movement.date, entry);
    });
    return [...byDate.values()]
      .sort((left, right) => String(left.date).localeCompare(String(right.date)))
      .map((entry) => ({ ...entry, label: shortDate(entry.date) }));
  }, [movements]);

  return (
    <div>
      <ReportHeader icon={ArrowLeftRight} title="Stock Movement" subtitle="Live inbound and outbound transactions from persisted stock activity." />
      <InventoryReportFilters report={report} fields={["search", "date", "warehouse", "movementType", "category", "itemType", "qtyRange"]} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric compact label="Total Movements" value={number.format(summary.totalMovements || 0)} sub="Filtered transactions" icon={Waypoints} tone="primary" />
        <Metric compact label="Total Stock In" value={number.format(summary.totalIn || 0)} sub="Units received" icon={TrendingUp} tone="success" />
        <Metric compact label="Total Stock Out" value={number.format(summary.totalOut || 0)} sub="Units issued" icon={TrendingDown} tone="accent" />
        <Metric compact label="Net Change" value={`${(summary.netChange || 0) >= 0 ? "+" : ""}${number.format(summary.netChange || 0)}`} sub="In minus out" icon={ArrowLeftRight} tone={(summary.netChange || 0) >= 0 ? "success" : "danger"} />
      </section>

      <section className="mt-5">
        <Panel eyebrow="Trend" title="Stock In vs Stock Out" accent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="movementInFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="movementOutFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--navy)" stopOpacity={0.25} /><stop offset="95%" stopColor="var(--navy)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} allowDecimals={false} /><Tooltip />
                <Area type="monotone" dataKey="in" name="Stock In" stroke="var(--primary)" strokeWidth={2} fill="url(#movementInFill)" />
                <Area type="monotone" dataKey="out" name="Stock Out" stroke="var(--navy)" strokeWidth={2} fill="url(#movementOutFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel
          title="Movement Ledger"
          action={<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-[var(--muted)]">{number.format(movements.length)} transactions</span>}
        >
          <div className="overflow-x-auto rounded-md border border-[var(--line)]">
            <table className="w-full min-w-[780px] text-left text-[13px]">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2">Date &amp; Time</th>
                  <th className="px-3 py-2">Movement</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Storage</th>
                  <th className="px-3 py-2 text-right">Change</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((movement) => {
                  const quantityIn = Number(movement.qtyIn) || 0;
                  const quantityOut = Number(movement.qtyOut) || 0;
                  const inbound = quantityIn > 0;
                  const quantity = inbound ? quantityIn : quantityOut;
                  return (
                    <tr key={movement.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-3 py-2 text-[var(--ink)]">{movement.date}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${inbound ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {movement.type}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="block font-semibold leading-4 text-[var(--ink)]">{movement.itemName}</span>
                        <span className="block text-[11px] leading-4 text-[var(--muted)]">{movement.itemCode} · {movement.category}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="block leading-4 text-[var(--ink)]">{movement.warehouse}</span>
                        <span className="block text-[11px] leading-4 text-[var(--muted)]">Batch: {movement.batch || "—"}</span>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${inbound ? "text-emerald-700" : "text-[var(--danger)]"}`}>
                        {inbound ? "+" : "−"}{number.format(quantity)} {movement.unit}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[var(--ink)]">{number.format(movement.balance)} {movement.unit}</td>
                      <td className="px-3 py-2"><span className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-1 font-mono text-[11px] text-[var(--ink)]">{movement.reference || "—"}</span></td>
                    </tr>
                  );
                })}
                {!report.loading && movements.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-sm text-[var(--muted)]">No movements match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  );
}
