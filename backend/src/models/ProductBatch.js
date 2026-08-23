import mongoose from "mongoose";

const productBatchSchema = new mongoose.Schema(
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

    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },

    manufacturingDate: {
      type: Date,
      default: null,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    purchasePrice: {
      type: Number,
      default: 0,
    },

    sellingPrice: {
      type: Number,
      default: 0,
    },

    mrp: {
      type: Number,
      default: 0,
    },

    quantity: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "expired", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

productBatchSchema.index(
  { tenantId: 1, storeId: 1, productId: 1, batchNumber: 1, expiryDate: 1 },
  { unique: true }
);

productBatchSchema.index({ tenantId: 1, storeId: 1, expiryDate: 1 });
productBatchSchema.index({ tenantId: 1, storeId: 1, quantity: 1 });

export default mongoose.model("ProductBatch", productBatchSchema);
