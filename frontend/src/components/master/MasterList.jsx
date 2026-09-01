import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as Crumb,
  Copy,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search as SearchIcon,
  SearchX,
} from "lucide-react";
import { masterEntities } from "../../data/masterManagement.js";
import { Badge, ConfirmDialog } from "../ui.jsx";
import { useMasterData } from "./MasterDataContext.jsx";
import { useToast } from "../Toast.jsx";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const PAGE_SIZE = 5;

const summaryTones = {
  primary: "text-[var(--primary)] bg-blue-50",
  success: "text-emerald-700 bg-emerald-50",
  muted: "text-[var(--muted)] bg-slate-100",
  warning: "text-[var(--warning)] bg-amber-50",
  danger: "text-[var(--danger)] bg-red-50",
  accent: "text-[var(--navy)] bg-slate-100",
};

function optionLabel(row) {
  return row.name || row.storeName || row.code || "";
}

function uniqueOptions(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function resolveFilterOptions(filter, getRows) {
  if (filter.optionsFrom === "warehouse") {
    return uniqueOptions(
      getRows("warehouse")
        .filter((row) => row.status !== "Inactive")
        .map(optionLabel)
    );
  }

  return filter.options || [];
}

function toCsv(columns, rows) {
  const header = columns.map((col) => col.label).join(",");
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const text = value === undefined || value === null ? "" : String(value);
        return `"${text.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export function MasterList({ entityKey }) {
  const entity = masterEntities[entityKey];
  const { getRows, updateRow, loading: dataLoading = {}, error: dataError = {} } = useMasterData();
  const showToast = useToast();
  const navigate = useNavigate();
  const rows = getRows(entityKey);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [entityKey]);

  useEffect(() => {
    setSearch("");
    setFilters({});
    setPage(1);
    setSort({ key: null, dir: 1 });
  }, [entityKey]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuFor(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isLoading = loading || Boolean(dataLoading[entityKey]);
  const loadError = dataError[entityKey] || "";

  const filteredRows = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((row) => entity.list.searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q)));
    }
    Object.entries(filters).forEach(([key, value]) => {
      if (value) result = result.filter((row) => String(row[key]) === value);
    });
    if (sort.key) {
      result = [...result].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * sort.dir;
        return String(av ?? "").localeCompare(String(bv ?? "")) * sort.dir;
      });
    }
    return result;
  }, [rows, search, filters, sort, entity.list.searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key) {
    setSort((prev) => (prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }));
  }

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
    showToast(`Exported ${filteredRows.length} ${entity.label.toLowerCase()} row(s).`);
  }

  function handleDuplicate(row) {
    navigate(`/master-management/${entityKey}/new`, { state: { duplicateFrom: row } });
  }

  async function confirmDeactivate() {
    if (!confirmTarget) return;
    try {
      await updateRow(entityKey, confirmTarget.code, { status: "Inactive" });
      showToast(`${confirmTarget.name || confirmTarget.code} marked as Inactive.`);
      setConfirmTarget(null);
    } catch (err) {
      showToast(err.message || "Unable to deactivate record.");
    }
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
        <Link to="/master-management" className="hover:text-[var(--primary)]">
          Master Management
        </Link>
        <Crumb size={12} />
        <span className="text-[var(--ink)]">{entity.label}</span>
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--ink)]">{entity.label}</h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{entity.list.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/master-management/${entityKey}/new`}
            className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]"
          >
            <Plus size={16} />
            Add {entity.singular}
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

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {entity.list.summary.map((card) => (
          <div key={card.label} className="rounded-md border border-[var(--line)] bg-white p-4">
            <p className="text-sm text-[var(--muted)]">{card.label}</p>
            <p className={`mt-1.5 inline-flex rounded px-1.5 text-2xl font-semibold ${summaryTones[card.tone] || ""}`}>
              {card.compute(rows)}
            </p>
          </div>
        ))}
      </div>

      {loadError && (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

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
              {resolveFilterOptions(filter, getRows).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
              <tr>
                {entity.list.columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`cursor-pointer select-none py-3 px-3 first:pl-4 ${col.align === "right" ? "text-right" : ""}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sort.key === col.key && <ChevronDown size={12} className={sort.dir === -1 ? "rotate-180" : ""} />}
                    </span>
                  </th>
                ))}
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
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

              {!isLoading && pageRows.length === 0 && (
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
                        }}
                        className="mt-1 rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-slate-50"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                pageRows.map((row) => (
                  <tr key={row.code} className="border-b border-slate-100 hover:bg-slate-50/60">
                    {entity.list.columns.map((col) => (
                      <td key={col.key} className={`px-3 py-3 first:pl-4 ${col.align === "right" ? "text-right" : ""}`}>
                        {col.badge ? (
                          <Badge>{row[col.key]}</Badge>
                        ) : col.mono ? (
                          <span className="font-mono text-xs">{row[col.key]}</span>
                        ) : col.money ? (
                          money.format(row[col.key])
                        ) : col.percent ? (
                          `${row[col.key]}%`
                        ) : (
                          row[col.key]
                        )}
                      </td>
                    ))}
                    <td className="relative px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenMenuFor(openMenuFor === row.code ? null : row.code)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--ink)]"
                        aria-label="Row actions"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenuFor === row.code && (
                        <div
                          ref={menuRef}
                          className="absolute right-3 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-[var(--line)] bg-white text-left shadow-lg"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuFor(null);
                              navigate(`/master-management/${entityKey}/${row.code}/view`);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink)] hover:bg-slate-50"
                          >
                            <Eye size={14} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuFor(null);
                              navigate(`/master-management/${entityKey}/${row.code}/edit`);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink)] hover:bg-slate-50"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuFor(null);
                              handleDuplicate(row);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink)] hover:bg-slate-50"
                          >
                            <Copy size={14} /> Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuFor(null);
                              setConfirmTarget(row);
                            }}
                            disabled={row.status === "Inactive"}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--danger)] hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                          >
                            <Ban size={14} /> Deactivate
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredRows.length > 0 && (
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
        open={Boolean(confirmTarget)}
        title={`Deactivate ${confirmTarget?.name || confirmTarget?.code || ""}?`}
        message="This record will be marked Inactive and hidden from active workflows. You can reactivate it later from Edit."
        confirmLabel="Deactivate"
        onConfirm={confirmDeactivate}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
