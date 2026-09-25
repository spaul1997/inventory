import mongoose from "mongoose";

const companyModules = ["purchase", "sales", "manufacturing"];

const tenantSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      default: "",
    },

    gstNumber: {
      type: String,
      default: "",
    },

    maxUsers: {
      type: Number,
      required: true,
      default: 10,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Maximum users must be a whole number.",
      },
    },

    monthlyAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    enabledModules: {
      type: [{ type: String, enum: companyModules }],
      default: () => [...companyModules],
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "expired", "cancelled", "suspended"],
      default: "trial",
    },

    currentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },

    trialStartDate: {
      type: Date,
      default: Date.now,
    },

    trialEndDate: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

tenantSchema.index({ tenantId: 1, storeId: 1 });
tenantSchema.index({ email: 1 }, { unique: true });
tenantSchema.index({ phone: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ subscriptionStatus: 1 });

export default mongoose.model("Tenant", tenantSchema);
