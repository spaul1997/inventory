import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRightCircle,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  PackageCheck,
  Plus,
  Printer,
  Search as SearchIcon,
  SearchX,
  Send,
  X,
} from "lucide-react";
import { formatDisplayDate, purchaseEntities } from "../../data/purchaseManagement.js";
import { Badge, ConfirmDialog } from "../ui.jsx";
import { usePurchaseData } from "./PurchaseDataContext.jsx";
import { useToast } from "../Toast.jsx";
import { useMasterData } from "../master/MasterDataContext.jsx";
import { useAuth } from "../../stores/AuthStore.jsx";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const PAGE_SIZE = 5;

const summaryTones = {
  primary: "text-[var(--primary)] bg-blue-50",
  success: "text-emerald-700 bg-emerald-50",
  muted: "text-[var(--muted)] bg-slate-100",
  warning: "text-[var(--warning)] bg-amber-50",
  danger: "text-[var(--danger)] bg-red-50",
  accent: "text-[var(--navy)] bg-slate-100",
};

const summaryGridCols = {
  1: "sm:grid-cols-1 xl:grid-cols-1",
  2: "sm:grid-cols-2 xl:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-2 xl:grid-cols-5",
  6: "sm:grid-cols-3 xl:grid-cols-6",
};

const rowActionIcons = { Eye, Pencil, Check, X, ArrowRightCircle, Printer, Send, Ban, PackageCheck };

