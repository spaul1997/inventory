import mongoose from "mongoose";

const rawMaterialSchema = new mongoose.Schema(
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

    name: {
      type: String,
      required: true,
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

    description: {
      type: String,
      default: "",
    },

    grade: {
      type: String,
      default: "",
      trim: true,
    },

    color: {
      type: String,
      default: "",
      trim: true,
    },

    weight: {
      type: Number,
      default: 0,
    },

    dimensions: {
      type: String,
      default: "",
      trim: true,
    },

    specification: {
      type: String,
      default: "",
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

    openingQty: {
      type: Number,
      default: 0,
    },

    openingValue: {
      type: Number,
      default: 0,
    },

    currentStock: {
      type: Number,
      default: 0,
    },

    preferredSupplier: {
      type: String,
      default: "",
      trim: true,
    },

    leadTime: {
      type: Number,
      default: 0,
    },

    moq: {
      type: Number,
      default: 0,
    },

    lastPurchasePrice: {
      type: Number,
      default: 0,
    },

    qualityGrade: {
      type: String,
      default: "",
      trim: true,
    },

    inspectionRequired: {
      type: Boolean,
      default: false,
    },

    certification: {
      type: String,
      default: "",
      trim: true,
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

    attachment: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Draft", "Low Stock"],
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

rawMaterialSchema.index(
  { tenantId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } }
);
rawMaterialSchema.index({ tenantId: 1, category: 1 });
rawMaterialSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model("RawMaterial", rawMaterialSchema);
