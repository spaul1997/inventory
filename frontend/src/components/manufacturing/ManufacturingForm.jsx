import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ChevronRight as Crumb, Paperclip, Plus, Trash2 } from "lucide-react";
import { manufacturingEntities } from "../../data/manufacturing/entities.js";
import { materials, materialByCode } from "../../data/manufacturing/shared.js";
import { computeBomCosting } from "../../data/manufacturing/bom.js";
import { getRequiredMaterials } from "./manufacturingUtils.js";
import { ConfirmDialog } from "../ui.jsx";
import { AuditStrip } from "./AuditStrip.jsx";
import { keyOf, useManufacturingData } from "./ManufacturingDataContext.jsx";
import { useMasterData } from "../master/MasterDataContext.jsx";
import { useStockData } from "../stock/StockDataContext.jsx";
import { useToast } from "../Toast.jsx";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

const workflowByEntity = {
  "production-planning": ["Draft", "Submitted", "Approved", "Released"],
  "material-issue": ["Draft", "Issued"],
  "production-process": ["Scheduled", "In Progress", "Completed"],
  "material-consumption": ["Draft", "Submitted", "Reviewed", "Posted"],
  "finished-goods": ["Draft", "Pending QC", "Completed"],
  "scrap-wastage": ["Draft", "Pending Approval", "Approved"],
};

const fallbackIds = {
  "product-finished-goods": "FG-3001",
  "production-planning": "PP-2026-001",
  "material-issue": "MI-2026-0001",
  "production-process": "PROC-2026-101",
  "material-consumption": "MC-2026-0001",
  "finished-goods": "FGR-2026-0001",
  "scrap-wastage": "SCR-2026-0001",
};

// Increments the trailing numeric run of the highest existing id/code,
// preserving whatever prefix and zero-padding width that format already
// uses (works uniformly across "PP-2026-020", "MI-2026-0011", "FG-3001", ...).
function nextId(entityKey, rows, idKey = "id") {
  if (rows.length === 0) return fallbackIds[entityKey];
  let bestPrefix = "";
  let bestWidth = 0;
  let bestNum = 0;
  rows.forEach((row) => {
    const match = String(row[idKey] || "").match(/^(.*?)(\d+)$/);
    if (!match) return;
    const [, prefix, digits] = match;
    const num = parseInt(digits, 10);
    if (num > bestNum) {
      bestNum = num;
      bestPrefix = prefix;
      bestWidth = digits.length;
    }
  });
  if (!bestPrefix) return fallbackIds[entityKey];
  return `${bestPrefix}${String(bestNum + 1).padStart(bestWidth, "0")}`;
}

const WORK_ORDER_LINKED_ENTITIES = ["material-issue", "production-process", "material-consumption", "finished-goods", "scrap-wastage"];

// Shared by the "work order" field's onChange AND by the initializer when a
// record is created via a "New Material Issue" / "Log Process Entry" / etc.
// link from WorkOrderForm (location.state.presetWorkOrder) — both cases need
// the exact same header + line-item auto-fill.
function buildWorkOrderPatch(entityKey, workOrderId, manufacturingData, hasEmptyItems) {
  const wo = manufacturingData.getRecord("work-order", workOrderId);
  const patch = { workOrder: workOrderId, productName: wo?.productName, product: wo?.product, productionBatch: wo?.batchNumber, productionLine: wo?.productionLine };
  if (wo && entityKey === "material-issue") patch.warehouse = "Raw Material Store";
  if (wo && entityKey === "finished-goods") patch.warehouse = wo.warehouse;
  if (!wo || !hasEmptyItems) return patch;

  const bom = manufacturingData.getBom(wo.bomId);
  if (entityKey === "material-issue") {
    const required = getRequiredMaterials(wo, bom);
    const issued = manufacturingData.getIssuedForWorkOrder(wo.id);
    patch.items = required
      .map((line) => {
        const balance = Math.max(0, line.requiredQty - (issued[line.code] || 0));
        return { code: line.code, name: line.name, requiredQty: Math.round(line.requiredQty * 100) / 100, qty: Math.round(balance * 100) / 100, unit: line.unit, warehouse: "Raw Material Store", batch: "", unitCost: line.unitCost, total: balance * line.unitCost };
      })
      .filter((l) => l.qty > 0);
  } else if (entityKey === "material-consumption") {
    const issued = manufacturingData.getIssuedForWorkOrder(wo.id);
    const consumed = manufacturingData.getConsumedForWorkOrder(wo.id);
    patch.items = Object.entries(issued).map(([code, issuedQty]) => {
      const mat = materialByCode(code);
      const remaining = Math.max(0, issuedQty - (consumed[code] || 0));
      return { code, name: mat?.name || "", issuedQty, consumedQty: remaining, returnedQty: 0, unit: mat?.unit || "", unitCost: mat?.price || 0, varianceReason: "" };
    });
  } else if (entityKey === "finished-goods") {
    const costPerUnit = bom ? computeBomCosting(bom).costPerUnit : 0;
    patch.items = [{ batchNo: wo.batchNumber || "", qtyReceived: "", qtyRejectedQC: "", unit: wo.uom, manufacturingDate: today(), expiryDate: "", packagingType: "Carton Box", numberOfPackages: "", qtyPerPackage: "", unitCost: Math.round(costPerUnit * 100) / 100, storageBin: "" }];
  }
  return patch;
}

