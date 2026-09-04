import React, { useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Bell, Boxes, Building2, CreditCard, LayoutDashboard, LogOut, Search, Settings as SettingsIcon, UserCog } from "lucide-react";
import { menu } from "./data/menu.js";
import { MegaMenu } from "./components/MegaMenu.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { AuthProvider, useAuth } from "./stores/AuthStore.jsx";
import { SpecialAdminDataProvider } from "./stores/SpecialAdminStore.jsx";
import { MasterDataProvider } from "./components/master/MasterDataContext.jsx";
import { PurchaseDataProvider } from "./components/purchase/PurchaseDataContext.jsx";
import { StockDataProvider } from "./components/stock/StockDataContext.jsx";
import { ManufacturingDataProvider } from "./components/manufacturing/ManufacturingDataContext.jsx";
import { SalesDataProvider } from "./components/sales/SalesDataContext.jsx";
import { ReportConfigProvider } from "./components/reports/ReportConfigContext.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { SpecialAdminCompany, SpecialAdminDashboard, SpecialAdminPayment } from "./pages/SpecialAdmin.jsx";
import EditProfile from "./pages/EditProfile.jsx";
import Settings from "./pages/Settings.jsx";
import Billing from "./pages/Billing.jsx";
import Placeholder from "./pages/Placeholder.jsx";
import { MasterManagementHome, MasterManagementListPage, MasterManagementFormPage } from "./pages/MasterManagement.jsx";
import { PurchaseManagementDashboard, PurchaseManagementListPage, PurchaseManagementFormPage } from "./pages/PurchaseManagement.jsx";
import {
  StockManagementDashboard,
  StockManagementListPage,
  StockManagementFormPage,
  BatchLotTracking,
  BatchDetail,
  StockItemDetail,
  StockMovementHistory,
  StockReports,
} from "./pages/StockManagement.jsx";
import InventoryReports from "./pages/InventoryReports.jsx";
import ManufacturingSalesReports from "./pages/ManufacturingSalesReports.jsx";
import { ManufacturingDashboard, ManufacturingListPage, ManufacturingFormPage, BomFormPage, WorkOrderFormPage, WipManagement } from "./pages/Manufacturing.jsx";
import { SalesListPage, SalesFormPage, CustomerProfilePage } from "./pages/Sales.jsx";

const specialAdminTabs = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Company", to: "/company", icon: Building2 },
  { label: "Payment", to: "/payment", icon: CreditCard },
];

function isSpecialAdminSession(session) {
  return session?.user?.role === "special_admin";
}

