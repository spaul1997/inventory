import Product from "../models/Product.js";
import PurchaseManagementDocument from "../models/PurchaseManagementDocument.js";
import StockManagementState from "../models/StockManagementState.js";

const REPORT_KEYS = new Set([
  "current-stock",
  "low-stock",
  "stock-movement",
  "purchase-report",
  "stock-valuation",
]);

const normalize = (value) => String(value ?? "").trim();
const lower = (value) => normalize(value).toLowerCase();
const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const unique = (values) => [...new Set(values.map(normalize).filter(Boolean))].sort((a, b) => a.localeCompare(b));

function dateKey(value) {
  const text = normalize(value);
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const displayMatch = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (displayMatch) return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function matchesText(row, fields, search) {
  const query = lower(search);
  if (!query) return true;
  return fields.some((field) => lower(row[field]).includes(query));
}

function matchesChoice(value, selected) {
  return !normalize(selected) || lower(value) === lower(selected);
}

function matchesRange(value, min, max) {
  const numeric = numberValue(value);
  if (normalize(min) && numeric < numberValue(min)) return false;
  if (normalize(max) && numeric > numberValue(max)) return false;
  return true;
}

function matchesDateRange(value, from, to) {
  const key = dateKey(value);
  if (normalize(from) && (!key || key < dateKey(from))) return false;
  if (normalize(to) && (!key || key > dateKey(to))) return false;
  return true;
}

function stockStatus(product, stock) {
  if (stock <= 0) return "Out of Stock";
  const minimum = Math.max(
    numberValue(product.minStock),
    numberValue(product.minimumStock),
    numberValue(product.reorderLevel)
  );
  if ((minimum > 0 && stock <= minimum) || lower(product.status) === "low stock") return "Low Stock";
  if (lower(product.status) === "inactive") return "Inactive";
  if (lower(product.status) === "draft") return "Draft";
  return "Active";
}

function inventoryRows(products, state, selectedWarehouse = "") {
  const balances = state?.balances && typeof state.balances === "object" ? state.balances : {};
  const warehouseQuery = lower(selectedWarehouse);

  return products
    .map((product) => {
      const breakdown = balances[product.code] && typeof balances[product.code] === "object"
        ? balances[product.code]
        : {};
      const warehouseEntries = Object.entries(breakdown);
      const matchingWarehouse = warehouseEntries.find(([warehouse]) => lower(warehouse) === warehouseQuery);
      const hasWarehouse = Boolean(
        matchingWarehouse ||
        (!warehouseEntries.length && warehouseQuery && lower(product.defaultWarehouse) === warehouseQuery)
      );

      if (warehouseQuery && !hasWarehouse) return null;

      const stock = warehouseQuery
        ? numberValue(matchingWarehouse?.[1] ?? product.currentStock)
        : warehouseEntries.length
          ? warehouseEntries.reduce((sum, [, quantity]) => sum + numberValue(quantity), 0)
          : numberValue(product.currentStock);
      const price = numberValue(product.purchasePrice || product.standardCost || product.sellingPrice);
      const threshold = Math.max(
        numberValue(product.minStock),
        numberValue(product.minimumStock),
        numberValue(product.reorderLevel)
      );
      const warehouses = warehouseEntries.map(([warehouse]) => warehouse);

      return {
        code: normalize(product.code),
        name: normalize(product.name),
        type: normalize(product.productType) || "Item",
        category: normalize(product.category) || "Uncategorized",
        unit: normalize(product.baseUnit) || normalize(product.purchaseUnit) || "Unit",
        warehouse: normalize(selectedWarehouse) || warehouses.join(", ") || normalize(product.defaultWarehouse) || "Unassigned",
        warehouses,
        stock,
        minimumStock: threshold,
        price,
        value: stock * price,
        status: stockStatus(product, stock),
      };
    })
    .filter(Boolean);
}

function purchaseAmount(items) {
  return (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const quantity = numberValue(item.qty ?? item.quantity ?? item.orderQty ?? item.orderedQty);
    const price = numberValue(item.price ?? item.rate ?? item.unitPrice);
    const discount = numberValue(item.discount ?? item.discountPct);
    const tax = numberValue(item.tax ?? item.gst);
    const taxable = quantity * price * (1 - discount / 100);
    return sum + taxable * (1 + tax / 100);
  }, 0);
}

function applyInventoryFilters(rows, query) {
  return rows.filter((row) => {
    if (!matchesText(row, ["code", "name", "category", "warehouse"], query.search)) return false;
    if (!matchesChoice(row.category, query.category)) return false;
    if (!matchesChoice(row.type, query.itemType)) return false;
    if (!matchesChoice(row.status, query.status)) return false;
    if (!matchesRange(row.stock, query.minStock, query.maxStock)) return false;
    if (!matchesRange(row.value, query.minValue, query.maxValue)) return false;
    return true;
  });
}

