import mongoose from "mongoose";

const saasPaymentSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      uppercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    paymentMode: {
      type: String,
      enum: ["cash", "bank", "upi", "card", "razorpay", "stripe", "other"],
      default: "cash",
    },

    transactionId: {
      type: String,
      default: "",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "success",
    },

    notes: {
      type: String,
      default: "",
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

saasPaymentSchema.index({ tenantId: 1, paymentDate: -1 });
saasPaymentSchema.index({ paymentStatus: 1 });

export default mongoose.model("SaasPayment", saasPaymentSchema);
