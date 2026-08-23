import React from "react";
import { useParams } from "react-router-dom";
import { SalesSidebar } from "../components/sales/SalesSidebar.jsx";
import { SalesList } from "../components/sales/SalesList.jsx";
import { SalesForm } from "../components/sales/SalesForm.jsx";
import { CustomerProfile } from "../components/sales/CustomerProfile.jsx";

function SalesLayout({ children }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <SalesSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function SalesListPage({ entityKey }) {
  return (
    <SalesLayout>
      <SalesList entityKey={entityKey} />
    </SalesLayout>
  );
}

export function SalesFormPage({ entityKey, mode }) {
  const { id } = useParams();
  return (
    <SalesLayout>
      <SalesForm entityKey={entityKey} mode={mode} recordId={id} />
    </SalesLayout>
  );
}

export function CustomerProfilePage({ mode }) {
  const { id } = useParams();
  return (
    <SalesLayout>
      <CustomerProfile mode={mode} recordId={id} />
    </SalesLayout>
  );
}
