import { customerEntity } from "./customers.js";
import { salesOrderEntity } from "./salesOrders.js";
import { allocationEntity } from "./allocations.js";
import { dispatchEntity } from "./dispatches.js";
import { invoiceEntity } from "./invoices.js";
import { returnEntity } from "./returns.js";

// Keyed by exact route slug (matches menu.js's slugify() output).
export const salesEntities = {
  "customer-management": customerEntity,
  "sales-order": salesOrderEntity,
  "product-allocation": allocationEntity,
  "delivery-dispatch": dispatchEntity,
  "sales-invoice": invoiceEntity,
  "sales-return": returnEntity,
};

// Rendered by the generic SalesForm engine (statusActions map + custom field
// types). Customer is the only bespoke one (CustomerProfile.jsx) — its tabs
// each query a different sibling entity by foreign key, which doesn't
// config-drive the way flat document forms do.
export const genericFormEntityKeys = ["sales-order", "product-allocation", "delivery-dispatch", "sales-invoice", "sales-return"];

export const salesNav = [
  { to: "/sales/customer-management", label: "Customer Management", icon: "Users" },
  { to: "/sales/sales-order", label: "Sales Order", icon: "FileText" },
  { to: "/sales/product-allocation", label: "Product Allocation", icon: "PackageCheck" },
  { to: "/sales/delivery-dispatch", label: "Delivery / Dispatch", icon: "Truck" },
  { to: "/sales/sales-invoice", label: "Sales Invoice", icon: "Receipt" },
  { to: "/sales/sales-return", label: "Sales Return", icon: "Undo2" },
];
