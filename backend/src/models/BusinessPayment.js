import mongoose from "mongoose";

const businessPaymentSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },

    paymentType: {
      type: String,
      enum: ["sale_payment", "purchase_payment", "expense", "refund"],
      required: true,
    },

    referenceType: {
      type: String,
      enum: ["sale", "purchase", "expense", "refund"],
      required: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentMode: {
      type: String,
      enum: ["cash", "upi", "card", "bank", "credit", "other"],
      default: "cash",
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    note: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

businessPaymentSchema.index({ tenantId: 1, storeId: 1, paymentDate: -1 });
businessPaymentSchema.index({ tenantId: 1, storeId: 1, paymentType: 1 });

export default mongoose.model("BusinessPayment", businessPaymentSchema);