function inventoryOptions(rows) {
  return {
    warehouses: unique(rows.flatMap((row) => row.warehouses?.length ? row.warehouses : [row.warehouse])),
    categories: unique(rows.map((row) => row.category)),
    itemTypes: unique(rows.map((row) => row.type)),
    statuses: unique(rows.map((row) => row.status)),
  };
}

function inventorySummary(rows) {
  const totalValue = rows.reduce((sum, row) => sum + numberValue(row.value), 0);
  return {
    totalItems: rows.length,
    totalStock: rows.reduce((sum, row) => sum + numberValue(row.stock), 0),
    totalValue,
    averageValue: rows.length ? totalValue / rows.length : 0,
    activeCount: rows.filter((row) => row.status === "Active").length,
    lowStockCount: rows.filter((row) => row.status === "Low Stock").length,
    outOfStockCount: rows.filter((row) => row.status === "Out of Stock").length,
    categoryCount: unique(rows.map((row) => row.category)).length,
  };
}

async function buildInventoryReport(reportKey, tenantId, query) {
  const [products, state] = await Promise.all([
    Product.find({ tenantId }).sort({ name: 1 }).lean(),
    StockManagementState.findOne({ tenantId }).lean(),
  ]);
  const allRows = inventoryRows(products, state);
  let rows = inventoryRows(products, state, query.warehouse);

  if (reportKey === "low-stock") {
    rows = rows.filter((row) => row.status === "Low Stock" || row.status === "Out of Stock");
  }
  if (reportKey === "stock-valuation") {
    rows = rows.filter((row) => row.stock > 0);
  }

  rows = applyInventoryFilters(rows, query).sort((left, right) => {
    if (reportKey === "low-stock") return left.stock - right.stock || left.name.localeCompare(right.name);
    return right.value - left.value || left.name.localeCompare(right.name);
  });

  return {
    rows,
    summary: inventorySummary(rows),
    options: inventoryOptions(allRows),
  };
}

async function buildMovementReport(tenantId, query) {
  const [products, state] = await Promise.all([
    Product.find({ tenantId }).select("code name productType category baseUnit").lean(),
    StockManagementState.findOne({ tenantId }).lean(),
  ]);
  const productMap = new Map(products.map((product) => [product.code, product]));
  const allRows = (Array.isArray(state?.movements) ? state.movements : []).map((movement, index) => {
    const product = productMap.get(movement.item) || {};
    return {
      id: normalize(movement.id) || `MOV-${index + 1}`,
      date: normalize(movement.date),
      type: normalize(movement.type) || "Movement",
      itemCode: normalize(movement.item),
      itemName: normalize(product.name) || normalize(movement.item),
      itemType: normalize(product.productType) || "Item",
      category: normalize(product.category) || "Uncategorized",
      unit: normalize(product.baseUnit),
      warehouse: normalize(movement.warehouse) || "Unassigned",
      batch: normalize(movement.batch),
      qtyIn: numberValue(movement.qtyIn),
      qtyOut: numberValue(movement.qtyOut),
      balance: numberValue(movement.balance),
      reference: normalize(movement.reference),
      user: normalize(movement.user),
    };
  });

  const rows = allRows
    .filter((row) => {
      if (!matchesText(row, ["itemCode", "itemName", "reference", "batch", "user"], query.search)) return false;
      if (!matchesChoice(row.type, query.movementType)) return false;
      if (!matchesChoice(row.warehouse, query.warehouse)) return false;
      if (!matchesChoice(row.category, query.category)) return false;
      if (!matchesChoice(row.itemType, query.itemType)) return false;
      if (!matchesDateRange(row.date, query.dateFrom, query.dateTo)) return false;
      if (!matchesRange(row.qtyIn + row.qtyOut, query.minQty, query.maxQty)) return false;
      return true;
    })
    .sort((left, right) => dateKey(right.date).localeCompare(dateKey(left.date)) || right.id.localeCompare(left.id));

  const totalIn = rows.reduce((sum, row) => sum + row.qtyIn, 0);
  const totalOut = rows.reduce((sum, row) => sum + row.qtyOut, 0);
  return {
    rows,
    summary: {
      totalMovements: rows.length,
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
    },
    options: {
      warehouses: unique(allRows.map((row) => row.warehouse)),
      categories: unique(allRows.map((row) => row.category)),
      itemTypes: unique(allRows.map((row) => row.itemType)),
      movementTypes: unique(allRows.map((row) => row.type)),
    },
  };
}

