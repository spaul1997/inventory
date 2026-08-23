import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductBatch",
      default: null,
    },

    batchNumber: {
      type: String,
      default: "",
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    sellingPrice: {
      type: Number,
      required: true,
    },

    mrp: {
      type: Number,
      default: 0,
    },

    taxRate: {
      type: Number,
      default: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
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

    invoiceNumber: {
      type: String,
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    saleDate: {
      type: Date,
      default: Date.now,
    },

    items: [saleItemSchema],

    subtotal: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    dueAmount: {
      type: Number,
      default: 0,
    },

    paymentMode: {
      type: String,
      enum: ["cash", "upi", "card", "bank", "credit", "mixed"],
      default: "cash",
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "paid",
    },

    prescription: {
      isRequired: {
        type: Boolean,
        default: false,
      },

      doctorName: {
        type: String,
        default: "",
      },

      prescriptionNumber: {
        type: String,
        default: "",
      },

      prescriptionFile: {
        type: String,
        default: "",
      },
    },

    notes: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["completed", "cancelled"],
      default: "completed",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

saleSchema.index(
  { tenantId: 1, storeId: 1, invoiceNumber: 1 },
  { unique: true }
);

saleSchema.index({ tenantId: 1, storeId: 1, saleDate: -1 });
saleSchema.index({ tenantId: 1, storeId: 1, customerId: 1 });

export default mongoose.model("Sale", saleSchema);
