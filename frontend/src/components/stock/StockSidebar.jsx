import React from "react";
import { NavLink } from "react-router-dom";
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, ClipboardCheck, LayoutDashboard, Layers, SlidersHorizontal } from "lucide-react";
import { stockEntities, stockEntityOrder } from "../../data/stockManagement.js";

const icons = { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, SlidersHorizontal, ClipboardCheck };

export function StockSidebar() {
  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="rounded-md border border-[var(--line)] bg-white p-3 lg:sticky lg:top-5">
        <NavLink
          to="/dashboard"
          className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-slate-50 hover:text-[var(--ink)]"
        >
          <LayoutDashboard size={16} />
          Back to Dashboard
        </NavLink>

        <NavLink
          to="/stock-management"
          end
          className={({ isActive }) =>
            `mb-1 block rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
              isActive ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`
          }
        >
          Stock Management
        </NavLink>
        <nav className="space-y-0.5">
          {stockEntityOrder.map((key) => {
            const entity = stockEntities[key];
            const Icon = icons[entity.icon] || SlidersHorizontal;
            return (
              <NavLink
                key={key}
                to={`/stock-management/${key}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-blue-50 text-[var(--primary)]" : "text-[var(--ink)] hover:bg-slate-50"
                  }`
                }
              >
                <Icon size={16} />
                {entity.label}
              </NavLink>
            );
          })}
          <NavLink
            to="/stock-management/batch-lot-tracking"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-blue-50 text-[var(--primary)]" : "text-[var(--ink)] hover:bg-slate-50"
              }`
            }
          >
            <Layers size={16} />
            Batch / Lot Tracking
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}
