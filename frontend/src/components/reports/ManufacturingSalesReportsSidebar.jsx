import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Factory, LayoutDashboard, Layers, PackageMinus, PackagePlus, ShieldCheck, ShoppingBag, Truck, Undo2 } from "lucide-react";
import { REPORT_KEYS, Modal, ModalActions, btnOutline } from "./reportShared.jsx";
import { useReportConfig } from "./ReportConfigContext.jsx";
import { useAuth } from "../../stores/AuthStore.jsx";
import { hasCompanyModule } from "../../data/menu.js";

const icons = {
  "production-report": Factory,
  "material-consumption-report": PackageMinus,
  "wip-report": Layers,
  "finished-goods-report": PackagePlus,
  "sales-report": ShoppingBag,
  "dispatch-report": Truck,
  "sales-return-report": Undo2,
};

const reportModules = {
  "production-report": "manufacturing",
  "material-consumption-report": "manufacturing",
  "wip-report": "manufacturing",
  "finished-goods-report": "manufacturing",
  "sales-report": "sales",
  "dispatch-report": "sales",
  "sales-return-report": "sales",
};

export function ManufacturingSalesReportsSidebar() {
  const { session } = useAuth();
  const visibleReports = REPORT_KEYS.filter((item) => hasCompanyModule(session?.user?.company?.enabledModules, reportModules[item.key]));

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

        <p className="mb-1 block rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Manufacturing &amp; Sales Reports</p>

        <nav className="space-y-0.5">
          {visibleReports.map((item) => {
            const Icon = icons[item.key];
            return (
              <NavLink
                key={item.key}
                to={`/manufacturing-sales-reports/${item.key}`}
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

        <div className="mt-2 border-t border-[var(--line)] pt-2">
          <AccessMatrixButton reports={visibleReports} />
        </div>
      </div>
    </aside>
  );
}

function AccessMatrixButton({ reports }) {
  const { accessMatrix, toggleAccess } = useReportConfig();
  const [open, setOpen] = useState(false);
  const roles = Object.keys(accessMatrix);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-slate-50 hover:text-[var(--ink)]"
      >
        <ShieldCheck size={16} />
        Manage Access
      </button>

      <Modal open={open} title="Reporting Access" onClose={() => setOpen(false)} wide>
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Configures intended per-role access to these reports. Not enforced — this application has no role-based login yet (Login accepts any credentials).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="border-b border-[var(--line)] text-[var(--muted)]">
              <tr>
                <th className="py-1.5 pr-2">Role</th>
                {reports.map((r) => (
                  <th key={r.key} className="px-2 pb-1.5 text-center font-medium">
                    {r.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2 font-medium text-[var(--ink)]">{role}</td>
                  {reports.map((r) => (
                    <td key={r.key} className="px-2 text-center">
                      <input type="checkbox" checked={accessMatrix[role].includes(r.key)} onChange={() => toggleAccess(role, r.key)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ModalActions>
          <button type="button" onClick={() => setOpen(false)} className={btnOutline}>
            Close
          </button>
        </ModalActions>
      </Modal>
    </>
  );
}
