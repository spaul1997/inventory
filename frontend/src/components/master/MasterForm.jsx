import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ChevronRight as Crumb, Paperclip, Plus, Trash2 } from "lucide-react";
import { masterEntities } from "../../data/masterManagement.js";
import { useMasterData } from "./MasterDataContext.jsx";
import { useToast } from "../Toast.jsx";

function blankValues(entity) {
  const values = {};
  entity.form.tabs.forEach((tab) => {
    tab.fields.forEach((field) => {
      if (field.type === "toggle" || field.type === "checkbox") values[field.key] = false;
      else if (field.type === "conversionTable") values[field.key] = [{ from: "BOX", to: "PCS", factor: 10 }];
      else if (field.type !== "computed") values[field.key] = "";
    });
  });
  return values;
}

function Field({ field, value, error, disabled, onChange }) {
  const baseInput = `w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-[var(--muted)] ${
    error ? "border-[var(--danger)] focus:ring-red-100" : "border-[var(--line)]"
  }`;

  if (field.type === "computed") {
    return (
      <div className={field.span === "full" ? "sm:col-span-2 lg:col-span-3" : ""}>
        <p className="mb-1.5 text-sm font-medium text-[var(--ink)]">{field.label}</p>
        <div className="rounded-md border border-dashed border-[var(--line)] bg-slate-50 px-3 py-2.5 text-sm font-medium text-[var(--ink)]">
          {field.compute(value)}
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
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            value ? "bg-[var(--primary)]" : "bg-slate-200"
          }`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </label>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2.5 text-sm font-medium text-[var(--ink)]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)]"
        />
        {field.label}
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
        <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={baseInput}>
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
        <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
          {field.label}
          {field.required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
        </label>
        <textarea
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className={baseInput}
        />
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{field.label}</label>
        <label className={`flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm ${disabled ? "text-[var(--muted)]" : "text-[var(--ink)] hover:bg-slate-50"} border-[var(--line)]`}>
          <Paperclip size={14} />
          {value ? value : "Choose file..."}
          <input
            type="file"
            disabled={disabled}
            className="hidden"
            onChange={(event) => onChange(event.target.files?.[0]?.name || "")}
          />
        </label>
      </div>
    );
  }

  if (field.type === "conversionTable") {
    const rows = Array.isArray(value) ? value : [];
    return (
      <div className={field.span === "full" ? "sm:col-span-2 lg:col-span-3" : ""}>
        <p className="mb-1.5 text-sm font-medium text-[var(--ink)]">{field.label}</p>
        <div className="rounded-md border border-[var(--line)]">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-[var(--line)] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-[var(--muted)]">
            <span>From Unit</span>
            <span>To Unit</span>
            <span>Conversion Factor</span>
            <span />
          </div>
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-0">
              <input
                disabled={disabled}
                value={row.from}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...next[index], from: event.target.value };
                  onChange(next);
                }}
                className="rounded border border-[var(--line)] px-2 py-1.5 text-sm"
              />
              <input
                disabled={disabled}
                value={row.to}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...next[index], to: event.target.value };
                  onChange(next);
                }}
                className="rounded border border-[var(--line)] px-2 py-1.5 text-sm"
              />
              <input
                disabled={disabled}
                type="number"
                value={row.factor}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...next[index], factor: event.target.value };
                  onChange(next);
                }}
                className="rounded border border-[var(--line)] px-2 py-1.5 text-sm"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-[var(--muted)]">
            Example: 1 {rows[0]?.from || "BOX"} = {rows[0]?.factor || 10} {rows[0]?.to || "PCS"}
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange([...rows, { from: "", to: "", factor: "" }])}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-deep)]"
          >
            <Plus size={13} /> Add Conversion
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
        {field.label}
        {field.required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </label>
      <input
        type={field.type === "number" ? "number" : "text"}
        value={value}
        disabled={disabled}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={baseInput}
      />
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

export function MasterForm({ entityKey, mode, recordId }) {
  const entity = masterEntities[entityKey];
  const { getRows, addRow, updateRow } = useMasterData();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const existingRecord = useMemo(() => {
    if (recordId) return getRows(entityKey).find((row) => row.code === recordId);
    return location.state?.duplicateFrom;
  }, [entityKey, recordId, getRows, location.state]);

  const [values, setValues] = useState(() => {
    const base = { ...blankValues(entity), ...(existingRecord || {}) };
    if (!recordId) base.code = ""; // creating fresh or duplicating — force a new, unique code
    return base;
  });
  const [activeTab, setActiveTab] = useState(entity.form.tabs[0].key);
  const [errors, setErrors] = useState({});
  const [errorBanner, setErrorBanner] = useState("");
  const isView = mode === "view";

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const nextErrors = {};
    let firstInvalidTab = null;
    entity.form.tabs.forEach((tab) => {
      tab.fields.forEach((field) => {
        if (field.required && !String(values[field.key] ?? "").trim()) {
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

  function persist(status) {
    const derived = entity.list.deriveRow ? entity.list.deriveRow(values) : {};
    const record = { ...values, ...derived, status: status || values.status || "Active" };
    if (mode === "edit" && recordId) {
      updateRow(entityKey, recordId, record);
    } else {
      addRow(entityKey, record);
    }
    return record;
  }

  function handleCancel() {
    navigate(`/master-management/${entityKey}`);
  }

  function handleSaveDraft() {
    if (!String(values.code || "").trim() || !String(values.name || "").trim()) {
      setErrorBanner("Item Code and Name are required, even for a draft.");
      return;
    }
    persist("Draft");
    showToast(`Saved as draft.`);
    navigate(`/master-management/${entityKey}`);
  }

  function handleSaveAndNew() {
    if (!validate()) return;
    persist();
    showToast(`${entity.singular} saved. Ready for a new entry.`);
    setValues(blankValues(entity));
    setActiveTab(entity.form.tabs[0].key);
  }

  function handleSave() {
    if (!validate()) return;
    persist();
    showToast(`${entity.singular} saved successfully.`);
    navigate(`/master-management/${entityKey}`);
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
        <Link to="/master-management" className="hover:text-[var(--primary)]">
          Master Management
        </Link>
        <Crumb size={12} />
        <Link to={`/master-management/${entityKey}`} className="hover:text-[var(--primary)]">
          {entity.label}
        </Link>
        <Crumb size={12} />
        <span className="text-[var(--ink)]">{isView ? "View" : mode === "edit" ? "Edit" : "Add"} {entity.singular}</span>
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)]">
        {isView ? "View" : mode === "edit" ? "Edit" : "Add"} {entity.label}
      </h2>

      {errorBanner && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
          <AlertCircle size={16} />
          {errorBanner}
        </div>
      )}

      <div className="mt-4 rounded-md border border-[var(--line)] bg-white">
        <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-[var(--line)] px-3 pt-2">
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
                      value={field.type === "computed" ? values : values[field.key]}
                      error={errors[field.key]}
                      disabled={isView}
                      onChange={(next) => setField(field.key, next)}
                    />
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>

      <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-end gap-2 rounded-md border border-[var(--line)] bg-white/95 p-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur">
        {isView ? (
          <>
            <button type="button" onClick={handleCancel} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Close
            </button>
            <Link
              to={`/master-management/${entityKey}/${recordId}/edit`}
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
            <button type="button" onClick={handleSaveDraft} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Save as Draft
            </button>
            <button type="button" onClick={handleSaveAndNew} className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50">
              Save &amp; New
            </button>
            <button type="button" onClick={handleSave} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
              Save {entity.singular}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
