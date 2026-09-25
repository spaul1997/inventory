import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ChevronRight as Crumb, Paperclip, Plus, Trash2 } from "lucide-react";
import { stockEntities } from "../../data/stockManagement.js";
import { ConfirmDialog } from "../ui.jsx";
import { useStockData } from "./StockDataContext.jsx";
import { useMasterData } from "../master/MasterDataContext.jsx";
import { useToast } from "../Toast.jsx";
import { WorkflowTimeline } from "../purchase/WorkflowTimeline.jsx";
import { useAuth } from "../../stores/AuthStore.jsx";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

const idPrefixes = { "stock-in": "SIN", "stock-out": "SOUT", "stock-transfer": "TRF", "stock-adjustment": "ADJ", "stock-count": "CNT" };

function nextId(entityKey, rows) {
  const prefix = idPrefixes[entityKey];
  const width = rows[0]?.id.split("-").pop().length || 4;
  const nums = rows.map((r) => parseInt(r.id.split("-").pop(), 10)).filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-2026-${String(next).padStart(width, "0")}`;
}

const workflowSteps = {
  "stock-in": ["Draft", "Posted", "Inventory Updated"],
  "stock-out": ["Draft", "Posted", "Inventory Deducted"],
  "stock-transfer": ["Created", "Pending Approval", "In Transit", "Completed"],
  "stock-count": ["Created", "In Progress", "Pending Review", "Approved", "Completed"],
};

function materialUnit(material) {
  return material?.unit || material?.baseUnit || material?.purchaseUnit || "";
}

function optionLabel(row) {
  return row.name || row.storeName || row.code || "";
}

function uniqueOptions(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function resolveFieldOptions(field, masterData, currentValue, values) {
  if (field.optionsFrom) {
    const dependencyValue = field.dependsOn ? String(values[field.dependsOn] || "").trim() : "";
    if (field.dependsOn && !dependencyValue) return [];
    const warehouse = field.dependsOn
      ? masterData
          .getRows("warehouse")
          .find((row) => [row.code, row.name, row.storeName].some((candidate) => String(candidate || "").trim().toLowerCase() === dependencyValue.toLowerCase()))
      : null;
    const dependencyAliases = new Set(
      [dependencyValue, warehouse?.code, warehouse?.name, warehouse?.storeName]
        .map((candidate) => String(candidate || "").trim().toLowerCase())
        .filter(Boolean)
    );
    const masterOptions = masterData
      .getRows(field.optionsFrom)
      .filter((row) => row.status !== "Inactive")
      .filter((row) => !field.dependsOn || dependencyAliases.has(String(row.warehouse || "").trim().toLowerCase()))
      .map(optionLabel);
    return uniqueOptions([...masterOptions, ...(masterOptions.includes(currentValue) ? [currentValue] : [])]);
  }

  return uniqueOptions([...(field.options || []), currentValue]);
}

function LineItemCell({ column, row, disabled, onChange, formValues, getAvailable, materialRows, stockBatches }) {
  const readOnly = disabled || column.readOnly;
  const warehouse = column.warehouseKey ? formValues[column.warehouseKey] : formValues.warehouse;

  if (column.type === "material-select") {
    return (
      <select
        disabled={readOnly}
        value={row.code || ""}
        onChange={(event) => {
          const code = event.target.value;
          const mat = materialRows.find((material) => material.code === code);
          const systemQty = code ? getAvailable(code, warehouse) : 0;
          onChange({ ...row, code, name: mat?.name || "", unit: materialUnit(mat), systemQty, batch: "" });
        }}
        className="w-full min-w-[170px] rounded border border-[var(--line)] px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-[var(--muted)]"
      >
        <option value="">Select material...</option>
        {materialRows.map((m) => (
          <option key={m.code} value={m.code}>
            {m.code} — {m.name}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "batch-select") {
    const options = (stockBatches || []).filter(
      (batch) =>
        batch.code === row.code &&
        batch.warehouse === warehouse &&
        batch.status !== "Consumed" &&
        (Number(batch.qty) || 0) > 0
    );
    return (
      <select
        disabled={readOnly || !row.code || !warehouse}
        value={row.batch || ""}
        onChange={(event) => onChange({ ...row, batch: event.target.value })}
        className="w-full min-w-[120px] rounded border border-[var(--line)] px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-[var(--muted)]"
      >
        <option value="">Select batch...</option>
        {options.map((batch) => (
          <option key={`${batch.id}-${batch.warehouse}`} value={batch.id}>
            {batch.id} ({batch.qty})
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "computed-total") {
    const total = (Number(row.qty) || 0) * (Number(row.unitCost) || 0);
    return <span className="block px-2 py-1.5 text-sm font-medium text-[var(--ink)]">{money.format(total)}</span>;
  }

  if (column.type === "available-stock") {
    const avail = row.code ? getAvailable(row.code, warehouse) : null;
    const insufficient = avail !== null && avail <= 0;
    return (
      <span className={`block whitespace-nowrap px-2 py-1.5 text-sm font-medium ${insufficient ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>
        {avail === null ? "—" : avail}
        {insufficient && <span className="ml-1 text-xs">(Insufficient)</span>}
      </span>
    );
  }

  if (column.type === "system-qty") {
    // Frozen at the moment this item was added to the count (or from seed data) — a
    // stock count compares against a snapshot, not a live-recalculated balance that
    // may have moved since counting started.
    return <span className="block whitespace-nowrap px-2 py-1.5 text-sm text-[var(--ink)]">{row.code ? (row.systemQty ?? 0) : "—"}</span>;
  }

  if (column.type === "variance") {
    const variance = (Number(row.physicalQty) || 0) - (Number(row.systemQty) || 0);
    const tone = variance > 0 ? "text-emerald-600" : variance < 0 ? "text-[var(--danger)]" : "text-[var(--muted)]";
    return <span className={`block px-2 py-1.5 text-sm font-semibold ${tone}`}>{variance > 0 ? `+${variance}` : variance}</span>;
  }

  if (readOnly) {
    return <span className="block whitespace-nowrap px-2 py-1.5 text-sm text-[var(--muted)]">{row[column.key] ?? ""}</span>;
  }

  return (
    <input
      type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
      value={row[column.key] ?? ""}
      onChange={(event) => {
        let value = event.target.value;
        if (column.maxKey) {
          const max = column.maxKey === "available" ? getAvailable(row.code, warehouse) : row[column.maxKey];
          if (value !== "" && Number(value) > Number(max)) value = String(max);
        }
        onChange({ ...row, [column.key]: value });
      }}
      className="w-full min-w-[90px] rounded border border-[var(--line)] px-2 py-1.5 text-sm"
    />
  );
}