async function buildPurchaseReport(tenantId, query) {
  const documents = await PurchaseManagementDocument.find({ tenantId, entityKey: "purchase-order" })
    .sort({ documentDate: -1, createdAt: -1 })
    .lean();
  const allRows = documents.map((document) => {
    const data = document.data || {};
    const items = Array.isArray(data.items) ? data.items : [];
    return {
      id: normalize(document.documentId || data.id),
      supplier: normalize(data.supplier) || "Unassigned",
      date: normalize(data.date || document.documentDate),
      warehouse: normalize(data.warehouse) || "Unassigned",
      itemsCount: items.length,
      totalQty: items.reduce((sum, item) => sum + numberValue(item.qty ?? item.quantity ?? item.orderQty ?? item.orderedQty), 0),
      amount: purchaseAmount(items),
      status: normalize(document.status || data.status) || "Draft",
    };
  });

  const rows = allRows
    .filter((row) => {
      if (!matchesText(row, ["id", "supplier", "warehouse", "status"], query.search)) return false;
      if (!matchesChoice(row.supplier, query.supplier)) return false;
      if (!matchesChoice(row.warehouse, query.warehouse)) return false;
      if (!matchesChoice(row.status, query.status)) return false;
      if (!matchesDateRange(row.date, query.dateFrom, query.dateTo)) return false;
      if (!matchesRange(row.amount, query.minValue, query.maxValue)) return false;
      if (!matchesRange(row.totalQty, query.minQty, query.maxQty)) return false;
      return true;
    })
    .sort((left, right) => dateKey(right.date).localeCompare(dateKey(left.date)) || right.id.localeCompare(left.id));

  return {
    rows,
    summary: {
      totalOrders: rows.length,
      totalValue: rows.reduce((sum, row) => sum + row.amount, 0),
      pendingApproval: rows.filter((row) => lower(row.status).includes("pending")).length,
      received: rows.filter((row) => ["received", "fully received"].includes(lower(row.status))).length,
      supplierCount: unique(rows.map((row) => row.supplier)).length,
    },
    options: {
      suppliers: unique(allRows.map((row) => row.supplier)),
      warehouses: unique(allRows.map((row) => row.warehouse)),
      statuses: unique(allRows.map((row) => row.status)),
    },
  };
}

async function buildReport(reportKey, tenantId, query) {
  if (["current-stock", "low-stock", "stock-valuation"].includes(reportKey)) {
    return buildInventoryReport(reportKey, tenantId, query);
  }
  if (reportKey === "stock-movement") return buildMovementReport(tenantId, query);
  return buildPurchaseReport(tenantId, query);
}

const reportTitles = {
  "current-stock": "Current Stock Report",
  "low-stock": "Low Stock Report",
  "stock-movement": "Stock Movement Report",
  "purchase-report": "Purchase Report",
  "stock-valuation": "Stock Valuation Report",
};

const reportColumns = {
  "current-stock": [
    ["Code", "code", 13], ["Item", "name", 25], ["Type", "type", 18], ["Category", "category", 16],
    ["Warehouse", "warehouse", 18], ["Stock", "stock", 10], ["Unit Price", "price", 12], ["Value", "value", 14], ["Status", "status", 13],
  ],
  "low-stock": [
    ["Code", "code", 13], ["Item", "name", 27], ["Category", "category", 18], ["Warehouse", "warehouse", 20],
    ["Stock", "stock", 10], ["Min Stock", "minimumStock", 10], ["Value", "value", 14], ["Status", "status", 14],
  ],
  "stock-movement": [
    ["Date", "date", 12], ["Type", "type", 14], ["Item Code", "itemCode", 13], ["Item", "itemName", 24],
    ["Warehouse", "warehouse", 18], ["In", "qtyIn", 8], ["Out", "qtyOut", 8], ["Balance", "balance", 10], ["Reference", "reference", 16],
  ],
  "purchase-report": [
    ["PO Number", "id", 16], ["Supplier", "supplier", 26], ["Date", "date", 15], ["Warehouse", "warehouse", 22],
    ["Items", "itemsCount", 8], ["Quantity", "totalQty", 10], ["Value", "amount", 15], ["Status", "status", 16],
  ],
  "stock-valuation": [
    ["Code", "code", 13], ["Item", "name", 27], ["Category", "category", 18], ["Warehouse", "warehouse", 20],
    ["Quantity", "stock", 11], ["Unit Price", "price", 13], ["Total Value", "value", 15], ["Status", "status", 13],
  ],
};

const xmlEscape = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

function filterDescription(query) {
  const labels = {
    search: "Search", dateFrom: "From", dateTo: "To", warehouse: "Warehouse", category: "Category",
    itemType: "Item Type", movementType: "Movement Type", supplier: "Supplier", status: "Status",
    minStock: "Minimum Stock", maxStock: "Maximum Stock", minQty: "Minimum Quantity", maxQty: "Maximum Quantity",
    minValue: "Minimum Value", maxValue: "Maximum Value",
  };
  const applied = Object.entries(query)
    .filter(([key, value]) => key !== "format" && normalize(value))
    .map(([key, value]) => `${labels[key] || key}: ${normalize(value)}`);
  return applied.length ? applied.join(" | ") : "All records";
}

