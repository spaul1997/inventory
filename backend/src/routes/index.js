import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import Category from "../models/Category.js";
import "../models/Plan.js";
import Product from "../models/Product.js";
import RawMaterial from "../models/RawMaterial.js";
import SaasPayment from "../models/SaasPayment.js";
import StockLocation from "../models/StockLocation.js";
import Store from "../models/Store.js";
import Subscription from "../models/Subscription.js";
import Tenant from "../models/Tenant.js";
import Role from "../models/Role.js";
import Unit from "../models/Unit.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";

const router = Router();

const normalize = (value) => String(value ?? "").trim();
const normalizeEmail = (value) => normalize(value).toLowerCase();
const normalizePhone = (value) => normalize(value).replace(/\D/g, "");
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPhoneRegex = (phone) => {
  if (!phone) return null;

  const digits = phone.split("").map(escapeRegex).join("\\D*");
  const optionalCountryCode = phone.length >= 10 ? "(?:\\d{1,3}\\D*)?" : "";

  return new RegExp(`^\\D*${optionalCountryCode}${digits}\\D*$`);
};

const slugCode = (value) =>
  normalize(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);

const hashValue = (value, algorithm) =>
  crypto.createHash(algorithm).update(String(value)).digest("hex");

const timingSafeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const verifyPassword = async (password, storedPassword) => {
  if (!password || !storedPassword) return false;

  const stored = String(storedPassword);

  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return bcrypt.compare(password, stored);
  }

  const candidates = [
    password,
    hashValue(password, "sha256"),
    hashValue(password, "sha512"),
  ];

  return candidates.some((candidate) => timingSafeEqual(candidate, stored));
};

const createSessionToken = (payload) => {
  const secret = process.env.JWT_SECRET || "ims-development-secret";
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
};

const verifySessionToken = (token) => {
  const [encodedPayload, signature] = String(token || "").split(".");
  if (!encodedPayload || !signature) return null;

  const secret = process.env.JWT_SECRET || "ims-development-secret";
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  if (!timingSafeEqual(signature, expectedSignature)) return null;

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

const requireSpecialAdmin = (req, res, next) => {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const payload = verifySessionToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (payload.role !== "special_admin") {
    return res.status(403).json({ message: "Special admin access required." });
  }

  req.auth = payload;
  return next();
};

const requireAuth = (req, res, next) => {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const payload = verifySessionToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Authentication required." });
  }

  req.auth = payload;
  return next();
};

const requireCompanyUser = (req, res, next) => {
  if (!req.auth?.tenantId) {
    return res.status(403).json({ message: "Company access required." });
  }

  return next();
};

const serializeCompany = (tenant) => {
  if (!tenant) return null;

  return {
    _id: tenant._id,
    businessName: tenant.businessName,
    ownerName: tenant.ownerName,
    email: tenant.email,
    phone: tenant.phone,
    address: tenant.address,
    gstNumber: tenant.gstNumber,
    status: tenant.status,
    subscriptionStatus: tenant.subscriptionStatus,
  };
};

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

