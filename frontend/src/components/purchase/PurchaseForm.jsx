import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ChevronRight as Crumb, Paperclip, Plus, Trash2 } from "lucide-react";
import { masterEntities } from "../../data/masterManagement.js";
import { purchaseEntities, materials, materialByCode, lineTotal, poTotals } from "../../data/purchaseManagement.js";
import { ConfirmDialog } from "../ui.jsx";
import { usePurchaseData } from "./PurchaseDataContext.jsx";
import { useMasterData } from "../master/MasterDataContext.jsx";
import { useToast } from "../Toast.jsx";
import { WorkflowTimeline } from "./WorkflowTimeline.jsx";
import { DocumentChain } from "./DocumentChain.jsx";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

const idPrefixes = { "purchase-request": "PR", "purchase-order": "PO", "goods-receipt": "GRN", "purchase-return": "RET" };

function nextId(entityKey, rows) {
  const prefix = idPrefixes[entityKey];
  const width = rows[0]?.id.split("-").pop().length || 3;
  const nums = rows.map((r) => parseInt(r.id.split("-").pop(), 10)).filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-2026-${String(next).padStart(width, "0")}`;
}

const workflowSteps = {
  "purchase-request": ["Created", "Submitted for Approval", "Approved", "Converted"],
  "purchase-order": ["Created", "Approved", "Sent to Supplier", "Received"],
  "goods-receipt": ["Created", "Submitted for Inspection", "Inspection Completed", "Stock Updated"],
  "purchase-return": ["Created", "Submitted for Approval", "Approved", "Stock Deducted"],
};

function documentLinks(entityKey, values) {
  if (entityKey === "purchase-order") {
    return [
      { label: "Purchase Request", id: values.refPR, to: values.refPR && `/purchase-management/purchase-request/${values.refPR}/view` },
      { label: "Purchase Order", id: values.id },
    ];
  }
  if (entityKey === "goods-receipt") {
    return [
      { label: "Purchase Order", id: values.refPO, to: values.refPO && `/purchase-management/purchase-order/${values.refPO}/view` },
      { label: "Goods Receipt", id: values.id },
    ];
  }
  if (entityKey === "purchase-return") {
    return [
      { label: "Purchase Order", id: values.refPO, to: values.refPO && `/purchase-management/purchase-order/${values.refPO}/view` },
      { label: "Goods Receipt", id: values.refGRN, to: values.refGRN && `/purchase-management/goods-receipt/${values.refGRN}/view` },
      { label: "Purchase Return", id: values.id },
    ];
  }
  return [{ label: "Purchase Request", id: values.id }];
}

function LineItemCell({ column, row, disabled, onChange }) {
  const readOnly = disabled || column.readOnly;

  if (column.type === "material-select") {
    return (
      <select
        disabled={readOnly}
        value={row.code || ""}
        onChange={(event) => {
          const code = event.target.value;
          const mat = materialByCode(code);
          onChange({ ...row, code, name: mat?.name || "", unit: mat?.unit || "", price: row.price ?? mat?.price ?? "" });
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

  if (column.type === "computed-line-total") {
    return <span className="block px-2 py-1.5 text-sm font-medium text-[var(--ink)]">{money.format(lineTotal(row))}</span>;
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
        if (column.maxKey && value !== "" && Number(value) > Number(row[column.maxKey])) {
          value = row[column.maxKey];
        }
        onChange({ ...row, [column.key]: value });
      }}
      className="w-full min-w-[90px] rounded border border-[var(--line)] px-2 py-1.5 text-sm"
    />
  );
}

function LineItemsField({ field, rows, disabled, onChange }) {
  const items = Array.isArray(rows) ? rows : [];
  const totals = field.totals === true ? poTotals(items) : field.totals === "return" ? { grandTotal: items.reduce((s, i) => s + (Number(i.returnQty) || 0) * (Number(i.price) || 0), 0) } : null;

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
        <div className="ml-auto mt-3 max-w-xs space-y-1 rounded-md border border-[var(--line)] bg-slate-50 p-3 text-sm">
          {field.totals === true ? (
            <>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Subtotal</span>
                <span>{money.format(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Discount</span>
                <span>-{money.format(totals.discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Tax</span>
                <span>{money.format(totals.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--line)] pt-1 font-semibold text-[var(--ink)]">
                <span>Grand Total</span>
                <span>{money.format(totals.grandTotal)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between font-semibold text-[var(--ink)]">
              <span>Total Return Value</span>
              <span>{money.format(totals.grandTotal)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ field, value, error, disabled, onChange }) {
  const baseInput = `w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)] ${
    error ? "border-[var(--danger)] focus:ring-red-100" : "border-[var(--line)]"
  }`;

  if (field.type === "lineItems") {
    return <LineItemsField field={field} rows={value} disabled={disabled} onChange={onChange} />;
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

export function PurchaseForm({ entityKey, mode, recordId }) {
  const entity = purchaseEntities[entityKey];
  const purchaseData = usePurchaseData();
  const masterData = useMasterData();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isView = mode === "view";

  const existingRecord = recordId ? purchaseData.getRecord(entityKey, recordId) : null;
  const convertFrom = !recordId ? location.state?.convertFrom : null;

  const [values, setValues] = useState(() => {
    if (existingRecord) return { ...existingRecord };

    const base = { id: nextId(entityKey, purchaseData.getRows(entityKey)), date: today(), status: "Draft", items: [] };

    if (convertFrom?.entityKey === "purchase-request" && entityKey === "purchase-order") {
      const source = convertFrom.record;
      return {
        ...base,
        refPR: source.id,
        supplier: "",
        items: source.items.map((item) => ({ code: item.code, name: item.name, qty: item.qty, unit: item.unit, price: materialByCode(item.code)?.price || 0, discount: 0, tax: 12 })),
      };
    }
    if (convertFrom?.entityKey === "purchase-order" && entityKey === "goods-receipt") {
      const source = convertFrom.record;
      return {
        ...base,
        refPO: source.id,
        supplier: source.supplier,
        warehouse: source.warehouse,
        items: source.items.map((item) => ({ code: item.code, name: item.name, orderedQty: item.qty, receivedQty: item.qty, acceptedQty: item.qty, rejectedQty: 0, unit: item.unit, batch: "", expiry: "" })),
      };
    }
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

    if (entityKey === "purchase-order" && field.key === "supplier") {
      const match = masterEntities.supplier.list.rows.find((s) => s.name === next);
      setValues((prev) => ({ ...prev, supplier: next, contact: match?.contact || "", phone: match?.phone || "" }));
    }

    if (entityKey === "goods-receipt" && field.key === "refPO") {
      const po = purchaseData.getRecord("purchase-order", next);
      if (po) {
        setValues((prev) => ({
          ...prev,
          refPO: next,
          supplier: po.supplier,
          warehouse: po.warehouse,
          items: po.items.map((item) => ({ code: item.code, name: item.name, orderedQty: item.qty, receivedQty: item.qty, acceptedQty: item.qty, rejectedQty: 0, unit: item.unit, batch: "", expiry: "" })),
        }));
      }
    }

    if (entityKey === "purchase-return" && field.key === "refGRN") {
      const grn = purchaseData.getRecord("goods-receipt", next);
      if (grn) {
        const rawRows = masterData.getRows("raw-material");
        setValues((prev) => ({
          ...prev,
          refGRN: next,
          refPO: grn.refPO,
          supplier: grn.supplier,
          warehouse: grn.warehouse,
          items: grn.items.map((item) => ({
            code: item.code,
            name: item.name,
            receivedQty: item.acceptedQty,
            availableQty: rawRows.find((r) => r.code === item.code)?.stock || 0,
            returnQty: 0,
            unit: item.unit,
            price: materialByCode(item.code)?.price || 0,
            batch: item.batch,
            reason: "",
          })),
        }));
      }
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

  function applyStockUpdate(direction) {
    values.items.forEach((item) => {
      const rawRows = masterData.getRows("raw-material");
      const current = rawRows.find((r) => r.code === item.code);
      if (!current) return;
      const qty = direction === "increase" ? Number(item.acceptedQty) || 0 : Number(item.returnQty) || 0;
      const delta = direction === "increase" ? qty : -qty;
      masterData.updateRow("raw-material", item.code, { stock: Math.max(0, (Number(current.stock) || 0) + delta) });
    });
  }

  function executeAction(action) {
    const record = {
      ...values,
      status: action.status || values.status,
      activity: [...(values.activity || []), { event: action.status || "Updated", date: today(), by: "You" }],
    };

    if (action.updatesStock) applyStockUpdate(action.updatesStock);

    if (mode === "edit") purchaseData.updateRow(entityKey, recordId, record);
    else purchaseData.addRow(entityKey, record);

    showToast(action.status ? `${values.id} updated to "${action.status}".` : `${entity.singular} saved.`);
    setPendingAction(null);
    navigate(`/purchase-management/${entityKey}`);
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
    navigate(`/purchase-management/${entityKey}`);
  }

  const kindClass = {
    ghost: "border border-[var(--line)] text-[var(--ink)] hover:bg-slate-50",
    outline: "border border-[var(--line)] text-[var(--ink)] hover:bg-slate-50",
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-deep)]",
  };

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)] print:hidden">
        <Link to="/purchase-management" className="hover:text-[var(--primary)]">
          Purchase Management
        </Link>
        <Crumb size={12} />
        <Link to={`/purchase-management/${entityKey}`} className="hover:text-[var(--primary)]">
          {entity.label}
        </Link>
        <Crumb size={12} />
        <span className="text-[var(--ink)]">
          {isView ? "View" : mode === "edit" ? "Edit" : "New"} {entity.singular}
        </span>
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[var(--ink)]">
          {isView ? values.id : mode === "edit" ? `Edit ${entity.label}` : `New ${entity.label}`}
        </h2>
      </div>

      {isView && (
        <div className="mt-3 space-y-3 rounded-md border border-[var(--line)] bg-white p-4">
          <DocumentChain links={documentLinks(entityKey, values)} />
          <WorkflowTimeline steps={workflowSteps[entityKey]} activity={values.activity} />
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
              to={`/purchase-management/${entityKey}/${recordId}/edit`}
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
