import Category from "../models/Category.js";
import Department from "../models/Department.js";
import LocationType from "../models/LocationType.js";
import Product from "../models/Product.js";
import StockLocation from "../models/StockLocation.js";
import Store from "../models/Store.js";
import Unit from "../models/Unit.js";
import Vendor from "../models/Vendor.js";
import WarehouseType from "../models/WarehouseType.js";

const normalize = (value) => String(value ?? "").trim();
const normalizeUpper = (value) => normalize(value).toUpperCase();
const normalizeEmail = (value) => normalize(value).toLowerCase();
const DEFAULT_PRODUCT_TYPE = "Other / Miscellaneous";

const formatDuplicateError = (error) => {
  if (error?.code !== 11000) return null;

  const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "record";
  return `${field} already exists.`;
};

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const booleanValue = (value) => value === true || value === "true";

const generateMasterCode = async (Model, tenantId, prefix, width = 3, startAt = 1) => {
  const baseCount = await Model.countDocuments({ tenantId });

  for (let offset = 1; offset <= 1000; offset += 1) {
    const nextNumber = startAt + baseCount + offset - 1;
    const code = `${prefix}-${String(nextNumber).padStart(width, "0")}`;
    const exists = await Model.exists({ tenantId, code });
    if (!exists) return code;
  }

  throw new Error(`Unable to generate ${prefix} code.`);
};

const validateStockLocationWarehouse = async (tenantId, warehouse) => {
  if (!warehouse) return "";

  const warehouseValue = normalize(warehouse);
  const exists = await Store.exists({
    tenantId,
    status: { $ne: "Inactive" },
    $or: [
      { code: warehouseValue },
      { name: warehouseValue },
      { storeName: warehouseValue },
    ],
  });

  return exists ? "" : "Select a valid active warehouse from Warehouse master data.";
};

const productFields = [
  "shortName",
  "department",
  "category",
  "subCategory",
  "brand",
  "description",
  "modelNumber",
  "productSize",
  "color",
  "material",
  "grade",
  "specification",
  "hsnCode",
  "barcode",
  "baseUnit",
  "purchaseUnit",
  "salesUnit",
  "defaultBom",
  "defaultWarehouse",
  "defaultLocation",
  "storageType",
  "internalNotes",
  "remarks",
  "attachment",
];

const numericProductFields = [
  "weight",
  "length",
  "width",
  "thickness",
  "conversionFactor",
  "minStock",
  "maxStock",
  "reorderLevel",
  "safetyStock",
  "openingQty",
  "openingValue",
  "purchasePrice",
  "standardCost",
  "sellingPrice",
  "wholesalePrice",
  "gst",
  "discount",
  "leadTime",
  "productionCost",
];

const booleanProductFields = [
  "serialTracking",
  "batchTracking",
  "expiryTracking",
  "manufactured",
  "bomRequired",
  "qualityInspection",
];

const productItemNameExists = (tenantId, name, currentCode = "") => {
  const query = { tenantId, name: normalizeUpper(name) };
  if (currentCode) query.code = { $ne: currentCode };
  return Product.exists(query).collation({ locale: "en", strength: 2 });
};

