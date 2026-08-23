import React, { useState } from "react";
import { Calendar, Clock3, Download, Printer, Save, X } from "lucide-react";
import { Metric } from "../ui.jsx";
import { useReportConfig } from "./ReportConfigContext.jsx";

// Metadata shared by the sidebar, the page router and the Access matrix so
// report keys/labels are declared exactly once.
export const REPORT_KEYS = [
  { key: "production-report", label: "Production Report", short: "Production" },
  { key: "material-consumption-report", label: "Material Consumption Report", short: "Mat. Consumption" },
  { key: "wip-report", label: "WIP Report", short: "WIP" },
  { key: "finished-goods-report", label: "Finished Goods Report", short: "Finished Goods" },
  { key: "sales-report", label: "Sales Report", short: "Sales" },
  { key: "dispatch-report", label: "Dispatch Report", short: "Dispatch" },
  { key: "sales-return-report", label: "Sales Return Report", short: "Sales Return" },
];

export const btnOutline =
  "inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-slate-50";
export const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-deep)]";
export const filterSelectClass = "rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm";

// ---------------------------------------------------------------------------
// Date range filter — preset buttons resolve to a {from,to} ISO-date window;
// "custom" hands control to two date inputs. Reports whose data has no
// per-row transaction date (e.g. WIP, which is a live snapshot) simply don't
// render this control rather than filtering against a fabricated date.
// ---------------------------------------------------------------------------
const RANGE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
];

