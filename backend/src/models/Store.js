import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      default: "",
      trim: true,
    },

    storeType: {
      type: String,
      enum: ["grocery", "mobile", "garment", "retail", "pharmacy", "Manufacturing", "Raw Material", "Finished Goods", "Distribution", "General"],
      default: "General",
    },

    type: {
      type: String,
      enum: ["Manufacturing", "Raw Material", "Finished Goods", "Distribution", "General"],
      default: "General",
    },

    manager: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    addressLine: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    pincode: {
      type: String,
      default: "",
      trim: true,
    },

    gstNumber: {
      type: String,
      default: "",
    },

    invoicePrefix: {
      type: String,
      default: "INV",
    },

    purchasePrefix: {
      type: String,
      default: "PUR",
    },

    currency: {
      type: String,
      default: "INR",
    },

    taxEnabled: {
      type: Boolean,
      default: true,
    },

    capacity: {
      type: Number,
      default: 0,
    },

    capacityUnit: {
      type: String,
      default: "",
      trim: true,
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

    binManagement: {
      type: Boolean,
      default: false,
    },

    batchTracking: {
      type: Boolean,
      default: false,
    },

    serialTracking: {
      type: Boolean,
      default: false,
    },

    qualityArea: {
      type: Boolean,
      default: false,
    },

    wipArea: {
      type: Boolean,
      default: false,
    },

    dispatchArea: {
      type: Boolean,
      default: false,
    },

    internalNotes: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Draft", "active", "inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

storeSchema.index({ tenantId: 1, storeName: 1 });
storeSchema.index({ tenantId: 1, storeType: 1 });
storeSchema.index(
  { tenantId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } }
);
storeSchema.index({ tenantId: 1, type: 1 });
storeSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model("Store", storeSchema);
