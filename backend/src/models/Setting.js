import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
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

    logo: {
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

    defaultTaxRate: {
      type: Number,
      default: 0,
    },

    taxEnabled: {
      type: Boolean,
      default: true,
    },

    lowStockAlertEnabled: {
      type: Boolean,
      default: true,
    },

    expiryAlertDays: {
      type: Number,
      default: 90,
    },

    currency: {
      type: String,
      default: "INR",
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },

    printSettings: {
      invoiceSize: {
        type: String,
        enum: ["thermal", "a4"],
        default: "thermal",
      },

      showLogo: {
        type: Boolean,
        default: true,
      },

      showGst: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

settingSchema.index({ tenantId: 1, storeId: 1 }, { unique: true });

export default mongoose.model("Setting", settingSchema);