function presetToRange(key) {
  const now = new Date();
  if (key === "all") return { from: "", to: "" };
  let start;
  if (key === "today") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (key === "week") {
    start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
  } else if (key === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (key === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
  } else if (key === "year") start = new Date(now.getFullYear(), 0, 1);
  return { from: start ? start.toISOString().slice(0, 10) : "", to: now.toISOString().slice(0, 10) };
}

export function useDateRangeFilter(defaultPreset = "all") {
  const [preset, setPreset] = useState(defaultPreset);
  const [custom, setCustom] = useState({ from: "", to: "" });
  const range = preset === "custom" ? custom : presetToRange(preset);
  return { preset, setPreset, custom, setCustom, range };
}

export function inDateRange(dateStr, range) {
  if (!dateStr) return true;
  const d = dateStr.slice(0, 10);
  if (range.from && d < range.from) return false;
  if (range.to && d > range.to) return false;
  return true;
}

export function DateRangeFilter({ preset, onPresetChange, custom, onCustomChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        <Calendar size={14} /> Period
      </span>
      {RANGE_PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onPresetChange(p.key)}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            preset === p.key ? "border-[var(--primary)] bg-blue-50 text-[var(--primary)]" : "border-[var(--line)] text-[var(--muted)] hover:bg-slate-50"
          }`}
        >
          {p.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPresetChange("custom")}
        className={`rounded-full border px-3 py-1 text-xs font-medium ${
          preset === "custom" ? "border-[var(--primary)] bg-blue-50 text-[var(--primary)]" : "border-[var(--line)] text-[var(--muted)] hover:bg-slate-50"
        }`}
      >
        Custom
      </button>
      {preset === "custom" && (
        <span className="flex items-center gap-1">
          <input type="date" value={custom.from} onChange={(e) => onCustomChange({ ...custom, from: e.target.value })} className="rounded-md border border-[var(--line)] px-2 py-1 text-xs" />
          <span className="text-xs text-[var(--muted)]">to</span>
          <input type="date" value={custom.to} onChange={(e) => onCustomChange({ ...custom, to: e.target.value })} className="rounded-md border border-[var(--line)] px-2 py-1 text-xs" />
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV export — same toCsv+Blob+temporary-<a> pattern as SalesList.jsx's
// handleExport, generalized to take an explicit filename.
// ---------------------------------------------------------------------------
export function exportRowsToCsv(columns, rows, filename) {
  const header = columns.map((c) => c.label).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const value = c.render ? c.render(row) : row[c.key];
        const text = value === undefined || value === null ? "" : String(value);
        return `"${text.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// KPI row — thin grid wrapper around ui.jsx's Metric.
// ---------------------------------------------------------------------------
export function KpiRow({ items }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Metric key={item.label} {...item} />
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Modal — matches the .fixed.inset-0.z-50 overlay convention already used
// app-wide (ui.jsx's ConfirmDialog, SalesForm.jsx's inline dialogs).
// ---------------------------------------------------------------------------
export function Modal({ open, title, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className={`w-full ${wide ? "max-w-lg" : "max-w-sm"} rounded-md border border-[var(--line)] bg-white p-5 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
          <button type="button" onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ children }) {
  return <div className="mt-5 flex justify-end gap-2">{children}</div>;
}

// ---------------------------------------------------------------------------
// Report actions bar — Export CSV / Print / Saved Views / Schedule, backed
// by ReportConfigContext. Scheduling is intentionally a capture-only form:
// see the isolation-point comment in ReportConfigContext.jsx.
// ---------------------------------------------------------------------------
const scheduleFrequencies = ["Daily", "Weekly", "Monthly", "Quarterly"];
const scheduleFormats = ["CSV", "PDF (Print)"];

export function ReportActionsBar({ reportKey, reportLabel, columns, rows, filters, onApplyView }) {
  const { savedViews, addSavedView, removeSavedView, schedules, addSchedule, toggleSchedule } = useReportConfig();
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [scheduleDraft, setScheduleDraft] = useState({ frequency: "Weekly", format: "CSV", recipients: "" });

  const views = savedViews[reportKey] || [];
  const reportSchedules = schedules.filter((s) => s.reportKey === reportKey);

  function handleSaveView() {
    if (!viewName.trim()) return;
    addSavedView(reportKey, viewName.trim(), filters);
    setViewName("");
    setSaveOpen(false);
  }

  function handleSchedule() {
    addSchedule({ reportKey, reportLabel, ...scheduleDraft });
    setScheduleDraft({ frequency: "Weekly", format: "CSV", recipients: "" });
    setScheduleOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => exportRowsToCsv(columns, rows, `${reportKey}.csv`)} className={btnOutline}>
        <Download size={14} /> Export CSV
      </button>
      <button type="button" onClick={() => window.print()} className={btnOutline}>
        <Printer size={14} /> Print
      </button>
      <button type="button" onClick={() => setLoadOpen(true)} className={btnOutline}>
        Saved Views ({views.length})
      </button>
      <button type="button" onClick={() => setSaveOpen(true)} className={btnOutline}>
        <Save size={14} /> Save View
      </button>
      <button type="button" onClick={() => setScheduleOpen(true)} className={btnOutline}>
        <Clock3 size={14} /> Schedule
      </button>

      <Modal open={saveOpen} title="Save Current View" onClose={() => setSaveOpen(false)}>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">View Name</label>
        <input
          type="text"
          value={viewName}
          onChange={(e) => setViewName(e.target.value)}
          placeholder="e.g. This Month, Delayed Only..."
          className="mt-1 w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm"
          autoFocus
        />
        <ModalActions>
          <button type="button" onClick={() => setSaveOpen(false)} className={btnOutline}>
            Cancel
          </button>
          <button type="button" onClick={handleSaveView} className={btnPrimary}>
            Save View
          </button>
        </ModalActions>
      </Modal>

      <Modal open={loadOpen} title={`Saved Views — ${reportLabel}`} onClose={() => setLoadOpen(false)} wide>
        {views.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No saved views yet for this report.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {views.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">{v.name}</p>
                  <p className="text-xs text-[var(--muted)]">Saved {v.createdAt.slice(0, 10)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onApplyView(v.filters);
                      setLoadOpen(false);
                    }}
                    className={btnOutline}
                  >
                    Apply
                  </button>
                  <button type="button" onClick={() => removeSavedView(reportKey, v.id)} className="text-xs font-semibold text-[var(--danger)] hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <ModalActions>
          <button type="button" onClick={() => setLoadOpen(false)} className={btnOutline}>
            Close
          </button>
        </ModalActions>
      </Modal>

      <Modal open={scheduleOpen} title={`Schedule ${reportLabel}`} onClose={() => setScheduleOpen(false)} wide>
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This captures your desired schedule only. This application has no backend job scheduler or email/notification service yet — delivery isn't wired to anything live.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Frequency</label>
            <select
              value={scheduleDraft.frequency}
              onChange={(e) => setScheduleDraft({ ...scheduleDraft, frequency: e.target.value })}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
            >
              {scheduleFrequencies.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Format</label>
            <select
              value={scheduleDraft.format}
              onChange={(e) => setScheduleDraft({ ...scheduleDraft, format: e.target.value })}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
            >
              {scheduleFormats.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Recipients (comma separated)</label>
            <input
              type="text"
              value={scheduleDraft.recipients}
              onChange={(e) => setScheduleDraft({ ...scheduleDraft, recipients: e.target.value })}
              placeholder="name@company.com, ..."
              className="mt-1 w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm"
            />
          </div>
        </div>

        {reportSchedules.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Existing schedules</p>
            <div className="space-y-1.5">
              {reportSchedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span>
                    {s.frequency} · {s.format} · {s.recipients || "no recipients set"}
                  </span>
                  <button type="button" onClick={() => toggleSchedule(s.id)} className={`text-xs font-semibold ${s.active ? "text-emerald-700" : "text-[var(--muted)]"}`}>
                    {s.active ? "Active" : "Paused"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <ModalActions>
          <button type="button" onClick={() => setScheduleOpen(false)} className={btnOutline}>
            Cancel
          </button>
          <button type="button" onClick={handleSchedule} className={btnPrimary}>
            Save Schedule
          </button>
        </ModalActions>
      </Modal>
    </div>
  );
}
