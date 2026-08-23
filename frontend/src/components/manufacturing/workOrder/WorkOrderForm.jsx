import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Check, ChevronRight as Crumb } from "lucide-react";
import { workOrderActions, WORK_ORDER_STATUSES } from "../../../data/manufacturing/workOrders.js";
import { computeBomCosting } from "../../../data/manufacturing/bom.js";
import { operators as operatorOptions, shifts, workCenters, machines, priorities, money, money0, today } from "../../../data/manufacturing/shared.js";
import { Badge, ConfirmDialog, Panel } from "../../ui.jsx";
import { AuditStrip } from "../AuditStrip.jsx";
import { useManufacturingData } from "../ManufacturingDataContext.jsx";
import { getRequiredMaterials, computeActualCost } from "../manufacturingUtils.js";
import { DocumentChain } from "../../purchase/DocumentChain.jsx";
import { WorkflowTimeline } from "../../purchase/WorkflowTimeline.jsx";
import { useToast } from "../../Toast.jsx";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "materials", label: "Materials" },
  { key: "issues", label: "Material Issues" },
  { key: "operations", label: "Operations" },
  { key: "consumption", label: "Consumption" },
  { key: "fgScrap", label: "Finished Goods & Scrap" },
  { key: "cost", label: "Cost Summary" },
  { key: "activity", label: "Activity" },
];

const LINEAR_STATUSES = WORK_ORDER_STATUSES.filter((s) => s !== "Cancelled");

// The lifecycle can branch (In Progress -> Completed skips On Hold /
// Partially Completed entirely) but WorkflowTimeline assumes a strictly
// linear "done" list — synthesize one from the current status's canonical
// position so a skipped optional step doesn't show as "current" after the
// work order has already moved past it.
function timelineActivity(status) {
  const index = LINEAR_STATUSES.indexOf(status);
  if (index < 0) return [];
  return LINEAR_STATUSES.slice(0, index + 1).map((event) => ({ event }));
}

function nextWoId(rows) {
  const nums = rows.map((r) => parseInt(r.id.split("-").pop(), 10)).filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 80) + 1;
  return `WO-2026-${String(next).padStart(4, "0")}`;
}

