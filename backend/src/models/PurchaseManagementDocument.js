import mongoose from "mongoose";

const purchaseManagementDocumentSchema = new mongoose.Schema(
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

    entityKey: {
      type: String,
      enum: ["purchase-request", "purchase-order", "goods-receipt", "purchase-return"],
      required: true,
      index: true,
    },

    documentId: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      default: "",
      trim: true,
    },

    documentDate: {
      type: String,
      default: "",
      trim: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

purchaseManagementDocumentSchema.index(
  { tenantId: 1, entityKey: 1, documentId: 1 },
  { unique: true }
);
purchaseManagementDocumentSchema.index({ tenantId: 1, entityKey: 1, documentDate: -1 });

export default mongoose.model("PurchaseManagementDocument", purchaseManagementDocumentSchema, "purchase_management_documents");
