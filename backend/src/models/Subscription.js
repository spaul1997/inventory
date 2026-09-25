import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "trial"],
      default: "trial",
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    amount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["trial", "active", "expired", "cancelled", "suspended"],
      default: "trial",
    },

    autoRenew: {
      type: Boolean,
      default: false,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ tenantId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

export default mongoose.model("Subscription", subscriptionSchema);
