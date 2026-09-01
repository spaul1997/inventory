import React from "react";
import {
  Area,
  AreaChart,
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
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Clock,
  PackageCheck,
  PackagePlus,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "../stores/AuthStore.jsx";
import { useMasterData } from "../components/master/MasterDataContext.jsx";
import { usePurchaseData } from "../components/purchase/PurchaseDataContext.jsx";
import { useSalesData } from "../components/sales/SalesDataContext.jsx";
import { Metric, Panel } from "../components/ui.jsx";
import { poTotals } from "../data/purchaseManagement.js";
import { computeOrderTotals } from "../data/sales/shared.js";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const todayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
  new Date()
);

const categoryPalette = ["#2563eb", "#0f2a43", "#0ea5e9", "#d97706", "#94a3b8", "#16a34a"];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function Dashboard() {
  const { session } = useAuth();
  const masterData = useMasterData();
  const purchaseData = usePurchaseData();
  const salesData = useSalesData();
  const products = masterData.getRows("product-item");
  const purchases = purchaseData.getRows("purchase-order");
  const sales = salesData.getRows("sales-order");
  const companyName = session?.user?.company?.businessName || "your company";

  const stores = [...new Set(products.map((product) => product.warehouse).filter(Boolean))];
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];
  const lowStock = products.filter((product) => product.status === "Low Stock" || (product.reorderLevel && Number(product.stock) <= Number(product.reorderLevel)));
  const totalValue = products.reduce((sum, product) => sum + (Number(product.stock) || 0) * (Number(product.price) || 0), 0);

  const openPOs = purchases.filter((po) => !["Received", "Closed", "Cancelled"].includes(po.status));
  const openPOValue = openPOs.reduce((sum, po) => sum + poTotals(po.items || []).grandTotal, 0);

  const categoryBreakdown = categories
    .map((category) => {
      const value = products
        .filter((product) => product.category === category)
        .reduce((sum, product) => sum + (Number(product.stock) || 0) * (Number(product.price) || 0), 0);
      return { category, value, pct: totalValue ? Math.round((value / totalValue) * 100) : 0 };
    })
    .sort((a, b) => b.value - a.value);

  const trendByDate = new Map();
  function addTrend(date, key, amount) {
    const entry = trendByDate.get(date) || { date, purchases: 0, sales: 0 };
    entry[key] += amount;
    trendByDate.set(date, entry);
  }
  purchases.forEach((po) => addTrend(po.date, "purchases", poTotals(po.items || []).grandTotal));
  sales.forEach((sale) => addTrend(sale.date, "sales", computeOrderTotals(sale.items || [], sale).grandTotal));
  const weeklyTrend = [...trendByDate.values()]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((entry) => ({ ...entry, label: dayLabel.format(new Date(entry.date)) }));

  const recentActivity = [
    ...purchases.map((po) => ({ type: "purchase", id: po.id, party: po.vendor, amount: poTotals(po.items || []).grandTotal, date: po.date })),
    ...sales.map((sale) => ({ type: "sale", id: sale.id, party: sale.customerName || sale.customerId, amount: computeOrderTotals(sale.items || [], sale).grandTotal, date: sale.date })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Overview</p>
          <h2 className="text-2xl font-semibold text-[var(--ink)]">{greeting()}, {companyName}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{todayLabel} — here's how your inventory is running today.</p>
        </div>
        <button className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
          New Stock Entry
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric
          label="Stock Value"
          value={money.format(totalValue)}
          sub={`Across ${stores.length} stores`}
          icon={PackageCheck}
          tone="primary"
          trend={{ direction: "up", value: "4.2%" }}
        />
        <Metric
          label="Active SKUs"
          value={products.length}
          sub={`${categories.length} categories`}
          icon={Boxes}
          tone="accent"
          trend={{ direction: "up", value: "2.1%" }}
        />
        <Metric
          label="Open POs"
          value={openPOs.length}
          sub={`${money.format(openPOValue)} pending`}
          icon={PackagePlus}
          tone="accent"
          trend={{ direction: "down", value: "1.4%" }}
        />
        <Metric
          label="Low Stock"
          value={lowStock.length}
          sub={`${products.length ? Math.round((lowStock.length / products.length) * 100) : 0}% of catalog`}
          icon={TriangleAlert}
          tone="warning"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel eyebrow="This Week" title="Purchases vs. Sales" accent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="purchasesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--navy)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--navy)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => money.format(value)} />
                <Area type="monotone" dataKey="purchases" name="Purchases" stroke="var(--navy)" strokeWidth={2} fill="url(#purchasesFill)" />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="var(--primary)" strokeWidth={2} fill="url(#salesFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-5 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--navy)]" /> Purchases
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" /> Sales
            </span>
          </div>
        </Panel>

        <Panel eyebrow="Live" title="Stock Distribution" accent>
          <div className="flex flex-col items-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip formatter={(value) => money.format(value)} />
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="category"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={entry.category} fill={categoryPalette[index % categoryPalette.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {categoryBreakdown.map((entry, index) => (
                <span key={entry.category} className="flex items-center gap-1.5 truncate text-[var(--ink)]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }}
                  />
                  <span className="truncate">{entry.category}</span>
                </span>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Reorder Alerts">
          <div className="space-y-3">
            {lowStock.length === 0 && <p className="text-sm text-[var(--muted)]">Nothing below reorder level.</p>}
            {lowStock.map((item) => (
              <div key={item.code} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-amber-950">{item.name}</p>
                    <p className="text-sm text-amber-800">{item.warehouse}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-900">{item.stock} {item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Recent Activity">
          <div className="space-y-1">
            {recentActivity.map((entry) => {
              const inbound = entry.type === "purchase";
              return (
                <div key={entry.id} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      inbound ? "bg-blue-50 text-[var(--primary)]" : "bg-slate-100 text-[var(--navy)]"
                    }`}
                  >
                    {inbound ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--ink)]">{entry.party}</p>
                    <p className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Clock size={11} /> {entry.id} · {entry.date}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${inbound ? "text-[var(--ink)]" : "text-[var(--primary)]"}`}>
                    {inbound ? "-" : "+"}{money.format(entry.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>
    </div>
  );
}
