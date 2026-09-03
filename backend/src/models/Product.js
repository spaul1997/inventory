import mongoose from "mongoose";

const productTypes = [
  "Raw Material",
  "Finished Goods",
  "Consumables",
  "Spare Parts & Components",
  "Equipment & Assets",
  "Services",
  "Other / Miscellaneous",
  "Semi-Finished Goods",
  "Trading Item",
  "general",
  "medicine",
];

const productSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
      index: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
    },

    productType: {
      type: String,
      enum: productTypes,
      default: "Other / Miscellaneous",
    },

    department: {
      type: String,
      default: "",
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      trim: true,
      default: "",
    },

    barcode: {
      type: String,
      trim: true,
      default: "",
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      default: null,
    },

    shortName: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    subCategory: {
      type: String,
      default: "",
      trim: true,
    },

    brand: {
      type: String,
      default: "",
      trim: true,
    },

    modelNumber: {
      type: String,
      default: "",
      trim: true,
    },

    productSize: {
      type: String,
      default: "",
      trim: true,
    },

    color: {
      type: String,
      default: "",
      trim: true,
    },

    material: {
      type: String,
      default: "",
      trim: true,
    },

    grade: {
      type: String,
      default: "",
      trim: true,
    },

    weight: {
      type: Number,
      default: 0,
    },

    length: {
      type: Number,
      default: 0,
    },

    width: {
      type: Number,
      default: 0,
    },

    thickness: {
      type: Number,
      default: 0,
    },

    specification: {
      type: String,
      default: "",
    },

    serialTracking: {
      type: Boolean,
      default: false,
    },

    batchTracking: {
      type: Boolean,
      default: false,
    },

    expiryTracking: {
      type: Boolean,
      default: false,
    },

    baseUnit: {
      type: String,
      default: "",
      trim: true,
    },

    purchaseUnit: {
      type: String,
      default: "",
      trim: true,
    },

    salesUnit: {
      type: String,
      default: "",
      trim: true,
    },

    conversionFactor: {
      type: Number,
      default: 0,
    },

    minStock: {
      type: Number,
      default: 0,
    },

    maxStock: {
      type: Number,
      default: 0,
    },

    reorderLevel: {
      type: Number,
      default: 0,
    },

    safetyStock: {
      type: Number,
      default: 0,
    },

    openingQty: {
      type: Number,
      default: 0,
    },

    openingValue: {
      type: Number,
      default: 0,
    },

    purchasePrice: {
      type: Number,
      default: 0,
    },

    sellingPrice: {
      type: Number,
      default: 0,
    },

    mrp: {
      type: Number,
      default: 0,
    },

    currentStock: {
      type: Number,
      default: 0,
    },

    minimumStock: {
      type: Number,
      default: 0,
    },

    taxRate: {
      type: Number,
      default: 0,
    },

    standardCost: {
      type: Number,
      default: 0,
    },

    wholesalePrice: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    hsnCode: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    manufactured: {
      type: Boolean,
      default: false,
    },

    defaultBom: {
      type: String,
      default: "",
      trim: true,
    },

    leadTime: {
      type: Number,
      default: 0,
    },

    productionCost: {
      type: Number,
      default: 0,
    },

    bomRequired: {
      type: Boolean,
      default: false,
    },

    qualityInspection: {
      type: Boolean,
      default: false,
    },

    defaultWarehouse: {
      type: String,
      default: "",
      trim: true,
    },

    defaultLocation: {
      type: String,
      default: "",
      trim: true,
    },

    storageType: {
      type: String,
      default: "",
      trim: true,
    },

    internalNotes: {
      type: String,
      default: "",
    },

    remarks: {
      type: String,
      default: "",
    },

    attachment: {
      type: String,
      default: "",
    },

    medicineDetails: {
      genericName: {
        type: String,
        default: "",
      },

      composition: {
        type: String,
        default: "",
      },

      manufacturer: {
        type: String,
        default: "",
      },

      medicineType: {
        type: String,
        enum: [
          "",
          "tablet",
          "capsule",
          "syrup",
          "injection",
          "cream",
          "drops",
          "powder",
          "other",
        ],
        default: "",
      },

      rackNumber: {
        type: String,
        default: "",
      },

      prescriptionRequired: {
        type: Boolean,
        default: false,
      },
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Draft", "Low Stock", "active", "inactive"],
      default: "Active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

productSchema.pre("validate", function normalizeProductName() {
  if (this.name) this.name = String(this.name).trim().toUpperCase();
});

productSchema.pre("findOneAndUpdate", function normalizeProductNameUpdate() {
  const update = this.getUpdate();
  const patch = update?.$set || update;
  if (patch?.name !== undefined) patch.name = String(patch.name ?? "").trim().toUpperCase();
});

productSchema.index(
  { tenantId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 }, partialFilterExpression: { name: { $type: "string" } } }
);
productSchema.index({ tenantId: 1, storeId: 1, sku: 1 });
productSchema.index({ tenantId: 1, storeId: 1, barcode: 1 });
productSchema.index({ tenantId: 1, storeId: 1, productType: 1 });
productSchema.index({ tenantId: 1, storeId: 1, currentStock: 1 });
productSchema.index(
  { tenantId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } }
);
productSchema.index({
  name: "text",
  code: "text",
  sku: "text",
  barcode: "text",
  "medicineDetails.genericName": "text",
  "medicineDetails.composition": "text",
  "medicineDetails.manufacturer": "text",
});

export default mongoose.model("Product", productSchema);
