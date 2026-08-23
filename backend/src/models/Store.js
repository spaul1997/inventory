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

    storeType: {
      type: String,
      enum: ["grocery", "mobile", "garment", "retail", "pharmacy"],
      required: true,
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

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

storeSchema.index({ tenantId: 1, storeName: 1 });
storeSchema.index({ tenantId: 1, storeType: 1 });

export default mongoose.model("Store", storeSchema);
