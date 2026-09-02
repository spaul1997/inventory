import React from "react";
import { NavLink } from "react-router-dom";
import { Boxes, Building2, LayoutDashboard, MapPin, Package, Ruler, Tags, Truck, Warehouse } from "lucide-react";
import { masterEntities, masterEntityOrder } from "../../data/masterManagement.js";

const icons = { Package, Boxes, Tags, Ruler, Truck, Warehouse, MapPin, Building2 };

export function MasterSidebar() {
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

        <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Master Setup</p>
        <nav className="space-y-0.5">
          {masterEntityOrder.map((key) => {
            const entity = masterEntities[key];
            const Icon = icons[entity.icon] || Package;
            return (
              <NavLink
                key={key}
                to={`/master-management/${key}`}
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
        </nav>
      </div>
    </aside>
  );
}
