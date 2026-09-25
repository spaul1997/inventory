import mongoose from "mongoose";

const stockManagementStateSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
      index: true,
    },
    balances: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    movements: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    batches: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
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

export default mongoose.model(
  "StockManagementState",
  stockManagementStateSchema,
  "stock_management_states"
);
