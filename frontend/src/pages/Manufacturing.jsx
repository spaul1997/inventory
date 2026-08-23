import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
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
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Factory,
  Gauge,
  Layers,
  ListTree,
  PackageMinus,
  PackagePlus,
  Plus,
  Recycle,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import { manufacturingEntities } from "../data/manufacturing/entities.js";
import { computeBomCosting } from "../data/manufacturing/bom.js";
import { materialByCode, money, money0, number, workCenters, today } from "../data/manufacturing/shared.js";
import { Badge, Metric, Panel } from "../components/ui.jsx";
import { ManufacturingSidebar } from "../components/manufacturing/ManufacturingSidebar.jsx";
import { ManufacturingList } from "../components/manufacturing/ManufacturingList.jsx";
import { ManufacturingForm } from "../components/manufacturing/ManufacturingForm.jsx";
import { BomForm } from "../components/manufacturing/BomForm.jsx";
import { WorkOrderForm } from "../components/manufacturing/workOrder/WorkOrderForm.jsx";
import { useManufacturingData } from "../components/manufacturing/ManufacturingDataContext.jsx";
import { useManufacturingWip } from "../components/manufacturing/manufacturingUtils.js";
import { useStockData } from "../components/stock/StockDataContext.jsx";

const categoryPalette = ["#2563eb", "#0f2a43", "#0ea5e9", "#d97706", "#94a3b8", "#16a34a", "#7c3aed", "#db2777"];

