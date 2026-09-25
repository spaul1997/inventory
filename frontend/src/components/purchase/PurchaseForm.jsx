import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Check, ChevronDown, ChevronRight as Crumb, Paperclip, Plus, Trash2, X } from "lucide-react";
import { masterEntities } from "../../data/masterManagement.js";
import { formatDisplayDate, purchaseEntities, materialByCode, lineTotal, poTotals } from "../../data/purchaseManagement.js";
import { ConfirmDialog } from "../ui.jsx";
import { usePurchaseData } from "./PurchaseDataContext.jsx";
import { useMasterData } from "../master/MasterDataContext.jsx";
import { useStockData } from "../stock/StockDataContext.jsx";
import { useToast } from "../Toast.jsx";
import { useAuth } from "../../stores/AuthStore.jsx";
import { WorkflowTimeline } from "./WorkflowTimeline.jsx";
import { DocumentChain } from "./DocumentChain.jsx";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const currentLocalDateTime = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};
const today = () => currentLocalDateTime().slice(0, 10);
const currentTime = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }).toUpperCase();
const currentDisplayDateTime = () => formatDisplayDate(currentLocalDateTime()).toUpperCase();
const dateTimeInputValue = (value) => {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00` : text;
};

const idPrefixes = { "purchase-request": "PR", "purchase-order": "PO", "goods-receipt": "GRN", "purchase-issue": "PI", "purchase-return": "RET" };
const editLockedStatuses = ["Approved", "Rejected", "Ordered", "Partially Received", "Completed GRN", "Received", "Issued", "Issue Complete", "Returned", "Cancelled", "Completed"];
const poCoverageStatuses = new Set(["Pending Approval", "Approved", "Ordered", "Partially Received", "Completed GRN", "Received"]);

function nextId(entityKey, rows) {
  const prefix = idPrefixes[entityKey];
  const width = rows[0]?.id.split("-").pop().length || 3;
  const nums = rows.map((r) => parseInt(r.id.split("-").pop(), 10)).filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-2026-${String(next).padStart(width, "0")}`;
}

const workflowSteps = {
  "purchase-request": ["Created", "Submitted for Approval", "Approved", "Received"],
  "purchase-order": ["Created", "Approved", "Sent to Supplier", "Completed GRN"],
  "goods-receipt": ["Created", "Submitted for Inspection", "Inspection Completed", "Stock Updated"],
  "purchase-issue": ["Created", "Submitted for Approval", "Approved", "Stock Issued"],
  "purchase-return": ["Created", "Submitted for Approval", "Approved", "Stock Deducted"],
};

const rejectedWorkflowSteps = {
  "purchase-request": ["Created", "Submitted for Approval", "Rejected"],
  "purchase-order": ["Created", "Submitted for Approval", "Rejected"],
  "goods-receipt": ["Created", "Submitted for Inspection", "Rejected"],
  "purchase-issue": ["Created", "Submitted for Approval", "Rejected"],
  "purchase-return": ["Created", "Submitted for Approval", "Rejected"],
};

function getWorkflowSteps(entityKey, status, activity = []) {
  if (status === "Rejected") return rejectedWorkflowSteps[entityKey] || workflowSteps[entityKey];
  if (
    entityKey === "purchase-request" &&
    (["Partial Issue", "Full Issue"].includes(status) || (activity || []).some((entry) => ["Partial Issue", "Full Issue"].includes(entry.event)))
  ) {
    return ["Created", "Submitted for Approval", "Approved", "Issue Status", "Received"];
  }
  return workflowSteps[entityKey];
}

function optionLabel(row) {
  return row.name || row.storeName || row.code || "";
}