const serializeProductItem = (product) => ({
  id: product.id,
  code: product.code,
  sku: product.sku || product.code,
  name: normalizeUpper(product.name),
  shortName: product.shortName || "",
  category: product.category || "",
  subCategory: product.subCategory || "",
  productType: product.productType || DEFAULT_PRODUCT_TYPE,
  department: product.department || "",
  brand: product.brand || "",
  description: product.description || "",
  modelNumber: product.modelNumber || "",
  productSize: product.productSize || "",
  color: product.color || "",
  material: product.material || "",
  grade: product.grade || "",
  weight: product.weight || 0,
  length: product.length || 0,
  width: product.width || 0,
  thickness: product.thickness || 0,
  specification: product.specification || "",
  hsnCode: product.hsnCode || "",
  barcode: product.barcode || "",
  serialTracking: Boolean(product.serialTracking),
  batchTracking: Boolean(product.batchTracking),
  expiryTracking: Boolean(product.expiryTracking),
  baseUnit: product.baseUnit || "",
  unit: product.baseUnit || "",
  purchaseUnit: product.purchaseUnit || "",
  salesUnit: product.salesUnit || "",
  conversionFactor: product.conversionFactor || 0,
  minStock: product.minStock || product.minimumStock || 0,
  maxStock: product.maxStock || 0,
  reorderLevel: product.reorderLevel || 0,
  safetyStock: product.safetyStock || 0,
  openingQty: product.openingQty || product.currentStock || 0,
  openingValue: product.openingValue || 0,
  stock: product.currentStock || product.openingQty || 0,
  purchasePrice: product.purchasePrice || 0,
  standardCost: product.standardCost || 0,
  sellingPrice: product.sellingPrice || 0,
  price: product.purchasePrice || product.standardCost || product.sellingPrice || 0,
  wholesalePrice: product.wholesalePrice || 0,
  gst: product.gst || product.taxRate || 0,
  discount: product.discount || 0,
  manufactured: Boolean(product.manufactured),
  defaultBom: product.defaultBom || "",
  leadTime: product.leadTime || 0,
  productionCost: product.productionCost || 0,
  bomRequired: Boolean(product.bomRequired),
  qualityInspection: Boolean(product.qualityInspection),
  defaultWarehouse: product.defaultWarehouse || "",
  warehouse: product.defaultWarehouse || "",
  defaultLocation: product.defaultLocation || "",
  storageType: product.storageType || "",
  internalNotes: product.internalNotes || "",
  remarks: product.remarks || "",
  attachment: product.attachment || "",
  status: product.status || "Active",
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const productItemPatch = (body) => {
  const patch = {};

  if (body.code !== undefined) {
    patch.code = normalize(body.code);
    patch.sku = patch.code;
  }
  if (body.name !== undefined) patch.name = normalizeUpper(body.name);
  if (body.productType !== undefined) patch.productType = normalize(body.productType) || DEFAULT_PRODUCT_TYPE;
  if (body.status !== undefined) patch.status = normalize(body.status) || "Active";

  productFields.forEach((field) => {
    if (body[field] !== undefined) patch[field] = normalize(body[field]);
  });
  numericProductFields.forEach((field) => {
    if (body[field] !== undefined) patch[field] = numberValue(body[field]);
  });
  booleanProductFields.forEach((field) => {
    if (body[field] !== undefined) patch[field] = booleanValue(body[field]);
  });

  if (patch.openingQty !== undefined) patch.currentStock = patch.openingQty;
  if (patch.minStock !== undefined) patch.minimumStock = patch.minStock;
  if (patch.gst !== undefined) patch.taxRate = patch.gst;

  return patch;
};

const serializeCategory = (category, itemCount = category.itemCount || 0) => ({
  id: category.id,
  code: category.code,
  name: category.name,
  parent: category.parent || "-",
  type: category.type,
  description: category.description || "",
  displayOrder: category.displayOrder || 0,
  itemCount,
  status: category.status || "Active",
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const categoryPatch = (body) => {
  const patch = {};

  if (body.code !== undefined) patch.code = normalize(body.code);
  if (body.name !== undefined) patch.name = normalize(body.name);
  if (body.parent !== undefined) patch.parent = normalize(body.parent) || "-";
  if (body.type !== undefined) patch.type = normalize(body.type);
  if (body.description !== undefined) patch.description = normalize(body.description);
  if (body.displayOrder !== undefined) patch.displayOrder = numberValue(body.displayOrder);
  if (body.itemCount !== undefined) patch.itemCount = numberValue(body.itemCount);
  if (body.status !== undefined) patch.status = normalize(body.status) || "Active";

  return patch;
};

const serializeUnit = (unit) => ({
  id: unit.id,
  code: unit.code,
  name: unit.name,
  symbol: unit.symbol || unit.shortName || "",
  shortName: unit.shortName || unit.symbol || "",
  type: unit.type || "",
  decimalPlaces: unit.decimalPlaces || 0,
  baseUnit: unit.baseUnit || "",
  conversionFactor: unit.conversionFactor || 0,
  description: unit.description || "",
  conversions: Array.isArray(unit.conversions) ? unit.conversions : [],
  isBase: !unit.baseUnit || unit.baseUnit === "-",
  status: unit.status || "Active",
  createdAt: unit.createdAt,
  updatedAt: unit.updatedAt,
});

const unitPatch = (body) => {
  const patch = {};

  if (body.code !== undefined) patch.code = normalize(body.code);
  if (body.name !== undefined) patch.name = normalize(body.name);
  if (body.symbol !== undefined) {
    patch.symbol = normalize(body.symbol);
    patch.shortName = patch.symbol;
  }
  if (body.type !== undefined) patch.type = normalize(body.type);
  if (body.baseUnit !== undefined) patch.baseUnit = normalize(body.baseUnit) === "-" ? "" : normalize(body.baseUnit);
  if (body.description !== undefined) patch.description = normalize(body.description);
  if (body.status !== undefined) patch.status = normalize(body.status) || "Active";
  if (body.decimalPlaces !== undefined) patch.decimalPlaces = numberValue(body.decimalPlaces);
  if (body.conversionFactor !== undefined) patch.conversionFactor = numberValue(body.conversionFactor);
  if (Array.isArray(body.conversions)) {
    patch.conversions = body.conversions.map((row) => ({
      from: normalize(row.from),
      to: normalize(row.to),
      factor: numberValue(row.factor),
    }));
  }

  return patch;
};

const vendorTextFields = [
  "category",
  "type",
  "website",
  "contact",
  "designation",
  "phone",
  "address",
  "gstNumber",
  "panNumber",
  "registrationNumber",
  "bankName",
  "accountNumber",
  "ifsc",
  "branchName",
  "accountHolder",
  "paymentTerms",
  "internalNotes",
  "attachment",
];

const serializeSupplier = (supplier) => ({
  id: supplier.id,
  code: supplier.code,
  name: supplier.name,
  category: supplier.category || "",
  type: supplier.type || "",
  website: supplier.website || "",
  contact: supplier.contact || "",
  designation: supplier.designation || "",
  phone: supplier.phone || "",
  email: supplier.email || "",
  address: supplier.address || "",
  gstNumber: supplier.gstNumber || "",
  panNumber: supplier.panNumber || "",
  registrationNumber: supplier.registrationNumber || "",
  bankName: supplier.bankName || "",
  accountNumber: supplier.accountNumber || "",
  ifsc: supplier.ifsc || "",
  branchName: supplier.branchName || "",
  accountHolder: supplier.accountHolder || "",
  paymentTerms: supplier.paymentTerms || "",
  leadTime: supplier.leadTime || 0,
  creditLimit: supplier.creditLimit || 0,
  openingBalance: supplier.openingBalance || 0,
  currentBalance: supplier.currentBalance || 0,
  rating: supplier.rating || 0,
  qualityRating: supplier.qualityRating || 0,
  deliveryRating: supplier.deliveryRating || 0,
  internalNotes: supplier.internalNotes || "",
  attachment: supplier.attachment || "",
  status: supplier.status || "Active",
  createdAt: supplier.createdAt,
  updatedAt: supplier.updatedAt,
});

const supplierPatch = (body) => {
  const patch = {};

  if (body.code !== undefined) patch.code = normalize(body.code);
  if (body.name !== undefined) patch.name = normalize(body.name);
  if (body.email !== undefined) patch.email = normalizeEmail(body.email);
  if (body.status !== undefined) patch.status = normalize(body.status) || "Active";
  vendorTextFields.forEach((field) => {
    if (body[field] !== undefined) patch[field] = normalize(body[field]);
  });
  ["leadTime", "creditLimit", "rating", "qualityRating", "deliveryRating"].forEach((field) => {
    if (body[field] !== undefined) patch[field] = numberValue(body[field]);
  });

  return patch;
};

const serializeWarehouseType = (warehouseType) => ({
  id: warehouseType.id,
  code: warehouseType.code,
  name: warehouseType.name,
  description: warehouseType.description || "",
  status: warehouseType.status || "Active",
  createdAt: warehouseType.createdAt,
  updatedAt: warehouseType.updatedAt,
});

const warehouseTypePatch = (body) => {
  const patch = {};

  if (body.code !== undefined) patch.code = normalize(body.code);
  if (body.name !== undefined) patch.name = normalize(body.name);
  if (body.description !== undefined) patch.description = normalize(body.description);
  if (body.status !== undefined) patch.status = normalize(body.status) || "Active";

  return patch;
};

const serializeLocationType = (locationType) => ({
  id: locationType.id,
  code: locationType.code,
  name: locationType.name,
  description: locationType.description || "",
  status: locationType.status || "Active",
  createdAt: locationType.createdAt,
  updatedAt: locationType.updatedAt,
});

const locationTypePatch = (body) => {
  const patch = {};

  if (body.code !== undefined) patch.code = normalize(body.code);
  if (body.name !== undefined) patch.name = normalize(body.name);
  if (body.description !== undefined) patch.description = normalize(body.description);
  if (body.status !== undefined) patch.status = normalize(body.status) || "Active";

  return patch;
};

const serializeDepartment = (department) => ({
  id: department.id,
  code: department.code,
  name: department.name,
  description: department.description || "",
  status: department.status || "Active",
  createdAt: department.createdAt,
  updatedAt: department.updatedAt,
});

const departmentPatch = (body) => {
  const patch = {};

  if (body.code !== undefined) patch.code = normalize(body.code);
  if (body.name !== undefined) patch.name = normalize(body.name);
  if (body.description !== undefined) patch.description = normalize(body.description);
  if (body.status !== undefined) patch.status = normalize(body.status) || "Active";

  return patch;
};

const warehouseTextFields = [
  "manager",
  "phone",
  "email",
  "addressLine",
  "city",
  "state",
  "district",
  "pincode",
  "capacityUnit",
  "internalNotes",
];

const warehouseBooleanFields = [
  "binManagement",
  "batchTracking",
  "serialTracking",
  "qualityArea",
  "wipArea",
  "dispatchArea",
];

const serializeWarehouse = (warehouse) => ({
  id: warehouse.id,
  code: warehouse.code,
  name: warehouse.name || warehouse.storeName,
  storeName: warehouse.storeName,
  type: warehouse.type || warehouse.storeType || "General",
  storeType: warehouse.storeType,
  manager: warehouse.manager || "",
  phone: warehouse.phone || "",
  email: warehouse.email || "",
  addressLine: warehouse.addressLine || warehouse.address || "",
  address: warehouse.address || warehouse.addressLine || "",
  city: warehouse.city || "",
  state: warehouse.state || "",
  district: warehouse.district || "",
  pincode: warehouse.pincode || "",
  capacity: warehouse.capacity || 0,
  capacityUnit: warehouse.capacityUnit || "",
  maxWeight: warehouse.maxWeight || 0,
  maxVolume: warehouse.maxVolume || 0,
  utilization: warehouse.utilization || 0,
  binManagement: Boolean(warehouse.binManagement),
  batchTracking: Boolean(warehouse.batchTracking),
  serialTracking: Boolean(warehouse.serialTracking),
  qualityArea: Boolean(warehouse.qualityArea),
  wipArea: Boolean(warehouse.wipArea),
  dispatchArea: Boolean(warehouse.dispatchArea),
  internalNotes: warehouse.internalNotes || "",
  status: warehouse.status || "Active",
  createdAt: warehouse.createdAt,
  updatedAt: warehouse.updatedAt,
});

const warehousePatch = (body) => {
  const patch = {};

  if (body.code !== undefined) patch.code = normalize(body.code);
  if (body.name !== undefined) {
    patch.name = normalize(body.name);
    patch.storeName = patch.name;
  }
  if (body.type !== undefined) {
    patch.type = normalize(body.type) || "General";
    patch.storeType = patch.type;
  }
  if (body.status !== undefined) patch.status = normalize(body.status) || "Active";
  warehouseTextFields.forEach((field) => {
    if (body[field] !== undefined) patch[field] = field === "email" ? normalizeEmail(body[field]) : normalize(body[field]);
  });
  ["capacity", "maxWeight", "maxVolume", "utilization"].forEach((field) => {
    if (body[field] !== undefined) patch[field] = numberValue(body[field]);
  });
  warehouseBooleanFields.forEach((field) => {
    if (body[field] !== undefined) patch[field] = booleanValue(body[field]);
  });

  if (patch.addressLine !== undefined) patch.address = patch.addressLine;

  return patch;
};

const stockLocationTextFields = [
  "warehouse",
  "type",
  "zone",
  "rack",
  "shelf",
  "bin",
  "allowedCategory",
  "temperature",
  "internalNotes",
];

const serializeStockLocation = (location) => ({
  id: location.id,
  code: location.code,
  name: location.name,
  warehouse: location.warehouse || "",
  type: location.type || "",
  zone: location.zone || "",
  rack: location.rack || "",
  shelf: location.shelf || "",
  bin: location.bin || "",
  maxQuantity: location.maxQuantity || 0,
  maxWeight: location.maxWeight || 0,
  maxVolume: location.maxVolume || 0,
  utilization: location.utilization || 0,
  allowedCategory: location.allowedCategory || "Any",
  temperature: location.temperature || "Ambient",
  hazardous: Boolean(location.hazardous),
  batchAllowed: Boolean(location.batchAllowed),
  expiryTracking: Boolean(location.expiryTracking),
  internalNotes: location.internalNotes || "",
  status: location.status || "Active",
  createdAt: location.createdAt,
  updatedAt: location.updatedAt,
});

const stockLocationPatch = (body) => {
  const patch = {};

  if (body.code !== undefined) patch.code = normalize(body.code);
  if (body.name !== undefined) patch.name = normalize(body.name);
  if (body.status !== undefined) patch.status = normalize(body.status) || "Active";
  stockLocationTextFields.forEach((field) => {
    if (body[field] !== undefined) patch[field] = normalize(body[field]);
  });
  ["maxQuantity", "maxWeight", "maxVolume", "utilization"].forEach((field) => {
    if (body[field] !== undefined) patch[field] = numberValue(body[field]);
  });
  ["hazardous", "batchAllowed", "expiryTracking"].forEach((field) => {
    if (body[field] !== undefined) patch[field] = booleanValue(body[field]);
  });

  return patch;
};

const masterEntityApis = {
  units: {
    Model: Unit,
    serialize: serializeUnit,
    patch: unitPatch,
    sort: { createdAt: -1, code: 1 },
    autoCode: { prefix: "UOM", width: 2 },
    requiredDraft: ["name"],
    requiredActive: ["symbol", "type"],
    requiredMessage: "Unit name, symbol, and unit type are required.",
    draftMessage: "Unit name is required.",
  },
  suppliers: {
    Model: Vendor,
    serialize: serializeSupplier,
    patch: supplierPatch,
    sort: { createdAt: -1, code: 1 },
    autoCode: { prefix: "SUP", width: 3, startAt: 101 },
    requiredDraft: ["name"],
    requiredActive: ["category", "contact", "phone"],
    requiredMessage: "Supplier name, category, contact person, and phone are required.",
    draftMessage: "Supplier name is required.",
  },
  "warehouse-types": {
    Model: WarehouseType,
    serialize: serializeWarehouseType,
    patch: warehouseTypePatch,
    sort: { createdAt: -1, code: 1 },
    autoCode: { prefix: "WHT", width: 2, startAt: 1 },
    requiredDraft: ["name"],
    requiredActive: [],
    requiredMessage: "Warehouse type name is required.",
    draftMessage: "Warehouse type name is required.",
  },
  "location-types": {
    Model: LocationType,
    serialize: serializeLocationType,
    patch: locationTypePatch,
    sort: { createdAt: -1, code: 1 },
    autoCode: { prefix: "LCT", width: 2, startAt: 1 },
    requiredDraft: ["name"],
    requiredActive: [],
    requiredMessage: "Location type name is required.",
    draftMessage: "Location type name is required.",
  },
  departments: {
    Model: Department,
    serialize: serializeDepartment,
    patch: departmentPatch,
    sort: { createdAt: -1, code: 1 },
    autoCode: { prefix: "DPT", width: 2, startAt: 1 },
    requiredDraft: ["name"],
    requiredActive: [],
    requiredMessage: "Department name is required.",
    draftMessage: "Department name is required.",
  },
  warehouses: {
    Model: Store,
    serialize: serializeWarehouse,
    patch: warehousePatch,
    sort: { createdAt: -1, code: 1 },
    autoCode: { prefix: "WH", width: 2, startAt: 1 },
    requiredDraft: ["name"],
    requiredActive: ["type"],
    requiredMessage: "Warehouse name and warehouse type are required.",
    draftMessage: "Warehouse name is required.",
  },
  "stock-locations": {
    Model: StockLocation,
    serialize: serializeStockLocation,
    patch: stockLocationPatch,
    sort: { createdAt: -1, code: 1 },
    autoCode: { prefix: "LOC", width: 3, startAt: 1 },
    requiredDraft: ["name"],
    requiredActive: ["warehouse", "type"],
    requiredMessage: "Location name, warehouse, and location type are required.",
    draftMessage: "Location name is required.",
  },
};

const validateMasterPatch = (patch, config) => {
  if (config.requiredDraft.some((field) => !patch[field])) {
    return config.draftMessage;
  }

  if (patch.status !== "Draft" && config.requiredActive.some((field) => !patch[field])) {
    return config.requiredMessage;
  }

  return "";
};

export async function listProductItems(req, res, next) {
  try {
    const products = await Product.find({ tenantId: req.auth.tenantId })
      .sort({ createdAt: -1, code: 1 })
      .lean();

    return res.status(200).json({
      rows: products.map(serializeProductItem),
    });
  } catch (error) {
    next(error);
  }
}

export async function createProductItem(req, res, next) {
  try {
    const patch = productItemPatch(req.body);

    if (!patch.code) {
      patch.code = await generateMasterCode(Product, req.auth.tenantId, "ITM", 4, 1001);
      patch.sku = patch.code;
    }

    if (!patch.name) {
      return res.status(400).json({
        message: "Product name is required.",
      });
    }

    if (patch.status !== "Draft" && (!patch.category || !patch.productType || !patch.baseUnit)) {
      return res.status(400).json({
        message: "Product name, category, product type, and base unit are required.",
      });
    }

    if (await productItemNameExists(req.auth.tenantId, patch.name)) {
      return res.status(409).json({ message: "Item Name already exists." });
    }

    const product = await Product.create({
      tenantId: req.auth.tenantId,
      storeId: req.auth.storeId || null,
      createdBy: req.auth.sub,
      ...patch,
    });

    return res.status(201).json({
      row: serializeProductItem(product),
    });
  } catch (error) {
    const duplicateMessage = formatDuplicateError(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage });
    }

    next(error);
  }
}

export async function updateProductItem(req, res, next) {
  try {
    const currentCode = normalize(req.params.code);
    const patch = productItemPatch(req.body);

    if (patch.code === "") {
      return res.status(400).json({ message: "Item code is required." });
    }
    if (patch.name === "") {
      return res.status(400).json({ message: "Product name is required." });
    }

    if (patch.name && await productItemNameExists(req.auth.tenantId, patch.name, currentCode)) {
      return res.status(409).json({ message: "Item Name already exists." });
    }

    const product = await Product.findOneAndUpdate(
      { tenantId: req.auth.tenantId, code: currentCode },
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product item not found." });
    }

    return res.status(200).json({
      row: serializeProductItem(product),
    });
  } catch (error) {
    const duplicateMessage = formatDuplicateError(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage });
    }

    next(error);
  }
}

