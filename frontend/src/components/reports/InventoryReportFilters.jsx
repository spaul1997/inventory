import React from "react";
import { Download, FileSpreadsheet, Filter, LoaderCircle, RotateCcw, Search } from "lucide-react";

const inputClass = "h-9 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100";

function SelectFilter({ label, value, onChange, options = [], compact = false }) {
  return (
    <label className={`${compact ? "text-[11px]" : "text-xs"} min-w-0 font-medium text-[var(--muted)]`}>
      <span className={`${compact ? "mb-0.5" : "mb-1"} block`}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} ${compact ? "!h-8 !px-2.5 !text-xs" : ""}`}>
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function InputFilter({ label, type = "text", value, onChange, placeholder, compact = false }) {
  return (
    <label className={`${compact ? "text-[11px]" : "text-xs"} min-w-0 font-medium text-[var(--muted)]`}>
      <span className={`${compact ? "mb-0.5" : "mb-1"} block`}>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${inputClass} ${compact ? "!h-8 !px-2.5 !text-xs" : ""}`} min={type === "number" ? "0" : undefined} />
    </label>
  );
}

export function InventoryReportFilters({ report, fields = [], compactRows = false }) {
  const { filters, options = {}, updateFilter, applyFilters, resetFilters, download, loading, exporting, error, rows = [] } = report;
  const has = (field) => fields.includes(field);

  return (
    <section className={`${compactRows ? "mb-4 p-3" : "mb-5 p-4"} rounded-lg border border-[var(--line)] bg-white shadow-sm`}>
      <div className={`${compactRows ? "mb-2" : "mb-3"} flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[var(--primary)]"><Filter size={16} /></span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--ink)]">Advanced Filters</h3>
              {compactRows && !loading && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">{rows.length} matches</span>}
            </div>
            <p className="text-xs text-[var(--muted)]">Filter live database records before viewing or downloading.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => download("pdf")} disabled={Boolean(exporting)} className={`${compactRows ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm"} inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white font-medium text-[var(--ink)] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60`}>
            {exporting === "pdf" ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />} PDF
          </button>
          <button type="button" onClick={() => download("excel")} disabled={Boolean(exporting)} className={`${compactRows ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm"} inline-flex items-center gap-2 rounded-md bg-emerald-700 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60`}>
            {exporting === "excel" ? <LoaderCircle size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} Excel
          </button>
        </div>
      </div>

      <form onSubmit={applyFilters} className={`${compactRows ? "gap-x-3 gap-y-2" : "gap-3"} grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6`}>
        {has("search") && (
          <label className={`${compactRows ? "text-[11px]" : "text-xs"} min-w-0 font-medium text-[var(--muted)] sm:col-span-2`}>
            <span className={`${compactRows ? "mb-0.5" : "mb-1"} block`}>Search</span>
            <span className="relative block">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Code, item, reference..." className={`${inputClass} pl-9 ${compactRows ? "!h-8 !text-xs" : ""}`} />
            </span>
          </label>
        )}
        {has("date") && <InputFilter compact={compactRows} label="From Date" type="date" value={filters.dateFrom} onChange={(value) => updateFilter("dateFrom", value)} />}
        {has("date") && <InputFilter compact={compactRows} label="To Date" type="date" value={filters.dateTo} onChange={(value) => updateFilter("dateTo", value)} />}
        {has("warehouse") && <SelectFilter compact={compactRows} label="Warehouse" value={filters.warehouse} onChange={(value) => updateFilter("warehouse", value)} options={options.warehouses} />}
        {has("category") && <SelectFilter compact={compactRows} label="Category" value={filters.category} onChange={(value) => updateFilter("category", value)} options={options.categories} />}
        {has("itemType") && <SelectFilter compact={compactRows} label="Item Type" value={filters.itemType} onChange={(value) => updateFilter("itemType", value)} options={options.itemTypes} />}
        {has("movementType") && <SelectFilter compact={compactRows} label="Movement Type" value={filters.movementType} onChange={(value) => updateFilter("movementType", value)} options={options.movementTypes} />}
        {has("supplier") && <SelectFilter compact={compactRows} label="Supplier" value={filters.supplier} onChange={(value) => updateFilter("supplier", value)} options={options.suppliers} />}
        {has("status") && <SelectFilter compact={compactRows} label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)} options={options.statuses} />}
        {has("stockRange") && <InputFilter compact={compactRows} label="Minimum Stock" type="number" value={filters.minStock} onChange={(value) => updateFilter("minStock", value)} placeholder="0" />}
        {has("stockRange") && <InputFilter compact={compactRows} label="Maximum Stock" type="number" value={filters.maxStock} onChange={(value) => updateFilter("maxStock", value)} placeholder="Any" />}
        {has("qtyRange") && <InputFilter compact={compactRows} label="Minimum Quantity" type="number" value={filters.minQty} onChange={(value) => updateFilter("minQty", value)} placeholder="0" />}
        {has("qtyRange") && <InputFilter compact={compactRows} label="Maximum Quantity" type="number" value={filters.maxQty} onChange={(value) => updateFilter("maxQty", value)} placeholder="Any" />}
        {has("valueRange") && <InputFilter compact={compactRows} label="Minimum Value" type="number" value={filters.minValue} onChange={(value) => updateFilter("minValue", value)} placeholder="0" />}
        {has("valueRange") && <InputFilter compact={compactRows} label="Maximum Value" type="number" value={filters.maxValue} onChange={(value) => updateFilter("maxValue", value)} placeholder="Any" />}

        <div className={`${compactRows ? "gap-1.5 sm:col-span-2 xl:col-span-1" : "gap-2 sm:col-span-2"} flex items-end`}>
          <button type="submit" disabled={loading} className={`${compactRows ? "h-8 gap-1 px-2.5 text-xs" : "h-9 gap-2 px-4 text-sm"} inline-flex items-center rounded-md bg-[var(--primary)] font-medium text-white hover:opacity-90 disabled:opacity-60`}>
            {loading ? <LoaderCircle size={15} className="animate-spin" /> : <Filter size={15} />} {compactRows ? "Apply" : "Apply Filters"}
          </button>
          <button type="button" onClick={resetFilters} className={`${compactRows ? "h-8 gap-1 px-2 text-xs" : "h-9 gap-2 px-3 text-sm"} inline-flex items-center rounded-md border border-[var(--line)] bg-white font-medium text-[var(--ink)] hover:bg-slate-50`}>
            <RotateCcw size={15} /> Reset
          </button>
        </div>
      </form>

      {(!compactRows || error) && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
        {!compactRows && <span className="text-[var(--muted)]">{loading ? "Loading live report data..." : `${rows.length} matching record${rows.length === 1 ? "" : "s"}`}</span>}
        {error && <span className="font-medium text-[var(--danger)]">{error}</span>}
      </div>}
    </section>
  );
}
