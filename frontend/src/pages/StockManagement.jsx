import React, { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpCircle,
  BarChart3,
  ClipboardCheck,
  Layers,
  Plus,
  Scale,
  SlidersHorizontal,
} from "lucide-react";
import { stockEntities, materialByCode, warehouses } from "../data/stockManagement.js";
import { purchaseOrders } from "../data/purchaseManagement.js";
import { StockSidebar } from "../components/stock/StockSidebar.jsx";
import { StockList } from "../components/stock/StockList.jsx";
import { StockForm } from "../components/stock/StockForm.jsx";
import { useStockData } from "../components/stock/StockDataContext.jsx";
import { useMasterData } from "../components/master/MasterDataContext.jsx";
import { Badge, Metric, Panel } from "../components/ui.jsx";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);
const icons = { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, SlidersHorizontal, ClipboardCheck };

function deriveBatchStatus(batch, todayStr) {
  if (batch.status === "Blocked" || batch.status === "Consumed") return batch.status;
  if (batch.qty <= 0) return "Consumed";
  if (!batch.expiryDate) return "Active";
  if (batch.expiryDate < todayStr) return "Expired";
  const daysLeft = (new Date(batch.expiryDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 30) return "Near Expiry";
  return "Active";
}

function StockLayout({ children }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <StockSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function StockManagementDashboard() {
  const stockData = useStockData();
  const masterData = useMasterData();
  const rawMaterials = masterData.getRows("raw-material");
  const todayStr = today();

  const totalQty = rawMaterials.reduce((sum, m) => sum + stockData.getTotalStock(m.code), 0);
  const totalValue = rawMaterials.reduce((sum, m) => sum + stockData.getTotalStock(m.code) * (materialByCode(m.code)?.price || 0), 0);
  const stockInToday = stockData.movements.filter((m) => m.date === todayStr && (m.type === "Stock In" || m.type === "Purchase")).length;
  const stockOutToday = stockData.movements.filter((m) => m.date === todayStr && m.type === "Stock Out").length;
  const pendingTransfers = stockData.getRows("stock-transfer").filter((t) => ["Pending Approval", "In Transit"].includes(t.status)).length;
  const lowStockItems = rawMaterials.filter((m) => stockData.getTotalStock(m.code) < 100).length;
  const underAdjustment = stockData.getRows("stock-adjustment").filter((a) => a.status === "Pending Approval").length;
  const expiringBatches = stockData.batches.filter((b) => ["Near Expiry", "Expired"].includes(deriveBatchStatus(b, todayStr))).length;

  const recentMovements = stockData.movements.slice(0, 8);

  return (
    <StockLayout>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--ink)]">Stock Management</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Monitor inventory movements, transfers, adjustments, stock counts and batch tracking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/stock-management/stock-in/new" className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              <Plus size={15} /> Stock In
            </Link>
            <Link to="/stock-management/stock-out/new" className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              <Plus size={15} /> Stock Out
            </Link>
            <Link to="/stock-management/stock-transfer/new" className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              <Plus size={15} /> Stock Transfer
            </Link>
            <Link to="/stock-management/stock-adjustment/new" className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              <Plus size={15} /> Stock Adjustment
            </Link>
            <Link to="/stock-management/stock-count/new" className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
              <Plus size={15} /> Stock Count
            </Link>
          </div>
        </div>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total Stock Quantity" value={totalQty.toLocaleString("en-IN")} sub="Across all warehouses" icon={Layers} tone="primary" />
          <Metric label="Total Stock Value" value={money.format(totalValue)} sub="Raw material inventory" icon={Scale} tone="success" trend={{ direction: "up", value: "3.1%" }} />
          <Metric label="Stock In Today" value={stockInToday} sub="Movements posted today" icon={ArrowDownCircle} tone="primary" />
          <Metric label="Stock Out Today" value={stockOutToday} sub="Movements posted today" icon={ArrowUpCircle} tone="accent" />
          <Metric label="Pending Transfers" value={pendingTransfers} sub="Awaiting approval or in transit" icon={ArrowLeftRight} tone="warning" />
          <Metric label="Low Stock Items" value={lowStockItems} sub="Below 100 units on hand" icon={SlidersHorizontal} tone="danger" />
          <Metric label="Items Under Adjustment" value={underAdjustment} sub="Pending approval" icon={ClipboardCheck} tone="warning" />
          <Metric label="Expiring Batches" value={expiringBatches} sub="Near expiry or expired" icon={Layers} tone="danger" />
        </section>

        <section className="mt-5">
          <Panel
            title="Recent Stock Transactions"
            action={
              <Link to="/stock-management/movements" className="text-sm font-medium text-[var(--primary)] hover:underline">
                View all movements
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="py-3">Transaction No</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Item</th>
                    <th>Warehouse</th>
                    <th className="pr-4 text-right">Quantity</th>
                    <th>Reference</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className="py-3 font-mono text-xs">{m.id}</td>
                      <td>{m.date}</td>
                      <td>{m.type}</td>
                      <td>{materialByCode(m.item)?.name || m.item}</td>
                      <td>{m.warehouse}</td>
                      <td className={`pr-4 text-right font-medium ${m.qtyIn ? "text-emerald-700" : "text-[var(--danger)]"}`}>
                        {m.qtyIn ? `+${m.qtyIn}` : `-${m.qtyOut}`}
                      </td>
                      <td className="font-mono text-xs">{m.reference}</td>
                      <td>{m.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      </div>
    </StockLayout>
  );
}

export function StockManagementListPage() {
  const { entity } = useParams();
  if (!stockEntities[entity]) return <Navigate to="/stock-management" replace />;
  return (
    <StockLayout>
      <StockList entityKey={entity} />
    </StockLayout>
  );
}

export function StockManagementFormPage({ mode }) {
  const { entity, id } = useParams();
  if (!stockEntities[entity]) return <Navigate to="/stock-management" replace />;
  return (
    <StockLayout>
      <StockForm entityKey={entity} mode={mode} recordId={id} />
    </StockLayout>
  );
}

export function BatchLotTracking() {
  const stockData = useStockData();
  const todayStr = today();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");

  const enriched = stockData.batches.map((b) => ({ ...b, derivedStatus: deriveBatchStatus(b, todayStr) }));

  const filtered = enriched.filter((b) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!b.id.toLowerCase().includes(q) && !b.item.toLowerCase().includes(q)) return false;
    }
    if (statusFilter && b.derivedStatus !== statusFilter) return false;
    if (warehouseFilter && b.warehouse !== warehouseFilter) return false;
    return true;
  });

  const summary = [
    { label: "Total Batches", value: enriched.length, tone: "text-[var(--primary)] bg-blue-50" },
    { label: "Active Batches", value: enriched.filter((b) => b.derivedStatus === "Active").length, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Expiring Soon", value: enriched.filter((b) => b.derivedStatus === "Near Expiry").length, tone: "text-[var(--warning)] bg-amber-50" },
    { label: "Expired Batches", value: enriched.filter((b) => b.derivedStatus === "Expired").length, tone: "text-[var(--danger)] bg-red-50" },
    { label: "Blocked Batches", value: enriched.filter((b) => b.derivedStatus === "Blocked").length, tone: "text-[var(--navy)] bg-slate-100" },
  ];

  return (
    <StockLayout>
      <div>
        <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
          <Link to="/stock-management" className="hover:text-[var(--primary)]">
            Stock Management
          </Link>
          <ArrowRight size={12} />
          <span className="text-[var(--ink)]">Batch / Lot Tracking</span>
        </p>
        <h2 className="text-xl font-semibold text-[var(--ink)]">Batch / Lot Tracking</h2>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Track inventory by batch/lot number, manufacturing date and expiry date.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summary.map((card) => (
            <div key={card.label} className="rounded-md border border-[var(--line)] bg-white p-4">
              <p className="text-sm text-[var(--muted)]">{card.label}</p>
              <p className={`mt-1.5 inline-flex rounded px-1.5 text-xl font-semibold ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-md border border-[var(--line)] bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] p-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batch number or item..."
              className="min-w-[220px] flex-1 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            />
            <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
              <option value="">Warehouse: All</option>
              {warehouses.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm">
              <option value="">Status: All</option>
              {["Active", "Near Expiry", "Expired", "Blocked", "Consumed"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-3 pl-4">Batch No</th>
                  <th>Item</th>
                  <th>Mfg Date</th>
                  <th>Expiry Date</th>
                  <th className="pr-6 text-right">Quantity</th>
                  <th>Warehouse</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-3 pl-4">
                      <Link to={`/stock-management/batch-lot-tracking/${b.id}`} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                        {b.id}
                      </Link>
                    </td>
                    <td>{b.item}</td>
                    <td>{b.mfgDate}</td>
                    <td>{b.expiryDate || "—"}</td>
                    <td className="pr-6 text-right">{b.qty}</td>
                    <td>{b.warehouse}</td>
                    <td>{b.location}</td>
                    <td>
                      <Badge>{b.derivedStatus}</Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-sm text-[var(--muted)]">
                      No batches match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </StockLayout>
  );
}

const batchDetailTabs = ["Overview", "Stock Movement", "Quality", "Documents"];

export function BatchDetail() {
  const { batchId } = useParams();
  const stockData = useStockData();
  const [tab, setTab] = useState("Overview");
  const batch = stockData.batches.find((b) => b.id === batchId);

  if (!batch) return <Navigate to="/stock-management/batch-lot-tracking" replace />;
  const status = deriveBatchStatus(batch, today());
  const movements = stockData.movements.filter((m) => m.batch === batch.id);
  const material = materialByCode(batch.code);

  return (
    <StockLayout>
      <div>
        <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
          <Link to="/stock-management" className="hover:text-[var(--primary)]">
            Stock Management
          </Link>
          <ArrowRight size={12} />
          <Link to="/stock-management/batch-lot-tracking" className="hover:text-[var(--primary)]">
            Batch / Lot Tracking
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-mono text-xl font-semibold text-[var(--ink)]">Batch: {batch.id}</h2>
          <Badge>{status}</Badge>
        </div>

        <div className="mt-4 rounded-md border border-[var(--line)] bg-white">
          <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-[var(--line)] px-3 pt-2">
            {batchDetailTabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-t-md border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === t ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="p-4 sm:p-5">
            {tab === "Overview" && (
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Item" value={<Link to={`/stock-management/item/${batch.code}`} className="text-[var(--primary)] hover:underline">{batch.item}</Link>} />
                <InfoRow label="Item Code" value={batch.code} />
                <InfoRow label="Batch Number" value={batch.id} />
                <InfoRow label="Manufacturing Date" value={batch.mfgDate} />
                <InfoRow label="Expiry Date" value={batch.expiryDate || "N/A"} />
                <InfoRow label="Current Quantity" value={`${batch.qty} ${material?.unit || ""}`} />
                <InfoRow label="Warehouse" value={batch.warehouse} />
                <InfoRow label="Location" value={batch.location} />
                <InfoRow label="Supplier" value={batch.supplier} />
                <InfoRow label="Reference" value={batch.reference} />
              </div>
            )}

            {tab === "Stock Movement" && (
              <div className="overflow-x-auto rounded-md border border-[var(--line)]">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Transaction</th>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2 text-right">Stock In</th>
                      <th className="px-3 py-2 text-right">Stock Out</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                          No movements recorded for this batch yet.
                        </td>
                      </tr>
                    )}
                    {movements.map((m) => (
                      <tr key={m.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{m.date}</td>
                        <td className="px-3 py-2">{m.type}</td>
                        <td className="px-3 py-2 font-mono text-xs">{m.reference}</td>
                        <td className="px-3 py-2 text-right text-emerald-700">{m.qtyIn || ""}</td>
                        <td className="px-3 py-2 text-right text-[var(--danger)]">{m.qtyOut || ""}</td>
                        <td className="px-3 py-2 text-right font-medium">{m.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "Quality" && (
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <InfoRow label="Inspection Status" value={status === "Expired" ? "Failed" : "Passed"} />
                <InfoRow label="Inspection Date" value={batch.mfgDate} />
                <InfoRow label="Inspector" value="Sunita Rao" />
                <InfoRow label="Quality Result" value={status === "Expired" ? "Rejected — expired" : "Within specification"} />
              </div>
            )}

            {tab === "Documents" && <p className="text-sm text-[var(--muted)]">No documents attached to this batch.</p>}
          </div>
        </div>
      </div>
    </StockLayout>
  );
}

export function StockItemDetail() {
  const { code } = useParams();
  const stockData = useStockData();
  const masterData = useMasterData();
  const material = masterData.getRows("raw-material").find((m) => m.code === code);
  const info = materialByCode(code);

  if (!material) return <Navigate to="/stock-management" replace />;

  const breakdown = stockData.getWarehouseBreakdown(code);
  const total = stockData.getTotalStock(code);
  const batches = stockData.batches.filter((b) => b.code === code);
  const movements = stockData.movements.filter((m) => m.item === code).slice(0, 10);
  const onOrder = purchaseOrders
    .filter((po) => !["Received", "Cancelled"].includes(po.status))
    .reduce((sum, po) => sum + po.items.filter((i) => i.code === code).reduce((s, i) => s + (Number(i.qty) || 0), 0), 0);

  return (
    <StockLayout>
      <div>
        <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
          <Link to="/stock-management" className="hover:text-[var(--primary)]">
            Stock Management
          </Link>
          <ArrowRight size={12} />
          <span className="text-[var(--ink)]">{material.name}</span>
        </p>
        <h2 className="text-xl font-semibold text-[var(--ink)]">{material.name}</h2>
        <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">{code}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Current Stock" value={`${total} ${material.unit}`} icon={Layers} tone="primary" />
          <Metric label="Available Stock" value={`${total} ${material.unit}`} sub="Not reserved" icon={ArrowDownCircle} tone="success" />
          <Metric label="On Order" value={`${onOrder} ${material.unit}`} sub="Open purchase orders" icon={ArrowLeftRight} tone="accent" />
          <Metric label="Stock Value" value={money.format(total * (info?.price || 0))} icon={Scale} tone="warning" />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Panel title="Warehouse Breakdown">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Warehouse</th>
                  <th className="text-right">Available</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(breakdown)
                  .filter(([, qty]) => qty > 0)
                  .map(([wh, qty]) => (
                    <tr key={wh} className="border-b border-slate-100">
                      <td className="py-2">{wh}</td>
                      <td className="text-right">{qty}</td>
                      <td className="text-right font-medium">{qty}</td>
                    </tr>
                  ))}
                {Object.values(breakdown).every((qty) => !qty) && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-[var(--muted)]">
                      No stock on hand.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Batch Breakdown">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Batch</th>
                  <th>Expiry</th>
                  <th className="pr-4 text-right">Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100">
                    <td className="py-2">
                      <Link to={`/stock-management/batch-lot-tracking/${b.id}`} className="font-mono text-xs text-[var(--primary)] hover:underline">
                        {b.id}
                      </Link>
                    </td>
                    <td>{b.expiryDate || "—"}</td>
                    <td className="text-right">{b.qty}</td>
                    <td>
                      <Badge>{deriveBatchStatus(b, today())}</Badge>
                    </td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[var(--muted)]">
                      No batches for this item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="mt-5">
          <Panel title="Recent Movements">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="py-2">Date</th>
                    <th>Transaction</th>
                    <th>Reference</th>
                    <th className="text-right">In</th>
                    <th className="text-right">Out</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className="py-2">{m.date}</td>
                      <td>{m.type}</td>
                      <td className="font-mono text-xs">{m.reference}</td>
                      <td className="text-right text-emerald-700">{m.qtyIn || ""}</td>
                      <td className="text-right text-[var(--danger)]">{m.qtyOut || ""}</td>
                      <td className="text-right font-medium">{m.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </StockLayout>
  );
}

export function StockMovementHistory() {
  const stockData = useStockData();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");

  const filtered = stockData.movements.filter((m) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!m.reference.toLowerCase().includes(q) && !(materialByCode(m.item)?.name || "").toLowerCase().includes(q)) return false;
    }
    if (typeFilter && m.type !== typeFilter) return false;
    if (warehouseFilter && m.warehouse !== warehouseFilter) return false;
    return true;
  });

  function handleExport() {
    const header = "Date,Transaction No,Type,Item,Batch,Warehouse,In,Out,Balance,User";
    const lines = filtered.map((m) =>
      [m.date, m.id, m.type, materialByCode(m.item)?.name || m.item, m.batch, m.warehouse, m.qtyIn, m.qtyOut, m.balance, m.user].join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock-movements.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const types = [...new Set(stockData.movements.map((m) => m.type))];

  return (
    <StockLayout>
      <div>
        <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
          <Link to="/stock-management" className="hover:text-[var(--primary)]">
            Stock Management
          </Link>
          <ArrowRight size={12} />
          <span className="text-[var(--ink)]">Stock Movement History</span>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--ink)]">Stock Movement History</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">Complete movement ledger across every warehouse, batch and transaction type.</p>
          </div>
          <button type="button" onClick={handleExport} className="rounded-md border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
            Export CSV
          </button>
        </div>

        <div className="mt-5 rounded-md border border-[var(--line)] bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] p-3">
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
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-3 pl-4">Date</th>
                  <th>Transaction No</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Batch</th>
                  <th>Warehouse</th>
                  <th className="text-right">In</th>
                  <th className="text-right">Out</th>
                  <th className="text-right">Balance</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="py-3 pl-4">{m.date}</td>
                    <td className="font-mono text-xs">{m.id}</td>
                    <td>{m.type}</td>
                    <td>{materialByCode(m.item)?.name || m.item}</td>
                    <td className="font-mono text-xs">{m.batch || "—"}</td>
                    <td>{m.warehouse}</td>
                    <td className="text-right text-emerald-700">{m.qtyIn || ""}</td>
                    <td className="text-right text-[var(--danger)]">{m.qtyOut || ""}</td>
                    <td className="text-right font-medium">{m.balance}</td>
                    <td>{m.user}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-sm text-[var(--muted)]">
                      No movements match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </StockLayout>
  );
}

const reportCards = [
  { key: "stock-summary", label: "Stock Summary", description: "Total quantity and value by item." },
  { key: "warehouse-stock", label: "Warehouse Stock", description: "Stock on hand grouped by warehouse." },
  { key: "movement", label: "Stock Movement", description: "Full movement ledger with filters.", to: "/stock-management/movements" },
  { key: "batch", label: "Batch / Lot Report", description: "All batches with expiry status.", to: "/stock-management/batch-lot-tracking" },
  { key: "expiry", label: "Expiry Report", description: "Batches expiring within 30 days." },
  { key: "valuation", label: "Stock Valuation", description: "Inventory value by item at current cost." },
];

export function StockReports() {
  const stockData = useStockData();
  const masterData = useMasterData();
  const [active, setActive] = useState("stock-summary");
  const todayStr = today();
  const rawMaterials = masterData.getRows("raw-material");

  const stockSummaryRows = useMemo(
    () =>
      rawMaterials.map((m) => ({
        code: m.code,
        name: m.name,
        unit: m.unit,
        qty: stockData.getTotalStock(m.code),
        value: stockData.getTotalStock(m.code) * (materialByCode(m.code)?.price || 0),
      })),
    [rawMaterials, stockData]
  );

  const warehouseRows = useMemo(() => {
    const rows = [];
    rawMaterials.forEach((m) => {
      const breakdown = stockData.getWarehouseBreakdown(m.code);
      Object.entries(breakdown).forEach(([wh, qty]) => {
        if (qty > 0) rows.push({ warehouse: wh, code: m.code, name: m.name, qty, unit: m.unit });
      });
    });
    return rows;
  }, [rawMaterials, stockData]);

  const expiryRows = useMemo(
    () =>
      stockData.batches
        .map((b) => ({ ...b, derivedStatus: deriveBatchStatus(b, todayStr) }))
        .filter((b) => ["Near Expiry", "Expired"].includes(b.derivedStatus)),
    [stockData.batches, todayStr]
  );

  const activeCard = reportCards.find((c) => c.key === active);

  return (
    <StockLayout>
      <div>
        <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
          <Link to="/stock-management" className="hover:text-[var(--primary)]">
            Stock Management
          </Link>
          <ArrowRight size={12} />
          <span className="text-[var(--ink)]">Reports</span>
        </p>
        <h2 className="text-xl font-semibold text-[var(--ink)]">Stock Management Reports</h2>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Stock summary, movement, batch, expiry and valuation reports.</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {reportCards.map((card) =>
            card.to ? (
              <Link key={card.key} to={card.to} className="rounded-md border border-[var(--line)] bg-white p-4 hover:border-[var(--primary)]">
                <div className="flex items-center gap-2 text-[var(--primary)]">
                  <BarChart3 size={16} />
                  <span className="text-sm font-semibold text-[var(--ink)]">{card.label}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">{card.description}</p>
              </Link>
            ) : (
              <button
                key={card.key}
                type="button"
                onClick={() => setActive(card.key)}
                className={`rounded-md border p-4 text-left ${active === card.key ? "border-[var(--primary)] bg-blue-50" : "border-[var(--line)] bg-white hover:border-[var(--primary)]"}`}
              >
                <div className="flex items-center gap-2 text-[var(--primary)]">
                  <BarChart3 size={16} />
                  <span className="text-sm font-semibold text-[var(--ink)]">{card.label}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">{card.description}</p>
              </button>
            )
          )}
        </div>

        <div className="mt-5 rounded-md border border-[var(--line)] bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">{activeCard?.label}</h3>

          {active === "stock-summary" && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Item Code</th>
                  <th>Item</th>
                  <th className="pr-4 text-right">Quantity</th>
                  <th className="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {stockSummaryRows.map((r) => (
                  <tr key={r.code} className="border-b border-slate-100">
                    <td className="py-2 font-mono text-xs">{r.code}</td>
                    <td>
                      <Link to={`/stock-management/item/${r.code}`} className="text-[var(--primary)] hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="text-right">
                      {r.qty} {r.unit}
                    </td>
                    <td className="text-right font-medium">{money.format(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {(active === "warehouse-stock" || active === "valuation") && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  {active === "warehouse-stock" ? <th className="py-2">Warehouse</th> : <th className="py-2">Item Code</th>}
                  <th>Item</th>
                  <th className="pr-4 text-right">Quantity</th>
                  {active === "valuation" && <th className="text-right">Value</th>}
                </tr>
              </thead>
              <tbody>
                {(active === "warehouse-stock" ? warehouseRows : stockSummaryRows).map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2">{active === "warehouse-stock" ? r.warehouse : <span className="font-mono text-xs">{r.code}</span>}</td>
                    <td>{r.name}</td>
                    <td className="text-right">
                      {r.qty} {r.unit}
                    </td>
                    {active === "valuation" && <td className="text-right font-medium">{money.format(r.value)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {active === "expiry" && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Batch</th>
                  <th>Item</th>
                  <th>Expiry Date</th>
                  <th className="pr-4 text-right">Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expiryRows.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100">
                    <td className="py-2">
                      <Link to={`/stock-management/batch-lot-tracking/${b.id}`} className="font-mono text-xs text-[var(--primary)] hover:underline">
                        {b.id}
                      </Link>
                    </td>
                    <td>{b.item}</td>
                    <td>{b.expiryDate}</td>
                    <td className="text-right">{b.qty}</td>
                    <td>
                      <Badge>{b.derivedStatus}</Badge>
                    </td>
                  </tr>
                ))}
                {expiryRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[var(--muted)]">
                      No batches expiring soon.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </StockLayout>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[var(--ink)]">{value || "—"}</p>
    </div>
  );
}