export async function listCategories(req, res, next) {
  try {
    const [categories, products] = await Promise.all([
      Category.find({ tenantId: req.auth.tenantId })
        .sort({ displayOrder: 1, createdAt: -1, code: 1 })
        .lean(),
      Product.find({ tenantId: req.auth.tenantId }).select("category").lean(),
    ]);
    const countByCategory = products.reduce((counts, product) => {
      if (!product.category) return counts;
      counts.set(product.category, (counts.get(product.category) || 0) + 1);
      return counts;
    }, new Map());

    return res.status(200).json({
      rows: categories.map((category) => serializeCategory(category, countByCategory.get(category.name) || 0)),
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const patch = categoryPatch(req.body);

    if (!patch.code) {
      patch.code = await generateMasterCode(Category, req.auth.tenantId, "CAT", 2);
    }

    if (!patch.name) {
      return res.status(400).json({
        message: "Category name is required.",
      });
    }

    if (patch.status !== "Draft" && !patch.type) {
      return res.status(400).json({
        message: "Category name and category type are required.",
      });
    }

    if (!patch.type) {
      patch.type = "Product";
    }

    const category = await Category.create({
      tenantId: req.auth.tenantId,
      storeId: req.auth.storeId || null,
      createdBy: req.auth.sub,
      ...patch,
    });

    return res.status(201).json({
      row: serializeCategory(category),
    });
  } catch (error) {
    const duplicateMessage = formatDuplicateError(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage });
    }

    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const currentCode = normalize(req.params.code);
    const patch = categoryPatch(req.body);

    if (patch.code === "") {
      return res.status(400).json({ message: "Category code is required." });
    }
    if (patch.name === "") {
      return res.status(400).json({ message: "Category name is required." });
    }

    const category = await Category.findOneAndUpdate(
      { tenantId: req.auth.tenantId, code: currentCode },
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    return res.status(200).json({
      row: serializeCategory(category),
    });
  } catch (error) {
    const duplicateMessage = formatDuplicateError(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage });
    }

    next(error);
  }
}

