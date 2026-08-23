import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertOctagon, PackageCheck, PackagePlus, Wallet } from "lucide-react";
import { Badge, Panel } from "../ui.jsx";
import { categoryPalette, ReportHeader } from "./reportUtils.jsx";
import { money0, number } from "../../data/manufacturing/shared.js";
import { useManufacturingData } from "../manufacturing/ManufacturingDataContext.jsx";
import { DateRangeFilter, inDateRange, useDateRangeFilter, KpiRow, ReportActionsBar, filterSelectClass } from "./reportShared.jsx";

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const QC_STATUSES = ["Pending", "Passed", "Passed with Rejections", "Failed"];
const STATUS_OPTIONS = ["Draft", "Pending QC", "Completed"];

export function FinishedGoodsReport() {
  const manufacturingData = useManufacturingData();
  const receipts = manufacturingData.getRows("finished-goods");
  const products = manufacturingData.getRows("product-finished-goods");

  const { preset, setPreset, custom, setCustom, range } = useDateRangeFilter("all");
  const [productFilter, setProductFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [qcFilter, setQcFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const flatRows = useMemo(
    () =>
      receipts.flatMap((r) =>
        (r.items || []).map((item, idx) => ({
          key: `${r.id}-${idx}`,
          receiptId: r.id,
          date: r.date,
          workOrder: r.workOrder,
          productName: r.productName,
          warehouse: r.warehouse,
          qcStatus: r.qcStatus,
          status: r.status,
          qtyReceived: Number(item.qtyReceived) || 0,
          qtyRejectedQC: Number(item.qtyRejectedQC) || 0,
          unitCost: Number(item.unitCost) || 0,
          value: (Number(item.qtyReceived) || 0) * (Number(item.unitCost) || 0),
        }))
      ),
    [receipts]
  );

  const productNames = [...new Set(flatRows.map((r) => r.productName))].sort();
  const warehouses = [...new Set(flatRows.map((r) => r.warehouse))].filter(Boolean).sort();

  const filtered = flatRows.filter((r) => {
    if (!inDateRange(r.date, range)) return false;
    if (productFilter && r.productName !== productFilter) return false;
    if (warehouseFilter && r.warehouse !== warehouseFilter) return false;
    if (qcFilter && r.qcStatus !== qcFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const totalReceived = filtered.reduce((s, r) => s + r.qtyReceived, 0);
  const totalRejected = filtered.reduce((s, r) => s + r.qtyRejectedQC, 0);
  const qcPassRate = totalReceived + totalRejected > 0 ? (totalReceived / (totalReceived + totalRejected)) * 100 : 100;
  const stockValueOnHand = products.reduce((s, p) => s + (Number(p.stock) || 0) * (Number(p.sellingPrice) || 0), 0);
  const belowReorderCount = products.filter((p) => (Number(p.stock) || 0) < (Number(p.reorderLevel) || 0)).length;

  const trend = useMemo(() => {
    const byDate = new Map();
    filtered.forEach((r) => {
      const entry = byDate.get(r.date) || { date: r.date, qty: 0 };
      entry.qty += r.qtyReceived;
      byDate.set(r.date, entry);
    });
    return [...byDate.values()].sort((a, b) => new Date(a.date) - new Date(b.date)).map((e) => ({ ...e, label: dayLabel.format(new Date(e.date)) }));
  }, [filtered]);

  const qcBreakdown = useMemo(() => {
    const map = new Map();
    receipts.forEach((r) => {
      if (!inDateRange(r.date, range)) return;
      const entry = map.get(r.qcStatus) || { name: r.qcStatus, value: 0 };
      entry.value += 1;
      map.set(r.qcStatus, entry);
    });
    return [...map.values()];
  }, [receipts, range]);

  const columns = [
    { key: "receiptId", label: "Receipt No" },
    { key: "date", label: "Date" },
    { key: "workOrder", label: "Work Order" },
    { key: "productName", label: "Product" },
    { key: "qtyReceived", label: "Qty Received" },
    { key: "qtyRejectedQC", label: "Qty Rejected (QC)" },
    { key: "qcStatus", label: "QC Status" },
    { key: "warehouse", label: "Warehouse" },
    { key: "value", label: "Value", render: (r) => r.value.toFixed(2) },
  ];

  return (
    <div>
      <ReportHeader icon={PackagePlus} title="Finished Goods Report" subtitle="Finished-goods receipts, QC outcomes and stock on hand by product." />

      <div className="mb-4">
        <DateRangeFilter preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
      </div>

      <KpiRow
        items={[
          { label: "Total Qty Received", value: number.format(totalReceived), icon: PackagePlus, tone: "primary" },
          { label: "Total Rejected (QC)", value: number.format(totalRejected), icon: AlertOctagon, tone: totalRejected > 0 ? "danger" : "success" },
          { label: "QC Pass Rate", value: `${qcPassRate.toFixed(1)}%`, icon: PackageCheck, tone: "success" },
          { label: "Stock Value on Hand", value: money0.format(stockValueOnHand), sub: `${belowReorderCount} product(s) below reorder level`, icon: Wallet, tone: belowReorderCount > 0 ? "warning" : "accent" },
        ]}
      />

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel eyebrow="Trend" title="Receipts Over Time" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="fgReceiptFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="qty" name="Qty Received" stroke="var(--primary)" strokeWidth={2} fill="url(#fgReceiptFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Quality" title="QC Outcome Split" accent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Pie data={qcBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {qcBreakdown.map((e, i) => (
                    <Cell key={e.name} fill={categoryPalette[i % categoryPalette.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel
          title="Finished Goods Register"
          action={
            <ReportActionsBar
              reportKey="finished-goods-report"
              reportLabel="Finished Goods Report"
              columns={columns}
              rows={filtered}
              filters={{ productFilter, warehouseFilter, qcFilter, statusFilter }}
              onApplyView={(f) => {
                setProductFilter(f.productFilter || "");
                setWarehouseFilter(f.warehouseFilter || "");
                setQcFilter(f.qcFilter || "");
                setStatusFilter(f.statusFilter || "");
              }}
            />
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Product: All</option>
              {productNames.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Warehouse: All</option>
              {warehouses.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <select value={qcFilter} onChange={(e) => setQcFilter(e.target.value)} className={filterSelectClass}>
              <option value="">QC Status: All</option>
              {QC_STATUSES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
              <option value="">Status: All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Receipt No</th>
                  <th>Date</th>
                  <th>Work Order</th>
                  <th>Product</th>
                  <th className="text-right">Received</th>
                  <th className="text-right">Rejected (QC)</th>
                  <th>QC Status</th>
                  <th>Warehouse</th>
                  <th className="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.key} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-2.5">
                      <Link to={`/manufacturing/finished-goods/${r.receiptId}/view`} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                        {r.receiptId}
                      </Link>
                    </td>
                    <td>{r.date}</td>
                    <td className="font-mono text-xs">{r.workOrder}</td>
                    <td>{r.productName}</td>
                    <td className="text-right">{r.qtyReceived}</td>
                    <td className="text-right text-[var(--danger)]">{r.qtyRejectedQC || ""}</td>
                    <td>
                      <Badge>{r.qcStatus}</Badge>
                    </td>
                    <td className="text-[var(--muted)]">{r.warehouse}</td>
                    <td className="text-right font-medium">{money0.format(r.value)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-[var(--muted)]">
                      No receipts match your filters.
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
