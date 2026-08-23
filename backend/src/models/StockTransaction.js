import mongoose from "mongoose";

const stockTransactionSchema = new mongoose.Schema(
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

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductBatch",
      default: null,
      index: true,
    },

    transactionType: {
      type: String,
      enum: [
        "opening_stock",
        "purchase_in",
        "sale_out",
        "manual_in",
        "manual_out",
        "adjustment",
        "damage",
        "sale_return",
        "purchase_return",
      ],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    previousStock: {
      type: Number,
      required: true,
    },

    newStock: {
      type: Number,
      required: true,
    },

    referenceType: {
      type: String,
      enum: [
        "product",
        "purchase",
        "sale",
        "manual",
        "damage",
        "sale_return",
        "purchase_return",
      ],
      required: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
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

stockTransactionSchema.index({ tenantId: 1, storeId: 1, productId: 1 });
stockTransactionSchema.index({ tenantId: 1, storeId: 1, createdAt: -1 });
stockTransactionSchema.index({ transactionType: 1 });

export default mongoose.model("StockTransaction", stockTransactionSchema);