export function WorkOrderForm({ mode, recordId }) {
  const manufacturingData = useManufacturingData();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isView = mode === "view";
  const isCreate = mode === "create";

  const existingRecord = recordId ? manufacturingData.getRecord("work-order", recordId) : null;
  const convertFrom = !recordId ? location.state?.convertFrom : null;
  const duplicateFrom = !recordId ? location.state?.duplicateFrom : null;

  const products = manufacturingData.getRows("product-finished-goods");
  const workOrderRows = manufacturingData.getRows("work-order");

  const [values, setValues] = useState(() => {
    if (existingRecord) return { ...existingRecord };

    const base = {
      id: nextWoId(workOrderRows),
      date: today(),
      planRef: "",
      salesOrderRef: "",
      product: "",
      productName: "",
      bomId: "",
      bomVersionUsed: "",
      plannedQty: "",
      uom: "PCS",
      batchNumber: "",
      plant: "Main Manufacturing Plant",
      warehouse: "Finished Goods Warehouse",
      productionLine: "",
      workCenter: "",
      machine: "",
      supervisor: "",
      operators: [],
      shift: shifts[0],
      priority: "Normal",
      plannedStart: "",
      plannedEnd: "",
      actualStart: "",
      actualEnd: "",
      qualityCheckRequired: true,
      instructions: "",
      holdReason: "",
      status: "Draft",
      activity: [{ event: "Draft", date: today(), by: "You" }],
    };

    if (duplicateFrom) {
      return { ...duplicateFrom, ...base, planRef: duplicateFrom.planRef, activity: [{ event: "Draft", date: today(), by: "You" }], createdBy: undefined, createdAt: undefined, updatedBy: undefined, updatedAt: undefined };
    }

    if (convertFrom?.entityKey === "production-planning") {
      const plan = convertFrom.record;
      const item = plan.items[0];
      const bom = item ? manufacturingData.getActiveBom(item.product) : null;
      return {
        ...base,
        planRef: plan.id,
        product: item?.product || "",
        productName: item?.productName || "",
        bomId: bom?.id || "",
        bomVersionUsed: bom?.revisionNumber || "",
        plannedQty: item?.plannedQty || "",
        uom: item?.uom || "PCS",
        plant: plan.plant,
        warehouse: plan.warehouse,
        productionLine: plan.productionLine,
        supervisor: plan.supervisor,
        shift: plan.shift,
        priority: item?.priority || plan.priority,
        plannedStart: `${today()}T08:00`,
        plannedEnd: item?.requiredDate ? `${item.requiredDate}T18:00` : "",
      };
    }

    return base;
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [errorBanner, setErrorBanner] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [holdReasonDraft, setHoldReasonDraft] = useState("");

  const isPersisted = !isCreate;
  const bom = values.bomId ? manufacturingData.getBom(values.bomId) : null;
  const requiredMaterials = useMemo(() => getRequiredMaterials(values, bom), [values.plannedQty, bom]);
  const issuedTotals = isPersisted ? manufacturingData.getIssuedForWorkOrder(values.id) : {};

  const linkedIssues = isPersisted ? manufacturingData.getRows("material-issue").filter((r) => r.workOrder === values.id) : [];
  const linkedProcess = isPersisted ? manufacturingData.getRows("production-process").filter((r) => r.workOrder === values.id) : [];
  const linkedConsumption = isPersisted ? manufacturingData.getRows("material-consumption").filter((r) => r.workOrder === values.id) : [];
  const linkedFg = isPersisted ? manufacturingData.getRows("finished-goods").filter((r) => r.workOrder === values.id) : [];
  const linkedScrap = isPersisted ? manufacturingData.getRows("scrap-wastage").filter((r) => r.workOrder === values.id) : [];

  const costs = isPersisted ? computeActualCost(values, manufacturingData) : { materialCost: 0, laborMachineCost: 0, overheadCost: 0, scrapCost: 0, actualTotalCost: 0, standardCost: bom ? bom.costPerUnit * (Number(values.plannedQty) || 0) : 0, variance: 0 };

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleProductChange(code) {
    const product = products.find((p) => p.code === code);
    const activeBom = manufacturingData.getActiveBom(code);
    setValues((prev) => ({ ...prev, product: code, productName: product?.name || "", uom: product?.uom || "PCS", bomId: activeBom?.id || "", bomVersionUsed: activeBom?.revisionNumber || "" }));
  }

  function toggleOperator(name) {
    setValues((prev) => ({ ...prev, operators: prev.operators.includes(name) ? prev.operators.filter((o) => o !== name) : [...prev.operators, name] }));
  }

  function validate() {
    if (!values.product || !values.plannedQty || !values.plant || !values.warehouse) {
      setErrorBanner("Product, planned quantity, plant and warehouse are required.");
      return false;
    }
    setErrorBanner("");
    return true;
  }

  function persist(patch) {
    const record = { ...values, ...patch, updatedBy: "You", updatedAt: new Date().toISOString().slice(0, 16) };
    if (isCreate) {
      record.createdBy = "You";
      record.createdAt = new Date().toISOString().slice(0, 16);
      manufacturingData.addRow("work-order", record);
    } else {
      manufacturingData.updateRow("work-order", values.id, record);
    }
    setValues(record);
    return record;
  }

  function handleSaveDraft() {
    persist({ status: "Draft" });
    showToast(`${values.id} saved as Draft.`);
    navigate("/manufacturing/work-order");
  }

  function runTransition(action) {
    if (action.requiresReason) {
      setPendingAction(action);
      return;
    }
    if (action.confirm) {
      setPendingAction(action);
      return;
    }
    if (action.to === "Pending Approval" || action.to === "Released" || action.to === "In Progress" || action.to === "Approved") {
      if (!validate()) return;
    }
    applyTransition(action);
  }

  function applyTransition(action, extra = {}) {
    const patch = { status: action.to, ...extra, activity: [...(values.activity || []), { event: action.to, date: today(), by: "You" }] };
    if (action.to === "In Progress" && !values.actualStart) patch.actualStart = new Date().toISOString().slice(0, 16);
    if (action.to === "Completed") patch.actualEnd = new Date().toISOString().slice(0, 16);
    persist(patch);
    showToast(`${values.id} is now ${action.to}.`);
    setPendingAction(null);
    setHoldReasonDraft("");
  }

  function handleFirstSave() {
    if (!validate()) return;
    persist({ status: "Draft" });
    showToast(`${values.id} created.`);
    navigate(`/manufacturing/work-order/${values.id}/view`);
  }

  const inputClass = "w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)]";
  const disabled = isView;
  const actions = workOrderActions[values.status] || [];

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)] print:hidden">
        <Link to="/manufacturing/manufacturing-dashboard" className="hover:text-[var(--primary)]">
          Manufacturing
        </Link>
        <Crumb size={12} />
        <Link to="/manufacturing/work-order" className="hover:text-[var(--primary)]">
          Work Order
        </Link>
        <Crumb size={12} />
        <span className="text-[var(--ink)]">{isView ? values.id : isCreate ? "New Work Order" : `Edit ${values.id}`}</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-[var(--ink)]">{isCreate ? "New Work Order" : `${values.id} — ${values.productName || "Untitled"}`}</h2>
        {!isCreate && <Badge>{values.status}</Badge>}
      </div>
      {isView && <AuditStrip record={values} />}

      {isPersisted && (
        <div className="mt-3 rounded-md border border-[var(--line)] bg-white p-4 print:hidden">
          <WorkflowTimeline steps={LINEAR_STATUSES} activity={timelineActivity(values.status)} />
        </div>
      )}

      {errorBanner && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 print:hidden">
          <AlertCircle size={16} />
          {errorBanner}
        </div>
      )}

      <div className="mt-4 rounded-md border border-[var(--line)] bg-white">
        <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-[var(--line)] px-3 pt-2 print:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-t-md border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === "overview" && (
            <div className="space-y-5">
              {isPersisted && (
                <DocumentChain
                  links={[
                    { id: values.planRef, label: "Production Plan", to: values.planRef ? `/manufacturing/production-planning/${values.planRef}/view` : null },
                    { id: values.id, label: "Work Order" },
                    { id: linkedIssues[0]?.id, label: "Material Issue", to: linkedIssues[0] ? `/manufacturing/material-issue/${linkedIssues[0].id}/view` : null },
                    { id: linkedFg[0]?.id, label: "Finished Goods Receipt", to: linkedFg[0] ? `/manufacturing/finished-goods/${linkedFg[0].id}/view` : null },
                  ]}
                />
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <TextField label="Work Order Number" value={values.id} disabled />
                <TextField label="Work Order Date" type="date" value={values.date} disabled={disabled} onChange={(v) => setField("date", v)} />
                <TextField label="Production Plan Reference" value={values.planRef} disabled />
                <SelectField
                  label="Finished Product"
                  required
                  value={values.product}
                  disabled={disabled || isPersisted}
                  onChange={handleProductChange}
                  options={products.map((p) => ({ value: p.code, label: `${p.code} — ${p.name}` }))}
                />
                <TextField label="BOM Used" value={bom ? `${bom.id} (${bom.revisionNumber})` : "No active BOM"} disabled />
                <TextField label="Planned Quantity" type="number" required value={values.plannedQty} disabled={disabled} onChange={(v) => setField("plannedQty", v)} />
                <TextField label="Unit of Measure" value={values.uom} disabled />
                <TextField label="Batch Number" value={values.batchNumber} disabled={disabled} onChange={(v) => setField("batchNumber", v)} />
                <SelectField label="Plant" required value={values.plant} disabled={disabled} onChange={(v) => setField("plant", v)} options={[{ value: "Main Manufacturing Plant", label: "Main Manufacturing Plant" }]} />
                <SelectField
                  label="Warehouse"
                  required
                  value={values.warehouse}
                  disabled={disabled}
                  onChange={(v) => setField("warehouse", v)}
                  options={["Finished Goods Warehouse", "Main Manufacturing Plant"].map((v) => ({ value: v, label: v }))}
                />
                <SelectField label="Production Line" value={values.productionLine} disabled={disabled} onChange={(v) => setField("productionLine", v)} options={workCenters.map((v) => ({ value: v, label: v }))} />
                <SelectField label="Work Center" value={values.workCenter} disabled={disabled} onChange={(v) => setField("workCenter", v)} options={workCenters.map((v) => ({ value: v, label: v }))} />
                <SelectField label="Assigned Machine" value={values.machine} disabled={disabled} onChange={(v) => setField("machine", v)} options={machines.map((v) => ({ value: v, label: v }))} />
                <TextField label="Supervisor" value={values.supervisor} disabled={disabled} onChange={(v) => setField("supervisor", v)} />
                <SelectField label="Shift" value={values.shift} disabled={disabled} onChange={(v) => setField("shift", v)} options={shifts.map((v) => ({ value: v, label: v }))} />
                <SelectField label="Priority" value={values.priority} disabled={disabled} onChange={(v) => setField("priority", v)} options={priorities.map((v) => ({ value: v, label: v }))} />
                <TextField label="Planned Start" type="text" placeholder="YYYY-MM-DDTHH:MM" value={values.plannedStart} disabled={disabled} onChange={(v) => setField("plannedStart", v)} />
                <TextField label="Planned End" type="text" placeholder="YYYY-MM-DDTHH:MM" value={values.plannedEnd} disabled={disabled} onChange={(v) => setField("plannedEnd", v)} />
                <TextField label="Actual Start" value={values.actualStart} disabled />
                <TextField label="Actual End" value={values.actualEnd} disabled />
                <ToggleField label="Quality Inspection Required" value={values.qualityCheckRequired} disabled={disabled} onChange={(v) => setField("qualityCheckRequired", v)} />
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-[var(--ink)]">Assigned Operators</p>
                <div className="flex flex-wrap gap-2">
                  {operatorOptions.map((name) => {
                    const selected = values.operators.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleOperator(name)}
                        className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium ${selected ? "border-[var(--primary)] bg-blue-50 text-[var(--primary)]" : "border-[var(--line)] text-[var(--ink)] hover:bg-slate-50"}`}
                      >
                        {selected && <Check size={12} />}
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Production Instructions</label>
                <textarea value={values.instructions} disabled={disabled} onChange={(e) => setField("instructions", e.target.value)} rows={3} className={inputClass} />
              </div>
              {values.holdReason && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <span className="font-semibold">Hold reason:</span> {values.holdReason}
                </div>
              )}
            </div>
          )}

          {activeTab === "materials" && (
            <div>
              {!bom ? (
                <EmptyNote text="No active BOM for this product yet — required materials cannot be calculated." />
              ) : (
                <div className="overflow-x-auto rounded-md border border-[var(--line)]">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
                      <tr>
                        <th className="px-3 py-2">Material</th>
                        <th className="px-3 py-2 text-right">Required Qty</th>
                        <th className="px-3 py-2 text-right">Issued Qty</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                        <th className="px-3 py-2">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requiredMaterials.map((line) => {
                        const issued = issuedTotals[line.code] || 0;
                        const balance = Math.max(0, line.requiredQty - issued);
                        return (
                          <tr key={line.code} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-medium text-[var(--ink)]">
                              {line.code} — {line.name}
                            </td>
                            <td className="px-3 py-2 text-right">{line.requiredQty.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-emerald-700">{issued.toFixed(2)}</td>
                            <td className={`px-3 py-2 text-right font-medium ${balance > 0 ? "text-[var(--warning)]" : "text-emerald-700"}`}>{balance.toFixed(2)}</td>
                            <td className="px-3 py-2">{line.unit}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "issues" && (
            <LinkedRecordsTable
              title="Material Issues"
              rows={linkedIssues}
              isPersisted={isPersisted}
              newLabel="New Material Issue"
              onNew={() => navigate("/manufacturing/material-issue/new", { state: { presetWorkOrder: values.id } })}
              columns={[
                { key: "id", label: "Issue No", link: (r) => `/manufacturing/material-issue/${r.id}/view` },
                { key: "date", label: "Date" },
                { key: "items", label: "Materials", render: (r) => r.items.map((i) => i.name).join(", ") },
                { key: "status", label: "Status", badge: true },
              ]}
            />
          )}

          {activeTab === "operations" && (
            <div className="space-y-5">
              <Panel title="Planned Operations (from BOM)">
                {!bom ? (
                  <EmptyNote text="No active BOM — no routing defined." />
                ) : (
                  <div className="overflow-x-auto rounded-md border border-[var(--line)]">
                    <table className="w-full min-w-[600px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
                        <tr>
                          <th className="px-3 py-2">Seq</th>
                          <th className="px-3 py-2">Operation</th>
                          <th className="px-3 py-2">Work Center</th>
                          <th className="px-3 py-2 text-right">Std Time (min/unit)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bom.operationLines.map((op) => (
                          <tr key={op.seq} className="border-t border-slate-100">
                            <td className="px-3 py-2">{op.seq}</td>
                            <td className="px-3 py-2 font-medium text-[var(--ink)]">{op.operationName}</td>
                            <td className="px-3 py-2">{op.workCenter}</td>
                            <td className="px-3 py-2 text-right">{op.standardTimeMins}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
              <LinkedRecordsTable
                title="Production Process Entries (actual)"
                rows={linkedProcess}
                isPersisted={isPersisted}
                newLabel="Log Process Entry"
                onNew={() => navigate("/manufacturing/production-process/new", { state: { presetWorkOrder: values.id } })}
                columns={[
                  { key: "id", label: "Entry No", link: (r) => `/manufacturing/production-process/${r.id}/view` },
                  { key: "operationName", label: "Operation" },
                  { key: "qtyProduced", label: "Produced", align: "right", render: (r) => `${r.qtyProduced} / ${r.plannedQty}` },
                  { key: "status", label: "Status", badge: true },
                ]}
              />
            </div>
          )}

          {activeTab === "consumption" && (
            <LinkedRecordsTable
              title="Material Consumption"
              rows={linkedConsumption}
              isPersisted={isPersisted}
              newLabel="New Consumption Entry"
              onNew={() => navigate("/manufacturing/material-consumption/new", { state: { presetWorkOrder: values.id } })}
              columns={[
                { key: "id", label: "Entry No", link: (r) => `/manufacturing/material-consumption/${r.id}/view` },
                { key: "date", label: "Date" },
                { key: "items", label: "Materials", render: (r) => r.items.map((i) => i.name).join(", ") },
                { key: "status", label: "Status", badge: true },
              ]}
            />
          )}

          {activeTab === "fgScrap" && (
            <div className="space-y-5">
              <LinkedRecordsTable
                title="Finished Goods Receipts"
                rows={linkedFg}
                isPersisted={isPersisted}
                newLabel="Receive Finished Goods"
                onNew={() => navigate("/manufacturing/finished-goods/new", { state: { presetWorkOrder: values.id } })}
                columns={[
                  { key: "id", label: "Receipt No", link: (r) => `/manufacturing/finished-goods/${r.id}/view` },
                  { key: "date", label: "Date" },
                  { key: "qty", label: "Received", align: "right", render: (r) => r.items.reduce((s, i) => s + (Number(i.qtyReceived) || 0), 0) },
                  { key: "status", label: "Status", badge: true },
                ]}
              />
              <LinkedRecordsTable
                title="Scrap / Wastage"
                rows={linkedScrap}
                isPersisted={isPersisted}
                newLabel="Log Scrap"
                onNew={() => navigate("/manufacturing/scrap-wastage/new", { state: { presetWorkOrder: values.id } })}
                columns={[
                  { key: "id", label: "Entry No", link: (r) => `/manufacturing/scrap-wastage/${r.id}/view` },
                  { key: "stage", label: "Stage" },
                  { key: "items", label: "Component(s)", render: (r) => r.items.map((i) => `${i.componentName} (${i.qty})`).join(", ") },
                  { key: "status", label: "Status", badge: true },
                ]}
              />
            </div>
          )}

          {activeTab === "cost" && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CostStat label="Actual Material Cost" value={costs.materialCost} />
              <CostStat label="Actual Labor + Machine Cost" value={costs.laborMachineCost} />
              <CostStat label="Overhead" value={costs.overheadCost} />
              <CostStat label="Scrap Cost" value={costs.scrapCost} />
              <CostStat label="Standard Cost (BOM)" value={costs.standardCost} />
              <CostStat label="Actual Total Cost" value={costs.actualTotalCost} emphasize />
              <div className="col-span-2 sm:col-span-3">
                <div className={`rounded-md border p-3 ${costs.variance > 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                  <p className="text-xs text-[var(--muted)]">Cost Variance (Actual − Standard)</p>
                  <p className={`mt-1 text-lg font-semibold ${costs.variance > 0 ? "text-[var(--danger)]" : "text-emerald-700"}`}>
                    {costs.variance > 0 ? "+" : ""}
                    {money0.format(costs.variance)} {costs.variance > 0 ? "over budget" : "under budget"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-4">
              <WorkflowTimeline steps={LINEAR_STATUSES} activity={timelineActivity(values.status)} />
              <div className="overflow-x-auto rounded-md border border-[var(--line)]">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(values.activity || []).map((entry, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-[var(--ink)]">{entry.event}</td>
                        <td className="px-3 py-2">{entry.date}</td>
                        <td className="px-3 py-2">{entry.by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-end gap-2 rounded-md border border-[var(--line)] bg-white/95 p-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur print:hidden">
        <button type="button" onClick={() => navigate("/manufacturing/work-order")} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
          {isView ? "Close" : "Cancel"}
        </button>
        {isView && (
          <button type="button" onClick={() => window.print()} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
            Print Job Card
          </button>
        )}
        {isCreate && (
          <button type="button" onClick={handleFirstSave} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
            Save Draft
          </button>
        )}
        {mode === "edit" && (
          <>
            <button type="button" onClick={handleSaveDraft} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Save Changes
            </button>
            <Link to={`/manufacturing/work-order/${values.id}/view`} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
              Done Editing
            </Link>
          </>
        )}
        {isView &&
          actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => runTransition(action)}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                action.kind === "primary" ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-deep)]" : action.tone === "danger" ? "border border-red-200 text-[var(--danger)] hover:bg-red-50" : "border border-[var(--line)] text-[var(--ink)] hover:bg-slate-50"
              }`}
            >
              {action.label}
            </button>
          ))}
        {isView && values.status === "Draft" && (
          <Link to={`/manufacturing/work-order/${values.id}/edit`} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
            Edit
          </Link>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction) && !pendingAction?.requiresReason}
        title={pendingAction?.confirm || `${pendingAction?.label}?`}
        message={`This will update ${values.id} to "${pendingAction?.to}".`}
        confirmLabel={pendingAction?.label}
        tone={pendingAction?.tone === "danger" ? "danger" : "primary"}
        onConfirm={() => applyTransition(pendingAction)}
        onCancel={() => setPendingAction(null)}
      />

      {pendingAction?.requiresReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-md border border-[var(--line)] bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-[var(--ink)]">Hold Work Order</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Provide a reason for placing {values.id} on hold.</p>
            <textarea
              value={holdReasonDraft}
              onChange={(e) => setHoldReasonDraft(e.target.value)}
              rows={3}
              placeholder="e.g. Material shortage — awaiting stainless sheet delivery"
              className="mt-3 w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setPendingAction(null); setHoldReasonDraft(""); }} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                disabled={!holdReasonDraft.trim()}
                onClick={() => applyTransition(pendingAction, { holdReason: holdReasonDraft.trim() })}
                className="rounded-md bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TextField({ label, value, onChange, disabled, required, type = "text", placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </label>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        disabled={disabled || !onChange}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)]"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, disabled, required, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </label>
      <select
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)]"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({ label, value, onChange, disabled }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] px-3 py-2.5">
      <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        aria-pressed={Boolean(value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${value ? "bg-[var(--primary)]" : "bg-slate-200"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function EmptyNote({ text }) {
  return <p className="rounded-md border border-dashed border-[var(--line)] bg-slate-50 px-4 py-6 text-center text-sm text-[var(--muted)]">{text}</p>;
}

function CostStat({ label, value, emphasize }) {
  return (
    <div className={`rounded-md border p-3 ${emphasize ? "border-[var(--primary)] bg-blue-50" : "border-[var(--line)] bg-white"}`}>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${emphasize ? "text-[var(--primary)]" : "text-[var(--ink)]"}`}>{money0.format(value)}</p>
    </div>
  );
}

function LinkedRecordsTable({ title, rows, columns, isPersisted, newLabel, onNew }) {
  return (
    <Panel
      title={title}
      action={
        isPersisted && (
          <button type="button" onClick={onNew} className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-deep)]">
            {newLabel}
          </button>
        )
      }
    >
      {!isPersisted ? (
        <EmptyNote text="Save this work order first to create linked records." />
      ) : rows.length === 0 ? (
        <EmptyNote text="Nothing recorded yet." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--line)]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right" : ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  {columns.map((c) => {
                    const val = c.render ? c.render(row) : row[c.key];
                    return (
                      <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right" : ""}`}>
                        {c.badge ? <Badge>{val}</Badge> : c.link ? (
                          <Link to={c.link(row)} className="font-mono text-xs font-medium text-[var(--primary)] hover:underline">
                            {val}
                          </Link>
                        ) : (
                          val
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
