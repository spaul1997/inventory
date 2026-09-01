import mongoose from "mongoose";

const stockLocationSchema = new mongoose.Schema(
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

    warehouse: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      enum: ["Rack", "Shelf", "Bin", "Floor", "Zone"],
      default: "Rack",
    },

    zone: {
      type: String,
      default: "",
      trim: true,
    },

    rack: {
      type: String,
      default: "",
      trim: true,
    },

    shelf: {
      type: String,
      default: "",
      trim: true,
    },

    bin: {
      type: String,
      default: "",
      trim: true,
    },

    maxQuantity: {
      type: Number,
      default: 0,
    },

    maxWeight: {
      type: Number,
      default: 0,
    },

    maxVolume: {
      type: Number,
      default: 0,
    },

    utilization: {
      type: Number,
      default: 0,
    },

    allowedCategory: {
      type: String,
      default: "Any",
      trim: true,
    },

    temperature: {
      type: String,
      default: "Ambient",
      trim: true,
    },

    hazardous: {
      type: Boolean,
      default: false,
    },

    batchAllowed: {
      type: Boolean,
      default: false,
    },

    expiryTracking: {
      type: Boolean,
      default: false,
    },

    internalNotes: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Draft"],
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

stockLocationSchema.index(
  { tenantId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } }
);
stockLocationSchema.index({ tenantId: 1, warehouse: 1 });
stockLocationSchema.index({ tenantId: 1, type: 1 });
stockLocationSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model("StockLocation", stockLocationSchema);