export async function listMasterRows(req, res, next) {
  try {
    const config = masterEntityApis[req.params.masterEntity];

    if (!config) {
      return res.status(404).json({ message: "Master entity not found." });
    }

    const rows = await config.Model.find({ tenantId: req.auth.tenantId })
      .sort(config.sort)
      .lean();

    return res.status(200).json({
      rows: rows.map(config.serialize),
    });
  } catch (error) {
    next(error);
  }
}

export async function createMasterRow(req, res, next) {
  try {
    const config = masterEntityApis[req.params.masterEntity];

    if (!config) {
      return res.status(404).json({ message: "Master entity not found." });
    }

    const patch = config.patch(req.body);

    if (config.autoCode && !patch.code) {
      patch.code = await generateMasterCode(
        config.Model,
        req.auth.tenantId,
        config.autoCode.prefix,
        config.autoCode.width,
        config.autoCode.startAt
      );
    }

    const validationMessage = validateMasterPatch(patch, config);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    if (req.params.masterEntity === "stock-locations") {
      const warehouseMessage = await validateStockLocationWarehouse(req.auth.tenantId, patch.warehouse);
      if (warehouseMessage) {
        return res.status(400).json({ message: warehouseMessage });
      }
    }

    const row = await config.Model.create({
      tenantId: req.auth.tenantId,
      storeId: req.auth.storeId || null,
      createdBy: req.auth.sub,
      ...patch,
    });

    return res.status(201).json({
      row: config.serialize(row),
    });
  } catch (error) {
    const duplicateMessage = formatDuplicateError(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage });
    }

    next(error);
  }
}

export async function updateMasterRow(req, res, next) {
  try {
    const config = masterEntityApis[req.params.masterEntity];

    if (!config) {
      return res.status(404).json({ message: "Master entity not found." });
    }

    const currentCode = normalize(req.params.code);
    const patch = config.patch(req.body);

    if (patch.code === "") {
      return res.status(400).json({ message: "Code is required." });
    }
    if (patch.name === "") {
      return res.status(400).json({ message: "Name is required." });
    }

    if (req.params.masterEntity === "stock-locations" && patch.warehouse !== undefined) {
      const warehouseMessage = await validateStockLocationWarehouse(req.auth.tenantId, patch.warehouse);
      if (warehouseMessage) {
        return res.status(400).json({ message: warehouseMessage });
      }
    }

    const row = await config.Model.findOneAndUpdate(
      { tenantId: req.auth.tenantId, code: currentCode },
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!row) {
      return res.status(404).json({ message: "Master record not found." });
    }

    return res.status(200).json({
      row: config.serialize(row),
    });
  } catch (error) {
    const duplicateMessage = formatDuplicateError(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage });
    }

    next(error);
  }
}