function LineItemCell({ column, row, disabled, onChange, formValues, ctx }) {
  const readOnly = disabled || column.readOnly;
  const { getAvailable, manufacturingData } = ctx;

  if (column.type === "material-select") {
    return (
      <select
        disabled={readOnly}
        value={row.code || ""}
        onChange={(event) => {
          const code = event.target.value;
          const mat = materialByCode(code);
          onChange({ ...row, code, name: mat?.name || "", unit: mat?.unit || "", unitCost: mat?.price ?? row.unitCost });
        }}
        className="w-full min-w-[170px] rounded border border-[var(--line)] px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-[var(--muted)]"
      >
        <option value="">Select material...</option>
        {materials.map((m) => (
          <option key={m.code} value={m.code}>
            {m.code} — {m.name}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "product-select") {
    const products = manufacturingData.getRows("product-finished-goods");
    return (
      <select
        disabled={readOnly}
        value={row.product || ""}
        onChange={(event) => {
          const code = event.target.value;
          const product = products.find((p) => p.code === code);
          const bom = manufacturingData.getActiveBom(code);
          onChange({ ...row, product: code, productName: product?.name || "", uom: product?.uom || "", bomVersion: bom?.revisionNumber || "—" });
        }}
        className="w-full min-w-[190px] rounded border border-[var(--line)] px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-[var(--muted)]"
      >
        <option value="">Select product...</option>
        {products.map((p) => (
          <option key={p.code} value={p.code}>
            {p.code} — {p.name}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "scrap-component-select") {
    const isFg = formValues.stage === "Finished Goods QC";
    const options = isFg ? manufacturingData.getRows("product-finished-goods").map((p) => ({ code: p.code, name: p.name, unit: p.uom })) : materials.map((m) => ({ code: m.code, name: m.name, unit: m.unit }));
    return (
      <select
        disabled={readOnly}
        value={row.component || ""}
        onChange={(event) => {
          const code = event.target.value;
          const found = options.find((o) => o.code === code);
          onChange({ ...row, component: code, componentName: found?.name || "", unit: found?.unit || "" });
        }}
        className="w-full min-w-[190px] rounded border border-[var(--line)] px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-[var(--muted)]"
      >
        <option value="">Select {isFg ? "product" : "material"}...</option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.code} — {o.name}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "computed-total") {
    const total = (Number(row.qty) || 0) * (Number(row.unitCost) || 0);
    return <span className="block whitespace-nowrap px-2 py-1.5 text-sm font-medium text-[var(--ink)]">{money.format(total)}</span>;
  }

  if (column.type === "computed-total-fg") {
    const qty = Number(row.qtyReceived ?? row.qty) || 0;
    const total = qty * (Number(row.unitCost) || 0);
    return <span className="block whitespace-nowrap px-2 py-1.5 text-sm font-medium text-[var(--ink)]">{money.format(total)}</span>;
  }

  if (column.type === "available-stock") {
    const avail = row.code ? getAvailable(row.code, row.warehouse || formValues.warehouse) : null;
    const insufficient = avail !== null && avail <= 0;
    return (
      <span className={`block whitespace-nowrap px-2 py-1.5 text-sm font-medium ${insufficient ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>
        {avail === null ? "—" : avail}
        {insufficient && <span className="ml-1 text-xs">(Insufficient)</span>}
      </span>
    );
  }

  if (column.type === "consumption-variance") {
    const variance = (Number(row.issuedQty) || 0) - (Number(row.consumedQty) || 0) - (Number(row.returnedQty) || 0);
    const pct = row.issuedQty ? ((variance / Number(row.issuedQty)) * 100).toFixed(1) : "0.0";
    const tone = variance > 0 ? "text-[var(--warning)]" : variance < 0 ? "text-[var(--danger)]" : "text-emerald-600";
    return (
      <span className={`block whitespace-nowrap px-2 py-1.5 text-sm font-semibold ${tone}`}>
        {variance} ({pct}%)
      </span>
    );
  }

  if (readOnly) {
    return <span className="block whitespace-nowrap px-2 py-1.5 text-sm text-[var(--muted)]">{row[column.key] ?? ""}</span>;
  }

  if (column.type === "select") {
    return (
      <select
        disabled={readOnly}
        value={row[column.key] || ""}
        onChange={(event) => onChange({ ...row, [column.key]: event.target.value })}
        className="w-full min-w-[140px] rounded border border-[var(--line)] px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-[var(--muted)]"
      >
        <option value="">Select...</option>
        {column.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
      value={row[column.key] ?? ""}
      onChange={(event) => {
        let value = event.target.value;
        if (column.maxKey) {
          const max = column.maxKey === "available" ? getAvailable(row.code, row.warehouse || formValues.warehouse) : row[column.maxKey];
          if (value !== "" && Number(value) > Number(max)) value = String(max);
        }
        onChange({ ...row, [column.key]: value });
      }}
      className="w-full min-w-[90px] rounded border border-[var(--line)] px-2 py-1.5 text-sm"
    />
  );
}

function LineItemsField({ field, rows, disabled, onChange, formValues, ctx }) {
  const items = Array.isArray(rows) ? rows : [];
  const totalKey = items[0] && "qtyReceived" in items[0] ? "qtyReceived" : "qty";
  const totals =
    field.totals === "manufacturing"
      ? { label: "Total Value", value: items.reduce((s, i) => s + (Number(i[totalKey]) || 0) * (Number(i.unitCost) || 0), 0) }
      : null;

  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-[var(--line)]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
            <tr>
              {field.columns.map((col) => (
                <th key={col.key} className="px-2 py-2 first:pl-3">
                  {col.label}
                </th>
              ))}
              {!disabled && field.allowAddRemove && <th className="px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={field.columns.length + 1} className="px-3 py-4 text-center text-sm text-[var(--muted)]">
                  No items yet.
                </td>
              </tr>
            )}
            {items.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                {field.columns.map((col) => (
                  <td key={col.key} className="px-2 py-1.5 first:pl-3">
                    <LineItemCell
                      column={col}
                      row={row}
                      disabled={disabled}
                      formValues={formValues}
                      ctx={ctx}
                      onChange={(next) => {
                        const updated = [...items];
                        updated[index] = next;
                        onChange(updated);
                      }}
                    />
                  </td>
                ))}
                {!disabled && field.allowAddRemove && (
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => onChange(items.filter((_, i) => i !== index))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!disabled && field.allowAddRemove && (
        <button
          type="button"
          onClick={() => onChange([...items, {}])}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-deep)]"
        >
          <Plus size={13} /> Add Item
        </button>
      )}

      {totals && (
        <div className="ml-auto mt-3 max-w-xs rounded-md border border-[var(--line)] bg-slate-50 p-3 text-sm">
          <div className="flex justify-between font-semibold text-[var(--ink)]">
            <span>{totals.label}</span>
            <span>{money.format(totals.value)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ field, value, error, disabled, onChange, formValues, ctx }) {
  const baseInput = `w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)] ${
    error ? "border-[var(--danger)] focus:ring-red-100" : "border-[var(--line)]"
  }`;

  if (field.type === "lineItems") {
    return <LineItemsField field={field} rows={value} disabled={disabled} onChange={onChange} formValues={formValues} ctx={ctx} />;
  }

  if (field.type === "work-order-select") {
    const workOrders = ctx.manufacturingData.getRows("work-order");
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
          {field.label}
          {field.required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
        </label>
        <select value={value || ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={baseInput}>
          <option value="">Select work order...</option>
          {workOrders.map((wo) => (
            <option key={wo.id} value={wo.id}>
              {wo.id} — {wo.productName} ({wo.status})
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  if (field.type === "product-item-select") {
    const items = ctx.masterData.getRows("product-item");
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{field.label}</label>
        <select value={value || ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={baseInput}>
          <option value="">Not linked</option>
          {items.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code} — {item.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "active-bom-lookup") {
    const bom = ctx.manufacturingData.getActiveBom(formValues.code);
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-[var(--ink)]">{field.label}</p>
        <div className="rounded-md border border-dashed border-[var(--line)] bg-slate-50 px-3 py-2.5 text-sm font-medium text-[var(--ink)]">
          {bom ? (
            <Link to={`/manufacturing/bill-of-materials-bom/${bom.id}/view`} className="text-[var(--primary)] hover:underline">
              {bom.id} ({bom.revisionNumber})
            </Link>
          ) : (
            "No active BOM"
          )}
        </div>
      </div>
    );
  }

  if (field.type === "active-bom-cost-lookup") {
    const bom = ctx.manufacturingData.getActiveBom(formValues.code);
    const cost = bom ? computeBomCosting(bom).costPerUnit : 0;
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-[var(--ink)]">{field.label}</p>
        <div className="rounded-md border border-dashed border-[var(--line)] bg-slate-50 px-3 py-2.5 text-sm font-medium text-[var(--ink)]">
          {bom ? money.format(cost) : "—"}
        </div>
      </div>
    );
  }

  if (field.type === "toggle") {
    return (
      <label className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] px-3 py-2.5">
        <span className="text-sm font-medium text-[var(--ink)]">{field.label}</span>
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

  if (field.type === "select") {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
          {field.label}
          {field.required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
        </label>
        <select value={value || ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={baseInput}>
          <option value="">Select {field.label.toLowerCase()}...</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className={field.span === "full" ? "sm:col-span-2 lg:col-span-3" : ""}>
        <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{field.label}</label>
        <textarea value={value || ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} rows={3} className={baseInput} />
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{field.label}</label>
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm ${
            disabled ? "text-[var(--muted)]" : "text-[var(--ink)] hover:bg-slate-50"
          } border-[var(--line)]`}
        >
          <Paperclip size={14} />
          {value ? value : "Choose file..."}
          <input type="file" disabled={disabled} className="hidden" onChange={(event) => onChange(event.target.files?.[0]?.name || "")} />
        </label>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
        {field.label}
        {field.required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
        {field.autoLabel && <span className="ml-1.5 text-xs font-normal text-[var(--muted)]">({field.autoLabel})</span>}
      </label>
      <input
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={value || ""}
        disabled={disabled || Boolean(field.autoLabel) || field.readOnly}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={baseInput}
      />
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

export function ManufacturingForm({ entityKey, mode, recordId }) {
  const entity = manufacturingEntities[entityKey];
  const manufacturingData = useManufacturingData();
  const masterData = useMasterData();
  const stockData = useStockData();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isView = mode === "view";
  const isProduct = entityKey === "product-finished-goods";

  const existingRecord = recordId ? manufacturingData.getRecord(entityKey, recordId) : null;
  const duplicateFrom = !recordId ? location.state?.duplicateFrom : null;
  const presetWorkOrder = !recordId ? location.state?.presetWorkOrder : null;

  const [values, setValues] = useState(() => {
    if (existingRecord) return { ...existingRecord };

    const rows = manufacturingData.getRows(entityKey);
    const base = isProduct
      ? { code: nextId(entityKey, rows, "code"), status: "Draft" }
      : { id: nextId(entityKey, rows, "id"), date: today(), status: workflowByEntity[entityKey]?.[0] || "Draft" };
    if (entity.form.tabs.some((tab) => tab.fields.some((f) => f.type === "lineItems"))) base.items = [];

    if (duplicateFrom) {
      return { ...duplicateFrom, ...base, activity: undefined, createdBy: undefined, createdAt: undefined, updatedBy: undefined, updatedAt: undefined };
    }

    if (presetWorkOrder && WORK_ORDER_LINKED_ENTITIES.includes(entityKey)) {
      return { ...base, ...buildWorkOrderPatch(entityKey, presetWorkOrder, manufacturingData, true) };
    }

    return base;
  });

  const [activeTab, setActiveTab] = useState(entity.form.tabs[0].key);
  const [errors, setErrors] = useState({});
  const [errorBanner, setErrorBanner] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  const ctx = { getAvailable: stockData.getAvailable, manufacturingData, masterData };

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleFieldChange(field, next) {
    if (field.key === "workOrder" && WORK_ORDER_LINKED_ENTITIES.includes(entityKey)) {
      setValues((prev) => ({ ...prev, ...buildWorkOrderPatch(entityKey, next, manufacturingData, Array.isArray(prev.items) && prev.items.length === 0) }));
      return;
    }
    setField(field.key, next);
  }

  function validate() {
    const nextErrors = {};
    let firstInvalidTab = null;
    entity.form.tabs.forEach((tab) => {
      tab.fields.forEach((field) => {
        if (field.required && !field.autoLabel && !String(values[field.key] ?? "").trim()) {
          nextErrors[field.key] = `${field.label} is required.`;
          if (!firstInvalidTab) firstInvalidTab = tab.key;
        }
      });
    });
    setErrors(nextErrors);
    if (firstInvalidTab) {
      setActiveTab(firstInvalidTab);
      setErrorBanner(`Please fill in ${Object.keys(nextErrors).length} required field(s).`);
      return false;
    }
    setErrorBanner("");
    return true;
  }

  function executeAction(action) {
    const key = keyOf(values);
    const isNew = mode !== "edit";
    const record = {
      ...values,
      status: action.status || values.status,
      updatedBy: "You",
      updatedAt: new Date().toISOString().slice(0, 16),
      ...(isNew ? { createdBy: "You", createdAt: new Date().toISOString().slice(0, 16) } : {}),
    };
    if (values.activity !== undefined || workflowByEntity[entityKey]) {
      record.activity = [...(values.activity || []), { event: action.status || "Updated", date: today(), by: "You" }];
    }

    if (action.manufacturingEffect === "materialIssue") {
      manufacturingData.postMaterialIssue(
        values.items.map((i) => ({ code: i.code, batch: i.batch, qty: i.qty, unitCost: i.unitCost })),
        { warehouse: values.warehouse, reference: values.workOrder || values.id, user: "You", date: values.date }
      );
    }
    if (action.manufacturingEffect === "materialConsumption") {
      manufacturingData.postMaterialReturn(values.items, { warehouse: "Raw Material Store", reference: values.workOrder || values.id, user: "You", date: values.date });
    }
    if (action.manufacturingEffect === "finishedGoodsReceipt") {
      manufacturingData.postFinishedGoodsReceipt(values.items, { productCode: values.product, warehouse: values.warehouse });
    }

    if (isNew) manufacturingData.addRow(entityKey, record);
    else manufacturingData.updateRow(entityKey, key, record);

    showToast(action.status ? `${key} updated to "${action.status}".` : `${entity.singular} saved.`);
    setPendingAction(null);
    navigate(`/manufacturing/${entityKey}`);
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

  function handleCancel() {
    navigate(`/manufacturing/${entityKey}`);
  }

  const kindClass = {
    outline: "border border-[var(--line)] text-[var(--ink)] hover:bg-slate-50",
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-deep)]",
  };

  const recordKey = keyOf(values);

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)] print:hidden">
        <Link to="/manufacturing/manufacturing-dashboard" className="hover:text-[var(--primary)]">
          Manufacturing
        </Link>
        <Crumb size={12} />
        <Link to={`/manufacturing/${entityKey}`} className="hover:text-[var(--primary)]">
          {entity.label}
        </Link>
        <Crumb size={12} />
        <span className="text-[var(--ink)]">
          {isView ? "View" : mode === "edit" ? "Edit" : "New"} {entity.singular}
        </span>
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)]">{isView ? recordKey : mode === "edit" ? `Edit ${entity.label}` : `New ${entity.label}`}</h2>
      {isView && <AuditStrip record={values} />}

      {errorBanner && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 print:hidden">
          <AlertCircle size={16} />
          {errorBanner}
        </div>
      )}

      <div className="mt-4 rounded-md border border-[var(--line)] bg-white">
        <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-[var(--line)] px-3 pt-2 print:hidden">
          {entity.form.tabs.map((tab) => (
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
          {entity.form.tabs
            .filter((tab) => tab.key === activeTab)
            .map((tab) => (
              <div key={tab.key} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tab.fields.map((field) => (
                  <div key={field.key} className={field.span === "full" ? "sm:col-span-2 lg:col-span-3" : ""}>
                    <Field
                      field={field}
                      value={values[field.key]}
                      error={errors[field.key]}
                      disabled={isView}
                      formValues={values}
                      ctx={ctx}
                      onChange={(next) => handleFieldChange(field, next)}
                    />
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>

      <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-end gap-2 rounded-md border border-[var(--line)] bg-white/95 p-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur print:hidden">
        {isView ? (
          <>
            <button type="button" onClick={handleCancel} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Close
            </button>
            <button type="button" onClick={() => window.print()} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Print
            </button>
            <Link to={`/manufacturing/${entityKey}/${recordKey}/edit`} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
              Edit {entity.singular}
            </Link>
          </>
        ) : (
          <>
            <button type="button" onClick={handleCancel} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Cancel
            </button>
            {entity.formActions.map((action) => (
              <button key={action.key} type="button" onClick={() => handleAction(action)} className={`rounded-md px-4 py-2 text-sm font-semibold ${kindClass[action.kind] || kindClass.outline}`}>
                {action.label}
              </button>
            ))}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.confirm || "Are you sure?"}
        message={`This will update ${recordKey} to "${pendingAction?.status}".`}
        confirmLabel={pendingAction?.label}
        onConfirm={() => executeAction(pendingAction)}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
