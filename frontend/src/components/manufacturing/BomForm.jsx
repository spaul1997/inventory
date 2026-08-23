import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ChevronRight as Crumb, Plus, Trash2 } from "lucide-react";
import { computeBomCosting } from "../../data/manufacturing/bom.js";
import { materials, materialByCode, workCenters, machines, money, today } from "../../data/manufacturing/shared.js";
import { Badge, ConfirmDialog, Panel } from "../ui.jsx";
import { AuditStrip } from "./AuditStrip.jsx";
import { useManufacturingData } from "./ManufacturingDataContext.jsx";
import { useToast } from "../Toast.jsx";

function nextBomVersion(productCode, rows) {
  const forProduct = rows.filter((b) => b.product === productCode);
  const maxVersion = forProduct.reduce((max, b) => Math.max(max, Number(b.version) || 0), 0);
  return maxVersion + 1;
}

function nextBomId(productCode, rows) {
  const suffix = productCode.split("-").pop();
  const count = rows.filter((b) => b.product === productCode).length;
  return count === 0 ? `BOM-${suffix}` : `BOM-${suffix}-V${count + 1}`;
}

function emptyMaterialLine() {
  return { code: "", name: "", category: "", qtyPerUnit: "", unit: "", unitCost: "", wastagePercent: "", issueMethod: "Manual", consumptionStage: "", remarks: "" };
}

function emptyOperationLine(seq) {
  return { seq, operationName: "", workCenter: "", machine: "", department: "Production", setupTimeMins: "", standardTimeMins: "", laborCount: 1, laborRatePerHour: "", machineRatePerHour: "", expectedOutput: "", qualityCheckpoint: false, instructions: "" };
}

