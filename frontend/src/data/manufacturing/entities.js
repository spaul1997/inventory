import { productFinishedGoodsEntity } from "./products.js";
import { bomEntity } from "./bom.js";
import { productionPlanningEntity } from "./planning.js";
import { workOrderEntity } from "./workOrders.js";
import { materialIssueEntity } from "./materialIssue.js";
import { productionProcessEntity } from "./productionProcess.js";
import { materialConsumptionEntity } from "./materialConsumption.js";
import { finishedGoodsEntity } from "./finishedGoods.js";
import { scrapEntity } from "./scrap.js";

// Keyed by exact route slug (matches menu.js's slugify() output) so the
// generic list/form pages can look themselves up straight from useParams-free
// fixed routes in App.jsx.
export const manufacturingEntities = {
  "product-finished-goods": productFinishedGoodsEntity,
  "bill-of-materials-bom": bomEntity,
  "production-planning": productionPlanningEntity,
  "work-order": workOrderEntity,
  "material-issue": materialIssueEntity,
  "production-process": productionProcessEntity,
  "material-consumption": materialConsumptionEntity,
  "finished-goods": finishedGoodsEntity,
  "scrap-wastage": scrapEntity,
};

// Entities rendered by the generic ManufacturingList/ManufacturingForm pair.
// BOM and Work Order are bespoke (BomForm.jsx / WorkOrderForm.jsx) — they use
// ManufacturingList for their list page (list config is generic-shaped) but
// never ManufacturingForm.
export const genericFormEntityKeys = [
  "product-finished-goods",
  "production-planning",
  "material-issue",
  "production-process",
  "material-consumption",
  "finished-goods",
  "scrap-wastage",
];

export const manufacturingNav = [
  { to: "/manufacturing/manufacturing-dashboard", label: "Manufacturing Dashboard", icon: "LayoutDashboard" },
  { to: "/manufacturing/product-finished-goods", label: "Product / Finished Goods", icon: "PackageSearch" },
  { to: "/manufacturing/bill-of-materials-bom", label: "Bill of Materials (BOM)", icon: "ListTree" },
  { to: "/manufacturing/production-planning", label: "Production Planning", icon: "CalendarRange" },
  { to: "/manufacturing/work-order", label: "Work Order", icon: "ClipboardList" },
  { to: "/manufacturing/material-issue", label: "Material Issue", icon: "PackageMinus" },
  { to: "/manufacturing/production-process", label: "Production Process", icon: "Workflow" },
  { to: "/manufacturing/material-consumption", label: "Material Consumption", icon: "PackageCheck" },
  { to: "/manufacturing/wip-management", label: "WIP Management", icon: "Boxes" },
  { to: "/manufacturing/finished-goods", label: "Finished Goods", icon: "PackagePlus" },
  { to: "/manufacturing/scrap-wastage", label: "Scrap / Wastage", icon: "Trash2" },
];
