import React from "react";
import { Link, useParams } from "react-router-dom";
import { InventoryReportsSidebar } from "../components/reports/InventoryReportsSidebar.jsx";
import { CurrentStockReport } from "../components/reports/CurrentStockReport.jsx";
import { LowStockReport } from "../components/reports/LowStockReport.jsx";
import { StockMovementReport } from "../components/reports/StockMovementReport.jsx";
import { PurchaseReport } from "../components/reports/PurchaseReport.jsx";
import { StockValuationReport } from "../components/reports/StockValuationReport.jsx";

const reportItems = [
  { key: "current-stock", label: "Current Stock", Component: CurrentStockReport },
  { key: "low-stock", label: "Low Stock", Component: LowStockReport },
  { key: "stock-movement", label: "Stock Movement", Component: StockMovementReport },
  { key: "purchase-report", label: "Purchase Report", Component: PurchaseReport },
  { key: "stock-valuation", label: "Stock Valuation", Component: StockValuationReport },
];

export default function InventoryReports() {
  const { reportSlug } = useParams();
  const activeItem = reportItems.find((item) => item.key === reportSlug);
  const ActiveReport = activeItem?.Component;

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <InventoryReportsSidebar />

      <div className="min-w-0 flex-1">
        <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
          <Link to="/inventory-reports" className="hover:text-[var(--primary)]">
            Inventory Reports
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