export function BomForm({ mode, recordId }) {
  const manufacturingData = useManufacturingData();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isView = mode === "view";

  const existingRecord = recordId ? manufacturingData.getRecord("bill-of-materials-bom", recordId) : null;
  const duplicateFrom = !recordId ? location.state?.duplicateFrom : null;

  const products = manufacturingData.getRows("product-finished-goods");
  const bomRows = manufacturingData.getRows("bill-of-materials-bom");

  const [values, setValues] = useState(() => {
    if (existingRecord) return { ...existingRecord };
    if (duplicateFrom) {
      const version = nextBomVersion(duplicateFrom.product, bomRows);
      return {
        ...duplicateFrom,
        id: nextBomId(duplicateFrom.product, bomRows),
        version,
        revisionNumber: `R${version}`,
        isDefault: false,
        status: "Draft",
        approvedBy: "",
        approvalDate: "",
        effectiveDate: today(),
        effectiveEndDate: "",
        activity: [{ event: "Draft", date: today(), by: "You" }],
        createdBy: undefined,
        createdAt: undefined,
        updatedBy: undefined,
        updatedAt: undefined,
      };
    }
    return {
      id: "",
      name: "",
      product: "",
      productName: "",
      version: 1,
      revisionNumber: "R1",
      isDefault: false,
      batchSize: 100,
      uom: "PCS",
      effectiveDate: today(),
      effectiveEndDate: "",
      plant: "Main Manufacturing Plant",
      productionLine: "",
      overheadPercent: 8,
      wastagePercent: 2,
      overheadMethod: "% of Prime Cost",
      status: "Draft",
      preparedBy: "You",
      approvedBy: "",
      approvalDate: "",
      notes: "",
      materialLines: [emptyMaterialLine()],
      operationLines: [emptyOperationLine(1)],
      activity: [{ event: "Draft", date: today(), by: "You" }],
    };
  });

  const [errorBanner, setErrorBanner] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const costing = useMemo(() => computeBomCosting(values), [values]);

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleProductChange(code) {
    const product = products.find((p) => p.code === code);
    const id = code ? nextBomId(code, bomRows) : "";
    const version = code ? nextBomVersion(code, bomRows) : 1;
    setValues((prev) => ({ ...prev, product: code, productName: product?.name || "", uom: product?.uom || "PCS", id: prev.id || id, version, revisionNumber: `R${version}` }));
  }

  function updateMaterialLine(index, patch) {
    setValues((prev) => {
      const lines = [...prev.materialLines];
      const next = { ...lines[index], ...patch };
      if (patch.code) {
        const mat = materialByCode(patch.code);
        next.name = mat?.name || "";
        next.unit = mat?.unit || "";
        next.unitCost = mat?.price ?? next.unitCost;
      }
      lines[index] = next;
      return { ...prev, materialLines: lines };
    });
  }

  function updateOperationLine(index, patch) {
    setValues((prev) => {
      const lines = [...prev.operationLines];
      lines[index] = { ...lines[index], ...patch };
      return { ...prev, operationLines: lines };
    });
  }

  function validate() {
    if (!values.product || !values.batchSize || values.materialLines.every((l) => !l.code)) {
      setErrorBanner("Select a product, batch size, and at least one material line before submitting.");
      return false;
    }
    setErrorBanner("");
    return true;
  }

  function executeAction(action) {
    const record = {
      ...values,
      status: action.status || values.status,
      activity: [...(values.activity || []), { event: action.status || action.label, date: today(), by: "You" }],
      updatedBy: "You",
      updatedAt: new Date().toISOString().slice(0, 16),
      ...(mode !== "edit" ? { createdBy: "You", createdAt: new Date().toISOString().slice(0, 16) } : {}),
    };

    if (mode === "edit") manufacturingData.updateRow("bill-of-materials-bom", recordId, record);
    else manufacturingData.addRow("bill-of-materials-bom", record);

    if (action.activate) manufacturingData.activateBom(record.id);

    showToast(action.status ? `${record.id} updated to "${action.status}".` : `BOM saved.`);
    setPendingAction(null);
    navigate("/manufacturing/bill-of-materials-bom");
  }

  function handleAction(action) {
    if (action.print) {
      window.print();
      return;
    }
    if (action.validate && !validate()) return;
    if (action.confirm) {
      setPendingAction(action);
      return;
    }
    executeAction(action);
  }

  const actionsForStatus = {
    Draft: [{ key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft" }, { key: "submit", label: "Submit for Approval", kind: "primary", status: "Pending Approval", validate: true }],
    "Pending Approval": [{ key: "approve", label: "Approve", kind: "primary", status: "Approved", validate: true }],
    Approved: [{ key: "activate", label: "Activate", kind: "primary", status: "Active", activate: true, validate: true }],
    Active: [{ key: "obsolete", label: "Discontinue Version", kind: "outline", status: "Obsolete", confirm: "Discontinue this BOM version?" }],
    Obsolete: [],
  }[values.status] || [{ key: "saveDraft", label: "Save Draft", kind: "outline", status: "Draft" }];

  const inputClass = "w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)]";
  const cellInput = "w-full min-w-[90px] rounded border border-[var(--line)] px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-[var(--muted)]";

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)] print:hidden">
        <Link to="/manufacturing/manufacturing-dashboard" className="hover:text-[var(--primary)]">
          Manufacturing
        </Link>
        <Crumb size={12} />
        <Link to="/manufacturing/bill-of-materials-bom" className="hover:text-[var(--primary)]">
          Bill of Materials (BOM)
        </Link>
        <Crumb size={12} />
        <span className="text-[var(--ink)]">{isView ? values.id : mode === "edit" ? "Edit BOM" : "New BOM"}</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-[var(--ink)]">{isView ? `${values.id} — ${values.productName}` : mode === "edit" ? `Edit ${values.id}` : "New Bill of Materials"}</h2>
        {isView && <Badge>{values.status}</Badge>}
      </div>
      {isView && <AuditStrip record={values} />}

      {errorBanner && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 print:hidden">
          <AlertCircle size={16} />
          {errorBanner}
        </div>
      )}

      <div className="mt-4 space-y-5">
        <Panel title="BOM Header">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">BOM Number</label>
              <input value={values.id} disabled className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                Finished Product<span className="ml-0.5 text-[var(--danger)]">*</span>
              </label>
              <select value={values.product} disabled={isView} onChange={(e) => handleProductChange(e.target.value)} className={inputClass}>
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Version</label>
              <input value={values.revisionNumber} disabled className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Batch Size (this recipe yields)</label>
              <input type="number" value={values.batchSize} disabled={isView} onChange={(e) => setField("batchSize", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Unit of Measure</label>
              <input value={values.uom} disabled className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Effective Start Date</label>
              <input type="date" value={values.effectiveDate} disabled={isView} onChange={(e) => setField("effectiveDate", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Effective End Date</label>
              <input type="date" value={values.effectiveEndDate} disabled={isView} onChange={(e) => setField("effectiveEndDate", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Production Line</label>
              <select value={values.productionLine} disabled={isView} onChange={(e) => setField("productionLine", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                {workCenters.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Overhead Allocation %</label>
              <input type="number" value={values.overheadPercent} disabled={isView} onChange={(e) => setField("overheadPercent", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Expected Wastage %</label>
              <input type="number" value={values.wastagePercent} disabled={isView} onChange={(e) => setField("wastagePercent", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Prepared By</label>
              <input value={values.preparedBy} disabled={isView} onChange={(e) => setField("preparedBy", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Approved By</label>
              <input value={values.approvedBy} disabled className={inputClass} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Notes</label>
              <textarea value={values.notes} disabled={isView} onChange={(e) => setField("notes", e.target.value)} rows={2} className={inputClass} />
            </div>
          </div>
        </Panel>

        <Panel title="Raw Material Lines" action={!isView && <span className="text-xs text-[var(--muted)]">Costed at {values.batchSize || 0} {values.uom}/batch</span>}>
          <div className="overflow-x-auto rounded-md border border-[var(--line)]">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-2 py-2 first:pl-3">Material</th>
                  <th className="px-2 py-2">Qty / Unit</th>
                  <th className="px-2 py-2">UOM</th>
                  <th className="px-2 py-2">Unit Cost</th>
                  <th className="px-2 py-2">Line Qty</th>
                  <th className="px-2 py-2">Line Cost</th>
                  <th className="px-2 py-2">Wastage %</th>
                  <th className="px-2 py-2">Consumption Stage</th>
                  <th className="px-2 py-2">Remarks</th>
                  {!isView && <th className="px-2 py-2" />}
                </tr>
              </thead>
              <tbody>
                {values.materialLines.map((line, index) => {
                  const lineQty = (Number(line.qtyPerUnit) || 0) * (Number(values.batchSize) || 0);
                  const lineCost = lineQty * (Number(line.unitCost) || 0);
                  return (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 first:pl-3">
                        <select disabled={isView} value={line.code} onChange={(e) => updateMaterialLine(index, { code: e.target.value })} className={cellInput + " min-w-[190px]"}>
                          <option value="">Select material...</option>
                          {materials.map((m) => (
                            <option key={m.code} value={m.code}>
                              {m.code} — {m.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" disabled={isView} value={line.qtyPerUnit} onChange={(e) => updateMaterialLine(index, { qtyPerUnit: e.target.value })} className={cellInput} />
                      </td>
                      <td className="px-2 py-1.5 text-[var(--muted)]">{line.unit || "—"}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" disabled={isView} value={line.unitCost} onChange={(e) => updateMaterialLine(index, { unitCost: e.target.value })} className={cellInput} />
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-[var(--ink)]">{lineQty.toFixed(2)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap font-medium text-[var(--ink)]">{money.format(lineCost)}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" disabled={isView} value={line.wastagePercent} onChange={(e) => updateMaterialLine(index, { wastagePercent: e.target.value })} className={cellInput} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input disabled={isView} value={line.consumptionStage} onChange={(e) => updateMaterialLine(index, { consumptionStage: e.target.value })} className={cellInput} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input disabled={isView} value={line.remarks} onChange={(e) => updateMaterialLine(index, { remarks: e.target.value })} className={cellInput} />
                      </td>
                      {!isView && (
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => setField("materialLines", values.materialLines.filter((_, i) => i !== index))} className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!isView && (
            <button type="button" onClick={() => setField("materialLines", [...values.materialLines, emptyMaterialLine()])} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-deep)]">
              <Plus size={13} /> Add Material
            </button>
          )}
        </Panel>

        <Panel title="Operations & Routing">
          <div className="overflow-x-auto rounded-md border border-[var(--line)]">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-2 py-2 first:pl-3">Seq</th>
                  <th className="px-2 py-2">Operation</th>
                  <th className="px-2 py-2">Work Center</th>
                  <th className="px-2 py-2">Machine</th>
                  <th className="px-2 py-2">Std Time (min/unit)</th>
                  <th className="px-2 py-2">Labor Rate/hr</th>
                  <th className="px-2 py-2">Machine Rate/hr</th>
                  <th className="px-2 py-2">Op Cost</th>
                  <th className="px-2 py-2">QC Checkpoint</th>
                  {!isView && <th className="px-2 py-2" />}
                </tr>
              </thead>
              <tbody>
                {values.operationLines.map((op, index) => {
                  const hours = ((Number(op.standardTimeMins) || 0) * (Number(values.batchSize) || 0)) / 60;
                  const opCost = hours * ((Number(op.laborRatePerHour) || 0) + (Number(op.machineRatePerHour) || 0));
                  return (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 first:pl-3 text-[var(--muted)]">{op.seq}</td>
                      <td className="px-2 py-1.5">
                        <input disabled={isView} value={op.operationName} onChange={(e) => updateOperationLine(index, { operationName: e.target.value })} className={cellInput + " min-w-[150px]"} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select disabled={isView} value={op.workCenter} onChange={(e) => updateOperationLine(index, { workCenter: e.target.value })} className={cellInput + " min-w-[160px]"}>
                          <option value="">Select...</option>
                          {workCenters.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select disabled={isView} value={op.machine} onChange={(e) => updateOperationLine(index, { machine: e.target.value })} className={cellInput + " min-w-[150px]"}>
                          <option value="">—</option>
                          {machines.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" disabled={isView} value={op.standardTimeMins} onChange={(e) => updateOperationLine(index, { standardTimeMins: e.target.value })} className={cellInput} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" disabled={isView} value={op.laborRatePerHour} onChange={(e) => updateOperationLine(index, { laborRatePerHour: e.target.value })} className={cellInput} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" disabled={isView} value={op.machineRatePerHour} onChange={(e) => updateOperationLine(index, { machineRatePerHour: e.target.value })} className={cellInput} />
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap font-medium text-[var(--ink)]">{money.format(opCost)}</td>
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" disabled={isView} checked={Boolean(op.qualityCheckpoint)} onChange={(e) => updateOperationLine(index, { qualityCheckpoint: e.target.checked })} className="h-4 w-4" />
                      </td>
                      {!isView && (
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => setField("operationLines", values.operationLines.filter((_, i) => i !== index))} className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!isView && (
            <button
              type="button"
              onClick={() => setField("operationLines", [...values.operationLines, emptyOperationLine(values.operationLines.length + 1)])}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-deep)]"
            >
              <Plus size={13} /> Add Operation
            </button>
          )}
        </Panel>

        <Panel eyebrow="Auto-Calculated" title="Costing Summary" accent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <CostStat label="Raw Material Cost" value={costing.materialCost} />
            <CostStat label="Labor + Machine Cost" value={costing.laborMachineCost} />
            <CostStat label="Overhead" value={costing.overheadCost} />
            <CostStat label="Wastage Cost" value={costing.wastageCost} />
            <CostStat label="Total Batch Cost" value={costing.totalBatchCost} emphasize />
            <CostStat label="Cost / Unit" value={costing.costPerUnit} emphasize />
          </div>
        </Panel>
      </div>

      <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-end gap-2 rounded-md border border-[var(--line)] bg-white/95 p-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur print:hidden">
        {isView ? (
          <>
            <button type="button" onClick={() => navigate("/manufacturing/bill-of-materials-bom")} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Close
            </button>
            <button type="button" onClick={() => window.print()} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Print
            </button>
            <button
              type="button"
              onClick={() => navigate("/manufacturing/bill-of-materials-bom/new", { state: { duplicateFrom: values } })}
              className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50"
            >
              Clone New Version
            </button>
            {["Draft", "Pending Approval"].includes(values.status) && (
              <Link to={`/manufacturing/bill-of-materials-bom/${values.id}/edit`} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
                Edit BOM
              </Link>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={() => navigate("/manufacturing/bill-of-materials-bom")} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Cancel
            </button>
            {actionsForStatus.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => handleAction(action)}
                className={`rounded-md px-4 py-2 text-sm font-semibold ${action.kind === "primary" ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-deep)]" : "border border-[var(--line)] text-[var(--ink)] hover:bg-slate-50"}`}
              >
                {action.label}
              </button>
            ))}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.confirm || "Are you sure?"}
        message={`This will update ${values.id} to "${pendingAction?.status}".`}
        confirmLabel={pendingAction?.label}
        onConfirm={() => executeAction(pendingAction)}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

function CostStat({ label, value, emphasize }) {
  return (
    <div className={`rounded-md border p-3 ${emphasize ? "border-[var(--primary)] bg-blue-50" : "border-[var(--line)] bg-white"}`}>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${emphasize ? "text-[var(--primary)]" : "text-[var(--ink)]"}`}>{money.format(value)}</p>
    </div>
  );
}
