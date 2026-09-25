import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Boxes, Building2, MapPin, Package, Ruler, ShieldCheck, Tags, Truck, UserRoundCog, Warehouse } from "lucide-react";
import { masterEntities, masterEntityOrder } from "../data/masterManagement.js";
import { MasterSidebar } from "../components/master/MasterSidebar.jsx";
import { useMasterData } from "../components/master/MasterDataContext.jsx";
import { MasterList } from "../components/master/MasterList.jsx";
import { MasterForm } from "../components/master/MasterForm.jsx";
import { AccessManagement } from "../components/master/AccessManagement.jsx";
import { hasPermission } from "../data/menu.js";
import { useAuth } from "../stores/AuthStore.jsx";

const icons = { Package, Boxes, Tags, Ruler, Truck, Warehouse, MapPin, Building2 };
const accessSections = [
  { key: "users", label: "Users", description: "Create company login accounts and assign roles.", icon: UserRoundCog },
  { key: "roles", label: "Roles", description: "Define roles and application permissions.", icon: ShieldCheck },
];

function MasterLayout({ children }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <MasterSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function MasterManagementHome() {
  const { getRows } = useMasterData();
  const { session } = useAuth();
  const canManageAccess = hasPermission(session?.user?.permissions, "access.manage");

  return (
    <MasterLayout>
      <div>
        <h2 className="text-xl font-semibold text-[var(--ink)]">Master Setup</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage products, materials, suppliers, warehouses and inventory configuration.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {masterEntityOrder.map((key) => {
            const entity = masterEntities[key];
            const Icon = icons[entity.icon] || Package;
            const rows = getRows(key);
            return (
              <div key={key} className="flex flex-col rounded-md border border-[var(--line)] bg-white p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-[var(--primary)]">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--ink)]">{entity.label}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{entity.description}</p>
                <p className="mt-3 text-2xl font-semibold text-[var(--ink)]">
                  {rows.length}
                  <span className="ml-1.5 text-sm font-normal text-[var(--muted)]">{entity.statLabel}</span>
                </p>
                <Link
                  to={`/master-management/${key}`}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-md bg-[var(--primary)] py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]"
                >
                  Manage
                  <ArrowRight size={15} />
                </Link>
              </div>
            );
          })}
          {canManageAccess && accessSections.map(({ key, label, description, icon: Icon }) => (
            <div key={key} className="flex flex-col rounded-md border border-[var(--line)] bg-white p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-[var(--primary)]">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--ink)]">{label}</h3>
              <p className="mt-1 flex-1 text-sm text-[var(--muted)]">{description}</p>
              <Link to={`/master-management/${key}`} className="mt-4 flex items-center justify-center gap-1.5 rounded-md bg-[var(--primary)] py-2 text-sm font-semibold text-white hover:bg-[var(--primary-deep)]">
                Manage <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </MasterLayout>
  );
}

export function MasterManagementListPage() {
  const { entity } = useParams();
  if (!masterEntities[entity]) return <Navigate to="/master-management" replace />;
  return (
    <MasterLayout>
      <MasterList entityKey={entity} />
    </MasterLayout>
  );
}

export function MasterManagementFormPage({ mode }) {
  const { entity, id } = useParams();
  if (!masterEntities[entity]) return <Navigate to="/master-management" replace />;
  return (
    <MasterLayout>
      <MasterForm entityKey={entity} mode={mode} recordId={id} />
    </MasterLayout>
  );
}

export function MasterAccessManagementPage({ section }) {
  return (
    <MasterLayout>
      <AccessManagement section={section} />
    </MasterLayout>
  );
}