function RejectionReasonDialog({ open, reason, error, onReasonChange, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-md border border-[var(--line)] bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-[var(--ink)]">Reject with reason</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Enter the rejection reason before saving this decision.</p>
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

function isDateColumn(column) {
  return column.type === "date" || /date/i.test(column.key) || /date/i.test(column.label);
}

function toCsv(columns, rows) {
  const header = columns.map((col) => col.label).join(",");
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const value = col.render ? col.render(row) : row[col.key];
        const text = value === undefined || value === null ? "" : String(isDateColumn(col) ? formatDisplayDate(value) : value);
        return `"${text.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export function PurchaseList({ entityKey }) {
  const entity = purchaseEntities[entityKey];
  const { getRows, updateRow } = usePurchaseData();
  const masterData = useMasterData();
  const { session } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const rows = getRows(entityKey);
  const authUserName = session?.user?.name || "You";

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [confirmAction, setConfirmAction] = useState(null);
  const [reasonAction, setReasonAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionReasonError, setRejectionReasonError] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [entityKey]);

  useEffect(() => {
    setSearch("");
    setFilters({});
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, [entityKey]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpenMenuFor(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((row) => entity.list.searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q)));
    }
    Object.entries(filters).forEach(([key, value]) => {
      if (value) result = result.filter((row) => String(row[key]) === value);
    });
    if (entity.list.dateKey) {
      if (dateFrom) result = result.filter((row) => row[entity.list.dateKey] >= dateFrom);
      if (dateTo) result = result.filter((row) => row[entity.list.dateKey] <= dateTo);
    }
    return result;
  }, [rows, search, filters, dateFrom, dateTo, entity.list.searchKeys, entity.list.dateKey]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleExport() {
    const csv = toCsv(entity.list.columns, filteredRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityKey}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredRows.length} row(s).`);
  }

  function filterOptions(filter) {
    if (!filter.optionsFrom) return filter.options || [];

    return [
      ...new Set(
        masterData
          .getRows(filter.optionsFrom)
          .filter((row) => row.status !== "Inactive")
          .map((row) => row.name || row.storeName || row.code)
          .filter(Boolean)
      ),
    ];
  }

  function runAction(action, row) {
    setOpenMenuFor(null);

    if (action.print) {
      navigate(`/purchase-management/${entityKey}/${row.id}/view`);
      return;
    }
    if (action.key === "view") {
      navigate(`/purchase-management/${entityKey}/${row.id}/view`);
      return;
    }
    if (action.key === "edit") {
      navigate(`/purchase-management/${entityKey}/${row.id}/edit`);
      return;
    }
    if (action.convertsTo) {
      navigate(`/purchase-management/${action.convertsTo}/new`, { state: { convertFrom: { entityKey, record: row } } });
      return;
    }
    if (action.setStatus) {
      if (action.requiresReason) {
        setReasonAction({ action, row });
        setRejectionReason("");
        setRejectionReasonError("");
        return;
      }
      if (action.confirm) {
        setConfirmAction({ action, row });
        return;
      }
      applyStatusChange(action, row);
    }
  }

  function toggleActionMenu(rowId, event) {
    event.stopPropagation();

    if (openMenuFor === rowId) {
      setOpenMenuFor(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4,
      left: Math.max(12, rect.right - 192),
    });
    setOpenMenuFor(rowId);
  }

  function approvalPatch(action, reason = "") {
    if (action.approvalAction === "approve") {
      return {
        approvedBy: authUserName,
        approvalDate: new Date().toISOString().slice(0, 10),
        rejectedBy: "",
        rejectionDate: "",
        rejectionReason: "",
      };
    }
    if (action.approvalAction === "reject") {
      return {
        rejectedBy: authUserName,
        rejectionDate: new Date().toISOString().slice(0, 10),
        rejectionReason: reason,
        approvedBy: "",
        approvalDate: "",
      };
    }
    return {};
  }

  function applyStatusChange(action, row, options = {}) {
    const date = new Date().toISOString().slice(0, 10);
    updateRow(entityKey, row.id, {
      status: action.setStatus,
      ...approvalPatch(action, options.reason),
      activity: [...(row.activity || []), { event: action.setStatus, date, by: authUserName, ...(options.reason ? { reason: options.reason } : {}) }],
    });
    showToast(`${row.id} marked as ${action.setStatus}.`);
    setConfirmAction(null);
    setReasonAction(null);
    setRejectionReason("");
    setRejectionReasonError("");
  }

  function confirmReasonAction() {
    const reason = rejectionReason.trim();
    if (!reason) {
      setRejectionReasonError("Rejection reason is required.");
      return;
    }
    applyStatusChange(reasonAction.action, reasonAction.row, { reason });
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
        <Link to="/purchase-management" className="hover:text-[var(--primary)]">
          Purchase Management
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--ink)]">{entity.label}</span>
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--ink)]">{entity.label}</h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{entity.list.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/purchase-management/${entityKey}/new`}
            className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]"
          >
            <Plus size={16} />
            New {entity.singular}
          </Link>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className={`mt-5 grid gap-4 ${summaryGridCols[entity.list.summary.length] || summaryGridCols[4]}`}>
        {entity.list.summary.map((card) => (
          <div key={card.label} className="rounded-md border border-[var(--line)] bg-white p-4">
            <p className="text-sm text-[var(--muted)]">{card.label}</p>
            <p className={`mt-1.5 inline-flex rounded px-1.5 text-xl font-semibold ${summaryTones[card.tone] || ""}`}>
              {card.compute(rows)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-md border border-[var(--line)] bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] p-3">
          <div className="relative flex-1 min-w-[220px]">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={entity.list.searchPlaceholder}
              className="w-full rounded-md border border-[var(--line)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {entity.list.filters.map((filter) => (
            <select
              key={filter.key}
              value={filters[filter.key] || ""}
              onChange={(event) => {
                setFilters((prev) => ({ ...prev, [filter.key]: event.target.value }));
                setPage(1);
              }}
              className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)]"
            >
              <option value="">{filter.label}: All</option>
              {filterOptions(filter).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ))}
          {entity.list.dateKey && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-[var(--line)] px-2 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)]"
              />
              <span>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-[var(--line)] px-2 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)]"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
              <tr>
                {entity.list.columns.map((col) => (
                  <th key={col.key} className={`py-3 px-3 first:pl-4 ${col.align === "right" ? "text-right" : ""}`}>
                    {col.label}
                  </th>
                ))}
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {entity.list.columns.map((col) => (
                      <td key={col.key} className="px-3 py-3">
                        <div className="h-3.5 w-full max-w-[120px] animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                    <td className="px-3 py-3" />
                  </tr>
                ))}

              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={entity.list.columns.length + 1} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-[var(--muted)]">
                      <SearchX size={28} />
                      <p className="text-sm font-medium text-[var(--ink)]">No results found</p>
                      <p className="text-xs">Try adjusting your search or filters.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setFilters({});
                          setDateFrom("");
                          setDateTo("");
                        }}
                        className="mt-1 rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-slate-50"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                pageRows.map((row) => {
                  const actions = entity.list.rowActions.filter((action) => {
                    if (action.showWhen && !action.showWhen(row)) return false;
                    if (action.hideWhen && action.hideWhen(row)) return false;
                    return true;
                  });
                  return (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      {entity.list.columns.map((col) => {
                        const value = col.render ? col.render(row) : row[col.key];
                        const displayValue = isDateColumn(col) ? formatDisplayDate(value) : value;
                        return (
                          <td key={col.key} className={`px-3 py-3 first:pl-4 ${col.align === "right" ? "text-right" : ""}`}>
                            {col.badge ? (
                              <Badge>{displayValue}</Badge>
                            ) : col.link ? (
                              <Link
                                to={`/purchase-management/${entityKey}/${row.id}/view`}
                                className={`font-medium text-[var(--primary)] hover:underline ${col.mono ? "font-mono text-xs" : ""}`}
                              >
                                {displayValue}
                              </Link>
                            ) : col.mono ? (
                              <span className="font-mono text-xs">{displayValue}</span>
                            ) : col.money ? (
                              money.format(displayValue)
                            ) : (
                              displayValue
                            )}
                          </td>
                        );
                      })}
                      <td className="relative px-3 py-3 text-right">
                        <button
                          type="button"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => toggleActionMenu(row.id, event)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--ink)]"
                          aria-label="Row actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openMenuFor === row.id && (
                          <div
                            ref={menuRef}
                            onMouseDown={(event) => event.stopPropagation()}
                            className="fixed z-50 w-48 overflow-hidden rounded-md border border-[var(--line)] bg-white text-left shadow-lg"
                            style={{ top: menuPosition.top, left: menuPosition.left }}
                          >
                            {actions.map((action) => {
                              const Icon = rowActionIcons[action.icon] || Eye;
                              return (
                                <button
                                  key={action.key}
                                  type="button"
                                  onClick={() => runAction(action, row)}
                                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${
                                    action.tone === "danger" ? "text-[var(--danger)]" : action.tone === "success" ? "text-emerald-700" : "text-[var(--ink)]"
                                  }`}
                                >
                                  <Icon size={14} /> {action.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {!loading && filteredRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-[var(--ink)]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.action.confirm || "Are you sure?"}
        message={`This will update ${confirmAction?.row.id} to "${confirmAction?.action.setStatus}".`}
        confirmLabel={confirmAction?.action.label}
        onConfirm={() => applyStatusChange(confirmAction.action, confirmAction.row)}
        onCancel={() => setConfirmAction(null)}
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
