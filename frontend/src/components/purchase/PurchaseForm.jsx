import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Check, ChevronDown, ChevronRight as Crumb, Paperclip, Plus, Trash2, X } from "lucide-react";
import { masterEntities } from "../../data/masterManagement.js";
import { purchaseEntities, materialByCode, lineTotal, poTotals } from "../../data/purchaseManagement.js";
import { ConfirmDialog } from "../ui.jsx";
import { usePurchaseData } from "./PurchaseDataContext.jsx";
import { useMasterData } from "../master/MasterDataContext.jsx";
import { useToast } from "../Toast.jsx";
import { useAuth } from "../../stores/AuthStore.jsx";
import { WorkflowTimeline } from "./WorkflowTimeline.jsx";
import { DocumentChain } from "./DocumentChain.jsx";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

const idPrefixes = { "purchase-request": "PR", "purchase-order": "PO", "goods-receipt": "GRN", "purchase-return": "RET" };
const editLockedStatuses = ["Approved", "Rejected", "Ordered", "Partially Received", "Received", "Returned", "Cancelled", "Completed"];

function nextId(entityKey, rows) {
  const prefix = idPrefixes[entityKey];
  const width = rows[0]?.id.split("-").pop().length || 3;
  const nums = rows.map((r) => parseInt(r.id.split("-").pop(), 10)).filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-2026-${String(next).padStart(width, "0")}`;
}

const workflowSteps = {
  "purchase-request": ["Created", "Submitted for Approval", "Approved", "Received"],
  "purchase-order": ["Created", "Approved", "Sent to Supplier", "Received"],
  "goods-receipt": ["Created", "Submitted for Inspection", "Inspection Completed", "Stock Updated"],
  "purchase-return": ["Created", "Submitted for Approval", "Approved", "Stock Deducted"],
};

function optionLabel(row) {
  return row.name || row.storeName || row.code || "";
}

function uniqueOptions(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function resolveFieldOptions(field, getMasterRows, getPurchaseRows, currentValue) {
  if (field.optionsFrom) {
    const entityOptions = getMasterRows(field.optionsFrom)
      .filter((row) => row.status !== "Inactive")
      .map(optionLabel);

    return uniqueOptions([...entityOptions, currentValue]);
  }

  if (field.optionsFromPurchase) {
    const entityOptions = getPurchaseRows(field.optionsFromPurchase)
      .filter((row) => row.status !== "Cancelled")
      .map((row) => row.id);

    return uniqueOptions([...entityOptions, currentValue]);
  }

  return field.options || [];
}

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

function materialUnitPrice(material) {
  return material?.purchasePrice ?? material?.lastPurchasePrice ?? material?.standardCost ?? material?.price ?? material?.sellingPrice ?? "";
}

function filterItemRows(productRows, department) {
  const rowsByCode = new Map();
  productRows.forEach((row) => {
    if (!row.code || rowsByCode.has(row.code)) return;
    if (department && row.department !== department) return;
    rowsByCode.set(row.code, {
      ...row,
      unit: row.unit || row.baseUnit || "",
      price: materialUnitPrice(row),
    });
  });
  return [...rowsByCode.values()];
}

function materialOptionLabel(material) {
  if (!material?.name) return "";
  return [material.name, material.code].filter(Boolean).join(" - ");
}

function MaterialLineItemSelect({ row, disabled, onChange, materialRows = [], selectedCodes = new Set() }) {
  const selectedMaterial = materialRows.find((m) => m.code === row.code);
  const selectedLabel = row.code ? materialOptionLabel(selectedMaterial || row) : "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selectedLabel);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  function openDropdown() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  }

  const options = useMemo(
    () => materialRows.filter((material) => material.code === row.code || !selectedCodes.has(material.code)),
    [materialRows, row.code, selectedCodes]
  );
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || query === selectedLabel) return options;
    return options.filter((material) =>
      [material.name, material.code, material.category, material.productType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [options, query, selectedLabel]);

  useEffect(() => {
    if (!open) setQuery(selectedLabel);
  }, [open, selectedLabel]);

  useEffect(() => {
    if (!open) return undefined;

    function handleDocumentMouseDown(event) {
      if (rootRef.current?.contains(event.target)) return;
      setOpen(false);
      setQuery(selectedLabel);
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, [open, selectedLabel]);

  function selectMaterial(material) {
    onChange({
      ...row,
      code: material.code,
      name: material.name || "",
      unit: material.unit || material.baseUnit || "",
      price: materialUnitPrice(material),
    });
    setQuery(materialOptionLabel(material));
    setOpen(false);
  }

  function handleChange(value) {
    setQuery(value);
    setOpen(true);

    if (!value.trim()) {
      onChange({ ...row, code: "", name: "", unit: "", price: "" });
      return;
    }

    const typedValue = value.split(" - ").pop().trim();
    if (selectedCodes.has(typedValue)) return;

    const matchedMaterial = options.find((material) => materialOptionLabel(material) === value || material.code === value || material.name === value);
    if (matchedMaterial) selectMaterial(matchedMaterial);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        value={query}
        placeholder="Search item name..."
        onFocus={openDropdown}
        onChange={(event) => {
          openDropdown();
          handleChange(event.target.value);
        }}
        className="w-full min-w-[210px] rounded border border-[var(--line)] px-2 py-1.5 pr-8 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)]"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-[var(--muted)] hover:bg-slate-50 disabled:pointer-events-none"
      >
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !disabled && (
        <div
          className="fixed z-40 max-h-60 overflow-y-auto rounded-md border border-[var(--line)] bg-white py-1 shadow-lg"
          style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
        >
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[var(--muted)]">No items found</p>
          ) : (
            filteredOptions.map((material) => (
              <button
                key={material.code}
                type="button"
                onClick={() => selectMaterial(material)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  material.code === row.code ? "font-semibold text-[var(--primary)]" : "text-[var(--ink)]"
                }`}
              >
                <span className="block font-medium">{material.name}</span>
                <span className="block text-xs text-[var(--muted)]">
                  {material.code}
                  {material.department ? ` · ${material.department}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function LineItemCell({ column, row, disabled, onChange, materialRows = [], selectedCodes = new Set() }) {
  const readOnly = disabled || column.readOnly;

  if (column.type === "material-select") {
    return <MaterialLineItemSelect row={row} disabled={readOnly} onChange={onChange} materialRows={materialRows} selectedCodes={selectedCodes} />;
  }

  if (column.type === "material-select") {
    return (
      <select
        disabled={readOnly}
        value={row.code || ""}
        onChange={(event) => {
          const code = event.target.value;
          if (selectedCodes.has(code)) return;

          const mat = materialRows.find((m) => m.code === code);
          onChange({ ...row, code, name: mat?.name || "", unit: mat?.unit || mat?.baseUnit || "", price: materialUnitPrice(mat) });
        }}
        className="w-full min-w-[170px] rounded border border-[var(--line)] px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-[var(--muted)]"
      >
        <option value="">Select material...</option>
        {materialRows.map((m) => (
          <option key={m.code} value={m.code} disabled={selectedCodes.has(m.code)}>
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

function LineItemsField({ field, rows, disabled, onChange, materialRows, hideAddButton = false }) {
  const items = Array.isArray(rows) ? rows : [];
  const totals =
    field.totals === true
      ? poTotals(items)
      : field.totals === "return"
        ? { grandTotal: items.reduce((s, i) => s + (Number(i.returnQty) || 0) * (Number(i.price) || 0), 0) }
        : field.totals === "request"
          ? { grandTotal: items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0) }
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
                      materialRows={materialRows}
                      selectedCodes={new Set(items.filter((_, itemIndex) => itemIndex !== index).map((item) => item.code).filter(Boolean))}
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

      {!disabled && field.allowAddRemove && !hideAddButton && (
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
              <span>{field.totals === "request" ? "Total Request Value" : "Total Return Value"}</span>
              <span>{money.format(totals.grandTotal)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchableSelect({ field, value, options, disabled, className, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function handleDocumentMouseDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`${className} flex items-center justify-between gap-2 text-left`}
      >
        <span className={value ? "" : "text-slate-400"}>{value || `Select ${field.label.toLowerCase()}...`}</span>
        <ChevronDown size={16} className={`shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-lg">
          <input
            autoFocus
            type="text"
            value={query}
            placeholder={`Search ${field.label.toLowerCase()}...`}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full border-b border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          />
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[var(--muted)]">No options found</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${option === value ? "font-semibold text-[var(--primary)]" : "text-[var(--ink)]"}`}
                >
                  {option}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RejectionReasonDialog({ open, reason, error, onReasonChange, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-md border border-[var(--line)] bg-white p-5 shadow-xl">
        <div>
          <h3 className="text-base font-semibold text-[var(--ink)]">Reject with reason</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Enter the rejection reason before saving this decision.</p>
        </div>
        <label className="mt-4 block text-sm font-medium text-[var(--ink)]">
          Rejection Reason <span className="text-[var(--danger)]">*</span>
        </label>
        <textarea
          autoFocus
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={4}
          className={`mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 ${
            error ? "border-[var(--danger)] focus:ring-red-100" : "border-[var(--line)] focus:ring-blue-100"
          }`}
        />
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ field, value, error, disabled, onChange, materialRows }) {
  const fieldDisabled = disabled || field.readOnly;
  const options = field.options || [];
  const baseInput = `w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)] ${
    error ? "border-[var(--danger)] focus:ring-red-100" : "border-[var(--line)]"
  }`;

  if (field.type === "lineItems") {
    return (
      <div>
        <LineItemsField field={field} rows={value} disabled={fieldDisabled} onChange={onChange} materialRows={materialRows} hideAddButton={field.hideAddButton} />
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  if (field.type === "toggle") {
    return (
      <label className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] px-3 py-2.5">
        <span className="text-sm font-medium text-[var(--ink)]">{field.label}</span>
        <button
          type="button"
          disabled={fieldDisabled}
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
        {field.searchable ? (
          <SearchableSelect field={field} value={value || ""} options={options} disabled={fieldDisabled} className={baseInput} onChange={onChange} />
        ) : (
          <select value={value || ""} disabled={fieldDisabled} onChange={(event) => onChange(event.target.value)} className={baseInput}>
            <option value="">Select {field.label.toLowerCase()}...</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className={field.span === "full" ? "sm:col-span-2 lg:col-span-3" : ""}>
        <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{field.label}</label>
        <textarea value={value || ""} disabled={fieldDisabled} onChange={(event) => onChange(event.target.value)} rows={3} className={baseInput} />
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{field.label}</label>
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm ${
            fieldDisabled ? "text-[var(--muted)]" : "text-[var(--ink)] hover:bg-slate-50"
          } border-[var(--line)]`}
        >
          <Paperclip size={14} />
          {value ? value : "Choose file..."}
          <input type="file" disabled={fieldDisabled} className="hidden" onChange={(event) => onChange(event.target.files?.[0]?.name || "")} />
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

function fieldSpanClass(field) {
  if (field.span === "full") return "sm:col-span-12";
  if (field.span === "half") return "sm:col-span-6";
  if (field.span === "quarter") return "sm:col-span-6 lg:col-span-3";
  return "sm:col-span-6 lg:col-span-4";
}

export function PurchaseForm({ entityKey, mode, recordId }) {
  const entity = purchaseEntities[entityKey];
  const purchaseData = usePurchaseData();
  const masterData = useMasterData();
  const { session } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isView = mode === "view";
  const authUserName = session?.user?.name || "You";

  const existingRecord = recordId ? purchaseData.getRecord(entityKey, recordId) : null;
  const convertFrom = !recordId ? location.state?.convertFrom : null;
  const allItemRows = filterItemRows(masterData.getRows("product-item"));

  function getAnyItem(code) {
    return allItemRows.find((m) => m.code === code) || materialByCode(code);
  }

  const [values, setValues] = useState(() => {
    if (existingRecord) return { ...existingRecord };

    const base = {
      id: nextId(entityKey, purchaseData.getRows(entityKey)),
      date: today(),
      status: "Draft",
      items: [],
      ...(entityKey === "purchase-request" ? { requestedBy: authUserName } : {}),
    };

    if (convertFrom?.entityKey === "purchase-request" && entityKey === "purchase-order") {
      const source = convertFrom.record;
      return {
        ...base,
        refPR: source.id,
        supplier: "",
        items: source.items.map((item) => ({ code: item.code, name: item.name, qty: item.qty, unit: item.unit, price: item.price ?? (materialUnitPrice(getAnyItem(item.code)) || 0), discount: 0, tax: 12 })),
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

  const [errors, setErrors] = useState({});
  const [errorBanner, setErrorBanner] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [reasonAction, setReasonAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionReasonError, setRejectionReasonError] = useState("");
  const itemRows = filterItemRows(masterData.getRows("product-item"), values.department);
  const visibleTabs = entity.form.tabs.filter((tab) => !(entityKey === "purchase-request" && mode === "create" && tab.key === "approval"));
  const visibleFormActions = entity.formActions.filter((action) => {
    if (action.showWhen && !action.showWhen(values)) return false;
    if (action.hideWhen && action.hideWhen(values)) return false;
    return true;
  });
  const canEditRecord = !editLockedStatuses.includes(values.status);
  const actionBarActions =
    mode === "edit"
      ? [{ key: "update", label: "Update", kind: "primary", validate: true }]
      : visibleFormActions;

  function getItem(code) {
    return itemRows.find((m) => m.code === code) || getAnyItem(code);
  }

  useEffect(() => {
    if (entityKey !== "purchase-request" || mode !== "create") return;
    setValues((prev) => ({ ...prev, requestedBy: authUserName }));
  }, [authUserName, entityKey, mode]);

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleFieldChange(field, next) {
    if (entityKey === "purchase-request" && field.key === "department") {
      setValues((prev) => ({ ...prev, department: next, items: prev.department === next ? prev.items : [] }));
      return;
    }

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
        const masterItemRows = masterData.getRows("product-item");
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
            availableQty: masterItemRows.find((r) => r.code === item.code)?.stock || 0,
            returnQty: 0,
            unit: item.unit,
            price: materialUnitPrice(getItem(item.code)) || 0,
            batch: item.batch,
            reason: "",
          })),
        }));
      }
    }
  }

  function validate() {
    const nextErrors = {};
    visibleTabs.forEach((tab) => {
      tab.fields.forEach((field) => {
        if (field.required && !field.autoLabel && !String(values[field.key] ?? "").trim()) {
          nextErrors[field.key] = `${field.label} is required.`;
        }
        if (field.type === "lineItems") {
          const selectedCodes = (Array.isArray(values[field.key]) ? values[field.key] : []).map((item) => item.code).filter(Boolean);
          const hasDuplicateCode = selectedCodes.some((code, index) => selectedCodes.indexOf(code) !== index);
          if (hasDuplicateCode) nextErrors[field.key] = "Same item cannot be added more than once.";
          if (entityKey === "purchase-request" && values.department) {
            const availableCodes = new Set(itemRows.map((item) => item.code));
            const unavailableCode = selectedCodes.find((code) => !availableCodes.has(code));
            if (unavailableCode) nextErrors[field.key] = "Selected item does not belong to the selected department.";
          }
        }
      });
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setErrorBanner(`Please fill in ${Object.keys(nextErrors).length} required field(s).`);
      return false;
    }
    setErrorBanner("");
    return true;
  }

  function applyStockUpdate(direction) {
    values.items.forEach((item) => {
      const masterItemRows = masterData.getRows("product-item");
      const current = masterItemRows.find((r) => r.code === item.code);
      if (!current) return;
      const qty = direction === "increase" ? Number(item.acceptedQty) || 0 : Number(item.returnQty) || 0;
      const delta = direction === "increase" ? qty : -qty;
      masterData.updateRow("product-item", item.code, { stock: Math.max(0, (Number(current.stock) || 0) + delta) });
    });
  }

  function approvalPatch(action, reason = "") {
    const status = action.status || values.status;
    if (action.approvalAction === "approve") {
      return {
        approvedBy: authUserName,
        approvalDate: today(),
        rejectedBy: "",
        rejectionDate: "",
        rejectionReason: "",
      };
    }
    if (action.approvalAction === "reject") {
      return {
        rejectedBy: authUserName,
        rejectionDate: today(),
        rejectionReason: reason,
        approvedBy: "",
        approvalDate: "",
      };
    }
    if (status === "Pending Approval") {
      return {
        approvedBy: "",
        approvalDate: "",
        rejectedBy: "",
        rejectionDate: "",
        rejectionReason: "",
      };
    }
    return {};
  }

  function executeAction(action, options = {}) {
    const record = {
      ...values,
      ...(entityKey === "purchase-request" && mode === "create" ? { requestedBy: authUserName } : {}),
      status: action.status || values.status,
      ...approvalPatch(action, options.reason),
      activity: [...(values.activity || []), { event: action.status || "Updated", date: today(), by: authUserName }],
    };

    if (action.updatesStock) applyStockUpdate(action.updatesStock);

    if (mode === "edit") purchaseData.updateRow(entityKey, recordId, record);
    else purchaseData.addRow(entityKey, record);

    if (entityKey === "purchase-order" && mode !== "edit" && convertFrom?.entityKey === "purchase-request" && action.status !== "Draft") {
      const source = convertFrom.record;
      purchaseData.updateRow("purchase-request", source.id, {
        status: "Received",
        activity: [...(source.activity || []), { event: "Received", date: today(), by: authUserName }],
      });
    }

    showToast(action.status ? `${values.id} updated to "${action.status}".` : mode === "edit" ? `${values.id} updated.` : `${entity.singular} saved.`);
    setPendingAction(null);
    setReasonAction(null);
    setRejectionReason("");
    setRejectionReasonError("");
    navigate(`/purchase-management/${entityKey}`);
  }

  function handleAction(action) {
    if (action.print) {
      window.print();
      return;
    }
    if (action.validate && !validate()) return;
    if (action.requiresReason) {
      setReasonAction(action);
      setRejectionReason("");
      setRejectionReasonError("");
      return;
    }
    if (action.confirm) {
      setPendingAction(action);
      return;
    }
    executeAction(action);
  }

  function confirmReasonAction() {
    const reason = rejectionReason.trim();
    if (!reason) {
      setRejectionReasonError("Rejection reason is required.");
      return;
    }
    executeAction(reasonAction, { reason });
  }

  function handleCancel() {
    navigate(`/purchase-management/${entityKey}`);
  }

  function addLineItem(field) {
    const items = Array.isArray(values[field.key]) ? values[field.key] : [];
    setField(field.key, [...items, {}]);
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
        <div className="divide-y divide-[var(--line)]">
          {visibleTabs.map((tab) => (
            <section key={tab.key} className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h3 className="text-sm font-semibold uppercase text-[var(--muted)]">{tab.label}</h3>
                {!isView &&
                  tab.fields
                    .filter((field) => field.type === "lineItems" && field.allowAddRemove)
                    .map((field) => (
                      <button
                        key={`${field.key}-add`}
                        type="button"
                        onClick={() => addLineItem(field)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-deep)]"
                      >
                        <Plus size={13} /> Add Item
                      </button>
                    ))}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                {tab.fields.map((field) => (
                  <div key={field.key} className={fieldSpanClass(field)}>
                    <Field
                      field={{
                        ...(field.type === "lineItems" && field.allowAddRemove ? { ...field, hideAddButton: true } : field),
                        options: resolveFieldOptions(field, masterData.getRows, purchaseData.getRows, values[field.key]),
                      }}
                      value={values[field.key]}
                      error={errors[field.key]}
                      disabled={isView}
                      materialRows={itemRows}
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
        {isView ? (
          <>
            <button type="button" onClick={handleCancel} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Close
            </button>
            <button type="button" onClick={() => window.print()} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Print
            </button>
            {canEditRecord && (
              <Link
                to={`/purchase-management/${entityKey}/${recordId}/edit`}
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
            {actionBarActions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => handleAction(action)}
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold ${
                  action.tone === "danger" ? "border border-red-200 text-[var(--danger)] hover:bg-red-50" : kindClass[action.kind] || kindClass.outline
                }`}
              >
                {action.approvalAction === "approve" && <Check size={15} />}
                {action.approvalAction === "reject" && <X size={15} />}
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
      <RejectionReasonDialog
        open={Boolean(reasonAction)}
        reason={rejectionReason}
        error={rejectionReasonError}
        onReasonChange={(reason) => {
          setRejectionReason(reason);
          if (rejectionReasonError) setRejectionReasonError("");
        }}
        onConfirm={confirmReasonAction}
        onCancel={() => {
          setReasonAction(null);
          setRejectionReason("");
          setRejectionReasonError("");
        }}
      />
    </div>
  );
}
