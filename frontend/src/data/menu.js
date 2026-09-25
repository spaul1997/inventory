function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Sub-items that already have a real page in this build keep their existing route
// instead of a generated placeholder path. Master Setup's, Purchase
// Management's, Stock Management's, Manufacturing's and Sales's own children
// are generated below (they resolve to /master-management/<slug>,
// /purchase-management/<slug>, /stock-management/<slug>, /manufacturing/<slug>
// and /sales/<slug>, which those modules own — see data/masterManagement.js,
// data/purchaseManagement.js, data/stockManagement.js, data/manufacturing/ and
// data/sales/).
const existingRoutes = {};

export const companyModuleKeys = ["purchase", "sales", "manufacturing"];

export function normalizeEnabledModules(value) {
  if (!Array.isArray(value)) return [...companyModuleKeys];
  return [...new Set(value)].filter((moduleKey) => companyModuleKeys.includes(moduleKey));
}

export function hasCompanyModule(value, moduleKey) {
  return normalizeEnabledModules(value).includes(moduleKey);
}

export function hasPermission(value, permission) {
  if (!permission) return true;
  const permissions = Array.isArray(value) ? value : [];
  return permissions.includes("*") || permissions.includes(permission);
}

const rawSections = [
  { label: "Dashboard", to: "/dashboard" },
  {
    label: "Purchase Management",
    module: "purchase",
    children: ["Purchase Request", "Purchase Order", "Goods Receipt", "Purchase Issue", "Purchase Return"],
  },
  {
    label: "Stock Management",
    children: ["Stock Transfer", "Stock Adjustment", "Stock Count", "Batch / Lot Tracking"],
  },
  {
    label: "Manufacturing",
    module: "manufacturing",
    children: [
      "Manufacturing Dashboard",
      "Product / Finished Goods",
      "Bill of Materials (BOM)",
      "Production Planning",
      "Work Order",
      "Material Issue",
      "Production Process",
      "Material Consumption",
      "WIP Management",
      "Finished Goods",
      "Scrap / Wastage",
    ],
  },
  {
    label: "Sales",
    module: "sales",
    children: ["Customer Management", "Sales Order", "Product Allocation", "Delivery / Dispatch", "Sales Invoice", "Sales Return"],
  },
  {
    label: "Inventory Reports",
    children: [
      "Current Stock",
      "Low Stock",
      "Stock Movement",
      { label: "Purchase Report", module: "purchase" },
      "Stock Valuation",
    ],
  },
  {
    label: "Manufacturing & Sales Reports",
    children: [
      { label: "Production Report", module: "manufacturing" },
      { label: "Material Consumption Report", module: "manufacturing" },
      { label: "WIP Report", module: "manufacturing" },
      { label: "Finished Goods Report", module: "manufacturing" },
      { label: "Sales Report", module: "sales" },
      { label: "Dispatch Report", module: "sales" },
      { label: "Sales Return Report", module: "sales" },
    ],
  },
  {
    label: "Master Setup",
    slug: "master-management",
    children: [
      "Product / Item",
      "Category",
      "Unit",
      "Supplier",
      "Department",
      "Warehouse",
      "Warehouse Type",
      "Stock Location",
      "Location Type",
      { label: "Users", permission: "access.manage" },
      { label: "Roles", permission: "access.manage" },
    ],
  },
];

export const menu = rawSections.map((section) => {
  if (!section.children) return section;

  const sectionSlug = section.slug || slugify(section.label);
  return {
    ...section,
    children: section.children.map((child) => {
      const item = typeof child === "string" ? { label: child } : child;
      return {
        ...item,
        to: existingRoutes[item.label] || `/${sectionSlug}/${slugify(item.label)}`,
      };
    }),
  };
});

export function menuForModules(value, permissions = []) {
  const enabled = new Set(normalizeEnabledModules(value));
  return menu
    .filter((section) => !section.module || enabled.has(section.module))
    .map((section) => {
      if (!section.children) return section;
      return {
        ...section,
        children: section.children.filter((child) =>
          (!child.module || enabled.has(child.module)) && hasPermission(permissions, child.permission)
        ),
      };
    })
    .filter((section) => !section.children || section.children.length > 0);
}

export const placeholderLookup = new Map();
menu.forEach((section) => {
  if (["Master Setup", "Purchase Management", "Stock Management", "Inventory Reports", "Manufacturing", "Sales", "Manufacturing & Sales Reports"].includes(section.label)) return; // owned by their own modules, not the generic Placeholder page
  section.children?.forEach((child) => {
    if (!Object.values(existingRoutes).includes(child.to)) {
      placeholderLookup.set(child.to, { section: section.label, title: child.label });
    }
  });
});