function uniqueOptions(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function optionValues(value) {
  return (Array.isArray(value) ? value : [value]).map((item) => String(item || "").trim()).filter(Boolean);
}

function resolveFieldOptions(field, getMasterRows, getPurchaseRows, currentValue, values = {}) {
  if (field.optionsFrom) {
    const entityOptions = getMasterRows(field.optionsFrom)
      .filter((row) => row.status !== "Inactive")
      .filter((row) => !field.dependsOn || !values[field.dependsOn] || row.warehouse === values[field.dependsOn])
      .map(optionLabel);

    return uniqueOptions([...entityOptions, ...optionValues(currentValue)]);
  }

  if (field.optionsFromPurchase) {
    const currentValues = optionValues(currentValue);
    const entityOptions = getPurchaseRows(field.optionsFromPurchase)
      .filter((row) => {
        if (currentValues.includes(row.id)) return true;
        if (field.optionStatuses) return field.optionStatuses.includes(row.status);
        return row.status !== "Cancelled";
      })
      .map((row) => row.id);

    return uniqueOptions([...entityOptions, ...currentValues]);
  }

  return uniqueOptions([...(field.options || []), ...optionValues(currentValue)]);
}

function documentLinks(entityKey, values) {
  if (entityKey === "purchase-order") {
    return [{ label: "Purchase Order", id: values.id }];
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
  if (entityKey === "purchase-issue") {
    return [
      { label: "Purchase Order", id: values.refPO, to: values.refPO && `/purchase-management/purchase-order/${values.refPO}/view` },
      { label: "Goods Receipt", id: values.refGRN, to: values.refGRN && `/purchase-management/goods-receipt/${values.refGRN}/view` },
      { label: "Purchase Issue", id: values.id },
    ];
  }
  return [{ label: "Purchase Request", id: values.id }];
}

function materialUnitPrice(material) {
  return material?.purchasePrice ?? material?.lastPurchasePrice ?? material?.standardCost ?? material?.price ?? material?.sellingPrice ?? "";
}

function normalizeFilterValue(value) {
  return String(value || "").trim().toLowerCase();
}

function rowDepartmentValues(row) {
  const department = row?.department;
  const values = [department, row?.departmentName, row?.departmentCode];

  if (department && typeof department === "object") {
    values.push(department.name, department.code, department.label, department.value);
  }

  return values.map(normalizeFilterValue).filter(Boolean);
}

function departmentOptionValues(departments, department) {
  const selected = normalizeFilterValue(department);
  if (!selected) return new Set();

  const values = new Set([selected]);
  const matchedDepartment = departments.find((row) =>
    [row.name, row.code].some((value) => normalizeFilterValue(value) === selected)
  );

  if (matchedDepartment?.name) values.add(normalizeFilterValue(matchedDepartment.name));
  if (matchedDepartment?.code) values.add(normalizeFilterValue(matchedDepartment.code));
  return values;
}

function filterItemRows(productRows, department = "", departments = []) {
  const departmentValues = departmentOptionValues(departments, department);
  const rowsByCode = new Map();
  productRows.forEach((row) => {
    if (!row.code || rowsByCode.has(row.code)) return;
    const itemDepartmentValues = rowDepartmentValues(row);
    if (departmentValues.size > 0 && itemDepartmentValues.length > 0 && !itemDepartmentValues.some((value) => departmentValues.has(value))) return;
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

function grnNetAmount(row) {
  const qty = grnReceivedQty(row);
  const rate = Number(row.rate ?? row.price) || 0;
  return qty * rate;
}

function grnReceivedQty(row) {
  return Number(row.receivedQty ?? row.unitQty ?? row.acceptedQty) || 0;
}

function grnTaxPercent(row) {
  if (row.gst !== undefined && row.gst !== null && row.gst !== "") return Number(row.gst) || 0;
  return (Number(row.cgst) || 0) + (Number(row.sgst) || 0) + (Number(row.igst) || 0);
}

function normalizeGoodsReceiptItems(items, fallbackLocation = "") {
  return (Array.isArray(items) ? items : []).map((item) => {
    const { cgst, sgst, igst, discountPct, ...rest } = item;
    const percentageDiscount = grnNetAmount(item) * ((Number(discountPct) || 0) / 100);
    const discountAmount = Math.round(((Number(item.discountAmount) || 0) + percentageDiscount) * 100) / 100;
    return { ...rest, location: item.location || fallbackLocation, discountAmount, gst: grnTaxPercent(item) };
  });
}

function grnLineAmount(row) {
  const netAmount = grnNetAmount(row);
  const discountAmount = Number(row.discountAmount) || 0;
  const taxableAmount = Math.max(0, netAmount - discountAmount);
  const taxPercent = grnTaxPercent(row);
  return taxableAmount * (1 + taxPercent / 100);
}

function MaterialLineItemSelect({ row, disabled, onChange, materialRows = [], selectedCodes = new Set(), compact = false, placeholder = "Search item name..." }) {
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
        placeholder={placeholder}
        onFocus={openDropdown}
        onChange={(event) => {
          openDropdown();
          handleChange(event.target.value);
        }}
        className={`w-full ${compact ? "min-w-[155px] px-1.5 py-1 text-xs" : "min-w-[210px] px-2 py-1.5 text-sm"} rounded border border-[var(--line)] pr-8 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)]`}
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

function LineItemCell({ column, row, disabled, onChange, materialRows = [], selectedCodes = new Set(), compact = false, stockBatches = [] }) {
  const readOnly = disabled || column.readOnly;
  const isCompact = compact || column.compact;
  const displayClass = `block whitespace-nowrap rounded border border-[var(--line)] bg-slate-100 text-right text-[var(--muted)] ${isCompact ? "px-1 py-1 text-xs" : "px-2 py-1.5 text-sm"}`;
  const inputClass = `w-full ${isCompact ? "min-w-[44px] px-1 py-1 text-xs" : "min-w-[90px] px-2 py-1.5 text-sm"} rounded border border-[var(--line)] ${column.type === "number" ? "text-right" : ""}`;

  if (column.type === "material-select") {
    return <MaterialLineItemSelect row={row} disabled={readOnly} onChange={onChange} materialRows={materialRows} selectedCodes={selectedCodes} compact={isCompact} placeholder={column.placeholder} />;
  }

  if (column.type === "batch-select") {
    const batchOptions = stockBatches.filter((batch) => batch.code === row.code && batch.status !== "Consumed" && (Number(batch.qty) || 0) > 0);
    return (
      <select
        disabled={readOnly || !row.code}
        value={row.batch || ""}
        onChange={(event) => {
          const batch = batchOptions.find((item) => item.id === event.target.value);
          onChange({
            ...row,
            batch: event.target.value,
            expiry: batch?.expiryDate || "0",
            availableQty: batch ? Number(batch.qty) || 0 : row.availableQty,
            warehouse: batch?.warehouse || row.warehouse || "",
          });
        }}
        className={inputClass}
      >
        <option value="">{column.placeholder || "Select one..."}</option>
        {batchOptions.map((batch) => (
          <option key={`${batch.id}-${batch.warehouse}`} value={batch.id}>
            {batch.id}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "line-select") {
    const options = uniqueOptions(column.strictOptions ? column.options || [] : [...(column.options || []), row[column.key]]);
    return (
      <select disabled={readOnly || column.disabled} value={options.includes(row[column.key]) ? row[column.key] : ""} onChange={(event) => onChange({ ...row, [column.key]: event.target.value })} className={inputClass}>
        <option value="">{column.placeholder || "Select one..."}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
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

  if (column.type === "computed-grn-net") {
    return <span className={displayClass}>{money.format(grnNetAmount(row))}</span>;
  }

  if (column.type === "computed-grn-amount") {
    return <span className={displayClass}>{money.format(grnLineAmount(row))}</span>;
  }

  if (readOnly) {
    return <span className={`block whitespace-nowrap text-[var(--muted)] ${isCompact ? "px-1 py-1 text-xs" : "px-2 py-1.5 text-sm"}`}>{row[column.key] ?? ""}</span>;
  }

  return (
    <input
      type={column.type === "number" ? "number" : ["date", "datetime-local"].includes(column.type) ? column.type : "text"}
      min={column.type === "number" && column.min !== undefined ? column.min : undefined}
      max={column.type === "number" && column.maxKey ? row[column.maxKey] : undefined}
      value={row[column.key] ?? ""}
      onChange={(event) => {
        let value = event.target.value;
        if (column.type === "number" && column.min !== undefined && value !== "" && Number(value) < Number(column.min)) {
          value = column.min;
        }
        if (column.maxKey && value !== "" && Number(value) > Number(row[column.maxKey])) {
          value = row[column.maxKey];
        }
        const patch = { ...row, [column.key]: value };
        if (column.syncQuantity) {
          patch.unitQty = value;
          patch.receivedQty = value;
          patch.acceptedQty = value;
        }
        if (column.syncIssueQuantity) {
          patch.issueQty = value;
        }
        onChange(patch);
      }}
      className={inputClass}
    />
  );
}

const lineItemNumericColumnKeys = new Set([
  "qty",
  "orderedQty",
  "receivedQty",
  "acceptedQty",
  "rejectedQty",
  "availableQty",
  "requestedQty",
  "previouslyIssuedQty",
  "remainingQty",
  "maxIssueQty",
  "returnQty",
  "issueQty",
  "price",
  "discount",
  "tax",
  "total",
  "unitQty",
  "subUnitQty",
  "testQty",
  "mrp",
  "rate",
  "netAmount",
  "discountAmount",
  "gst",
  "amount",
]);

function lineItemColumnClass(column) {
  const numeric = lineItemNumericColumnKeys.has(column.key) || column.type === "computed-line-total";
  return `purchase-lineitems-col purchase-lineitems-col-${column.key} ${numeric ? "text-right" : ""}`;
}

function LineItemsField({ field, rows, disabled, onChange, materialRows, stockBatches = [], hideAddButton = false }) {
  const items = Array.isArray(rows) ? rows : [];
  const hasColumnGroups = Array.isArray(field.columnGroups) && field.columnGroups.length > 0;
  const compactRows = Boolean(field.compactRows);
  const canRemoveRows = field.allowAddRemove || field.allowRemoveRows;
  const groupedColumnKeys = new Set((field.columnGroups || []).flatMap((group) => group.keys || []));
  const columnGroupByStartKey = new Map((field.columnGroups || []).map((group) => [group.keys?.[0], group]));
  const totals =
    field.totals === true
      ? poTotals(items)
      : field.totals === "return"
        ? { grandTotal: items.reduce((s, i) => s + (Number(i.returnQty) || 0) * (Number(i.price) || 0), 0) }
        : field.totals === "issue"
          ? { grandTotal: items.reduce((s, i) => s + (Number(i.issueQty) || 0) * (Number(i.price) || 0), 0) }
        : field.totals === "request"
          ? { grandTotal: items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0) }
          : null;
  const defaultRow = () => ({ ...(field.defaultRow || {}) });

  return (
    <div>
      <div className="purchase-lineitems-wrapper overflow-x-auto rounded-md border border-[var(--line)]">
        <table className="purchase-lineitems-table w-full min-w-[700px] text-left text-sm" style={field.minWidth ? { minWidth: field.minWidth } : undefined}>
          <thead className={`${field.headerTone === "teal" ? "bg-teal-900 text-white" : "bg-slate-50 text-[var(--muted)]"} text-xs uppercase`}>
            {hasColumnGroups ? (
              <>
                <tr>
                  {field.columns.map((col) => {
                    const group = columnGroupByStartKey.get(col.key);
                    if (group) {
                      return (
                        <th key={group.label} colSpan={group.keys.length} className="border-b border-white/20 px-2 py-1.5 text-center">
                          {group.label}
                        </th>
                      );
                    }
                    if (groupedColumnKeys.has(col.key)) return null;
                    return (
                      <th key={col.key} rowSpan={2} className={`${compactRows ? "px-1.5 py-1.5" : "px-2 py-2"} first:pl-3 ${lineItemColumnClass(col)}`} style={col.width ? { minWidth: col.width } : undefined}>
                        {col.label}
                        {col.required && <span className="ml-0.5 text-red-300">*</span>}
                      </th>
                    );
                  })}
                  {!disabled && canRemoveRows && <th rowSpan={2} className="px-2 py-2" />}
                </tr>
                <tr>
                  {field.columns
                    .filter((col) => groupedColumnKeys.has(col.key))
                    .map((col) => (
                      <th key={col.key} className={`${compactRows ? "px-1.5 py-1.5" : "px-2 py-2"} ${lineItemColumnClass(col)}`} style={col.width ? { minWidth: col.width } : undefined}>
                        {col.label}
                        {col.required && <span className="ml-0.5 text-red-300">*</span>}
                      </th>
                    ))}
                </tr>
              </>
            ) : (
              <tr>
                {field.columns.map((col) => (
                  <th key={col.key} className={`${compactRows ? "px-1.5 py-1.5" : "px-2 py-2"} first:pl-3 ${lineItemColumnClass(col)}`} style={col.width ? { minWidth: col.width } : undefined}>
                    {col.label}
                    {col.required && <span className="ml-0.5 text-red-300">*</span>}
                  </th>
                ))}
                {!disabled && canRemoveRows && <th className="px-2 py-2" />}
              </tr>
            )}
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={field.columns.length + (canRemoveRows && !disabled ? 1 : 0)} className="px-3 py-4 text-center text-sm text-[var(--muted)]">
                  No items yet.
                </td>
              </tr>
            )}
            {items.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                {field.columns.map((col) => (
                  <td key={col.key} className={`${compactRows ? "px-1 py-1" : "px-2 py-1.5"} first:pl-3 ${lineItemColumnClass(col)}`} style={col.width ? { minWidth: col.width } : undefined}>
                    <LineItemCell
                      column={col}
                      row={row}
                      disabled={disabled}
                      materialRows={materialRows}
                      compact={compactRows}
                      stockBatches={stockBatches}
                      selectedCodes={field.allowDuplicateCodes ? new Set() : new Set(items.filter((_, itemIndex) => itemIndex !== index).map((item) => item.code).filter(Boolean))}
                      onChange={(next) => {
                        const updated = [...items];
                        updated[index] = next;
                        onChange(updated);
                      }}
                    />
                  </td>
                ))}
                {!disabled && canRemoveRows && (
                  <td className="px-2 py-1.5">
                    {field.inlineAddButton && index === items.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => onChange([...items, defaultRow()])}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 border-emerald-400 text-[var(--ink)] shadow-sm hover:bg-emerald-50"
                        aria-label="Add item"
                      >
                        <Plus size={15} strokeWidth={3} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onChange(items.filter((_, i) => i !== index))}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]"
                        aria-label="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
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
          onClick={() => onChange([...items, defaultRow()])}
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
              <span>{field.totals === "request" ? "Total Request Value" : field.totals === "issue" ? "Total Issue Value" : "Total Return Value"}</span>
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
        <span className={value ? "" : "text-slate-400"}>{value || field.placeholder || `Select ${field.label.toLowerCase()}...`}</span>
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

function MultiSearchableSelect({ field, value, options, disabled, className, onChange }) {
  const selectedValues = optionValues(value);
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

  function toggleOption(option) {
    const next = selectedValues.includes(option) ? selectedValues.filter((item) => item !== option) : [...selectedValues, option];
    onChange(next);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`${className} flex min-h-[42px] items-center justify-between gap-2 text-left`}
      >
        <span className={`flex flex-wrap gap-1 ${selectedValues.length ? "" : "text-slate-400"}`}>
          {selectedValues.length
            ? selectedValues.map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-[var(--ink)]">
                  {item}
                </span>
              ))
            : field.placeholder || `Select ${field.label.toLowerCase()}...`}
        </span>
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
              filteredOptions.map((option) => {
                const selected = selectedValues.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      selected ? "font-semibold text-[var(--primary)]" : "text-[var(--ink)]"
                    }`}
                  >
                    <span>{option}</span>
                    {selected && <Check size={14} />}
                  </button>
                );
              })
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

function Field({ field, value, error, disabled, onChange, materialRows, stockBatches }) {
  const fieldDisabled = disabled || field.readOnly;
  const options = field.options || [];
  const baseInput = `w-full rounded-md border bg-white px-3 ${field.compact ? "py-1.5" : "py-2"} text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)] ${
    error ? "border-[var(--danger)] focus:ring-red-100" : "border-[var(--line)]"
  }`;
  const labelClass = `${field.compact ? "mb-1" : "mb-1.5"} block text-sm font-medium text-[var(--ink)]`;

  if (field.type === "lineItems") {
    return (
      <div>
        <LineItemsField field={field} rows={value} disabled={fieldDisabled} onChange={onChange} materialRows={materialRows} stockBatches={stockBatches} hideAddButton={field.hideAddButton} />
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  if (field.type === "toggle") {
    if (field.labelOutside) {
      return (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{field.label}</label>
          <div className={`${baseInput} flex min-h-[46px] items-center justify-end`}>
            <button
              type="button"
              disabled={fieldDisabled}
              onClick={() => onChange(!value)}
              aria-label={field.label}
              aria-pressed={Boolean(value)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${value ? "bg-[var(--primary)]" : "bg-slate-200"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      );
    }

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
        <label className={labelClass}>
          {field.label}
          {field.required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
        </label>
        {field.searchable && field.multiple ? (
          <MultiSearchableSelect field={field} value={value} options={options} disabled={fieldDisabled} className={baseInput} onChange={onChange} />
        ) : field.searchable ? (
          <SearchableSelect field={field} value={value || ""} options={options} disabled={fieldDisabled} className={baseInput} onChange={onChange} />
        ) : (
          <select value={value || ""} disabled={fieldDisabled} onChange={(event) => onChange(event.target.value)} className={baseInput}>
            <option value="">{field.placeholder || `Select ${field.label.toLowerCase()}...`}</option>
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
      <div className={`${field.span === "full" ? "sm:col-span-2 lg:col-span-3" : ""} ${field.fillHeight ? "flex h-full flex-col" : ""}`}>
        <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{field.label}</label>
        <textarea
          value={value || ""}
          disabled={fieldDisabled}
          onChange={(event) => onChange(event.target.value)}
          rows={field.rows || 3}
          className={`${baseInput} ${field.fillHeight ? "min-h-[124px] flex-1" : ""}`}
        />
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
      <label className={labelClass}>
        {field.label}
        {field.required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
        {field.autoLabel && <span className="ml-1.5 text-xs font-normal text-[var(--muted)]">({field.autoLabel})</span>}
      </label>
      <input
        type={field.type === "number" ? "number" : ["date", "datetime-local"].includes(field.type) ? field.type : "text"}
        value={field.type === "datetime-local" ? dateTimeInputValue(value) : field.uppercase ? String(value || "").toUpperCase() : value || ""}
        disabled={disabled || Boolean(field.autoLabel) || field.readOnly}
        placeholder={field.placeholder}
        onChange={(event) => onChange(field.uppercase ? event.target.value.toUpperCase() : event.target.value)}
        className={`${baseInput} ${field.uppercase ? "uppercase" : ""}`}
      />
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

function warehouseAddress(warehouse) {
  if (!warehouse) return "";
  const address = warehouse.addressLine || warehouse.address;
  return [address, warehouse.city, warehouse.district, warehouse.state, warehouse.pincode].filter(Boolean).join(", ");
}

function WarehouseAddressSummary({ warehouse }) {
  if (!warehouse) return null;
  const address = warehouseAddress(warehouse);

  return (
    <div className="mt-3 rounded-md border border-[var(--line)] bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">Location Address</p>
      <p className="mt-1 text-sm font-medium text-[var(--ink)]">{address || "-"}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
        <span>{warehouse.name}</span>
        <span>Capacity: {warehouse.utilization !== undefined ? `${warehouse.utilization}%` : "-"}</span>
      </div>
    </div>
  );
}

function fieldSpanClass(field) {
  if (field.span === "full") return "sm:col-span-12";
  if (field.span === "half") return "sm:col-span-6";
  if (field.span === "quarter") return "sm:col-span-6 lg:col-span-3";
  return "sm:col-span-6 lg:col-span-4";
}

function isFieldVisible(field, values) {
  if (field.showWhen && !field.showWhen(values)) return false;
  if (field.hideWhen && field.hideWhen(values)) return false;
  return true;
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function printValue(value, fallback = "-") {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  return String(value);
}

function printNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function printTax(row) {
  const taxPercent = grnTaxPercent(row);
  return taxPercent ? `${taxPercent}%` : "-";
}

function printItemLabel(row) {
  const fallbackMaterial = materialByCode(row.code);
  return row.name || fallbackMaterial?.name || row.code || "-";
}

function countsAgainstPurchaseOrderReceipt(row) {
  return row.status === "Completed" && row.stockUpdated !== false;
}

function reservesPurchaseOrderReceiptQty(row) {
  if (row.status === "Pending Inspection") return true;
  return countsAgainstPurchaseOrderReceipt(row);
}

function PrintInfoItem({ label, value, fallback }) {
  return (
    <div className="grn-print-info-item">
      <span>{label}</span>
      <strong>{printValue(value, fallback)}</strong>
    </div>
  );
}

function PrintGoodsReceipt({ values, company, companyName, companyContact }) {
  const items = Array.isArray(values.items) ? values.items : [];
  const totalAmount = items.reduce((sum, item) => sum + grnLineAmount(item), 0);
  const documentRows = [
    ["Delivery Challan", values.challanDoc],
    ["Supplier Invoice", values.invoiceDoc],
    ["Inspection Report", values.inspectionDoc],
  ];

  return (
    <div className="grn-print-layout hidden print:block">
      <div className="grn-print-company">
        <h1>{companyName}</h1>
        {company.address && <p>{company.address}</p>}
        {companyContact && <p>{companyContact}</p>}
        {company.gstNumber && <p>GST: {company.gstNumber}</p>}
      </div>

      <section className="grn-print-title">
        <div>
          <h2>Goods Receipt Note</h2>
          <p>{printValue(values.refPO)} {"->"} {printValue(values.id)}</p>
        </div>
        <div className="grn-print-title-meta">
          <span>GRN No: <strong>{printValue(values.id)}</strong></span>
          <span>Status: <strong>{printValue(values.status)}</strong></span>
          <span>Date & Time: <strong>{printValue(formatDisplayDate(values.date, { includeTime: true }))}</strong></span>
        </div>
      </section>

      <section className="grn-print-section">
        <h3>Receipt Information</h3>
        <div className="grn-print-info">
          <PrintInfoItem label="Receipt Date & Time" value={formatDisplayDate(values.date, { includeTime: true })} />
          <PrintInfoItem label="Purchase Order" value={values.refPO} />
          <PrintInfoItem label="Supplier" value={values.supplier} />
          <PrintInfoItem label="Warehouse" value={values.warehouse} />
          <PrintInfoItem label="Delivery Challan Number" value={values.challanNumber} />
          <PrintInfoItem label="Supplier Invoice Number" value={values.invoiceNumber} />
        </div>
      </section>

      <section className="grn-print-section">
        <h3>Received Items</h3>
        <table className="grn-print-items">
          <colgroup>
            <col className="grn-print-col-index" />
            <col className="grn-print-col-item" />
            <col className="grn-print-col-batch" />
            <col className="grn-print-col-batch" />
            <col className="grn-print-col-expiry" />
            <col className="grn-print-col-qty" />
            <col className="grn-print-col-qty" />
            <col className="grn-print-col-unit" />
            <col className="grn-print-col-money" />
            <col className="grn-print-col-money" />
            <col className="grn-print-col-tax" />
            <col className="grn-print-col-money" />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Batch</th>
              <th>Location</th>
              <th>Exp.</th>
              <th>Order</th>
              <th>Recv</th>
              <th>Unit</th>
              <th>Rate</th>
              <th>Net</th>
              <th>GST</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const discountText = Number(item.discountAmount) ? money.format(Number(item.discountAmount)) : "";
              return (
                <tr key={`${item.code || "item"}-${index}`}>
                  <td className="grn-print-number">{index + 1}</td>
                  <td>
                    <strong>{printItemLabel(item)}</strong>
                    {item.code && <span>{item.code}</span>}
                    {discountText && <span>Discount: {discountText}</span>}
                  </td>
                  <td>{printValue(item.batch, "Item wise")}</td>
                  <td>{printValue(item.location)}</td>
                  <td>{printValue(item.expiry)}</td>
                  <td className="grn-print-number">{printNumber(item.orderedQty)}</td>
                  <td className="grn-print-number">{printNumber(item.receivedQty)}</td>
                  <td>{printValue(item.unit)}</td>
                  <td className="grn-print-number">{money.format(Number(item.rate ?? item.price) || 0)}</td>
                  <td className="grn-print-number">{money.format(grnNetAmount(item))}</td>
                  <td className="grn-print-number">{printTax(item)}</td>
                  <td className="grn-print-number">{money.format(grnLineAmount(item))}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={11}>Total Amount</td>
              <td className="grn-print-number">{money.format(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="grn-print-section">
        <h3>Quality Inspection</h3>
        <div className="grn-print-info">
          <PrintInfoItem label="Inspection Required" value={values.inspectionRequired ? "Yes" : "No"} />
          <PrintInfoItem label="Quality Status" value={values.qualityStatus} />
          <PrintInfoItem label="Inspector" value={values.inspectedBy} />
          <PrintInfoItem label="Inspection Date" value={values.inspectionDate} />
          <div className="grn-print-info-item grn-print-info-wide">
            <span>Inspection Remarks</span>
            <strong>{printValue(values.inspectionRemarks)}</strong>
          </div>
        </div>
      </section>

      <section className="grn-print-section">
        <h3>Documents</h3>
        <div className="grn-print-documents">
          {documentRows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{printValue(value, "Not attached")}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function issueLineQty(item) {
  return Number(item.issueQty ?? item.qty) || 0;
}

function issueLineAmount(item) {
  return issueLineQty(item) * (Number(item.price) || 0);
}

function PrintPurchaseIssue({ values, company, companyName, companyContact }) {
  const items = Array.isArray(values.items) ? values.items : [];
  const totalAmount = items.reduce((sum, item) => sum + issueLineAmount(item), 0);
  const showRejection = Boolean(values.rejectionReason);

  return (
    <div className="grn-print-layout hidden print:block">
      <div className="grn-print-company">
        <h1>{companyName}</h1>
        {company.address && <p>{company.address}</p>}
        {companyContact && <p>{companyContact}</p>}
        {company.gstNumber && <p>GST: {company.gstNumber}</p>}
      </div>

      <section className="grn-print-title">
        <div>
          <h2>Purchase Issue Details</h2>
          <p>{printValue(values.requisitionNo)} {"->"} {printValue(values.id)}</p>
        </div>
        <div className="grn-print-title-meta">
          <span>Issue No: <strong>{printValue(values.id)}</strong></span>
          <span>Status: <strong>{printValue(values.status)}</strong></span>
          <span>Date & Time: <strong>{printValue(formatDisplayDate(values.date, { includeTime: true }))}</strong></span>
        </div>
      </section>

      <section className="grn-print-section">
        <h3>Issue Information</h3>
        <div className="grn-print-info">
          <PrintInfoItem label="Date & Time" value={formatDisplayDate(values.date, { includeTime: true })} />
          <PrintInfoItem label="Department" value={values.department} />
          <PrintInfoItem label="Requisition No" value={values.requisitionNo} />
          <PrintInfoItem label="Purchase Order" value={values.refPO} />
          <PrintInfoItem label="Goods Receipt" value={values.refGRN} />
        </div>
      </section>

      <section className="grn-print-section">
        <h3>Material Items</h3>
        <table className="grn-print-items">
          <colgroup>
            <col className="grn-print-col-index" />
            <col className="grn-print-col-item" />
            <col className="grn-print-col-qty" />
            <col className="grn-print-col-qty" />
            <col className="grn-print-col-qty" />
            <col className="grn-print-col-qty" />
            <col className="grn-print-col-qty" />
            <col className="grn-print-col-unit" />
            <col className="grn-print-col-money" />
            <col className="grn-print-col-money" />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Req.</th>
              <th>Prev. Issued</th>
              <th>Remaining</th>
              <th>Avail.</th>
              <th>Issued</th>
              <th>Unit</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.code || "item"}-${index}`}>
                <td className="grn-print-number">{index + 1}</td>
                <td>
                  <strong>{printItemLabel(item)}</strong>
                  {item.code && <span>{item.code}</span>}
                  {item.remarks && <span>{item.remarks}</span>}
                </td>
                <td className="grn-print-number">{printNumber(item.requestedQty)}</td>
                <td className="grn-print-number">{printNumber(item.previouslyIssuedQty)}</td>
                <td className="grn-print-number">{printNumber(item.remainingQty)}</td>
                <td className="grn-print-number">{printNumber(item.availableQty)}</td>
                <td className="grn-print-number">{printNumber(issueLineQty(item))}</td>
                <td>{printValue(item.unit)}</td>
                <td className="grn-print-number">{money.format(Number(item.price) || 0)}</td>
                <td className="grn-print-number">{money.format(issueLineAmount(item))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9}>Total Issue Value</td>
              <td className="grn-print-number">{money.format(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="grn-print-section">
        <h3>Issue Details</h3>
        <div className="grn-print-info">
          <div className="grn-print-info-item grn-print-info-wide">
            <span>Note</span>
            <strong>{printValue(values.note)}</strong>
          </div>
        </div>
      </section>

      <section className="grn-print-section">
        <h3>Approval & Issue</h3>
        <div className="grn-print-info">
          <PrintInfoItem label="Requested By" value={values.requestedBy} />
          <PrintInfoItem label="Approved By" value={values.approvedBy} />
          <PrintInfoItem label="Approval Date" value={values.approvalDate} />
          <PrintInfoItem label="Issued By" value={values.issuedBy} />
          <PrintInfoItem label="Issued Date" value={values.issuedDate} />
          {showRejection && (
            <>
              <PrintInfoItem label="Rejected By" value={values.rejectedBy} />
              <PrintInfoItem label="Rejection Date" value={values.rejectionDate} />
              <div className="grn-print-info-item grn-print-info-wide">
                <span>Rejection Reason</span>
                <strong>{printValue(values.rejectionReason)}</strong>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function returnLineQty(item) {
  return Number(item.returnQty) || 0;
}

function returnLineAmount(item) {
  return returnLineQty(item) * (Number(item.price) || 0);
}

function PrintPurchaseReturn({ values, company, companyName, companyContact }) {
  const items = Array.isArray(values.items) ? values.items : [];
  const totalAmount = items.reduce((sum, item) => sum + returnLineAmount(item), 0);
  const showRejection = Boolean(values.rejectionReason);

  return (
    <div className="grn-print-layout hidden print:block">
      <div className="grn-print-company">
        <h1>{companyName}</h1>
        {company.address && <p>{company.address}</p>}
        {companyContact && <p>{companyContact}</p>}
        {company.gstNumber && <p>GST: {company.gstNumber}</p>}
      </div>

      <section className="grn-print-title">
        <div>
          <h2>Purchase Return Details</h2>
          <p>{printValue(values.refGRN)} {"->"} {printValue(values.id)}</p>
        </div>
        <div className="grn-print-title-meta">
          <span>Return No: <strong>{printValue(values.id)}</strong></span>
          <span>Status: <strong>{printValue(values.status)}</strong></span>
          <span>Return Date: <strong>{printValue(formatDisplayDate(values.date))}</strong></span>
        </div>
      </section>

      <section className="grn-print-section">
        <h3>Return Information</h3>
        <div className="grn-print-info">
          <PrintInfoItem label="Return Date" value={formatDisplayDate(values.date)} />
          <PrintInfoItem label="Supplier" value={values.supplier} />
          <PrintInfoItem label="Warehouse" value={values.warehouse} />
          <PrintInfoItem label="Reference GRN" value={values.refGRN} />
          <PrintInfoItem label="Reference PO" value={values.refPO} />
          <PrintInfoItem label="Return Reason" value={values.reason} />
        </div>
      </section>

      <section className="grn-print-section">
        <h3>Return Items</h3>
        <table className="grn-print-items purchase-return-print-items">
          <colgroup>
            <col className="return-print-col-index" />
            <col className="return-print-col-item" />
            <col className="return-print-col-qty" />
            <col className="return-print-col-qty" />
            <col className="return-print-col-qty" />
            <col className="return-print-col-unit" />
            <col className="return-print-col-batch" />
            <col className="return-print-col-reason" />
            <col className="return-print-col-money" />
            <col className="return-print-col-money" />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Received</th>
              <th>Available</th>
              <th>Return</th>
              <th>Unit</th>
              <th>Batch</th>
              <th>Reason</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.code || "item"}-${index}`}>
                <td className="grn-print-number">{index + 1}</td>
                <td>
                  <strong>{printItemLabel(item)}</strong>
                  {item.code && <span>{item.code}</span>}
                </td>
                <td className="grn-print-number">{printNumber(item.receivedQty)}</td>
                <td className="grn-print-number">{printNumber(item.availableQty)}</td>
                <td className="grn-print-number">{printNumber(returnLineQty(item))}</td>
                <td>{printValue(item.unit)}</td>
                <td>{printValue(item.batch)}</td>
                <td>{printValue(item.reason || values.reason)}</td>
                <td className="grn-print-number">{money.format(Number(item.price) || 0)}</td>
                <td className="grn-print-number">{money.format(returnLineAmount(item))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9}>Total Return Value</td>
              <td className="grn-print-number">{money.format(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="grn-print-section">
        <h3>Return Details</h3>
        <div className="grn-print-info">
          <PrintInfoItem label="Supplier Credit Note" value={values.creditNoteNumber} />
          <PrintInfoItem label="Transport Details" value={values.transportDetails} />
          <PrintInfoItem label="Attachment" value={values.attachment} fallback="Not attached" />
          <div className="grn-print-info-item grn-print-info-wide">
            <span>Return Remarks</span>
            <strong>{printValue(values.returnRemarks)}</strong>
          </div>
        </div>
      </section>

      <section className="grn-print-section">
        <h3>Approval</h3>
        <div className="grn-print-info">
          <PrintInfoItem label="Requested By" value={values.requestedBy} />
          <PrintInfoItem label="Approved By" value={values.approvedBy} />
          <PrintInfoItem label="Approval Date" value={values.approvalDate} />
          {showRejection && (
            <>
              <PrintInfoItem label="Rejected By" value={values.rejectedBy} />
              <PrintInfoItem label="Rejection Date" value={values.rejectionDate} />
              <div className="grn-print-info-item grn-print-info-wide">
                <span>Rejection Reason</span>
                <strong>{printValue(values.rejectionReason)}</strong>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export function PurchaseForm({ entityKey, mode, recordId }) {
  const entity = purchaseEntities[entityKey];
  const purchaseData = usePurchaseData();
  const masterData = useMasterData();
  const stockData = useStockData();
  const { session } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isView = mode === "view";
  const authUserName = session?.user?.name || "You";
  const company = session?.user?.company || {};
  const companyName = company.businessName || "IMS Control Center";
  const companyContact = [company.email, company.phone].filter(Boolean).join(" | ");
  const departmentRows = masterData.getRows("department");

  const existingRecord = recordId ? purchaseData.getRecord(entityKey, recordId) : null;
  const convertFrom = !recordId ? location.state?.convertFrom : null;
  const allItemRows = filterItemRows(masterData.getRows("product-item"));

  function getAnyItem(code) {
    return allItemRows.find((m) => m.code === code) || materialByCode(code);
  }

  const [values, setValues] = useState(() => {
    if (existingRecord) {
      return entityKey === "goods-receipt"
        ? { ...existingRecord, items: normalizeGoodsReceiptItems(existingRecord.items, existingRecord.location) }
        : { ...existingRecord };
    }

    const base = {
      id: nextId(entityKey, purchaseData.getRows(entityKey)),
      date: entityKey === "purchase-issue" ? currentDisplayDateTime() : ["purchase-request", "purchase-order", "goods-receipt"].includes(entityKey) ? currentLocalDateTime() : today(),
      status: entityKey === "purchase-issue" ? "Issue Incomplete" : "Draft",
      items: [],
      ...(entityKey === "purchase-request" ? { requestedBy: authUserName } : {}),
      ...(entityKey === "purchase-issue" ? { requestedBy: authUserName } : {}),
      ...(entityKey === "purchase-order"
          ? {
            warehouse: "",
            warehouseCode: "",
            warehouseType: "",
            warehouseManager: "",
            warehouseUtilization: "",
            warehouseStatus: "",
          }
        : {}),
    };

    if (convertFrom?.entityKey === "purchase-request" && entityKey === "purchase-order") {
      const source = convertFrom.record;
      return {
        ...base,
        refPR: [source.id],
        supplier: "",
        items: source.items.map((item) => ({ code: item.code, name: item.name, qty: item.qty, unit: item.unit, price: item.price ?? (materialUnitPrice(getAnyItem(item.code)) || 0), discount: 0, tax: 12 })),
      };
    }
    if (convertFrom?.entityKey === "purchase-request" && entityKey === "purchase-issue") {
      const source = convertFrom.record;
      const completedIssues = purchaseData
        .getRows("purchase-issue")
        .filter((issue) => issue.requisitionNo === source.id && ["Issued", "Issue Complete"].includes(issue.status) && issue.stockUpdated !== false);
      return {
        ...base,
        department: source.department || "",
        requisitionNo: source.id,
        items: (source.items || []).map((item) => {
          const requestedQty = Number(item.qty) || 0;
          const previouslyIssuedQty = completedIssues.reduce(
            (sum, issue) =>
              sum +
              (issue.items || [])
                .filter((issueItem) => issueItem.code === item.code)
                .reduce((itemSum, issueItem) => itemSum + (Number(issueItem.issueQty ?? issueItem.qty ?? issueItem.unitQty) || 0), 0),
            0
          );
          const remainingQty = Math.max(0, requestedQty - previouslyIssuedQty);
          const material = getAnyItem(item.code);
          const activeBatches = (stockData.batches || []).filter((batch) => batch.code === item.code && batch.status !== "Consumed" && (Number(batch.qty) || 0) > 0);
          const batch = activeBatches[0];
          const unit = item.unit || material?.unit || material?.baseUnit || "";
          const availableQty = batch ? Number(batch.qty) || 0 : activeBatches.reduce((sum, row) => sum + (Number(row.qty) || 0), 0) || stockData.getTotalStock(item.code) || 0;
          const maxIssueQty = Math.min(remainingQty, availableQty);
          return {
            code: item.code,
            name: item.name || material?.name || "",
            batch: batch?.id || "",
            expiry: batch?.expiryDate || "0",
            qty: maxIssueQty,
            unitQty: maxIssueQty,
            issueQty: maxIssueQty,
            unit,
            subUnitQty: 0,
            subUnit: material?.purchaseUnit || material?.salesUnit || unit,
            availableQty,
            maxIssueQty,
            warehouse: batch?.warehouse || material?.warehouse || "Raw Material Store",
            price: item.price ?? materialUnitPrice(material) ?? 0,
            requestedQty,
            previouslyIssuedQty,
            remainingQty,
          };
        }).filter((item) => item.remainingQty > 0),
      };
    }
    if (convertFrom?.entityKey === "purchase-order" && entityKey === "goods-receipt") {
      const source = convertFrom.record;
      return {
        ...base,
        refPO: source.id,
        supplier: source.supplier,
        warehouse: source.warehouse,
        items: remainingGoodsReceiptItemsForPurchaseOrder(source),
      };
    }
    if (convertFrom?.entityKey === "goods-receipt" && entityKey === "purchase-issue") {
      const source = convertFrom.record;
      return {
        ...base,
        refGRN: source.id,
        refPO: source.refPO,
        supplier: source.supplier,
        warehouse: source.warehouse,
        issueType: "Production",
        requestedBy: authUserName,
        items: availablePurchaseIssueItemsForGoodsReceipt(source),
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
  const shouldScopeItemsByDepartment = ["purchase-request", "purchase-issue"].includes(entityKey);
  const itemRows = shouldScopeItemsByDepartment
    ? (values.department ? filterItemRows(masterData.getRows("product-item"), values.department, departmentRows) : [])
    : filterItemRows(masterData.getRows("product-item"));
  const selectedWarehouse = masterData.getRows("warehouse").find((warehouse) => warehouse.name === values.warehouse);
  const canEditRecord = !editLockedStatuses.includes(values.status);
  const isReadOnlyMode = isView || (mode === "edit" && !canEditRecord);
  const visibleTabs = entity.form.tabs
    .filter((tab) => tab.key !== "approval")
    .map((tab) => ({ ...tab, fields: tab.fields.filter((field) => isFieldVisible(field, values)) }))
    .filter((tab) => tab.fields.length > 0);
  const visibleFormActions = entity.formActions.filter((action) => {
    if (action.showWhen && !action.showWhen(values)) return false;
    if (action.hideWhen && action.hideWhen(values)) return false;
    return true;
  });
  const actionBarActions =
    mode === "edit"
      ? [{ key: "update", label: "Update", kind: "primary", validate: true }, ...visibleFormActions.filter((action) => !["cancel", "saveDraft"].includes(action.key))]
      : visibleFormActions.filter((action) => !(mode === "create" && action.print));

  function getItem(code) {
    return itemRows.find((m) => m.code === code) || getAnyItem(code);
  }

  function activeBatchesForItem(code) {
    return (stockData.batches || []).filter((batch) => batch.code === code && batch.status !== "Consumed" && (Number(batch.qty) || 0) > 0);
  }

  function returnedQtyForGoodsReceiptItem(grn, item) {
    return purchaseData
      .getRows("purchase-return")
      .filter((purchaseReturn) => purchaseReturn.refGRN === grn.id && (purchaseReturn.status === "Returned" || purchaseReturn.stockDeducted === true))
      .reduce((sum, purchaseReturn) => {
        const returnedQty = (purchaseReturn.items || [])
          .filter((returnItem) => returnItem.code === item.code && (!item.batch || !returnItem.batch || returnItem.batch === item.batch))
          .reduce((itemSum, returnItem) => itemSum + (Number(returnItem.returnQty) || 0), 0);
        return sum + returnedQty;
      }, 0);
  }

  function availableQtyForPurchaseReturnItem(grn, item) {
    const receivedQty = Number(item.acceptedQty ?? item.receivedQty ?? item.unitQty) || 0;
    const receiptBalance = Math.max(0, receivedQty - returnedQtyForGoodsReceiptItem(grn, item));
    const batch = item.batch
      ? (stockData.batches || []).find((stockBatch) => stockBatch.id === item.batch && stockBatch.code === item.code && stockBatch.warehouse === grn.warehouse)
      : null;

    if (batch) return Math.min(receiptBalance, Math.max(0, Number(batch.qty) || 0));

    const warehouseBreakdown = stockData.getWarehouseBreakdown(item.code);
    if (grn.warehouse && Object.prototype.hasOwnProperty.call(warehouseBreakdown, grn.warehouse)) {
      return Math.min(receiptBalance, Math.max(0, Number(warehouseBreakdown[grn.warehouse]) || 0));
    }

    return receiptBalance;
  }

  function purchaseReturnItemsFromGoodsReceipt(grn) {
    return (grn.items || []).map((item) => ({
      code: item.code,
      name: item.name,
      receivedQty: Number(item.acceptedQty ?? item.receivedQty ?? item.unitQty) || 0,
      availableQty: availableQtyForPurchaseReturnItem(grn, item),
      returnQty: 0,
      unit: item.unit,
      price: Number(item.rate ?? item.price ?? materialUnitPrice(getItem(item.code))) || 0,
      batch: item.batch,
      reason: "",
    }));
  }

  function availableQtyForIssueItem(item) {
    if (!item.code) return Number(item.availableQty) || 0;
    const activeBatches = activeBatchesForItem(item.code);
    const selectedBatch = activeBatches.find((batch) => batch.id === item.batch) || activeBatches[0];
    if (selectedBatch) return Number(selectedBatch.qty) || 0;
    return stockData.getTotalStock(item.code) || Number(item.availableQty) || 0;
  }

  function normalizePurchaseIssueItems(items) {
    return (Array.isArray(items) ? items : []).map((item) => {
      const material = getItem(item.code);
      const activeBatches = activeBatchesForItem(item.code);
      const selectedBatch = activeBatches.find((batch) => batch.id === item.batch) || activeBatches[0];
      const unit = item.unit || material?.unit || material?.baseUnit || "";
      const requestedQty = Number(item.requestedQty ?? item.receivedQty ?? item.remainingQty ?? item.qty ?? item.unitQty ?? item.issueQty) || 0;
      const previouslyIssuedQty = Number(item.previouslyIssuedQty) || 0;
      const remainingQty = Math.max(0, Number(item.remainingQty) || requestedQty - previouslyIssuedQty);
      const availableQty = availableQtyForIssueItem(item);
      const maxIssueQty = Math.max(0, Math.min(remainingQty, availableQty));
      const rawIssueQty = Number(item.issueQty ?? item.qty ?? item.unitQty) || 0;
      const issueQty = Math.max(0, Math.min(rawIssueQty, maxIssueQty));
      return {
        ...item,
        name: item.name || material?.name || "",
        qty: issueQty,
        unit,
        subUnit: item.subUnit || material?.purchaseUnit || material?.salesUnit || unit,
        batch: item.batch || selectedBatch?.id || "",
        expiry: item.expiry || selectedBatch?.expiryDate || "0",
        availableQty,
        maxIssueQty,
        warehouse: item.warehouse || selectedBatch?.warehouse || material?.warehouse || "Raw Material Store",
        price: item.price ?? materialUnitPrice(material) ?? 0,
        requestedQty,
        previouslyIssuedQty,
        remainingQty,
        unitQty: issueQty,
        issueQty,
        subUnitQty: item.subUnitQty ?? 0,
      };
    });
  }

  function purchaseIssueItemsFromRequisition(requestId) {
    const request = purchaseData.getRecord("purchase-request", requestId);
    if (!request) return [];
    const issueRows = completedPurchaseIssueRows();

    return normalizePurchaseIssueItems(
      (request.items || [])
        .map((item) => {
          const requestedQty = Number(item.qty) || 0;
          const previouslyIssuedQty = issuedQtyForPurchaseRequestItem(requestId, item.code, issueRows);
          const remainingQty = Math.max(0, requestedQty - previouslyIssuedQty);
          return remainingQty > 0
            ? {
                code: item.code,
                name: item.name,
                qty: remainingQty,
                unit: item.unit,
                unitQty: remainingQty,
                issueQty: remainingQty,
                subUnitQty: 0,
                subUnit: item.unit,
                expiry: "0",
                batch: "",
                requestedQty,
                previouslyIssuedQty,
                remainingQty,
                price: item.price,
              }
            : null;
        })
        .filter(Boolean)
    );
  }

  function issuedQtyForPurchaseRequestItem(requestId, code, issueRows) {
    return issueRows
      .filter((issue) => issue.requisitionNo === requestId)
      .reduce((sum, issue) => {
        return (
          sum +
          (issue.items || [])
            .filter((issueItem) => issueItem.code === code)
            .reduce((itemSum, issueItem) => itemSum + (Number(issueItem.issueQty ?? issueItem.qty ?? issueItem.unitQty) || 0), 0)
        );
      }, 0);
  }

  function purchaseRequestIssueStatus(request, issueRows) {
    const requestedItems = (request.items || []).filter((item) => item.code && (Number(item.qty) || 0) > 0);
    if (requestedItems.length === 0) return "";

    const issuedItems = requestedItems.filter((item) => issuedQtyForPurchaseRequestItem(request.id, item.code, issueRows) > 0);
    if (issuedItems.length === 0) return "";

    const fullyIssued = requestedItems.every((item) => issuedQtyForPurchaseRequestItem(request.id, item.code, issueRows) >= (Number(item.qty) || 0));
    return fullyIssued ? "Full Issue" : "Partial Issue";
  }

  function purchaseOrderCoverageRows({ includeRecord = null, excludeId = "" } = {}) {
    const rows = purchaseData
      .getRows("purchase-order")
      .filter((row) => row.id !== excludeId && row.id !== includeRecord?.id);
    const mergedRows = includeRecord ? [includeRecord, ...rows] : rows;
    return mergedRows.filter((row) => poCoverageStatuses.has(row.status));
  }

  function requestQtyForCode(requestId, code) {
    const request = purchaseData.getRecord("purchase-request", requestId);
    return (request?.items || []).filter((item) => item.code === code).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }

  function itemAllocationsForPurchaseOrder(po, item) {
    const explicitAllocations = Array.isArray(item.sourcePRAllocations)
      ? item.sourcePRAllocations
          .map((allocation) => ({ requestId: allocation.requestId || allocation.refPR || allocation.id, qty: Number(allocation.qty) || 0 }))
          .filter((allocation) => allocation.requestId && allocation.qty > 0)
      : [];

    if (explicitAllocations.length > 0) return explicitAllocations;

    const refIds = optionValues(po.refPR);
    const qty = Number(item.qty) || 0;
    if (!item.code || qty <= 0 || refIds.length === 0) return [];
    if (refIds.length === 1) return [{ requestId: refIds[0], qty }];

    let remainingQty = qty;
    const inferredAllocations = [];
    refIds.forEach((requestId) => {
      if (remainingQty <= 0) return;
      const availableForRequest = requestQtyForCode(requestId, item.code);
      if (availableForRequest <= 0) return;
      const allocatedQty = Math.min(remainingQty, availableForRequest);
      inferredAllocations.push({ requestId, qty: allocatedQty });
      remainingQty -= allocatedQty;
    });
    return inferredAllocations;
  }

  function orderedQtyForRequestItem(requestId, code, coverageRows) {
    return coverageRows.reduce((sum, po) => {
      return (
        sum +
        (po.items || []).reduce((itemSum, item) => {
          if (item.code !== code) return itemSum;
          return (
            itemSum +
            itemAllocationsForPurchaseOrder(po, item)
              .filter((allocation) => allocation.requestId === requestId)
              .reduce((allocationSum, allocation) => allocationSum + (Number(allocation.qty) || 0), 0)
          );
        }, 0)
      );
    }, 0);
  }

  function remainingPurchaseRequestItems(requestId, coverageRows = purchaseOrderCoverageRows({ excludeId: values.id })) {
    const request = purchaseData.getRecord("purchase-request", requestId);
    if (!request) return [];

    return (request.items || [])
      .map((item) => {
        const requestedQty = Number(item.qty) || 0;
        const orderedQty = orderedQtyForRequestItem(requestId, item.code, coverageRows);
        const remainingQty = Math.max(0, requestedQty - orderedQty);
        return remainingQty > 0 ? { ...item, requestedQty, orderedQty, qty: remainingQty } : null;
      })
      .filter(Boolean);
  }

  function hasPurchaseRequestRemaining(requestId) {
    return remainingPurchaseRequestItems(requestId).length > 0;
  }

  function purchaseOrderItemsFromRequests(requestIds) {
    const itemsByCode = new Map();

    optionValues(requestIds).forEach((requestId) => {
      const request = purchaseData.getRecord("purchase-request", requestId);
      if (!request || request.status !== "Approved") return;

      remainingPurchaseRequestItems(requestId).forEach((item) => {
        if (!item.code) return;
        const material = getItem(item.code);
        const current = itemsByCode.get(item.code);
        const qty = Number(item.qty) || 0;

        if (current) {
          itemsByCode.set(item.code, {
            ...current,
            qty: (Number(current.qty) || 0) + qty,
            sourcePRAllocations: [...(current.sourcePRAllocations || []), { requestId, qty }],
          });
          return;
        }

        itemsByCode.set(item.code, {
          code: item.code,
          name: item.name || material?.name || "",
          qty,
          unit: item.unit || material?.unit || material?.baseUnit || "",
          price: item.price ?? materialUnitPrice(material) ?? 0,
          discount: 0,
          tax: 12,
          sourcePRAllocations: [{ requestId, qty }],
        });
      });
    });

    return [...itemsByCode.values()];
  }

  function purchaseOrderWithSourceAllocations(recordValues) {
    if (entityKey !== "purchase-order") return recordValues;

    const requestIds = optionValues(recordValues.refPR);
    if (requestIds.length === 0) {
      return {
        ...recordValues,
        items: (recordValues.items || []).map(({ sourcePRAllocations, ...item }) => item),
      };
    }

    const coverageRows = purchaseOrderCoverageRows({ excludeId: recordValues.id });
    const remainingByRequestItem = new Map();
    requestIds.forEach((requestId) => {
      remainingPurchaseRequestItems(requestId, coverageRows).forEach((item) => {
        remainingByRequestItem.set(`${requestId}::${item.code}`, Number(item.qty) || 0);
      });
    });

    return {
      ...recordValues,
      items: (recordValues.items || []).map((item) => {
        let qtyToAllocate = Number(item.qty) || 0;
        const sourcePRAllocations = [];

        requestIds.forEach((requestId) => {
          if (!item.code || qtyToAllocate <= 0) return;
          const key = `${requestId}::${item.code}`;
          const availableQty = remainingByRequestItem.get(key) || 0;
          const allocatedQty = Math.min(qtyToAllocate, availableQty);
          if (allocatedQty <= 0) return;

          sourcePRAllocations.push({ requestId, qty: allocatedQty });
          remainingByRequestItem.set(key, availableQty - allocatedQty);
          qtyToAllocate -= allocatedQty;
        });

        return { ...item, sourcePRAllocations };
      }),
    };
  }

  function goodsReceiptItemFromPurchaseOrderItem(item, qty) {
    const receiptQty = Number(qty) || 0;
    return {
      code: item.code,
      name: item.name,
      orderedQty: receiptQty,
      receivedQty: receiptQty,
      acceptedQty: receiptQty,
      rejectedQty: 0,
      unitQty: receiptQty,
      unit: item.unit,
      testQty: "",
      mrp: item.price || 0,
      rate: item.price || 0,
      discountAmount: Math.round(receiptQty * (Number(item.price) || 0) * ((Number(item.discount) || 0) / 100) * 100) / 100,
      gst: item.tax || 0,
      batch: "",
      expiry: "",
    };
  }

  function remainingGoodsReceiptItemsForPurchaseOrder(po) {
    const receiptRows = reservedGoodsReceiptRows();
    return (po.items || [])
      .map((item) => {
        const orderedQty = Number(item.qty) || 0;
        const receivedQty = receivedQtyForPurchaseOrderItem(po.id, item.code, receiptRows);
        const remainingQty = Math.max(0, orderedQty - receivedQty);
        return remainingQty > 0 ? goodsReceiptItemFromPurchaseOrderItem(item, remainingQty) : null;
      })
      .filter(Boolean);
  }

  function reservedGoodsReceiptRows({ includeRecord = null, excludeId = "", excludeIds = [] } = {}) {
    const omittedIds = new Set([excludeId, ...excludeIds, includeRecord?.id].map(normalizeFilterValue).filter(Boolean));
    const rows = purchaseData
      .getRows("goods-receipt")
      .filter((row) => !omittedIds.has(normalizeFilterValue(row.id)));
    const mergedRows = includeRecord ? [includeRecord, ...rows] : rows;
    return mergedRows.filter(reservesPurchaseOrderReceiptQty);
  }

  function completedPurchaseIssueRows({ includeRecord = null } = {}) {
    const rows = purchaseData
      .getRows("purchase-issue")
      .filter((row) => row.id !== includeRecord?.id);
    const mergedRows = includeRecord ? [includeRecord, ...rows] : rows;
    return mergedRows.filter((row) => ["Issued", "Issue Complete"].includes(row.status) && row.stockUpdated !== false);
  }

  function issuedQtyForGoodsReceiptItem(grnId, item, issueRows) {
    return issueRows
      .filter((issue) => issue.refGRN === grnId)
      .reduce((sum, issue) => {
        return (
          sum +
          (issue.items || [])
            .filter((issueItem) => issueItem.code === item.code && String(issueItem.batch || "") === String(item.batch || ""))
            .reduce((itemSum, issueItem) => itemSum + (Number(issueItem.issueQty) || 0), 0)
        );
      }, 0);
  }

  function purchaseIssueItemFromGoodsReceiptItem(item, availableQty) {
    const qty = Number(availableQty) || 0;
    const price = Number(item.rate ?? item.price) || 0;
    return {
      code: item.code,
      name: item.name,
      receivedQty: grnReceivedQty(item),
      availableQty: qty,
      issueQty: qty,
      unit: item.unit,
      batch: item.batch || "",
      price,
      remarks: "",
    };
  }

  function availablePurchaseIssueItemsForGoodsReceipt(grn) {
    if (!grn || !countsAgainstPurchaseOrderReceipt(grn)) return [];
    const issueRows = completedPurchaseIssueRows();
    return (grn.items || [])
      .map((item) => {
        const receivedQty = grnReceivedQty(item);
        const issuedQty = issuedQtyForGoodsReceiptItem(grn.id, item, issueRows);
        const availableQty = Math.max(0, receivedQty - issuedQty);
        return availableQty > 0 ? purchaseIssueItemFromGoodsReceiptItem(item, availableQty) : null;
      })
      .filter(Boolean);
  }

  function resolvedFieldOptions(field) {
    const options = resolveFieldOptions(field, masterData.getRows, purchaseData.getRows, values[field.key], values);
    if (entityKey === "goods-receipt" && field.key === "refPO") {
      return options.filter((poId) => {
        if (poId === values.refPO) return true;
        const po = purchaseData.getRecord("purchase-order", poId);
        return po && remainingGoodsReceiptItemsForPurchaseOrder(po).length > 0;
      });
    }
    if (entityKey === "purchase-issue" && field.key === "refGRN") {
      return options.filter((grnId) => {
        if (grnId === values.refGRN) return true;
        const grn = purchaseData.getRecord("goods-receipt", grnId);
        return grn && availablePurchaseIssueItemsForGoodsReceipt(grn).length > 0;
      });
    }
    if (entityKey === "purchase-issue" && field.key === "requisitionNo") {
      return options.filter((requestId) => {
        if (requestId === values.requisitionNo) return true;
        const request = purchaseData.getRecord("purchase-request", requestId);
        const issueRows = completedPurchaseIssueRows();
        const hasRemaining = (request?.items || []).some(
          (item) => issuedQtyForPurchaseRequestItem(requestId, item.code, issueRows) < (Number(item.qty) || 0)
        );
        return request && hasRemaining && (!values.department || request.department === values.department);
      });
    }

    if (entityKey !== "purchase-order" || field.key !== "refPR") return options;

    const selectedRequestIds = new Set(optionValues(values.refPR));
    return options.filter((requestId) => selectedRequestIds.has(requestId) || hasPurchaseRequestRemaining(requestId));
  }

  function resolvedLineItemColumns(field) {
    return (field.columns || []).map((column) => {
      if (!column.optionsFrom) return column;

      if (column.optionsFrom === "stock-location" && column.dependsOn) {
        const selectedWarehouse = String(values[column.dependsOn] || "").trim();
        const warehouseRow = masterData
          .getRows("warehouse")
          .find((row) => [row.code, row.name, row.storeName].some((value) => String(value || "").trim().toLowerCase() === selectedWarehouse.toLowerCase()));
        const warehouseAliases = new Set(
          [selectedWarehouse, warehouseRow?.code, warehouseRow?.name, warehouseRow?.storeName]
            .map((value) => String(value || "").trim().toLowerCase())
            .filter(Boolean)
        );
        const options = selectedWarehouse
          ? masterData
              .getRows(column.optionsFrom)
              .filter((row) => row.status !== "Inactive")
              .filter((row) => warehouseAliases.has(String(row.warehouse || "").trim().toLowerCase()))
              .map(optionLabel)
          : [];

        return {
          ...column,
          options: uniqueOptions(options),
          strictOptions: true,
          disabled: !selectedWarehouse,
          placeholder: selectedWarehouse ? "Select location..." : "Select warehouse first...",
        };
      }

      return {
        ...column,
        options: resolveFieldOptions(column, masterData.getRows, purchaseData.getRows, "", values),
      };
    });
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

    if (entityKey === "purchase-issue" && field.key === "department") {
      setValues((prev) => ({
        ...prev,
        department: next,
        requisitionNo: prev.department === next ? prev.requisitionNo : "",
        items: prev.department === next ? prev.items : [],
      }));
      return;
    }

    if (entityKey === "purchase-issue" && field.key === "requisitionNo") {
      const request = purchaseData.getRecord("purchase-request", next);
      setValues((prev) => ({
        ...prev,
        requisitionNo: next,
        department: request?.department || prev.department,
        status: prev.status || "Issue Incomplete",
        items: purchaseIssueItemsFromRequisition(next),
      }));
      return;
    }

    if (entityKey === "purchase-issue" && field.key === "items") {
      setField(field.key, normalizePurchaseIssueItems(next));
      return;
    }

    if (entityKey === "purchase-order" && field.key === "refPR") {
      setValues((prev) => ({ ...prev, refPR: next, items: purchaseOrderItemsFromRequests(next) }));
      return;
    }

    if (entityKey === "goods-receipt" && field.key === "warehouse") {
      setValues((prev) => ({
        ...prev,
        warehouse: next || "",
        location: "",
        items: prev.warehouse === next ? prev.items : (prev.items || []).map((item) => ({ ...item, location: "" })),
      }));
      return;
    }

    setField(field.key, next);

    if (entityKey === "purchase-order" && field.key === "supplier") {
      const match = masterEntities.supplier.list.rows.find((s) => s.name === next);
      setValues((prev) => ({ ...prev, supplier: next, contact: match?.contact || "", phone: match?.phone || "" }));
    }

    if (entityKey === "purchase-order" && field.key === "warehouse") {
      const match = masterData.getRows("warehouse").find((warehouse) => warehouse.name === next);
      setValues((prev) => ({
        ...prev,
        warehouse: next || "",
        warehouseCode: match?.code || "",
        warehouseType: match?.type || "",
        warehouseManager: match?.manager || "",
        warehouseUtilization: match?.utilization !== undefined ? `${match.utilization}%` : "",
        warehouseStatus: match?.status || "",
      }));
    }

    if (entityKey === "goods-receipt" && field.key === "refPO") {
      const po = purchaseData.getRecord("purchase-order", next);
      if (po) {
        setValues((prev) => ({
          ...prev,
          refPO: next,
          supplier: po.supplier,
          warehouse: po.warehouse,
          location: "",
          items: remainingGoodsReceiptItemsForPurchaseOrder(po),
        }));
      } else {
        setValues((prev) => ({ ...prev, refPO: next, supplier: "", warehouse: "", location: "", items: [] }));
      }
    }

    if (entityKey === "purchase-issue" && field.key === "refGRN") {
      const grn = purchaseData.getRecord("goods-receipt", next);
      if (grn) {
        setValues((prev) => ({
          ...prev,
          refGRN: next,
          refPO: grn.refPO,
          supplier: grn.supplier,
          warehouse: grn.warehouse,
          items: availablePurchaseIssueItemsForGoodsReceipt(grn),
        }));
      } else {
        setValues((prev) => ({ ...prev, refGRN: next, refPO: "", supplier: "", warehouse: "", items: [] }));
      }
    }

    if (entityKey === "purchase-return" && field.key === "refGRN") {
      const grn = purchaseData.getRecord("goods-receipt", next);
      if (grn) {
        setValues((prev) => ({
          ...prev,
          refGRN: next,
          refPO: grn.refPO,
          supplier: grn.supplier,
          warehouse: grn.warehouse,
          items: purchaseReturnItemsFromGoodsReceipt(grn),
        }));
      } else {
        setValues((prev) => ({ ...prev, refGRN: next, refPO: "", supplier: "", warehouse: "", items: [] }));
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
          const sourceLineItems = Array.isArray(values[field.key]) ? values[field.key] : [];
          const lineItems = entityKey === "purchase-issue" && field.key === "items" ? normalizePurchaseIssueItems(sourceLineItems) : sourceLineItems;
          if (field.minRows && lineItems.length < field.minRows) {
            nextErrors[field.key] = `At least ${field.minRows} item${field.minRows === 1 ? "" : "s"} required.`;
          }
          const requiredColumns = (field.columns || []).filter((column) => column.required && !String(column.type || "").startsWith("computed-"));
          const missingRequiredColumn = lineItems
            .map((item, index) => {
              const missingColumn = requiredColumns.find((column) => isBlank(item[column.key]));
              return missingColumn ? `Row ${index + 1}: ${missingColumn.label}` : "";
            })
            .find(Boolean);
          if (missingRequiredColumn) {
            nextErrors[field.key] = `${missingRequiredColumn} is required.`;
          }
          if (!nextErrors[field.key] && field.requirePositiveQuantityKey && !lineItems.some((item) => (Number(item[field.requirePositiveQuantityKey]) || 0) > 0)) {
            nextErrors[field.key] = field.requirePositiveQuantityMessage || "At least one item must have a receive quantity.";
          }
          const selectedCodes = lineItems.map((item) => item.code).filter(Boolean);
          const hasDuplicateCode = selectedCodes.some((code, index) => selectedCodes.indexOf(code) !== index);
          if (!nextErrors[field.key] && !field.allowDuplicateCodes && hasDuplicateCode) nextErrors[field.key] = "Same item cannot be added more than once.";

          if (!nextErrors[field.key] && entityKey === "goods-receipt" && field.key === "items" && values.refPO) {
            const purchaseOrder = purchaseData.getRecord("purchase-order", values.refPO);
            const reservedRows = reservedGoodsReceiptRows({ excludeIds: [recordId, values.id, existingRecord?.id] });
            const overReceivedItem = lineItems.find((item) => {
              if (!item.code) return false;
              const orderedQty = Number((purchaseOrder?.items || []).find((poItem) => poItem.code === item.code)?.qty) || 0;
              const reservedQty = receivedQtyForPurchaseOrderItem(values.refPO, item.code, reservedRows);
              const currentQty = grnReceivedQty(item);
              return currentQty > Math.max(0, orderedQty - reservedQty);
            });

            if (overReceivedItem) {
              const reservedQty = receivedQtyForPurchaseOrderItem(values.refPO, overReceivedItem.code, reservedRows);
              const orderedQty = Number((purchaseOrder?.items || []).find((poItem) => poItem.code === overReceivedItem.code)?.qty) || 0;
              const remainingQty = Math.max(0, orderedQty - reservedQty);
              nextErrors[field.key] = `${overReceivedItem.name || overReceivedItem.code} has only ${remainingQty} remaining for this PO.`;
            }
          }

          if (!nextErrors[field.key] && entityKey === "purchase-issue" && field.key === "items") {
            const request = purchaseData.getRecord("purchase-request", values.requisitionNo);
            const completedIssues = completedPurchaseIssueRows();
            const overIssueItem = lineItems.find((item) => {
              const issueQty = Number(item.issueQty) || 0;
              const requestedQty = Number((request?.items || []).find((requestItem) => requestItem.code === item.code)?.qty ?? item.requestedQty) || 0;
              const previouslyIssuedQty = request
                ? issuedQtyForPurchaseRequestItem(request.id, item.code, completedIssues)
                : Number(item.previouslyIssuedQty) || 0;
              const liveRemainingQty = Math.max(0, requestedQty - previouslyIssuedQty);
              return issueQty > liveRemainingQty || issueQty > availableQtyForIssueItem(item);
            });

            if (overIssueItem) {
              const requestedQty = Number((request?.items || []).find((requestItem) => requestItem.code === overIssueItem.code)?.qty ?? overIssueItem.requestedQty) || 0;
              const previouslyIssuedQty = request
                ? issuedQtyForPurchaseRequestItem(request.id, overIssueItem.code, completedIssues)
                : Number(overIssueItem.previouslyIssuedQty) || 0;
              const allowedQty = Math.min(Math.max(0, requestedQty - previouslyIssuedQty), availableQtyForIssueItem(overIssueItem));
              nextErrors[field.key] = `${overIssueItem.name || overIssueItem.code} can issue a maximum of ${allowedQty}.`;
            }
          }

          if (!nextErrors[field.key] && entityKey === "purchase-return" && field.key === "items") {
            const invalidReturnItem = lineItems.find((item) => {
              const returnQty = Number(item.returnQty) || 0;
              return returnQty < 0 || returnQty > (Number(item.availableQty) || 0);
            });
            if (invalidReturnItem) {
              nextErrors[field.key] = `${invalidReturnItem.name || invalidReturnItem.code} return quantity must be between 0 and ${Number(invalidReturnItem.availableQty) || 0}.`;
            }
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

  function applyStockUpdate(direction, stockRecord = values) {
    if (entityKey === "goods-receipt" && direction === "increase") {
      stockData.postStockIn(
        stockRecord.items.map((item) => ({
          code: item.code,
          name: item.name,
          batch: item.batch,
          expiry: item.expiry,
          location: item.location || "",
          qty: grnReceivedQty(item),
          unit: item.unit,
          unitCost: Number(item.rate ?? item.price) || 0,
        })),
        {
          warehouse: stockRecord.warehouse,
          reference: stockRecord.id,
          supplier: stockRecord.supplier,
          user: authUserName,
          date: stockRecord.date,
        }
      );
      return;
    }

    if (entityKey === "purchase-issue" && direction === "decrease") {
      const issueWarehouse = stockRecord.warehouse || stockRecord.items.find((item) => item.warehouse)?.warehouse || "Raw Material Store";
      stockData.postStockOut(
        stockRecord.items.map((item) => ({
          code: item.code,
          name: item.name,
          batch: item.batch,
          qty: Number(item.issueQty ?? item.qty ?? item.unitQty) || 0,
          unit: item.unit,
          unitCost: Number(item.price) || 0,
        })),
        {
          warehouse: issueWarehouse,
          reference: stockRecord.id,
          supplier: stockRecord.supplier,
          user: authUserName,
          date: stockRecord.date,
        }
      );
      return;
    }

    stockRecord.items.forEach((item) => {
      const masterItemRows = masterData.getRows("product-item");
      const current = masterItemRows.find((r) => r.code === item.code);
      if (!current) return;
      const qty = direction === "increase" ? grnReceivedQty(item) : Number(item.returnQty ?? item.issueQty) || 0;
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

  function statusPatch(status) {
    if (status === "Received") {
      return {
        receivedBy: authUserName,
        receivedDate: today(),
      };
    }
    if (["Issued", "Issue Complete"].includes(status)) {
      return {
        issuedBy: authUserName,
        issuedDate: today(),
      };
    }
    return {};
  }

  async function updateLinkedPurchaseRequestCoverage(record) {
    if (entityKey !== "purchase-order" || record.status === "Draft") return;

    const affectedRequestIds = uniqueOptions([...optionValues(existingRecord?.refPR), ...optionValues(record.refPR)]);
    if (affectedRequestIds.length === 0) return;

    const coverageRows = purchaseOrderCoverageRows({ includeRecord: record });
    await Promise.all(
      affectedRequestIds.map((requestId) => {
        const request = purchaseData.getRecord("purchase-request", requestId);
        if (!request || !["Approved", "Received"].includes(request.status)) return Promise.resolve();

        const hasRemaining = remainingPurchaseRequestItems(requestId, coverageRows).length > 0;
        if (!hasRemaining && request.status !== "Received") {
          return purchaseData.updateRow("purchase-request", request.id, {
            status: "Received",
            receivedBy: authUserName,
            receivedDate: today(),
            activity: [...(request.activity || []), { event: "Received", date: today(), time: currentTime(), by: authUserName }],
          });
        }

        if (hasRemaining && request.status === "Received") {
          return purchaseData.updateRow("purchase-request", request.id, {
            status: "Approved",
            receivedBy: "",
            receivedDate: "",
            activity: (request.activity || []).filter((entry) => entry.event !== "Received"),
          });
        }

        return Promise.resolve();
      })
    );
  }

  async function updateLinkedPurchaseRequestIssueStatus(record) {
    if (entityKey !== "purchase-issue" || !["Issued", "Issue Complete"].includes(record.status) || !record.stockUpdated || !record.requisitionNo) return;

    const request = purchaseData.getRecord("purchase-request", record.requisitionNo);
    if (!request || !["Approved", "Partial Issue", "Full Issue"].includes(request.status)) return;

    const nextStatus = purchaseRequestIssueStatus(request, completedPurchaseIssueRows({ includeRecord: record }));
    if (!nextStatus || request.status === nextStatus) return;

    await purchaseData.updateRow("purchase-request", request.id, {
      status: nextStatus,
      receivedBy: "",
      receivedDate: "",
      activity: [...(request.activity || []), { event: nextStatus, date: today(), time: currentTime(), by: authUserName, reference: record.id }],
    });
  }

  function completedGoodsReceiptRows({ includeRecord = null } = {}) {
    const rows = purchaseData
      .getRows("goods-receipt")
      .filter((row) => row.id !== includeRecord?.id);
    const mergedRows = includeRecord ? [includeRecord, ...rows] : rows;
    return mergedRows.filter(countsAgainstPurchaseOrderReceipt);
  }

  function receivedQtyForPurchaseOrderItem(poId, itemCode, receiptRows) {
    return receiptRows
      .filter((receipt) => receipt.refPO === poId)
      .reduce((sum, receipt) => {
        return (
          sum +
          (receipt.items || [])
            .filter((item) => item.code === itemCode)
            .reduce((itemSum, item) => itemSum + grnReceivedQty(item), 0)
        );
      }, 0);
  }

  async function updateLinkedPurchaseOrderReceiptStatus(record) {
    if (entityKey !== "goods-receipt" || record.status !== "Completed") return;

    const po = purchaseData.getRecord("purchase-order", record.refPO);
    if (!po || ["Draft", "Pending Approval", "Rejected", "Cancelled", "Returned"].includes(po.status)) return;

    const receiptRows = completedGoodsReceiptRows({ includeRecord: record });
    const orderedItems = (po.items || []).filter((item) => item.code && (Number(item.qty) || 0) > 0);
    if (orderedItems.length === 0) return;

    const hasAnyReceived = orderedItems.some((item) => receivedQtyForPurchaseOrderItem(po.id, item.code, receiptRows) > 0);
    if (!hasAnyReceived) return;

    const isFullyReceived = orderedItems.every((item) => receivedQtyForPurchaseOrderItem(po.id, item.code, receiptRows) >= (Number(item.qty) || 0));
    const nextStatus = isFullyReceived ? "Completed GRN" : "Partially Received";
    if (po.status === nextStatus) return;

    await purchaseData.updateRow("purchase-order", po.id, {
      status: nextStatus,
      ...(nextStatus === "Completed GRN" ? { receivedBy: authUserName, receivedDate: today() } : { receivedBy: "", receivedDate: "" }),
      activity: [...(po.activity || []), { event: nextStatus, date: today(), time: currentTime(), by: authUserName }],
    });
  }

  async function executeAction(action, options = {}) {
    const status = action.status || values.status;
    const recordValues =
      entityKey === "purchase-issue"
        ? { ...values, items: normalizePurchaseIssueItems(values.items) }
        : purchaseOrderWithSourceAllocations(values);
    const activity = [...(recordValues.activity || [])];
    const hasCreatedActivity = activity.some((entry) => ["Created", "Draft"].includes(entry.event));
    const actionEvent = action.activityEvent || (action.status === "Draft" ? "Created" : action.status || "Updated");
    if (mode === "create" && !hasCreatedActivity) {
      activity.push({ event: "Created", date: today(), time: currentTime(), by: authUserName });
    }
    if (!(mode === "create" && actionEvent === "Created" && !hasCreatedActivity)) {
      activity.push({ event: actionEvent, date: today(), time: currentTime(), by: authUserName, ...(options.reason ? { reason: options.reason } : {}) });
    }

    const record = {
      ...recordValues,
      ...(entityKey === "purchase-request" && mode === "create" ? { requestedBy: authUserName } : {}),
      ...(entityKey === "purchase-order" && mode === "create" ? { preparedBy: recordValues.preparedBy || authUserName } : {}),
      ...(entityKey === "purchase-issue" && mode === "create" ? { requestedBy: recordValues.requestedBy || authUserName } : {}),
      status,
      ...approvalPatch(action, options.reason),
      ...statusPatch(status),
      ...(action.updatesStock ? { stockUpdated: true } : {}),
      activity,
    };

    try {
      if (action.updatesStock && !values.stockUpdated) applyStockUpdate(action.updatesStock, record);

      if (mode === "edit") await purchaseData.updateRow(entityKey, recordId, record);
      else await purchaseData.addRow(entityKey, record);

      await updateLinkedPurchaseRequestCoverage(record);
      await updateLinkedPurchaseRequestIssueStatus(record);
      await updateLinkedPurchaseOrderReceiptStatus(record);

      showToast(action.status ? `${values.id} updated to "${action.status}".` : mode === "edit" ? `${values.id} updated.` : `${entity.singular} saved.`);
      setPendingAction(null);
      setReasonAction(null);
      setRejectionReason("");
      setRejectionReasonError("");
      navigate(`/purchase-management/${entityKey}`);
    } catch (error) {
      setErrorBanner(error.message || `Unable to save ${entity.singular}.`);
      showToast(error.message || `Unable to save ${entity.singular}.`, "error");
    }
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

  function printWorkflowSection() {
    document.body.classList.add("purchase-workflow-only-print");
    window.addEventListener(
      "afterprint",
      () => {
        document.body.classList.remove("purchase-workflow-only-print");
      },
      { once: true }
    );
    window.print();
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
  const showBackButton = ["purchase-request", "purchase-order"].includes(entityKey) && mode === "create";
  const dedicatedPrintAreaClass =
    entityKey === "goods-receipt"
      ? "goods-receipt-print-area"
      : entityKey === "purchase-issue"
        ? "purchase-issue-print-area"
        : entityKey === "purchase-return"
          ? "purchase-return-print-area"
          : "";
  const hasDedicatedPrintLayout = Boolean(dedicatedPrintAreaClass);

  return (
    <div className={isView ? `purchase-detail-print-area ${dedicatedPrintAreaClass}` : ""}>
      {isView && entityKey === "goods-receipt" && <PrintGoodsReceipt values={values} company={company} companyName={companyName} companyContact={companyContact} />}
      {isView && entityKey === "purchase-issue" && <PrintPurchaseIssue values={values} company={company} companyName={companyName} companyContact={companyContact} />}
      {isView && entityKey === "purchase-return" && <PrintPurchaseReturn values={values} company={company} companyName={companyName} companyContact={companyContact} />}

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

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h2 className="text-xl font-semibold text-[var(--ink)]">
          {isView ? values.id : mode === "edit" ? `Edit ${entity.label}` : `New ${entity.label}`}
        </h2>
        {showBackButton && (
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
            Back
          </button>
        )}
      </div>

      {isView && !hasDedicatedPrintLayout && (
        <div className="hidden border-b border-[var(--line)] pb-4 print:block">
          <div className="workflow-print-banner rounded-md border border-[var(--line)] bg-slate-50 px-5 py-4 text-center">
            <h1 className="text-xl font-bold text-[var(--ink)]">{companyName}</h1>
            {company.address && <p className="mt-1 text-sm text-[var(--muted)]">{company.address}</p>}
            {companyContact && <p className="mt-1 text-sm text-[var(--muted)]">{companyContact}</p>}
            {company.gstNumber && <p className="mt-1 text-xs font-medium text-[var(--muted)]">GST: {company.gstNumber}</p>}
          </div>
          <div className="workflow-print-title mt-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--ink)]">{entity.label} Details</h2>
            <p className="text-sm font-medium text-[var(--muted)]">
              {values.id} - Status: {values.status}
            </p>
          </div>
        </div>
      )}

      {isView && (
        <div className={`purchase-workflow-print-area mt-3 space-y-3 rounded-md border border-[var(--line)] bg-white p-4 ${hasDedicatedPrintLayout ? "print:hidden" : ""}`}>
          <DocumentChain links={documentLinks(entityKey, values)} />
          <WorkflowTimeline steps={getWorkflowSteps(entityKey, values.status, values.activity)} activity={values.activity} record={values} />
        </div>
      )}

      {errorBanner && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 print:hidden">
          <AlertCircle size={16} />
          {errorBanner}
        </div>
      )}

      <div className={`mt-4 rounded-md border border-[var(--line)] bg-white ${isView && hasDedicatedPrintLayout ? "print:hidden" : ""}`}>
        <div className="divide-y divide-[var(--line)]">
          {visibleTabs.map((tab) => (
            <section key={tab.key} className={tab.compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}>
              <div className={`${tab.compact ? "mb-2" : "mb-4"} flex flex-wrap items-center gap-3`}>
                <h3 className="text-sm font-semibold uppercase text-[var(--muted)]">{tab.label}</h3>
                {!isReadOnlyMode &&
                  tab.fields
                    .filter((field) => field.type === "lineItems" && field.allowAddRemove && !field.hideSectionAddButton)
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
              <div className={`grid grid-cols-1 ${tab.compact ? "gap-3" : "gap-4"} sm:grid-cols-12`}>
                {tab.fields.map((field) => (
                  <div key={field.key} className={`${fieldSpanClass(field)} purchase-field purchase-field-${field.type}`}>
                    <Field
                      field={{
                        ...(field.type === "lineItems" && field.allowAddRemove ? { ...field, hideAddButton: true } : field),
                        options: resolvedFieldOptions(field),
                        columns: field.type === "lineItems" ? resolvedLineItemColumns(field) : field.columns,
                        compact: tab.compact,
                      }}
                      value={values[field.key]}
                      error={errors[field.key]}
                      disabled={isReadOnlyMode || Boolean(field.disabledWhen?.(values))}
                      materialRows={itemRows}
                      stockBatches={stockData.batches}
                      onChange={(next) => handleFieldChange(field, next)}
                    />
                    {entityKey === "purchase-order" && tab.key === "delivery" && field.key === "warehouse" && selectedWarehouse && <WarehouseAddressSummary warehouse={selectedWarehouse} />}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-end gap-2 rounded-md border border-[var(--line)] bg-white/95 p-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur print:hidden">
        {isView || (mode === "edit" && !canEditRecord) ? (
          <>
            <button type="button" onClick={handleCancel} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Close
            </button>
            <button type="button" onClick={printWorkflowSection} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Print
            </button>
            {isView && canEditRecord && (
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
        tone={pendingAction?.tone}
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
