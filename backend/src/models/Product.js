import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
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

    productType: {
      type: String,
      enum: ["general", "medicine"],
      default: "general",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      trim: true,
      default: "",
    },

    barcode: {
      type: String,
      trim: true,
      default: "",
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
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

    currentStock: {
      type: Number,
      default: 0,
    },

    minimumStock: {
      type: Number,
      default: 0,
    },

    taxRate: {
      type: Number,
      default: 0,
    },

    hsnCode: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    medicineDetails: {
      genericName: {
        type: String,
        default: "",
      },

      composition: {
        type: String,
        default: "",
      },

      manufacturer: {
        type: String,
        default: "",
      },

      medicineType: {
        type: String,
        enum: [
          "",
          "tablet",
          "capsule",
          "syrup",
          "injection",
          "cream",
          "drops",
          "powder",
          "other",
        ],
        default: "",
      },

      rackNumber: {
        type: String,
        default: "",
      },

      prescriptionRequired: {
        type: Boolean,
        default: false,
      },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ tenantId: 1, storeId: 1, name: 1 });
productSchema.index({ tenantId: 1, storeId: 1, sku: 1 });
productSchema.index({ tenantId: 1, storeId: 1, barcode: 1 });
productSchema.index({ tenantId: 1, storeId: 1, productType: 1 });
productSchema.index({ tenantId: 1, storeId: 1, currentStock: 1 });
productSchema.index({
  name: "text",
  sku: "text",
  barcode: "text",
  "medicineDetails.genericName": "text",
  "medicineDetails.composition": "text",
  "medicineDetails.manufacturer": "text",
});

export default mongoose.model("Product", productSchema);
