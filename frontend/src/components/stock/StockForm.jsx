import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ChevronRight as Crumb, Paperclip, Plus, Trash2 } from "lucide-react";
import { stockEntities, materials, materialByCode } from "../../data/stockManagement.js";
import { ConfirmDialog } from "../ui.jsx";
import { useStockData } from "./StockDataContext.jsx";
import { useToast } from "../Toast.jsx";
import { WorkflowTimeline } from "../purchase/WorkflowTimeline.jsx";

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
  "stock-transfer": ["Created", "Approved", "In Transit", "Received", "Completed"],
  "stock-count": ["Draft", "Counting", "Variance Review", "Approved", "Adjustment", "Completed"],
};

function LineItemCell({ column, row, disabled, onChange, formValues, getAvailable }) {
  const readOnly = disabled || column.readOnly;
  const warehouse = column.warehouseKey ? formValues[column.warehouseKey] : formValues.warehouse;

  if (column.type === "material-select") {
    return (
      <select
        disabled={readOnly}
        value={row.code || ""}
        onChange={(event) => {
          const code = event.target.value;
          const mat = materialByCode(code);
          const systemQty = code ? getAvailable(code, warehouse) : 0;
          onChange({ ...row, code, name: mat?.name || "", unit: mat?.unit || "", systemQty });
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

function LineItemsField({ field, rows, disabled, onChange, formValues, getAvailable }) {
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

function Field({ field, value, error, disabled, onChange, formValues, getAvailable }) {
  const baseInput = `w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)] ${
    error ? "border-[var(--danger)] focus:ring-red-100" : "border-[var(--line)]"
  }`;

  if (field.type === "lineItems") {
    return <LineItemsField field={field} rows={value} disabled={disabled} onChange={onChange} formValues={formValues} getAvailable={getAvailable} />;
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
          {materials.map((m) => (
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

export function StockForm({ entityKey, mode, recordId }) {
  const entity = stockEntities[entityKey];
  const stockData = useStockData();
  const showToast = useToast();
  const navigate = useNavigate();
  const isView = mode === "view";

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

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleFieldChange(field, next) {
    setField(field.key, next);
    if (entityKey === "stock-adjustment" && field.key === "code") {
      const mat = materialByCode(next);
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
    const record = { ...values, status: action.status || values.status };
    if (values.activity) record.activity = [...values.activity, { event: action.status || "Updated", date: today(), by: "You" }];

    if (action.stockEffect === "in") stockData.postStockIn(values.items, { warehouse: values.warehouse, reference: values.refNumber || values.id, user: "You", date: values.date });
    if (action.stockEffect === "out") stockData.postStockOut(values.items, { warehouse: values.warehouse, reference: values.refNumber || values.id, user: "You", date: values.date });
    if (action.stockEffect === "transfer") stockData.postTransfer(values.items, { fromWarehouse: values.fromWarehouse, toWarehouse: values.toWarehouse, reference: values.id, user: "You", date: values.date });
    if (action.stockEffect === "adjustment") stockData.postAdjustment(values, "You");

    if (action.createsAdjustment) {
      // Compare against each item's frozen system-qty snapshot (taken when it was
      // added to the count), not a live re-lookup — the whole point of a count is to
      // reconcile against the balance as it stood at count time. Track newly created
      // adjustment ids locally so a multi-item count doesn't reuse the same next-id
      // (stockData.getRows() won't reflect an addRow() until the next render).
      let priorAdjustments = stockData.getRows("stock-adjustment");
      (values.items || []).forEach((item) => {
        if (!item.code) return;
        const systemQty = Number(item.systemQty) || 0;
        const variance = (Number(item.physicalQty) || 0) - systemQty;
        if (variance === 0) return;
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
        stockData.addRow("stock-adjustment", adjRecord);
        stockData.postAdjustment(adjRecord, "You");
        priorAdjustments = [adjRecord, ...priorAdjustments];
      });
    }

    if (mode === "edit") stockData.updateRow(entityKey, recordId, record);
    else stockData.addRow(entityKey, record);

    showToast(action.status ? `${values.id} updated to "${action.status}".` : `${entity.singular} saved.`);
    setPendingAction(null);
    navigate(`/stock-management/${entityKey}`);
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
                      getAvailable={stockData.getAvailable}
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
            <Link
              to={`/stock-management/${entityKey}/${recordId}/edit`}
              className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]"
            >
              Edit {entity.singular}
            </Link>
          </>
        ) : (
          <>
            <button type="button" onClick={handleCancel} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Cancel
            </button>
            {entity.formActions.map((action) => (
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
