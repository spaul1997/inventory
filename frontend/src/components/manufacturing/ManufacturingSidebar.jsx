import React from "react";
import { NavLink } from "react-router-dom";
import {
  Boxes,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  ListTree,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  PackageSearch,
  Trash2,
  Workflow,
} from "lucide-react";
import { manufacturingNav } from "../../data/manufacturing/entities.js";

const icons = {
  LayoutDashboard,
  PackageSearch,
  ListTree,
  CalendarRange,
  ClipboardList,
  PackageMinus,
  Workflow,
  PackageCheck,
  Boxes,
  PackagePlus,
  Trash2,
};

export function ManufacturingSidebar() {
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

        <p className="mb-1 block rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Manufacturing</p>

        <nav className="space-y-0.5">
          {manufacturingNav.map((item) => {
            const Icon = icons[item.icon] || ClipboardList;
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
