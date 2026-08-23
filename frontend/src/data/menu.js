function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Sub-items that already have a real page in this build keep their existing route
// instead of a generated placeholder path. Master Management's, Purchase
// Management's, Stock Management's, Manufacturing's and Sales's own children
// are generated below (they resolve to /master-management/<slug>,
// /purchase-management/<slug>, /stock-management/<slug>, /manufacturing/<slug>
// and /sales/<slug>, which those modules own — see data/masterManagement.js,
// data/purchaseManagement.js, data/stockManagement.js, data/manufacturing/ and
// data/sales/).
const existingRoutes = {};

const rawSections = [
  { label: "Dashboard", to: "/dashboard" },
  {
    label: "Master Management",
    children: ["Product / Item", "Raw Material", "Category", "Unit", "Supplier", "Warehouse", "Stock Location"],
  },
  {
    label: "Purchase Management",
    children: ["Purchase Request", "Purchase Order", "Goods Receipt", "Purchase Return"],
  },
  {
    label: "Stock Management",
    children: ["Stock In", "Stock Out", "Stock Transfer", "Stock Adjustment", "Stock Count", "Batch / Lot Tracking"],
  },
  {
    label: "Manufacturing",
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
    children: ["Customer Management", "Sales Order", "Product Allocation", "Delivery / Dispatch", "Sales Invoice", "Sales Return"],
  },
  {
    label: "Inventory Reports",
    children: ["Current Stock", "Low Stock", "Stock Movement", "Purchase Report", "Stock Valuation"],
  },
  {
    label: "Manufacturing & Sales Reports",
    children: [
      "Production Report",
      "Material Consumption Report",
      "WIP Report",
      "Finished Goods Report",
      "Sales Report",
      "Dispatch Report",
      "Sales Return Report",
    ],
  },
];

export const menu = rawSections.map((section) => {
  if (!section.children) return section;

  const sectionSlug = slugify(section.label);
  return {
    ...section,
    children: section.children.map((label) => ({
      label,
      to: existingRoutes[label] || `/${sectionSlug}/${slugify(label)}`,
    })),
  };
});

export const placeholderLookup = new Map();
menu.forEach((section) => {
  if (["Master Management", "Purchase Management", "Stock Management", "Inventory Reports", "Manufacturing", "Sales", "Manufacturing & Sales Reports"].includes(section.label)) return; // owned by their own modules, not the generic Placeholder page
  section.children?.forEach((child) => {
    if (!Object.values(existingRoutes).includes(child.to)) {
      placeholderLookup.set(child.to, { section: section.label, title: child.label });
    }
  });
});
