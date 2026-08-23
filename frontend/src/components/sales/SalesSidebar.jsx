import React from "react";
import { NavLink } from "react-router-dom";
import { FileText, LayoutDashboard, PackageCheck, Receipt, Truck, Undo2, Users } from "lucide-react";
import { salesNav } from "../../data/sales/entities.js";

const icons = { Users, FileText, PackageCheck, Truck, Receipt, Undo2 };

export function SalesSidebar() {
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

        <p className="mb-1 block rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Sales</p>

        <nav className="space-y-0.5">
          {salesNav.map((item) => {
            const Icon = icons[item.icon] || FileText;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-blue-50 text-[var(--primary)]" : "text-[var(--ink)] hover:bg-slate-50"
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
