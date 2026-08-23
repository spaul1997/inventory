import React from "react";
import { NavLink } from "react-router-dom";
import { ArrowLeftRight, Boxes, LayoutDashboard, Scale, ShoppingCart, TriangleAlert } from "lucide-react";

const navItems = [
  { to: "/inventory-reports/current-stock", label: "Current Stock", icon: Boxes },
  { to: "/inventory-reports/low-stock", label: "Low Stock", icon: TriangleAlert },
  { to: "/inventory-reports/stock-movement", label: "Stock Movement", icon: ArrowLeftRight },
  { to: "/inventory-reports/purchase-report", label: "Purchase Report", icon: ShoppingCart },
  { to: "/inventory-reports/stock-valuation", label: "Stock Valuation", icon: Scale },
];

export function InventoryReportsSidebar() {
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

        <p className="mb-1 block rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Inventory Reports</p>

        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-blue-50 text-[var(--primary)]" : "text-[var(--ink)] hover:bg-slate-50"
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
