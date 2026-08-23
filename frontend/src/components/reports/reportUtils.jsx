import { useMemo } from "react";
import { useMasterData } from "../master/MasterDataContext.jsx";
import { useStockData } from "../stock/StockDataContext.jsx";

export const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const number = new Intl.NumberFormat("en-IN");

export const categoryPalette = ["#2563eb", "#0f2a43", "#0ea5e9", "#d97706", "#94a3b8", "#16a34a", "#7c3aed", "#db2777"];

/**
 * Merges Master Management's Product / Item and Raw Material rows into one
 * flat inventory list, resolving raw-material quantities against the live
 * StockDataContext ledger so "current stock" always matches Stock Management.
 */
export function useInventoryItems() {
  const masterData = useMasterData();
  const stockData = useStockData();

  const products = masterData.getRows("product-item");
  const materials = masterData.getRows("raw-material");

  return useMemo(() => {
    const productItems = products.map((row) => ({
      code: row.code,
      name: row.name,
      type: "Product",
      category: row.category,
      unit: row.unit,
      stock: Number(row.stock) || 0,
      price: Number(row.price) || 0,
      status: row.status,
    }));

    const materialItems = materials.map((row) => ({
      code: row.code,
      name: row.name,
      type: "Raw Material",
      category: row.category,
      unit: row.unit,
      stock: stockData.getTotalStock(row.code),
      price: Number(row.price) || 0,
      status: row.status,
    }));

    return [...productItems, ...materialItems].map((item) => ({ ...item, value: item.stock * item.price }));
  }, [products, materials, stockData]);
}

export function groupByCategory(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = item.category || "Uncategorized";
    const entry = map.get(key) || { category: key, qty: 0, value: 0, count: 0 };
    entry.qty += item.stock;
    entry.value += item.value;
    entry.count += 1;
    map.set(key, entry);
  });
  return [...map.values()].sort((a, b) => b.value - a.value);
}

export function ReportHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[var(--primary)]">
              <Icon size={16} />
            </span>
          )}
          <h2 className="text-xl font-semibold text-[var(--ink)]">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