function ManufacturingLayout({ children }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <ManufacturingSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function ManufacturingListPage({ entityKey }) {
  return (
    <ManufacturingLayout>
      <ManufacturingList entityKey={entityKey} />
    </ManufacturingLayout>
  );
}

export function ManufacturingFormPage({ entityKey, mode }) {
  const { id } = useParams();
  return (
    <ManufacturingLayout>
      <ManufacturingForm entityKey={entityKey} mode={mode} recordId={id} />
    </ManufacturingLayout>
  );
}

export function BomFormPage({ mode }) {
  const { id } = useParams();
  return (
    <ManufacturingLayout>
      <BomForm mode={mode} recordId={id} />
    </ManufacturingLayout>
  );
}

export function WorkOrderFormPage({ mode }) {
  const { id } = useParams();
  return (
    <ManufacturingLayout>
      <WorkOrderForm mode={mode} recordId={id} />
    </ManufacturingLayout>
  );
}

const ACTIVE_WO_STATUSES = ["Released", "In Progress", "On Hold", "Partially Completed"];

export function ManufacturingDashboard() {
  const manufacturingData = useManufacturingData();
  const stockData = useStockData();
  const wip = useManufacturingWip();
  const [lineFilter, setLineFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const workOrders = manufacturingData.getRows("work-order");
  const plans = manufacturingData.getRows("production-planning");
  const finishedGoods = manufacturingData.getRows("finished-goods");
  const scrapRows = manufacturingData.getRows("scrap-wastage");
  const materialIssues = manufacturingData.getRows("material-issue");
  const materialConsumption = manufacturingData.getRows("material-consumption");
  const processEntries = manufacturingData.getRows("production-process");
  const boms = manufacturingData.getRows("bill-of-materials-bom");

  const filteredWorkOrders = lineFilter ? workOrders.filter((wo) => wo.productionLine === lineFilter) : workOrders;

  const activeWorkOrders = filteredWorkOrders.filter((wo) => !["Closed", "Cancelled"].includes(wo.status)).length;
  const inProgress = filteredWorkOrders.filter((wo) => wo.status === "In Progress").length;
  const onHold = filteredWorkOrders.filter((wo) => wo.status === "On Hold").length;
  const completed = filteredWorkOrders.filter((wo) => ["Completed", "Closed"].includes(wo.status)).length;

  const plannedQtyTotal = plans.reduce((sum, p) => sum + p.items.reduce((s, i) => s + (Number(i.plannedQty) || 0), 0), 0);
  const producedQtyTotal = finishedGoods.filter((f) => f.status === "Completed").reduce((sum, f) => sum + f.items.reduce((s, i) => s + (Number(i.qtyReceived) || 0), 0), 0);
  const efficiency = plannedQtyTotal ? Math.round((producedQtyTotal / plannedQtyTotal) * 100) : 0;

  const totalWipValue = wip.reduce((sum, w) => sum + w.wipValue, 0);
  const scrapValue = scrapRows.reduce((sum, s) => sum + s.items.reduce((x, i) => x + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0), 0);
  const scrapQtyTotal = scrapRows.reduce((sum, s) => sum + s.items.reduce((x, i) => x + (Number(i.qty) || 0), 0), 0);
  const scrapRate = producedQtyTotal + scrapQtyTotal ? ((scrapQtyTotal / (producedQtyTotal + scrapQtyTotal)) * 100).toFixed(1) : "0.0";

  const consumptionVariancePct = useMemo(() => {
    const items = materialConsumption.flatMap((r) => r.items);
    if (!items.length) return 0;
    const avg = items.reduce((s, i) => s + Math.abs((Number(i.issuedQty) || 0) - (Number(i.consumedQty) || 0) - (Number(i.returnedQty) || 0)) / (Number(i.issuedQty) || 1), 0) / items.length;
    return (avg * 100).toFixed(1);
  }, [materialConsumption]);

  const productsInActiveProduction = new Set(workOrders.filter((wo) => ACTIVE_WO_STATUSES.includes(wo.status)).map((wo) => wo.product)).size;

  const trend = useMemo(() => {
    const byMonth = new Map();
    plans.forEach((p) => {
      const month = p.date.slice(0, 7);
      const entry = byMonth.get(month) || { month, planned: 0, produced: 0 };
      entry.planned += p.items.reduce((s, i) => s + (Number(i.plannedQty) || 0), 0);
      byMonth.set(month, entry);
    });
    finishedGoods
      .filter((f) => f.status === "Completed")
      .forEach((f) => {
        const month = f.date.slice(0, 7);
        const entry = byMonth.get(month) || { month, planned: 0, produced: 0 };
        entry.produced += f.items.reduce((s, i) => s + (Number(i.qtyReceived) || 0), 0);
        byMonth.set(month, entry);
      });
    return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [plans, finishedGoods]);

  const statusDistribution = useMemo(() => {
    const map = new Map();
    workOrders.forEach((wo) => map.set(wo.status, (map.get(wo.status) || 0) + 1));
    return [...map.entries()].map(([status, count]) => ({ status, count }));
  }, [workOrders]);

  const materialFlow = useMemo(() => {
    const issued = {};
    materialIssues.forEach((mi) => mi.items.forEach((i) => { if (i.code) issued[i.code] = (issued[i.code] || 0) + (Number(i.qty) || 0); }));
    const consumed = {};
    materialConsumption.forEach((mc) => mc.items.forEach((i) => { if (i.code) consumed[i.code] = (consumed[i.code] || 0) + (Number(i.consumedQty) || 0); }));
    return Object.entries(issued)
      .map(([code, issuedQty]) => ({ code, name: materialByCode(code)?.name || code, issued: issuedQty, consumed: consumed[code] || 0 }))
      .sort((a, b) => b.issued - a.issued)
      .slice(0, 6);
  }, [materialIssues, materialConsumption]);

  const wipByProduct = useMemo(() => {
    const map = new Map();
    wip.forEach((w) => map.set(w.product, (map.get(w.product) || 0) + w.wipValue));
    return [...map.entries()].map(([product, value]) => ({ product, value }));
  }, [wip]);

  const scrapByReason = useMemo(() => {
    const map = new Map();
    scrapRows.forEach((s) => {
      const value = s.items.reduce((x, i) => x + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0);
      map.set(s.scrapReason, (map.get(s.scrapReason) || 0) + value);
    });
    return [...map.entries()].map(([reason, value]) => ({ reason, value }));
  }, [scrapRows]);

  const attentionWorkOrders = workOrders.filter((wo) => wo.status === "On Hold" || (ACTIVE_WO_STATUSES.includes(wo.status) && wo.plannedEnd && wo.plannedEnd.slice(0, 10) < today()));

  const recentProcess = [...processEntries].sort((a, b) => (b.startDateTime || "").localeCompare(a.startDateTime || "")).slice(0, 6);

  const upcomingPlans = plans.filter((p) => ["Approved", "Released"].includes(p.status)).flatMap((p) => p.items.map((i) => ({ ...i, planId: p.id, planDate: p.date })));

  const lowAvailabilityMaterials = useMemo(() => {
    const flagged = [];
    boms
      .filter((b) => b.status === "Active")
      .forEach((bom) => {
        bom.materialLines.forEach((line) => {
          const required = (Number(line.qtyPerUnit) || 0) * (Number(bom.batchSize) || 0);
          const available = stockData.getAvailable(line.code, "Raw Material Store");
          if (available < required) flagged.push({ code: line.code, name: line.name, product: bom.productName, required, available });
        });
      });
    return flagged;
  }, [boms, stockData]);

  const recentFg = [...finishedGoods].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <ManufacturingLayout>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Manufacturing</p>
            <h2 className="text-2xl font-semibold text-[var(--ink)]">Manufacturing Dashboard</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Live production, WIP and cost overview across every work order.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/manufacturing/bill-of-materials-bom/new" className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              <Plus size={15} /> BOM
            </Link>
            <Link to="/manufacturing/production-planning/new" className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              <Plus size={15} /> Production Plan
            </Link>
            <Link to="/manufacturing/work-order/new" className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              <Plus size={15} /> Work Order
            </Link>
            <Link to="/manufacturing/material-issue/new" className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
              <Plus size={15} /> Material Issue
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-[var(--line)] bg-white p-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Filters</span>
          <select value={lineFilter} onChange={(e) => setLineFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
            <option value="">Production Line: All</option>
            {workCenters.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-[var(--line)] px-2 py-2 text-sm" />
            <span>to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-[var(--line)] px-2 py-2 text-sm" />
          </div>
        </div>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active Work Orders" value={number.format(activeWorkOrders)} sub={`${workOrders.length} total`} icon={ClipboardList} tone="primary" />
          <Metric label="In Progress" value={number.format(inProgress)} sub="Currently running" icon={Factory} tone="accent" />
          <Metric label="On Hold" value={number.format(onHold)} sub="Needs attention" icon={AlertTriangle} tone="danger" />
          <Metric label="Completed / Closed" value={number.format(completed)} sub="All-time" icon={CheckCircle2} tone="success" />
          <Metric label="Planned Production Qty" value={number.format(plannedQtyTotal)} sub="Across all production plans" icon={ListTree} tone="accent" />
          <Metric label="Actual Production Qty" value={number.format(producedQtyTotal)} sub="Finished-goods received" icon={PackagePlus} tone="success" />
          <Metric label="Production Efficiency" value={`${efficiency}%`} sub="Actual / planned" icon={Gauge} tone={efficiency >= 70 ? "success" : "warning"} />
          <Metric label="WIP Value" value={money0.format(totalWipValue)} sub={`${wip.length} active work orders`} icon={Boxes} tone="primary" />
          <Metric label="Scrap Value" value={money0.format(scrapValue)} sub="All-time" icon={Recycle} tone="danger" />
          <Metric label="Scrap Rate" value={`${scrapRate}%`} sub="Of produced + scrapped qty" icon={AlertTriangle} tone="warning" />
          <Metric label="Consumption Variance" value={`${consumptionVariancePct}%`} sub="Avg. across postings" icon={TrendingUp} tone="accent" />
          <Metric label="Products in Production" value={number.format(productsInActiveProduction)} sub="Distinct products active" icon={Layers} tone="primary" />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Panel eyebrow="Trend" title="Planned vs Actual Production" accent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="plannedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--navy)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--navy)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="producedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="planned" name="Planned" stroke="var(--navy)" strokeWidth={2} fill="url(#plannedFill)" />
                  <Area type="monotone" dataKey="produced" name="Produced" stroke="var(--primary)" strokeWidth={2} fill="url(#producedFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-5 text-sm text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--navy)]" /> Planned
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--primary)]" /> Produced
              </span>
            </div>
          </Panel>

          <Panel eyebrow="Status" title="Work Order Status Distribution" accent>
            <div className="flex flex-col items-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip />
                    <Pie data={statusDistribution} dataKey="count" nameKey="status" innerRadius={45} outerRadius={72} paddingAngle={2}>
                      {statusDistribution.map((entry, index) => (
                        <Cell key={entry.status} fill={categoryPalette[index % categoryPalette.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {statusDistribution.map((entry, index) => (
                  <span key={entry.status} className="flex items-center gap-1.5 truncate text-[var(--ink)]">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }} />
                    <span className="truncate">
                      {entry.status} ({entry.count})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-3">
          <Panel eyebrow="Top 6" title="Material Issued vs Consumed" accent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={materialFlow} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="issued" name="Issued" fill="var(--navy)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="consumed" name="Consumed" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel eyebrow="By Product" title="WIP Value" accent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wipByProduct} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="product" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => money0.format(v)} />
                  <Bar dataKey="value" name="WIP Value" radius={[3, 3, 0, 0]}>
                    {wipByProduct.map((entry, index) => (
                      <Cell key={entry.product} fill={categoryPalette[index % categoryPalette.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel eyebrow="By Reason" title="Scrap Value" accent>
            {scrapByReason.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--muted)]">No scrap recorded.</p>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(v) => money0.format(v)} />
                      <Pie data={scrapByReason} dataKey="value" nameKey="reason" innerRadius={40} outerRadius={62} paddingAngle={2}>
                        {scrapByReason.map((entry, index) => (
                          <Cell key={entry.reason} fill={categoryPalette[index % categoryPalette.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-1 space-y-1 text-xs">
                  {scrapByReason.map((entry, index) => (
                    <span key={entry.reason} className="flex items-center gap-1.5 text-[var(--ink)]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }} />
                      {entry.reason}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel title="Work Orders Requiring Attention">
            {attentionWorkOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">Nothing needs attention right now.</p>
            ) : (
              <div className="space-y-2">
                {attentionWorkOrders.map((wo) => (
                  <Link key={wo.id} to={`/manufacturing/work-order/${wo.id}/view`} className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100/60">
                    <div>
                      <p className="text-sm font-semibold text-amber-950">{wo.id} — {wo.productName}</p>
                      <p className="text-xs text-amber-800">{wo.status === "On Hold" ? `On hold: ${wo.holdReason || "no reason given"}` : `Planned end ${wo.plannedEnd?.slice(0, 10)} has passed`}</p>
                    </div>
                    <Badge>{wo.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Low-Availability Materials (Active BOMs)">
            {lowAvailabilityMaterials.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">All materials for active BOMs are sufficiently stocked.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                    <tr>
                      <th className="py-2">Material</th>
                      <th>For Product</th>
                      <th className="text-right">Required</th>
                      <th className="text-right">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowAvailabilityMaterials.map((m, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2">{m.name}</td>
                        <td className="text-[var(--muted)]">{m.product}</td>
                        <td className="text-right">{m.required.toFixed(1)}</td>
                        <td className="text-right font-semibold text-[var(--danger)]">{m.available}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel title="Recent Production Process Activity">
            <div className="space-y-2.5">
              {recentProcess.map((p) => (
                <Link key={p.id} to={`/manufacturing/production-process/${p.id}/view`} className="block rounded-md border border-slate-100 p-2.5 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--ink)]">{p.operationName}</p>
                    <Badge>{p.status}</Badge>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {p.workOrder} · {p.workCenter}
                  </p>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Upcoming Production Schedule">
            <div className="space-y-2.5">
              {upcomingPlans.length === 0 && <p className="py-4 text-center text-sm text-[var(--muted)]">No upcoming approved plans.</p>}
              {upcomingPlans.map((item, i) => (
                <Link key={i} to={`/manufacturing/production-planning/${item.planId}/view`} className="flex items-center justify-between rounded-md border border-slate-100 p-2.5 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">{item.productName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {item.planId} · {item.plannedQty} {item.uom} due {item.requiredDate}
                    </p>
                  </div>
                  <Badge>{item.priority}</Badge>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Recent Finished Goods Receipts">
            <div className="space-y-2.5">
              {recentFg.map((fg) => (
                <Link key={fg.id} to={`/manufacturing/finished-goods/${fg.id}/view`} className="flex items-center justify-between rounded-md border border-slate-100 p-2.5 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">{fg.productName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {fg.id} · {fg.items.reduce((s, i) => s + (Number(i.qtyReceived) || 0), 0)} received
                    </p>
                  </div>
                  <Badge>{fg.status}</Badge>
                </Link>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </ManufacturingLayout>
  );
}

const WIP_AGING_BUCKETS = ["0-7 days", "8-14 days", "15-30 days", "30+ days"];

export function WipManagement() {
  const wip = useManufacturingWip();
  const [search, setSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [agingFilter, setAgingFilter] = useState("");

  const totalWipValue = wip.reduce((sum, w) => sum + w.wipValue, 0);
  const totalWipQty = wip.reduce((sum, w) => sum + w.wipQty, 0);
  const delayedCount = wip.filter((w) => w.agingBucket === "30+ days").length;

  const byLine = useMemo(() => {
    const map = new Map();
    wip.forEach((w) => map.set(w.productionLine || "Unassigned", (map.get(w.productionLine || "Unassigned") || 0) + w.wipValue));
    return [...map.entries()].map(([line, value]) => ({ line, value }));
  }, [wip]);

  const byAging = useMemo(() => WIP_AGING_BUCKETS.map((bucket) => ({ bucket, value: wip.filter((w) => w.agingBucket === bucket).reduce((s, w) => s + w.wipValue, 0) })), [wip]);

  const filtered = wip.filter((w) => {
    if (search.trim() && !`${w.workOrder} ${w.product}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (lineFilter && w.productionLine !== lineFilter) return false;
    if (agingFilter && w.agingBucket !== agingFilter) return false;
    return true;
  });

  return (
    <ManufacturingLayout>
      <div>
        <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
          <Link to="/manufacturing/manufacturing-dashboard" className="hover:text-[var(--primary)]">
            Manufacturing
          </Link>
          <span>/</span>
          <span className="text-[var(--ink)]">WIP Management</span>
        </p>
        <h2 className="text-xl font-semibold text-[var(--ink)]">WIP Management</h2>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Live work-in-progress tracking, valuation and aging — derived from active work orders.</p>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active WIP Orders" value={number.format(wip.length)} icon={Wrench} tone="primary" />
          <Metric label="Total WIP Quantity" value={number.format(totalWipQty)} icon={Boxes} tone="accent" />
          <Metric label="Total WIP Value" value={money0.format(totalWipValue)} icon={Wallet} tone="success" />
          <Metric label="Aging 30+ Days" value={number.format(delayedCount)} sub="Needs review" icon={CalendarClock} tone={delayedCount > 0 ? "danger" : "success"} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <Panel eyebrow="By Production Line" title="WIP Value" accent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byLine} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="line" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={45} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => money0.format(v)} />
                  <Bar dataKey="value" name="WIP Value" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel eyebrow="Aging" title="WIP Value by Age" accent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byAging} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => money0.format(v)} />
                  <Bar dataKey="value" name="WIP Value" radius={[3, 3, 0, 0]}>
                    {byAging.map((entry, index) => (
                      <Cell key={entry.bucket} fill={index === 3 ? "var(--danger)" : categoryPalette[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <section className="mt-5">
          <Panel title="Work-in-Progress Register">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search work order or product..."
                className="min-w-[220px] flex-1 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
              />
              <select value={lineFilter} onChange={(e) => setLineFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
                <option value="">Production Line: All</option>
                {workCenters.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <select value={agingFilter} onChange={(e) => setAgingFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
                <option value="">Aging: All</option>
                {WIP_AGING_BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="py-2">Work Order</th>
                    <th>Product</th>
                    <th>Line</th>
                    <th className="text-right">WIP Qty</th>
                    <th className="text-right">Material Value</th>
                    <th className="text-right">Process Cost</th>
                    <th className="text-right">WIP Value</th>
                    <th>Aging</th>
                    <th>Status</th>
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
                      <td>{w.productionLine}</td>
                      <td className="text-right">{w.wipQty}</td>
                      <td className="text-right">{money0.format(w.materialIssuedValue)}</td>
                      <td className="text-right">{money0.format(w.processCostSoFar)}</td>
                      <td className="text-right font-semibold">{money0.format(w.wipValue)}</td>
                      <td>
                        <span className={w.agingBucket === "30+ days" ? "text-[var(--danger)] font-medium" : "text-[var(--muted)]"}>{w.agingBucket}</span>
                      </td>
                      <td>
                        <Badge>{w.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-sm text-[var(--muted)]">
                        No active work-in-progress matches your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      </div>
    </ManufacturingLayout>
  );
}
