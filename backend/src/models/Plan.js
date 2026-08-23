import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: true,
      trim: true,
    },

    planCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },

    monthlyPrice: {
      type: Number,
      default: 0,
    },

    yearlyPrice: {
      type: Number,
      default: 0,
    },

    limits: {
      stores: {
        type: Number,
        default: 1,
      },
      users: {
        type: Number,
        default: 2,
      },
      products: {
        type: Number,
        default: 100,
      },
      invoicesPerMonth: {
        type: Number,
        default: 500,
      },
    },

    features: {
      pharmacyModule: {
        type: Boolean,
        default: false,
      },
      batchManagement: {
        type: Boolean,
        default: false,
      },
      expiryAlert: {
        type: Boolean,
        default: false,
      },
      prescriptionTracking: {
        type: Boolean,
        default: false,
      },
      reports: {
        type: Boolean,
        default: true,
      },
      gstBilling: {
        type: Boolean,
        default: true,
      },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Plan", planSchema);
