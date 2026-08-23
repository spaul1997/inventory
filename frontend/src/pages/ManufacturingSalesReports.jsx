import React from "react";
import { Link, useParams } from "react-router-dom";
import { ManufacturingSalesReportsSidebar } from "../components/reports/ManufacturingSalesReportsSidebar.jsx";
import { REPORT_KEYS } from "../components/reports/reportShared.jsx";
import { ProductionReport } from "../components/reports/ProductionReport.jsx";
import { MaterialConsumptionReport } from "../components/reports/MaterialConsumptionReport.jsx";
import { WipReport } from "../components/reports/WipReport.jsx";
import { FinishedGoodsReport } from "../components/reports/FinishedGoodsReport.jsx";
import { SalesReport } from "../components/reports/SalesReport.jsx";
import { DispatchReport } from "../components/reports/DispatchReport.jsx";
import { SalesReturnReport } from "../components/reports/SalesReturnReport.jsx";

const componentsByKey = {
  "production-report": ProductionReport,
  "material-consumption-report": MaterialConsumptionReport,
  "wip-report": WipReport,
  "finished-goods-report": FinishedGoodsReport,
  "sales-report": SalesReport,
  "dispatch-report": DispatchReport,
  "sales-return-report": SalesReturnReport,
};

const reportItems = REPORT_KEYS.map((r) => ({ key: r.key, label: r.label, Component: componentsByKey[r.key] }));

export default function ManufacturingSalesReports() {
  const { reportSlug } = useParams();
  const activeItem = reportItems.find((item) => item.key === reportSlug);
  const ActiveReport = activeItem?.Component;

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <ManufacturingSalesReportsSidebar />

      <div className="min-w-0 flex-1">
        <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
          <Link to="/manufacturing-sales-reports" className="hover:text-[var(--primary)]">
            Manufacturing &amp; Sales Reports
          </Link>
          {activeItem && (
            <>
              <span>/</span>
              <span className="text-[var(--ink)]">{activeItem.label}</span>
            </>
          )}
        </p>

        {ActiveReport ? (
          <ActiveReport />
        ) : (
          <div className="flex min-h-[50vh] items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">
            Select a report from the menu on the left.
          </div>
        )}
      </div>
    </div>
  );
}
