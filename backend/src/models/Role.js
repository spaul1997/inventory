import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    roleType: {
      type: String,
      enum: ["saas", "store"],
      required: true,
    },

    isSystemRole: {
      type: Boolean,
      default: false,
    },

    permissions: [
      {
        type: String,
      },
    ],

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model("Role", roleSchema);