function LineItemsField({ field, rows, disabled, onChange, formValues, getAvailable, materialRows, stockBatches }) {
  const items = Array.isArray(rows) ? rows : [];
  const totals =
    field.totals === "stockIn"
      ? { label: "Total Value", value: items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0) }
      : field.totals === "stockOut"
        ? { label: "Total Value", value: items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0) }
        : null;

  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-[var(--line)]">
        <table className="w-full min-w-[700px] text-left text-sm">
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
                      getAvailable={getAvailable}
                      materialRows={materialRows}
                      stockBatches={stockBatches}
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

function Field({ field, value, error, disabled, onChange, formValues, getAvailable, materialRows, stockBatches }) {
  const baseInput = `w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)] ${
    error ? "border-[var(--danger)] focus:ring-red-100" : "border-[var(--line)]"
  }`;

  if (field.type === "lineItems") {
    return <LineItemsField field={field} rows={value} disabled={disabled} onChange={onChange} formValues={formValues} getAvailable={getAvailable} materialRows={materialRows} stockBatches={stockBatches} />;
  }

  if (field.type === "material-select-field") {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
          {field.label}
          {field.required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
        </label>
        <select value={value || ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={baseInput}>
          <option value="">Select item...</option>
          {materialRows.map((m) => (
            <option key={m.code} value={m.code}>
              {m.code} — {m.name}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  if (field.type === "stock-lookup") {
    const stock = formValues.code && formValues.warehouse ? getAvailable(formValues.code, formValues.warehouse) : null;
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-[var(--ink)]">{field.label}</p>
        <div className="rounded-md border border-dashed border-[var(--line)] bg-slate-50 px-3 py-2.5 text-sm font-medium text-[var(--ink)]">
          {stock === null ? "Select item & warehouse" : `${stock}`}
        </div>
      </div>
    );
  }

  if (field.type === "adjustment-preview") {
    const stock = formValues.code && formValues.warehouse ? getAvailable(formValues.code, formValues.warehouse) : 0;
    const qty = Number(formValues.qty) || 0;
    const delta = formValues.type === "Increase" ? qty : -qty;
    const newStock = Math.max(0, stock + delta);
    return (
      <div className="sm:col-span-2 lg:col-span-3">
        <p className="mb-1.5 text-sm font-medium text-[var(--ink)]">{field.label}</p>
        <div className="rounded-md border border-dashed border-[var(--line)] bg-slate-50 px-3 py-2.5 text-sm font-medium text-[var(--ink)]">
          Current Stock: {stock} &nbsp;&nbsp; {formValues.type === "Decrease" ? "−" : "+"} {qty} &nbsp;&nbsp; = New Stock:{" "}
          <span className={newStock < stock ? "text-[var(--danger)]" : "text-emerald-700"}>{newStock}</span>
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
          <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
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
        <select value={field.options.includes(value) ? value : ""} disabled={disabled || Boolean(field.dependsOn && !formValues[field.dependsOn])} onChange={(event) => onChange(event.target.value)} className={baseInput}>
          <option value="">{field.dependsOn && !formValues[field.dependsOn] ? `Select ${field.dependsOn.replace(/([A-Z])/g, " $1").toLowerCase()} first...` : `Select ${field.label.toLowerCase()}...`}</option>
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

export function StockForm({ entityKey, mode, recordId }) {
  const entity = stockEntities[entityKey];
  const stockData = useStockData();
  const masterData = useMasterData();
  const showToast = useToast();
  const { session } = useAuth();
  const navigate = useNavigate();
  const isView = mode === "view";
  const userName = session?.user?.name || "You";
  const lockedStatuses = {
    "stock-transfer": ["Completed", "Cancelled"],
    "stock-adjustment": ["Posted", "Cancelled"],
    "stock-count": ["Completed", "Cancelled"],
  };
  const materialRows = masterData.getRows("product-item").filter((row) => row.status !== "Inactive");

  const existingRecord = recordId ? stockData.getRecord(entityKey, recordId) : null;

  const [values, setValues] = useState(() => {
    if (existingRecord) return { ...existingRecord };
    const base = { id: nextId(entityKey, stockData.getRows(entityKey)), date: today(), status: "Draft" };
    if (entity.form.tabs.some((tab) => tab.fields.some((f) => f.type === "lineItems"))) base.items = [];
    return base;
  });

  const [activeTab, setActiveTab] = useState(entity.form.tabs[0].key);
  const [errors, setErrors] = useState({});
  const [errorBanner, setErrorBanner] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const hydratedKeyRef = useRef("");

  useEffect(() => {
    if (stockData.loading) return;
    const hydrationKey = recordId ? `${entityKey}:${recordId}` : `${entityKey}:new`;
    if (hydratedKeyRef.current === hydrationKey) return;

    if (recordId && existingRecord) {
      setValues({ ...existingRecord });
    } else if (!recordId) {
      setValues((prev) => ({ ...prev, id: nextId(entityKey, stockData.getRows(entityKey)) }));
    }
    hydratedKeyRef.current = hydrationKey;
  }, [entityKey, existingRecord, recordId, stockData.loading]);

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleFieldChange(field, next) {
    setField(field.key, next);
    (field.clearOnChange || []).forEach((key) => setField(key, ""));
    if (entityKey === "stock-adjustment" && field.key === "code") {
      const mat = materialRows.find((material) => material.code === next);
      setField("item", mat?.name || "");
    }
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

    if (entityKey === "stock-transfer") {
      if (values.fromWarehouse && values.fromWarehouse === values.toWarehouse) {
        nextErrors.toWarehouse = "Destination warehouse must be different from source warehouse.";
        firstInvalidTab ||= "info";
      }
      const items = Array.isArray(values.items) ? values.items : [];
      const invalidItem = items.find((item) => {
        const qty = Number(item.qty) || 0;
        const available = stockData.getAvailable(item.code, values.fromWarehouse);
        const availableBatches = stockData.batches.filter(
          (batch) => batch.code === item.code && batch.warehouse === values.fromWarehouse && batch.status !== "Consumed" && (Number(batch.qty) || 0) > 0
        );
        const selectedBatch = availableBatches.find((batch) => batch.id === item.batch);
        return !item.code || qty <= 0 || qty > available || (availableBatches.length > 0 && !selectedBatch) || (selectedBatch && qty > (Number(selectedBatch.qty) || 0));
      });
      const hasDuplicateItems = new Set(items.map((item) => item.code).filter(Boolean)).size !== items.filter((item) => item.code).length;
      if (items.length === 0 || invalidItem || hasDuplicateItems) {
        nextErrors.items = items.length === 0
          ? "Add at least one item to the transfer."
          : hasDuplicateItems
            ? "Each transfer item can be added only once."
            : `${invalidItem.name || invalidItem.code || "Transfer item"} needs a valid batch and available quantity.`;
        firstInvalidTab ||= "items";
      }
    }

    if (entityKey === "stock-adjustment") {
      const qty = Number(values.qty) || 0;
      const available = stockData.getAvailable(values.code, values.warehouse);
      if (qty <= 0 || (values.type === "Decrease" && qty > available)) {
        nextErrors.qty = qty <= 0 ? "Adjustment quantity must be greater than zero." : `Only ${available} is available in this warehouse.`;
        firstInvalidTab ||= "info";
      }
    }

    if (entityKey === "stock-count") {
      const items = Array.isArray(values.items) ? values.items : [];
      const invalidItem = items.find((item) => !item.code || item.physicalQty === "" || item.physicalQty === undefined || Number(item.physicalQty) < 0);
      const hasDuplicateItems = new Set(items.map((item) => item.code).filter(Boolean)).size !== items.filter((item) => item.code).length;
      if (items.length === 0 || invalidItem || hasDuplicateItems) {
        nextErrors.items = items.length === 0
          ? "Add at least one item to count."
          : hasDuplicateItems
            ? "Each count item can be added only once."
            : "Every count item needs a valid physical quantity.";
        firstInvalidTab ||= "items";
      }
    }

    setErrors(nextErrors);
    if (firstInvalidTab) {
      setActiveTab(firstInvalidTab);
      setErrorBanner(`Please fill in ${Object.keys(nextErrors).length} required field(s).`);
      return false;
    }
    setErrorBanner("");
    return true;
  }

  async function executeAction(action) {
    const record = { ...values, status: action.status || values.status };
    if (entityKey === "stock-adjustment") {
      const currentStock = stockData.getAvailable(values.code, values.warehouse);
      const delta = values.type === "Increase" ? Number(values.qty) || 0 : -(Number(values.qty) || 0);
      record.currentStock = currentStock;
      record.newStock = Math.max(0, currentStock + delta);
    }
    const activity = Array.isArray(values.activity) && values.activity.length
      ? [...values.activity]
      : [{ event: "Created", date: values.date || today(), by: userName }];
    if (action.status && action.status !== "Draft" && activity.at(-1)?.event !== action.status) {
      activity.push({ event: action.status, date: today(), by: userName });
    }
    record.activity = activity;

    try {
      if (mode === "edit") await stockData.updateRow(entityKey, recordId, record);
      else await stockData.addRow(entityKey, record);

      if (action.stockEffect === "in") await stockData.postStockIn(values.items, { warehouse: values.warehouse, reference: values.refNumber || values.id, user: userName, date: values.date });
      if (action.stockEffect === "out") await stockData.postStockOut(values.items, { warehouse: values.warehouse, reference: values.refNumber || values.id, user: userName, date: values.date });
      if (action.stockEffect === "transfer") await stockData.postTransfer(values.items, { fromWarehouse: values.fromWarehouse, toWarehouse: values.toWarehouse, toLocation: values.toLocation, reference: values.id, user: userName, date: values.date });
      if (action.stockEffect === "adjustment") await stockData.postAdjustment(record, userName);

      if (action.createsAdjustment) {
      // Compare against each item's frozen system-qty snapshot (taken when it was
      // added to the count), not a live re-lookup — the whole point of a count is to
      // reconcile against the balance as it stood at count time. Track newly created
      // adjustment ids locally so a multi-item count doesn't reuse the same next-id
      // (stockData.getRows() won't reflect an addRow() until the next render).
        let priorAdjustments = stockData.getRows("stock-adjustment");
        for (const item of values.items || []) {
          if (!item.code) continue;
          const systemQty = Number(item.systemQty) || 0;
          const variance = (Number(item.physicalQty) || 0) - systemQty;
          if (variance === 0) continue;
          const adjRecord = {
          id: nextId("stock-adjustment", priorAdjustments),
          date: values.date,
          warehouse: values.warehouse,
          location: values.location,
          type: variance > 0 ? "Increase" : "Decrease",
          code: item.code,
          item: item.name,
          currentStock: systemQty,
          qty: Math.abs(variance),
          reason: values.varianceReason || "Data Correction",
          remarks: `Auto-generated from Stock Count ${values.id}.`,
          status: "Posted",
          };
          await stockData.addRow("stock-adjustment", adjRecord);
          await stockData.postAdjustment(adjRecord, userName);
          priorAdjustments = [adjRecord, ...priorAdjustments];
        }
      }

      showToast(action.status ? `${values.id} updated to "${action.status}".` : `${entity.singular} saved.`);
      setPendingAction(null);
      navigate(`/stock-management/${entityKey}`);
    } catch (requestError) {
      setPendingAction(null);
      setErrorBanner(requestError.message || `Unable to save ${entity.singular.toLowerCase()}.`);
    }
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
    navigate(`/stock-management/${entityKey}`);
  }

  const kindClass = {
    ghost: "border border-[var(--line)] text-[var(--ink)] hover:bg-slate-50",
    outline: "border border-[var(--line)] text-[var(--ink)] hover:bg-slate-50",
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-deep)]",
  };
  const visibleFormActions = entity.formActions.filter((action) => {
    if (action.showWhen && !action.showWhen(values, mode)) return false;
    if (action.hideWhen && action.hideWhen(values, mode)) return false;
    return true;
  });
  const canEditRecord = !(lockedStatuses[entityKey] || []).includes(values.status);
  const isReadOnlyMode = isView || (mode === "edit" && !canEditRecord);

  if (stockData.loading) {
    return <div className="rounded-md border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">Loading stock data...</div>;
  }

  if (recordId && !existingRecord) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Stock record not found. <Link to={`/stock-management/${entityKey}`} className="font-semibold underline">Return to list</Link>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)] print:hidden">
        <Link to="/stock-management" className="hover:text-[var(--primary)]">
          Stock Management
        </Link>
        <Crumb size={12} />
        <Link to={`/stock-management/${entityKey}`} className="hover:text-[var(--primary)]">
          {entity.label}
        </Link>
        <Crumb size={12} />
        <span className="text-[var(--ink)]">
          {isView ? "View" : mode === "edit" ? "Edit" : "New"} {entity.singular}
        </span>
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)]">
        {isView ? values.id : mode === "edit" ? `Edit ${entity.label}` : `New ${entity.label}`}
      </h2>

      {isView && workflowSteps[entityKey] && (
        <div className="mt-3 rounded-md border border-[var(--line)] bg-white p-4">
          <WorkflowTimeline steps={workflowSteps[entityKey]} activity={values.activity || [{ event: values.status, date: values.date, by: "—" }]} />
        </div>
      )}

      {errorBanner && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 print:hidden">
          <AlertCircle size={16} />
          {errorBanner}
        </div>
      )}

      <div className="mt-4 rounded-md border border-[var(--line)] bg-white">
        {!entity.form.singlePage && (
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
        )}

        <div className={entity.form.singlePage ? "divide-y divide-[var(--line)]" : "p-4 sm:p-5"}>
          {entity.form.tabs
            .filter((tab) => entity.form.singlePage || tab.key === activeTab)
            .map((tab) => (
              <section key={tab.key} className={entity.form.singlePage ? "p-4 sm:p-5" : ""}>
                {entity.form.singlePage && <h3 className="mb-4 text-sm font-semibold uppercase text-[var(--muted)]">{tab.label}</h3>}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tab.fields.map((field) => (
                    <div key={field.key} className={field.span === "full" ? "sm:col-span-2 lg:col-span-3" : ""}>
                      <Field
                        field={{ ...field, options: resolveFieldOptions(field, masterData, values[field.key], values) }}
                        value={values[field.key]}
                        error={errors[field.key]}
                        disabled={isReadOnlyMode}
                        formValues={values}
                        getAvailable={stockData.getAvailable}
                        materialRows={materialRows}
                        stockBatches={stockData.batches}
                        onChange={(next) => handleFieldChange(field, next)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </div>

      <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-end gap-2 rounded-md border border-[var(--line)] bg-white/95 p-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur print:hidden">
        {isReadOnlyMode ? (
          <>
            <button type="button" onClick={handleCancel} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Close
            </button>
            <button type="button" onClick={() => window.print()} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Print
            </button>
            {isView && canEditRecord && (
              <Link
                to={`/stock-management/${entityKey}/${recordId}/edit`}
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]"
              >
                Edit {entity.singular}
              </Link>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={handleCancel} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Cancel
            </button>
            {visibleFormActions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => handleAction(action)}
                className={`rounded-md px-4 py-2 text-sm font-semibold ${kindClass[action.kind] || kindClass.outline}`}
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
