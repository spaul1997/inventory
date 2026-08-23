import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
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

    key: {
      type: String,
      required: true,
    },

    prefix: {
      type: String,
      default: "",
    },

    sequence: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

counterSchema.index({ tenantId: 1, storeId: 1, key: 1 }, { unique: true });

export default mongoose.model("Counter", counterSchema);