function excelBuffer(title, columns, rows, filters) {
  const header = columns.map(([label]) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(label)}</Data></Cell>`).join("");
  const body = rows.map((row) => `<Row>${columns.map(([, key]) => {
    const value = row[key] ?? "";
    const type = typeof value === "number" ? "Number" : "String";
    return `<Cell><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
  }).join("")}</Row>`).join("");
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="Default"><Alignment ss:Vertical="Bottom"/></Style><Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14"/></Style><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DCE6F1" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Report"><Table><Row><Cell ss:StyleID="Title"><Data ss:Type="String">${xmlEscape(title)}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Generated ${xmlEscape(new Date().toISOString())}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Filters: ${xmlEscape(filters)}</Data></Cell></Row><Row/>` +
    `<Row>${header}</Row>${body}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>5</SplitHorizontal><TopRowBottomPane>5</TopRowBottomPane></WorksheetOptions></Worksheet></Workbook>`;
  return Buffer.from(xml, "utf8");
}

const ascii = (value) => String(value ?? "")
  .replace(/₹/g, "INR ")
  .replace(/[–—]/g, "-")
  .normalize("NFKD")
  .replace(/[^\x20-\x7E]/g, "");
const pdfEscape = (value) => ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const fixedCell = (value, width) => {
  const text = ascii(value);
  return text.length > width ? `${text.slice(0, Math.max(0, width - 1))}~` : text.padEnd(width, " ");
};

function pdfBuffer(title, columns, rows, filters) {
  const headerLine = columns.map(([label, , width]) => fixedCell(label, width)).join(" ");
  const separator = columns.map(([, , width]) => "-".repeat(width)).join(" ");
  const rowLines = rows.map((row) => columns.map(([, key, width]) => fixedCell(row[key], width)).join(" "));
  const pageSize = 40;
  const pageRows = rowLines.length
    ? Array.from({ length: Math.ceil(rowLines.length / pageSize) }, (_, index) => rowLines.slice(index * pageSize, (index + 1) * pageSize))
    : [[]];
  const objects = [];
  const pageReferences = pageRows.map((_, index) => `${4 + index * 2} 0 R`).join(" ");
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageReferences}] /Count ${pageRows.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  pageRows.forEach((lines, index) => {
    const pageObject = 4 + index * 2;
    const contentObject = pageObject + 1;
    const pageLines = [
      title,
      `Generated: ${new Date().toLocaleString("en-IN")}    Page ${index + 1} of ${pageRows.length}`,
      `Filters: ${ascii(filters).slice(0, 180)}`,
      "",
      headerLine,
      separator,
      ...lines,
      ...(rows.length ? [] : ["No records match the selected filters."]),
    ];
    const commands = pageLines.map((line, lineIndex) => `${lineIndex ? "0 -11 Td\n" : ""}(${pdfEscape(line)}) Tj`).join("\n");
    const stream = `BT\n/F1 7 Tf\n22 570 Td\n${commands}\nET`;
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] = `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`;
  });

  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(output, "ascii");
    output += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(output, "ascii");
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(output, "ascii");
}

function validateReport(req, res) {
  const reportKey = normalize(req.params.reportKey);
  if (!REPORT_KEYS.has(reportKey)) {
    res.status(404).json({ message: "Inventory report not found." });
    return null;
  }
  return reportKey;
}

export async function getInventoryReport(req, res, next) {
  try {
    const reportKey = validateReport(req, res);
    if (!reportKey) return;
    const report = await buildReport(reportKey, req.auth.tenantId, req.query);
    return res.status(200).json({ ...report, generatedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
}

export async function exportInventoryReport(req, res, next) {
  try {
    const reportKey = validateReport(req, res);
    if (!reportKey) return;
    const format = lower(req.query.format);
    if (!["pdf", "excel"].includes(format)) {
      return res.status(400).json({ message: "Export format must be pdf or excel." });
    }

    const report = await buildReport(reportKey, req.auth.tenantId, req.query);
    const title = reportTitles[reportKey];
    const columns = reportColumns[reportKey];
    const date = new Date().toISOString().slice(0, 10);
    const extension = format === "pdf" ? "pdf" : "xls";
    const filters = filterDescription(req.query);
    const buffer = format === "pdf" ? pdfBuffer(title, columns, report.rows, filters) : excelBuffer(title, columns, report.rows, filters);

    res.setHeader("Content-Type", format === "pdf" ? "application/pdf" : "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${reportKey}-${date}.${extension}"`);
    res.setHeader("Content-Length", buffer.length);
    return res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
}