const serializeProductItem = (product) => ({
  id: product.id,
  code: product.code,
  sku: product.sku || product.code,
  name: product.name,
  shortName: product.shortName || "",
  category: product.category || "",
  subCategory: product.subCategory || "",
  productType: product.productType || "Trading Item",
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
  price: product.sellingPrice || 0,
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
  if (body.name !== undefined) patch.name = normalize(body.name);
  if (body.productType !== undefined) patch.productType = normalize(body.productType) || "Trading Item";
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

const rawMaterialTextFields = [
  "category",
  "subCategory",
  "description",
  "grade",
  "color",
  "dimensions",
  "specification",
  "baseUnit",
  "preferredSupplier",
  "qualityGrade",
  "certification",
  "defaultWarehouse",
  "defaultLocation",
  "storageType",
  "internalNotes",
  "attachment",
];

const rawMaterialNumberFields = [
  "weight",
  "minStock",
  "maxStock",
  "reorderLevel",
  "openingQty",
  "openingValue",
  "leadTime",
  "moq",
  "lastPurchasePrice",
];

const rawMaterialBooleanFields = [
  "batchTracking",
  "expiryTracking",
  "inspectionRequired",
];

const serializeRawMaterial = (material) => ({
  id: material.id,
  code: material.code,
  name: material.name,
  category: material.category || "",
  subCategory: material.subCategory || "",
  description: material.description || "",
  grade: material.grade || "",
  color: material.color || "",
  weight: material.weight || 0,
  dimensions: material.dimensions || "",
  specification: material.specification || "",
  batchTracking: Boolean(material.batchTracking),
  expiryTracking: Boolean(material.expiryTracking),
  baseUnit: material.baseUnit || "",
  unit: material.baseUnit || "",
  minStock: material.minStock || 0,
  maxStock: material.maxStock || 0,
  reorderLevel: material.reorderLevel || 0,
  openingQty: material.openingQty || material.currentStock || 0,
  openingValue: material.openingValue || 0,
  stock: material.currentStock || material.openingQty || 0,
  preferredSupplier: material.preferredSupplier || "",
  leadTime: material.leadTime || 0,
  moq: material.moq || 0,
  lastPurchasePrice: material.lastPurchasePrice || 0,
  price: material.lastPurchasePrice || 0,
  qualityGrade: material.qualityGrade || "",
  inspectionRequired: Boolean(material.inspectionRequired),
  certification: material.certification || "",
  defaultWarehouse: material.defaultWarehouse || "",
  defaultLocation: material.defaultLocation || "",
  storageType: material.storageType || "",
  internalNotes: material.internalNotes || "",
  attachment: material.attachment || "",
  status: material.status || "Active",
  createdAt: material.createdAt,
  updatedAt: material.updatedAt,
});

const rawMaterialPatch = (body) => {
  const patch = {};

  if (body.code !== undefined) patch.code = normalize(body.code);
  if (body.name !== undefined) patch.name = normalize(body.name);
  if (body.status !== undefined) patch.status = normalize(body.status) || "Active";
  rawMaterialTextFields.forEach((field) => {
    if (body[field] !== undefined) patch[field] = normalize(body[field]);
  });
  rawMaterialNumberFields.forEach((field) => {
    if (body[field] !== undefined) patch[field] = numberValue(body[field]);
  });
  rawMaterialBooleanFields.forEach((field) => {
    if (body[field] !== undefined) patch[field] = booleanValue(body[field]);
  });

  if (patch.openingQty !== undefined) patch.currentStock = patch.openingQty;

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

const warehouseTextFields = [
  "manager",
  "phone",
  "email",
  "addressLine",
  "city",
  "state",
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
  "raw-materials": {
    Model: RawMaterial,
    serialize: serializeRawMaterial,
    patch: rawMaterialPatch,
    sort: { createdAt: -1, code: 1 },
    autoCode: { prefix: "RM", width: 4, startAt: 2001 },
    requiredDraft: ["name"],
    requiredActive: ["category", "baseUnit"],
    requiredMessage: "Material name, category, and base unit are required.",
    draftMessage: "Material name is required.",
  },
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

router.get("/", (req, res) => {
  res.status(200).json({
    message: "IMS API",
    status: "ready",
  });
});

router.get("/auth/me", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role === "special_admin") {
      return res.status(200).json({
        user: {
          id: "special-admin",
          name: process.env.SPECIAL_ADMIN_NAME || "Special Admin",
          email: normalizeEmail(process.env.SPECIAL_ADMIN_EMAIL),
          phone: process.env.SPECIAL_ADMIN_MOBILE || "",
          employeeCode: normalize(process.env.SPECIAL_ADMIN_EMPLOYEE_CODE),
          role: "special_admin",
          userType: "saas_admin",
        },
      });
    }

    const user = await User.findById(req.auth.sub)
      .populate("roleId", "name roleType permissions")
      .populate("tenantId", "businessName ownerName email phone address gstNumber status subscriptionStatus")
      .select("-password -refreshToken");

    if (
      !user ||
      user.status !== "active" ||
      (user.userType === "store_user" && !user.tenantId) ||
      user.tenantId?.status !== "active"
    ) {
      return res.status(401).json({ message: "Session is no longer active." });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeCode: user.employeeCode,
        phone: user.phone,
        role: user.roleId?.name || user.userType,
        permissions: user.roleId?.permissions || [],
        userType: user.userType,
        tenantId: user.tenantId?._id,
        storeId: user.storeId,
        company: serializeCompany(user.tenantId),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const loginId = normalize(
      req.body.loginId ??
        req.body.username ??
        req.body.email ??
        req.body.employeeCode ??
        req.body.phone ??
        req.body.mobile
    );
    const email = normalizeEmail(loginId);
    const password = String(req.body.password ?? "");
    const phone = normalizePhone(loginId);
    const phoneRegex = buildPhoneRegex(phone);

    if (!password || !loginId) {
      return res.status(400).json({ message: "Employee code, email, or phone and password are required." });
    }

    const specialAdminEmployeeCode = normalize(process.env.SPECIAL_ADMIN_EMPLOYEE_CODE);
    const specialAdminEmail = normalizeEmail(process.env.SPECIAL_ADMIN_EMAIL);
    const specialAdminPhone = normalizePhone(process.env.SPECIAL_ADMIN_MOBILE);
    const specialAdminPasswordMatches =
      (process.env.SPECIAL_ADMIN_PASSWORD_HASH &&
        (await verifyPassword(password, process.env.SPECIAL_ADMIN_PASSWORD_HASH))) ||
      (process.env.SPECIAL_ADMIN_PASSWORD &&
        timingSafeEqual(password, process.env.SPECIAL_ADMIN_PASSWORD));
    const specialAdminIdentifierMatches =
      (specialAdminEmployeeCode &&
        loginId.toLowerCase() === specialAdminEmployeeCode.toLowerCase()) ||
      (specialAdminEmail && email === specialAdminEmail) ||
      (specialAdminPhone && phone === specialAdminPhone);
    const specialAdminMatches = specialAdminPasswordMatches && specialAdminIdentifierMatches;

    if (specialAdminMatches) {
      const user = {
        id: "special-admin",
        name: process.env.SPECIAL_ADMIN_NAME || "Special Admin",
        email: specialAdminEmail,
        phone: process.env.SPECIAL_ADMIN_MOBILE || "",
        mobile: process.env.SPECIAL_ADMIN_MOBILE || "",
        employeeCode: specialAdminEmployeeCode,
        role: "special_admin",
        userType: "saas_admin",
      };

      return res.status(200).json({
        token: createSessionToken({ sub: user.id, role: user.role, userType: user.userType, email: user.email }),
        user,
      });
    }

    const user = await User.findOne({
      $or: [
        { employeeCode: new RegExp(`^${escapeRegex(loginId)}$`, "i") },
        { email },
        ...(phone ? [{ phone }, { phone: phoneRegex }] : []),
      ],
    })
      .select("+password")
      .populate("roleId", "name roleType permissions")
      .populate("tenantId", "businessName ownerName email phone address gstNumber status subscriptionStatus");

    if (
      !user ||
      user.status !== "active" ||
      (user.userType === "store_user" && !user.tenantId) ||
      user.tenantId?.status !== "active" ||
      !(await verifyPassword(password, user.password))
    ) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json({
      token: createSessionToken({
        sub: user.id,
        role: user.roleId?.name || user.userType,
        userType: user.userType,
        email: user.email,
        tenantId: user.tenantId?._id,
        storeId: user.storeId,
      }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeCode: user.employeeCode,
        phone: user.phone,
        role: user.roleId?.name || user.userType,
        permissions: user.roleId?.permissions || [],
        userType: user.userType,
        tenantId: user.tenantId?._id,
        storeId: user.storeId,
        company: serializeCompany(user.tenantId),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/company/profile", requireAuth, requireCompanyUser, async (req, res, next) => {
  try {
    const company = await Tenant.findById(req.auth.tenantId)
      .select("businessName ownerName email phone address gstNumber status subscriptionStatus createdAt updatedAt")
      .lean();

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    return res.status(200).json({ company });
  } catch (error) {
    next(error);
  }
});

router.get("/master/product-items", requireAuth, requireCompanyUser, async (req, res, next) => {
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
});

router.post("/master/product-items", requireAuth, requireCompanyUser, async (req, res, next) => {
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
});

router.put("/master/product-items/:code", requireAuth, requireCompanyUser, async (req, res, next) => {
  try {
    const currentCode = normalize(req.params.code);
    const patch = productItemPatch(req.body);

    if (patch.code === "") {
      return res.status(400).json({ message: "Item code is required." });
    }
    if (patch.name === "") {
      return res.status(400).json({ message: "Product name is required." });
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
});

router.get("/master/categories", requireAuth, requireCompanyUser, async (req, res, next) => {
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
});

router.post("/master/categories", requireAuth, requireCompanyUser, async (req, res, next) => {
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
});

router.put("/master/categories/:code", requireAuth, requireCompanyUser, async (req, res, next) => {
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
});

router.get("/master/:masterEntity", requireAuth, requireCompanyUser, async (req, res, next) => {
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
});

router.post("/master/:masterEntity", requireAuth, requireCompanyUser, async (req, res, next) => {
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
});

router.put("/master/:masterEntity/:code", requireAuth, requireCompanyUser, async (req, res, next) => {
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
});

router.get("/saas-admin/dashboard", requireSpecialAdmin, async (req, res, next) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      trialCompanies,
      suspendedCompanies,
      activeSubscriptions,
      pendingPayments,
      paymentSummary,
      recentCompanies,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: "active" }),
      Tenant.countDocuments({ subscriptionStatus: "trial" }),
      Tenant.countDocuments({ status: "suspended" }),
      Subscription.countDocuments({ status: "active" }),
      SaasPayment.countDocuments({ paymentStatus: "pending" }),
      SaasPayment.aggregate([
        { $match: { paymentStatus: "success" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            paymentCount: { $sum: 1 },
          },
        },
      ]),
      Tenant.find({})
        .select("businessName ownerName email phone status subscriptionStatus createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return res.status(200).json({
      summary: {
        totalCompanies,
        activeCompanies,
        trialCompanies,
        suspendedCompanies,
        activeSubscriptions,
        pendingPayments,
        totalRevenue: paymentSummary[0]?.totalRevenue || 0,
        paymentCount: paymentSummary[0]?.paymentCount || 0,
      },
      recentCompanies,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/saas-admin/companies", requireSpecialAdmin, async (req, res, next) => {
  try {
    const companies = await Tenant.find({})
      .select("businessName ownerName email phone address gstNumber status subscriptionStatus createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({ companies });
  } catch (error) {
    next(error);
  }
});

router.post("/saas-admin/companies", requireSpecialAdmin, async (req, res, next) => {
  const createdIds = {
    tenantId: null,
    roleId: null,
    userId: null,
  };

  try {
    const businessName = normalize(req.body.businessName);
    const ownerName = normalize(req.body.ownerName);
    const email = normalizeEmail(req.body.email);
    const phone = normalize(req.body.phone);
    const address = normalize(req.body.address);
    const gstNumber = normalize(req.body.gstNumber).toUpperCase();
    const adminName = normalize(req.body.adminName) || ownerName;
    const adminEmail = normalizeEmail(req.body.adminEmail || email);
    const adminPhone = normalize(req.body.adminPhone) || phone;
    const adminEmployeeCode =
      normalize(req.body.adminEmployeeCode) ||
      `${slugCode(businessName) || "COMP"}-ADMIN`;
    const adminPassword = String(req.body.adminPassword || "");

    if (!businessName || !ownerName || !email || !phone || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        message: "Company details and super admin credentials are required.",
      });
    }

    if (adminPassword.length < 8) {
      return res.status(400).json({
        message: "Super admin password must be at least 8 characters.",
      });
    }

    const tenant = await Tenant.create({
      businessName,
      ownerName,
      email,
      phone,
      address,
      gstNumber,
      status: "active",
      subscriptionStatus: "trial",
    });
    createdIds.tenantId = tenant._id;

    const role = await Role.create({
      tenantId: tenant._id,
      name: "Super Admin",
      roleType: "store",
      isSystemRole: true,
      permissions: ["*"],
      status: "active",
    });
    createdIds.roleId = role._id;

    const user = await User.create({
      tenantId: tenant._id,
      storeId: null,
      name: adminName,
      email: adminEmail,
      employeeCode: adminEmployeeCode,
      phone: adminPhone,
      password: await bcrypt.hash(adminPassword, 12),
      roleId: role._id,
      userType: "store_user",
      status: "active",
    });
    createdIds.userId = user._id;

    tenant.createdBy = user._id;
    await tenant.save();

    return res.status(201).json({
      company: {
        _id: tenant._id,
        businessName: tenant.businessName,
        ownerName: tenant.ownerName,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        gstNumber: tenant.gstNumber,
        status: tenant.status,
        subscriptionStatus: tenant.subscriptionStatus,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
      superAdmin: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeCode: user.employeeCode,
        phone: user.phone,
        role: role.name,
        userType: user.userType,
      },
    });
  } catch (error) {
    if (createdIds.userId) {
      await User.findByIdAndDelete(createdIds.userId).catch(() => {});
    }
    if (createdIds.roleId) {
      await Role.findByIdAndDelete(createdIds.roleId).catch(() => {});
    }
    if (createdIds.tenantId) {
      await Tenant.findByIdAndDelete(createdIds.tenantId).catch(() => {});
    }

    const duplicateMessage = formatDuplicateError(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage });
    }

    next(error);
  }
});

router.get("/saas-admin/payments", requireSpecialAdmin, async (req, res, next) => {
  try {
    const payments = await SaasPayment.find({})
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(200)
      .populate("tenantId", "businessName email phone")
      .populate("planId", "planName planCode monthlyPrice yearlyPrice")
      .lean();

    return res.status(200).json({ payments });
  } catch (error) {
    next(error);
  }
});

export default router;
