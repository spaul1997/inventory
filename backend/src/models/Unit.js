import mongoose from "mongoose";

const unitSchema = new mongoose.Schema(
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

    code: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    shortName: {
      type: String,
      default: "",
      trim: true,
    },

    symbol: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      enum: ["Count", "Weight", "Length", "Volume"],
      default: "Count",
    },

    decimalPlaces: {
      type: Number,
      default: 0,
    },

    baseUnit: {
      type: String,
      default: "",
      trim: true,
    },

    conversionFactor: {
      type: Number,
      default: 0,
    },

    description: {
      type: String,
      default: "",
    },

    conversions: [
      {
        from: {
          type: String,
          default: "",
        },
        to: {
          type: String,
          default: "",
        },
        factor: {
          type: Number,
          default: 0,
        },
      },
    ],

    status: {
      type: String,
      enum: ["Active", "Inactive", "Draft", "active", "inactive"],
      default: "Active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

unitSchema.index({ tenantId: 1, storeId: 1, name: 1 });
unitSchema.index(
  { tenantId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } }
);
unitSchema.index({ tenantId: 1, type: 1 });
unitSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model("Unit", unitSchema);
