import React from "react";
import { NavLink } from "react-router-dom";
import { FileText, LayoutDashboard, PackageCheck, ShoppingCart, Undo2 } from "lucide-react";
import { purchaseEntities, purchaseEntityOrder } from "../../data/purchaseManagement.js";

const icons = { FileText, ShoppingCart, PackageCheck, Undo2 };

export function PurchaseSidebar() {
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
          to="/purchase-management"
          end
          className={({ isActive }) =>
            `mb-1 block rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
              isActive ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`
          }
        >
          Purchase Management
        </NavLink>
        <nav className="space-y-0.5">
          {purchaseEntityOrder.map((key) => {
            const entity = purchaseEntities[key];
            const Icon = icons[entity.icon] || FileText;
            return (
              <NavLink
                key={key}
                to={`/purchase-management/${key}`}
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
