import { useMemo } from "react";
import { useManufacturingData } from "./ManufacturingDataContext.jsx";
import { computeBomCosting } from "../../data/manufacturing/bom.js";

const ACTIVE_WIP_STATUSES = ["Released", "In Progress", "On Hold", "Partially Completed"];

export function getRequiredMaterials(workOrder, bom) {
  if (!bom || !workOrder) return [];
  const plannedQty = Number(workOrder.plannedQty) || 0;
  return (bom.materialLines || []).map((line) => ({
    ...line,
    requiredQty: (Number(line.qtyPerUnit) || 0) * plannedQty,
  }));
}

function daysBetween(fromDate, toDate = new Date()) {
  if (!fromDate) return 0;
  const from = new Date(fromDate);
  const diffMs = toDate.getTime() - from.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

function agingBucket(days) {
  if (days <= 7) return "0-7 days";
  if (days <= 14) return "8-14 days";
  if (days <= 30) return "15-30 days";
  return "30+ days";
}

/** Actual cost accrued so far against a work order, per the Cost Summary formula. */
export function computeActualCost(workOrder, manufacturingData) {
  const bom = manufacturingData.getBom(workOrder.bomId);
  const issues = manufacturingData.getRows("material-issue").filter((mi) => mi.workOrder === workOrder.id && mi.status === "Issued");
  const materialCost = issues.reduce((sum, mi) => sum + mi.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0), 0);

  const processEntries = manufacturingData.getRows("production-process").filter((p) => p.workOrder === workOrder.id);
  const laborMachineCost = processEntries.reduce((sum, entry) => {
    const op = (bom?.operationLines || []).find((o) => o.operationName === entry.operationName);
    const rate = op ? (Number(op.laborRatePerHour) || 0) + (Number(op.machineRatePerHour) || 0) : 0;
    const hours = (Number(entry.runningTimeMins) || 0) / 60;
    return sum + hours * rate;
  }, 0);

  const overheadCost = bom ? ((materialCost + laborMachineCost) * (Number(bom.overheadPercent) || 0)) / 100 : 0;

  const scrapEntries = manufacturingData.getRows("scrap-wastage").filter((s) => s.workOrder === workOrder.id);
  const scrapCost = scrapEntries.reduce((sum, s) => sum + s.items.reduce((x, i) => x + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0), 0);

  const actualTotalCost = materialCost + laborMachineCost + overheadCost + scrapCost;
  const standardCost = bom ? computeBomCosting(bom).costPerUnit * (Number(workOrder.plannedQty) || 0) : 0;

  return { materialCost, laborMachineCost, overheadCost, scrapCost, actualTotalCost, standardCost, variance: actualTotalCost - standardCost };
}

/**
 * WIP is fully derived, not its own CRUD store — one row per active work
 * order, computed from linked Material Issue / Production Process / Finished
 * Goods / Scrap records. Mirrors reportUtils.jsx's useInventoryItems()
 * precedent from Inventory Reports.
 */
export function useManufacturingWip() {
  const manufacturingData = useManufacturingData();
  const workOrders = manufacturingData.getRows("work-order");
  const materialIssues = manufacturingData.getRows("material-issue");
  const processEntries = manufacturingData.getRows("production-process");
  const finishedGoods = manufacturingData.getRows("finished-goods");
  const scrapRows = manufacturingData.getRows("scrap-wastage");

  return useMemo(() => {
    return workOrders
      .filter((wo) => ACTIVE_WIP_STATUSES.includes(wo.status))
      .map((wo) => {
        const bom = manufacturingData.getBom(wo.bomId);

        const materialIssuedValue = materialIssues
          .filter((mi) => mi.workOrder === wo.id && mi.status === "Issued")
          .reduce((sum, mi) => sum + mi.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0), 0);

        const processCostSoFar = processEntries
          .filter((p) => p.workOrder === wo.id)
          .reduce((sum, entry) => {
            const op = (bom?.operationLines || []).find((o) => o.operationName === entry.operationName);
            const rate = op ? (Number(op.laborRatePerHour) || 0) + (Number(op.machineRatePerHour) || 0) : 0;
            const hours = (Number(entry.runningTimeMins) || 0) / 60;
            return sum + hours * rate;
          }, 0);

        const relatedFg = finishedGoods.filter((fg) => fg.workOrder === wo.id && fg.status === "Completed");
        const fgReceivedQty = relatedFg.reduce((sum, fg) => sum + fg.items.reduce((s, i) => s + (Number(i.qtyReceived) || 0), 0), 0);
        const fgReceivedValue = relatedFg.reduce((sum, fg) => sum + fg.items.reduce((s, i) => s + (Number(i.qtyReceived) || 0) * (Number(i.unitCost) || 0), 0), 0);

        const scrapQty = scrapRows
          .filter((s) => s.workOrder === wo.id)
          .reduce((sum, s) => sum + s.items.filter((i) => i.component === wo.product).reduce((x, i) => x + (Number(i.qty) || 0), 0), 0);

        const wipValue = Math.max(0, materialIssuedValue + processCostSoFar - fgReceivedValue);
        const wipQty = Math.max(0, (Number(wo.plannedQty) || 0) - fgReceivedQty - scrapQty);
        const days = daysBetween(wo.actualStart || wo.date);

        return {
          workOrder: wo.id,
          product: wo.productName,
          productionLine: wo.productionLine,
          status: wo.status,
          plannedQty: wo.plannedQty,
          fgReceivedQty,
          scrapQty,
          wipQty,
          materialIssuedValue,
          processCostSoFar,
          fgReceivedValue,
          wipValue,
          daysInWip: days,
          agingBucket: agingBucket(days),
          supervisor: wo.supervisor,
        };
      });
  }, [workOrders, materialIssues, processEntries, finishedGoods, scrapRows, manufacturingData]);
}
