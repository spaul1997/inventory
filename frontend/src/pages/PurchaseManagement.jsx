import React, { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { FileText, IndianRupee, PackageCheck, Plus, ShoppingCart, Undo2 } from "lucide-react";
import {
  purchaseEntities,
  poTotals,
} from "../data/purchaseManagement.js";
import { PurchaseSidebar } from "../components/purchase/PurchaseSidebar.jsx";
import { PurchaseList } from "../components/purchase/PurchaseList.jsx";
import { PurchaseForm } from "../components/purchase/PurchaseForm.jsx";
import { WorkflowTimeline } from "../components/purchase/WorkflowTimeline.jsx";
import { DocumentChain } from "../components/purchase/DocumentChain.jsx";
import { Badge, Metric, Panel } from "../components/ui.jsx";
import { usePurchaseData } from "../components/purchase/PurchaseDataContext.jsx";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const editLockedStatuses = ["Approved", "Rejected", "Ordered", "Partially Received", "Received", "Returned", "Cancelled", "Completed"];

function PurchaseLayout({ children }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <PurchaseSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function PurchaseManagementDashboard() {
  const { getRows } = usePurchaseData();
  const requests = getRows("purchase-request");
  const orders = getRows("purchase-order");
  const receipts = getRows("goods-receipt");
  const returns = getRows("purchase-return");

  const pendingRequests = requests.filter((r) => r.status === "Pending Approval").length;
  const openOrders = orders.filter((r) => ["Approved", "Ordered", "Partially Received"].includes(r.status)).length;
  const awaitingReceipt = receipts.filter((r) => r.status === "Pending Inspection").length;
  const activeReturns = returns.filter((r) => ["Pending Approval", "Approved"].includes(r.status)).length;
  const totalValue = orders.reduce((sum, po) => sum + poTotals(po.items).grandTotal, 0);

  const recentOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  return (
    <PurchaseLayout>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--ink)]">Purchase Management</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Manage purchase requests, supplier orders, goods receipts and purchase returns.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/purchase-management/purchase-request/new" className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              <Plus size={15} /> Purchase Request
            </Link>
            <Link to="/purchase-management/purchase-order/new" className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              <Plus size={15} /> Purchase Order
            </Link>
            <Link to="/purchase-management/goods-receipt/new" className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              <Plus size={15} /> Goods Receipt
            </Link>
            <Link to="/purchase-management/purchase-return/new" className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
              <Plus size={15} /> Purchase Return
            </Link>
          </div>
        </div>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Pending Purchase Requests" value={pendingRequests} icon={FileText} tone="warning" />
          <Metric label="Open Purchase Orders" value={openOrders} icon={ShoppingCart} tone="primary" />
          <Metric label="Goods Awaiting Receipt" value={awaitingReceipt} icon={PackageCheck} tone="accent" />
          <Metric label="Purchase Returns" value={activeReturns} icon={Undo2} tone="danger" />
          <Metric label="Total Purchase Value" value={money.format(totalValue)} icon={IndianRupee} tone="success" trend={{ direction: "up", value: "5.8%" }} />
        </section>

        <section className="mt-5">
          <Panel title="Recent Purchase Orders">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="py-3">PO Number</th>
                    <th>Supplier</th>
                    <th>Order Date</th>
                    <th>Expected Date</th>
                    <th className="pr-4 text-right">Items</th>
                    <th className="pr-6 text-right">Total Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((po) => (
                    <tr key={po.id} className="border-b border-slate-100">
                      <td className="py-3">
                        <Link to={`/purchase-management/purchase-order/${po.id}/view`} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                          {po.id}
                        </Link>
                      </td>
                      <td className="font-medium">{po.supplier}</td>
                      <td>{po.date}</td>
                      <td>{po.expectedDate}</td>
                      <td className="pr-4 text-right">{po.items.length}</td>
                      <td className="pr-6 text-right">{money.format(poTotals(po.items).grandTotal)}</td>
                      <td>
                        <Badge>{po.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      </div>
    </PurchaseLayout>
  );
}

export function PurchaseManagementListPage() {
  const { entity } = useParams();
  if (!purchaseEntities[entity]) return <Navigate to="/purchase-management" replace />;
  return (
    <PurchaseLayout>
      <PurchaseList entityKey={entity} />
    </PurchaseLayout>
  );
}

export function PurchaseManagementFormPage({ mode }) {
  const { entity, id } = useParams();
  if (!purchaseEntities[entity]) return <Navigate to="/purchase-management" replace />;

  return (
    <PurchaseLayout>
      <PurchaseForm entityKey={entity} mode={mode} recordId={id} />
    </PurchaseLayout>
  );
}

const detailTabs = ["Overview", "Items", "Goods Receipts", "Purchase Returns", "Payments", "Documents", "Activity Log"];

function PurchaseOrderDetails({ id }) {
  const purchaseData = usePurchaseData();
  const [tab, setTab] = useState("Overview");
  const po = purchaseData.getRecord("purchase-order", id);

  if (!po) return <Navigate to="/purchase-management/purchase-order" replace />;

  const totals = poTotals(po.items);
  const relatedReceipts = purchaseData.getRows("goods-receipt").filter((g) => g.refPO === po.id);
  const relatedReturns = purchaseData.getRows("purchase-return").filter((r) => r.refPO === po.id);
  const paid = po.status === "Received" ? totals.grandTotal : po.status === "Partially Received" ? totals.grandTotal * 0.4 : 0;
  const canEditRecord = !editLockedStatuses.includes(po.status);

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)] print:hidden">
        <Link to="/purchase-management" className="hover:text-[var(--primary)]">
          Purchase Management
        </Link>
        <span>/</span>
        <Link to="/purchase-management/purchase-order" className="hover:text-[var(--primary)]">
          Purchase Order
        </Link>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-xl font-semibold text-[var(--ink)]">{po.id}</h2>
        <Badge>{po.status}</Badge>
        <div className="ml-auto flex gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className="rounded-md border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
            Print
          </button>
          {canEditRecord && (
            <Link to={`/purchase-management/purchase-order/${po.id}/edit`} className="rounded-md bg-[var(--primary)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-[var(--line)] bg-white">
        <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-[var(--line)] px-3 pt-2 print:hidden">
          {detailTabs.map((t) => (
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
            <div className="space-y-5">
              <DocumentChain
                links={[
                  { label: "Purchase Request", id: po.refPR, to: po.refPR && `/purchase-management/purchase-request/${po.refPR}/view` },
                  { label: "Purchase Order", id: po.id },
                  ...(relatedReceipts[0] ? [{ label: "Goods Receipt", id: relatedReceipts[0].id, to: `/purchase-management/goods-receipt/${relatedReceipts[0].id}/view` }] : []),
                ]}
              />
              <WorkflowTimeline steps={["Created", "Approved", "Sent to Supplier", "Received"]} activity={po.activity} />

              <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Supplier" value={po.supplier} />
                <InfoRow label="PO Date" value={po.date} />
                <InfoRow label="Expected Date" value={po.expectedDate} />
                <InfoRow label="Warehouse" value={po.warehouse} />
                <InfoRow label="Payment Terms" value={po.paymentTerms} />
                <InfoRow label="Delivery Terms" value={po.deliveryTerms} />
                <InfoRow label="Prepared By" value={po.preparedBy} />
                <InfoRow label="Approved By" value={po.approvedBy} />
                <InfoRow label="Approval Date" value={po.approvalDate} />
                <InfoRow label="Rejected By" value={po.rejectedBy} />
                <InfoRow label="Rejection Date" value={po.rejectionDate} />
                <InfoRow label="Rejection Reason" value={po.rejectionReason} />
                <InfoRow label="Grand Total" value={money.format(totals.grandTotal)} />
              </div>
            </div>
          )}

          {tab === "Items" && (
            <div className="overflow-x-auto rounded-md border border-[var(--line)]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item) => (
                    <tr key={item.code} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs text-[var(--muted)]">{item.code}</span> {item.name}
                      </td>
                      <td className="px-3 py-2 text-right">{item.qty}</td>
                      <td className="px-3 py-2">{item.unit}</td>
                      <td className="px-3 py-2 text-right">{money.format(item.price)}</td>
                      <td className="px-3 py-2 text-right font-medium">{money.format((item.qty || 0) * (item.price || 0) * (1 - (item.discount || 0) / 100) * (1 + (item.tax || 0) / 100))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--line)] font-semibold text-[var(--ink)]">
                    <td className="px-3 py-2" colSpan={4}>
                      Grand Total
                    </td>
                    <td className="px-3 py-2 text-right">{money.format(totals.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {tab === "Goods Receipts" && (
            <RelatedList
              rows={relatedReceipts}
              empty="No goods receipts recorded against this PO yet."
              columns={[
                { key: "id", label: "GRN Number", to: (r) => `/purchase-management/goods-receipt/${r.id}/view` },
                { key: "date", label: "Receipt Date" },
                { key: "status", label: "Status", badge: true },
              ]}
            />
          )}

          {tab === "Purchase Returns" && (
            <RelatedList
              rows={relatedReturns}
              empty="No purchase returns raised against this PO."
              columns={[
                { key: "id", label: "Return Number", to: (r) => `/purchase-management/purchase-return/${r.id}/view` },
                { key: "date", label: "Return Date" },
                { key: "reason", label: "Reason" },
                { key: "status", label: "Status", badge: true },
              ]}
            />
          )}

          {tab === "Payments" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <InfoCard label="Total Amount" value={money.format(totals.grandTotal)} />
                <InfoCard label="Paid" value={money.format(paid)} />
                <InfoCard label="Balance" value={money.format(totals.grandTotal - paid)} />
              </div>
              {paid > 0 ? (
                <div className="overflow-x-auto rounded-md border border-[var(--line)]">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
                      <tr>
                        <th className="px-3 py-2">Payment Ref</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono text-xs">PAY-{po.id.split("-").pop()}</td>
                        <td className="px-3 py-2">{po.expectedDate}</td>
                        <td className="px-3 py-2">Bank Transfer</td>
                        <td className="px-3 py-2 text-right">{money.format(paid)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">No payments recorded yet.</p>
              )}
            </div>
          )}

          {tab === "Documents" && (
            <div className="space-y-2">
              {[po.quotation, po.supplierDocument].filter(Boolean).length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No documents attached.</p>
              ) : (
                [po.quotation, po.supplierDocument].filter(Boolean).map((doc) => (
                  <div key={doc} className="flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)]">
                    {doc}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "Activity Log" && (
            <ol className="space-y-4">
              {po.activity.map((entry, index) => (
                <li key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                    {index < po.activity.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-[var(--line)]" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-[var(--ink)]">{entry.event}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {entry.date} · {entry.by}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
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

function InfoCard({ label, value }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-slate-50 p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function RelatedList({ rows, columns, empty }) {
  if (rows.length === 0) return <p className="text-sm text-[var(--muted)]">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-md border border-[var(--line)]">
      <table className="w-full min-w-[500px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2">
                  {col.badge ? (
                    <Badge>{row[col.key]}</Badge>
                  ) : col.to ? (
                    <Link to={col.to(row)} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                      {row[col.key]}
                    </Link>
                  ) : (
                    row[col.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