function ProtectedRoute({ children }) {
  const { session } = useAuth();
  const location = useLocation();

  if (session?.token && session.verified === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 text-sm font-medium text-[var(--muted)]">
        Checking session...
      </div>
    );
  }

  if (!session?.token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function Topbar() {
  const { logout, session } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);
  const isSpecialAdmin = isSpecialAdminSession(session);

  const displayName = session?.user?.name || "User";
  const displayCompany = session?.user?.company?.businessName;
  const roleLabel = isSpecialAdmin ? "Special Admin" : "Signed in";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="bg-[var(--navy)] text-white">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-2 sm:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15">
            <Boxes size={18} />
          </div>
          <span className="hidden text-sm font-semibold sm:block">IMS Control Center</span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="relative hidden md:block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search product, SKU, store, vendor..."
              className="w-64 rounded-full border border-white/15 bg-white/10 py-1.5 pl-9 pr-14 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/40 focus:bg-white/15 lg:w-72"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
              Ctrl K
            </kbd>
          </div>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((value) => !value)}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Notifications"
            >
              <Bell size={16} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-[var(--line)] bg-white p-3 text-sm text-[var(--muted)] shadow-lg">
                No new notifications.
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((value) => !value)}
              className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
                {initials || "U"}
              </span>
              <span className="hidden text-sm font-medium sm:block">{displayName}</span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-md border border-[var(--line)] bg-white text-sm shadow-lg">
                <div className="border-b border-[var(--line)] px-3 py-2">
                  <p className="font-medium text-[var(--ink)]">{displayName}</p>
                  {displayCompany && <p className="truncate text-xs text-[var(--muted)]">{displayCompany}</p>}
                  <p className="text-xs text-[var(--muted)]">{roleLabel}</p>
                </div>
                {!isSpecialAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--ink)] hover:bg-slate-50"
                    >
                      <UserCog size={15} />
                      Edit Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/settings");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--ink)] hover:bg-slate-50"
                    >
                      <SettingsIcon size={15} />
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/billing");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--ink)] hover:bg-slate-50"
                    >
                      <CreditCard size={15} />
                      Billing
                    </button>
                  </>
                )}
                <div className="border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--ink)] hover:bg-slate-50"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          {isSpecialAdmin ? (
            <div className="flex flex-wrap items-center gap-1">
              {specialAdminTabs.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={label}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? "border-[var(--primary)] text-white" : "border-transparent text-white/70 hover:text-white"
                    }`
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </div>
          ) : (
            <MegaMenu sections={menu} />
          )}
        </div>
      </nav>
    </header>
  );
}

function BusinessDataProviders({ storageScope, children }) {
  const { session } = useAuth();

  return (
    <MasterDataProvider storageScope={storageScope} token={session?.token}>
      <PurchaseDataProvider storageScope={storageScope} token={session?.token}>
        <StockDataProvider storageScope={storageScope}>
          <ManufacturingDataProvider storageScope={storageScope}>
            <SalesDataProvider storageScope={storageScope}>
              <ReportConfigProvider storageScope={storageScope}>{children}</ReportConfigProvider>
            </SalesDataProvider>
          </ManufacturingDataProvider>
        </StockDataProvider>
      </PurchaseDataProvider>
    </MasterDataProvider>
  );
}

function Shell() {
  const { session } = useAuth();
  const isSpecialAdmin = isSpecialAdminSession(session);
  const companyScope = session?.user?.tenantId || session?.user?.company?._id || session?.user?.id;

  return (
    <div className="min-h-screen">
      <Topbar />
      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        <div className="route-transition">
          {isSpecialAdmin ? (
            <SpecialAdminDataProvider token={session?.token}>
              <Routes>
                <Route path="/dashboard" element={<SpecialAdminDashboard />} />
                <Route path="/company" element={<SpecialAdminCompany />} />
                <Route path="/payment" element={<SpecialAdminPayment />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </SpecialAdminDataProvider>
          ) : (
            <BusinessDataProviders storageScope={companyScope}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<EditProfile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/billing" element={<Billing />} />
            <Route path="/master-management" element={<MasterManagementHome />} />
            <Route path="/master-management/:entity" element={<MasterManagementListPage />} />
            <Route path="/master-management/:entity/new" element={<MasterManagementFormPage mode="create" />} />
            <Route path="/master-management/:entity/:id/edit" element={<MasterManagementFormPage mode="edit" />} />
            <Route path="/master-management/:entity/:id/view" element={<MasterManagementFormPage mode="view" />} />
            <Route path="/purchase-management" element={<PurchaseManagementDashboard />} />
            <Route path="/purchase-management/:entity" element={<PurchaseManagementListPage />} />
            <Route path="/purchase-management/:entity/new" element={<PurchaseManagementFormPage mode="create" />} />
            <Route path="/purchase-management/:entity/:id/edit" element={<PurchaseManagementFormPage mode="edit" />} />
            <Route path="/purchase-management/:entity/:id/view" element={<PurchaseManagementFormPage mode="view" />} />
            <Route path="/stock-management" element={<StockManagementDashboard />} />
            <Route path="/stock-management/movements" element={<StockMovementHistory />} />
            <Route path="/stock-management/reports" element={<StockReports />} />
            <Route path="/stock-management/item/:code" element={<StockItemDetail />} />
            <Route path="/stock-management/batch-lot-tracking" element={<BatchLotTracking />} />
            <Route path="/stock-management/batch-lot-tracking/:batchId" element={<BatchDetail />} />
            <Route path="/stock-management/:entity" element={<StockManagementListPage />} />
            <Route path="/stock-management/:entity/new" element={<StockManagementFormPage mode="create" />} />
            <Route path="/stock-management/:entity/:id/edit" element={<StockManagementFormPage mode="edit" />} />
            <Route path="/stock-management/:entity/:id/view" element={<StockManagementFormPage mode="view" />} />
            <Route path="/inventory-reports" element={<InventoryReports />} />
            <Route path="/inventory-reports/:reportSlug" element={<InventoryReports />} />

            <Route path="/manufacturing-sales-reports" element={<ManufacturingSalesReports />} />
            <Route path="/manufacturing-sales-reports/:reportSlug" element={<ManufacturingSalesReports />} />

            <Route path="/manufacturing" element={<Navigate to="/manufacturing/manufacturing-dashboard" replace />} />
            <Route path="/manufacturing/manufacturing-dashboard" element={<ManufacturingDashboard />} />

            <Route path="/manufacturing/product-finished-goods" element={<ManufacturingListPage entityKey="product-finished-goods" />} />
            <Route path="/manufacturing/product-finished-goods/new" element={<ManufacturingFormPage entityKey="product-finished-goods" mode="create" />} />
            <Route path="/manufacturing/product-finished-goods/:id/edit" element={<ManufacturingFormPage entityKey="product-finished-goods" mode="edit" />} />
            <Route path="/manufacturing/product-finished-goods/:id/view" element={<ManufacturingFormPage entityKey="product-finished-goods" mode="view" />} />

            <Route path="/manufacturing/bill-of-materials-bom" element={<ManufacturingListPage entityKey="bill-of-materials-bom" />} />
            <Route path="/manufacturing/bill-of-materials-bom/new" element={<BomFormPage mode="create" />} />
            <Route path="/manufacturing/bill-of-materials-bom/:id/edit" element={<BomFormPage mode="edit" />} />
            <Route path="/manufacturing/bill-of-materials-bom/:id/view" element={<BomFormPage mode="view" />} />

            <Route path="/manufacturing/production-planning" element={<ManufacturingListPage entityKey="production-planning" />} />
            <Route path="/manufacturing/production-planning/new" element={<ManufacturingFormPage entityKey="production-planning" mode="create" />} />
            <Route path="/manufacturing/production-planning/:id/edit" element={<ManufacturingFormPage entityKey="production-planning" mode="edit" />} />
            <Route path="/manufacturing/production-planning/:id/view" element={<ManufacturingFormPage entityKey="production-planning" mode="view" />} />

            <Route path="/manufacturing/work-order" element={<ManufacturingListPage entityKey="work-order" />} />
            <Route path="/manufacturing/work-order/new" element={<WorkOrderFormPage mode="create" />} />
            <Route path="/manufacturing/work-order/:id/edit" element={<WorkOrderFormPage mode="edit" />} />
            <Route path="/manufacturing/work-order/:id/view" element={<WorkOrderFormPage mode="view" />} />

            <Route path="/manufacturing/material-issue" element={<ManufacturingListPage entityKey="material-issue" />} />
            <Route path="/manufacturing/material-issue/new" element={<ManufacturingFormPage entityKey="material-issue" mode="create" />} />
            <Route path="/manufacturing/material-issue/:id/edit" element={<ManufacturingFormPage entityKey="material-issue" mode="edit" />} />
            <Route path="/manufacturing/material-issue/:id/view" element={<ManufacturingFormPage entityKey="material-issue" mode="view" />} />

            <Route path="/manufacturing/production-process" element={<ManufacturingListPage entityKey="production-process" />} />
            <Route path="/manufacturing/production-process/new" element={<ManufacturingFormPage entityKey="production-process" mode="create" />} />
            <Route path="/manufacturing/production-process/:id/edit" element={<ManufacturingFormPage entityKey="production-process" mode="edit" />} />
            <Route path="/manufacturing/production-process/:id/view" element={<ManufacturingFormPage entityKey="production-process" mode="view" />} />

            <Route path="/manufacturing/material-consumption" element={<ManufacturingListPage entityKey="material-consumption" />} />
            <Route path="/manufacturing/material-consumption/new" element={<ManufacturingFormPage entityKey="material-consumption" mode="create" />} />
            <Route path="/manufacturing/material-consumption/:id/edit" element={<ManufacturingFormPage entityKey="material-consumption" mode="edit" />} />
            <Route path="/manufacturing/material-consumption/:id/view" element={<ManufacturingFormPage entityKey="material-consumption" mode="view" />} />

            <Route path="/manufacturing/wip-management" element={<WipManagement />} />

            <Route path="/manufacturing/finished-goods" element={<ManufacturingListPage entityKey="finished-goods" />} />
            <Route path="/manufacturing/finished-goods/new" element={<ManufacturingFormPage entityKey="finished-goods" mode="create" />} />
            <Route path="/manufacturing/finished-goods/:id/edit" element={<ManufacturingFormPage entityKey="finished-goods" mode="edit" />} />
            <Route path="/manufacturing/finished-goods/:id/view" element={<ManufacturingFormPage entityKey="finished-goods" mode="view" />} />

            <Route path="/manufacturing/scrap-wastage" element={<ManufacturingListPage entityKey="scrap-wastage" />} />
            <Route path="/manufacturing/scrap-wastage/new" element={<ManufacturingFormPage entityKey="scrap-wastage" mode="create" />} />
            <Route path="/manufacturing/scrap-wastage/:id/edit" element={<ManufacturingFormPage entityKey="scrap-wastage" mode="edit" />} />
            <Route path="/manufacturing/scrap-wastage/:id/view" element={<ManufacturingFormPage entityKey="scrap-wastage" mode="view" />} />

            <Route path="/sales/customer-management" element={<SalesListPage entityKey="customer-management" />} />
            <Route path="/sales/customer-management/new" element={<CustomerProfilePage mode="create" />} />
            <Route path="/sales/customer-management/:id/edit" element={<CustomerProfilePage mode="edit" />} />
            <Route path="/sales/customer-management/:id/view" element={<CustomerProfilePage mode="view" />} />

            <Route path="/sales/sales-order" element={<SalesListPage entityKey="sales-order" />} />
            <Route path="/sales/sales-order/new" element={<SalesFormPage entityKey="sales-order" mode="create" />} />
            <Route path="/sales/sales-order/:id/edit" element={<SalesFormPage entityKey="sales-order" mode="edit" />} />
            <Route path="/sales/sales-order/:id/view" element={<SalesFormPage entityKey="sales-order" mode="view" />} />

            <Route path="/sales/product-allocation" element={<SalesListPage entityKey="product-allocation" />} />
            <Route path="/sales/product-allocation/new" element={<SalesFormPage entityKey="product-allocation" mode="create" />} />
            <Route path="/sales/product-allocation/:id/edit" element={<SalesFormPage entityKey="product-allocation" mode="edit" />} />
            <Route path="/sales/product-allocation/:id/view" element={<SalesFormPage entityKey="product-allocation" mode="view" />} />

            <Route path="/sales/delivery-dispatch" element={<SalesListPage entityKey="delivery-dispatch" />} />
            <Route path="/sales/delivery-dispatch/new" element={<SalesFormPage entityKey="delivery-dispatch" mode="create" />} />
            <Route path="/sales/delivery-dispatch/:id/edit" element={<SalesFormPage entityKey="delivery-dispatch" mode="edit" />} />
            <Route path="/sales/delivery-dispatch/:id/view" element={<SalesFormPage entityKey="delivery-dispatch" mode="view" />} />

            <Route path="/sales/sales-invoice" element={<SalesListPage entityKey="sales-invoice" />} />
            <Route path="/sales/sales-invoice/new" element={<SalesFormPage entityKey="sales-invoice" mode="create" />} />
            <Route path="/sales/sales-invoice/:id/edit" element={<SalesFormPage entityKey="sales-invoice" mode="edit" />} />
            <Route path="/sales/sales-invoice/:id/view" element={<SalesFormPage entityKey="sales-invoice" mode="view" />} />

            <Route path="/sales/sales-return" element={<SalesListPage entityKey="sales-return" />} />
            <Route path="/sales/sales-return/new" element={<SalesFormPage entityKey="sales-return" mode="create" />} />
            <Route path="/sales/sales-return/:id/edit" element={<SalesFormPage entityKey="sales-return" mode="edit" />} />
            <Route path="/sales/sales-return/:id/view" element={<SalesFormPage entityKey="sales-return" mode="view" />} />

            <Route path="/:sectionSlug/:itemSlug" element={<Placeholder />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BusinessDataProviders>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Shell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
