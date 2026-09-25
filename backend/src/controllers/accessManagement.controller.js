import bcrypt from "bcryptjs";
import Role from "../models/Role.js";
import Tenant from "../models/Tenant.js";
import User from "../models/User.js";

const normalize = (value) => String(value ?? "").trim();
const normalizeEmail = (value) => normalize(value).toLowerCase();
const userStatuses = ["active", "inactive", "blocked"];
const roleStatuses = ["active", "inactive"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const accessPermissionOptions = [
  { key: "dashboard.view", label: "Dashboard", description: "View company dashboards and summaries." },
  { key: "master.manage", label: "Master Setup", description: "Create and update master data." },
  { key: "access.manage", label: "Users & Roles", description: "Manage company users, roles, and permissions." },
  { key: "purchase.manage", label: "Purchase Management", description: "Manage purchasing workflows and records." },
  { key: "stock.manage", label: "Stock Management", description: "Manage stock, warehouses, and inventory records." },
  { key: "manufacturing.manage", label: "Manufacturing", description: "Manage manufacturing workflows and records." },
  { key: "sales.manage", label: "Sales", description: "Manage sales workflows and records." },
  { key: "reports.view", label: "Reports", description: "View inventory, manufacturing, and sales reports." },
  { key: "settings.manage", label: "Settings", description: "Manage company-level application settings." },
];

const allowedPermissions = new Set(accessPermissionOptions.map((permission) => permission.key));

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function duplicateMessage(error) {
  if (error?.code !== 11000) return "";
  const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "record";
  return `${field} already exists.`;
}

function normalizePermissions(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalize))].filter((permission) => allowedPermissions.has(permission));
}

function serializeUser(user) {
  const role = user.roleId && typeof user.roleId === "object" ? user.roleId : null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    employeeCode: user.employeeCode || "",
    phone: user.phone || "",
    roleId: role?._id ? String(role._id) : String(user.roleId || ""),
    roleName: role?.name || "Unassigned",
    isSystemRole: Boolean(role?.isSystemRole),
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function serializeRole(role, userCount = 0) {
  return {
    id: String(role._id),
    name: role.name,
    roleType: role.roleType,
    isSystemRole: Boolean(role.isSystemRole),
    permissions: Array.isArray(role.permissions) ? role.permissions : [],
    status: role.status,
    userCount,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

async function requireAccessManager(req) {
  const requester = await User.findOne({
    _id: req.auth.sub,
    tenantId: req.auth.tenantId,
    status: "active",
  }).populate("roleId", "permissions status");

  const permissions = requester?.roleId?.permissions || [];
  const allowed = requester?.roleId?.status === "active"
    && (permissions.includes("*") || permissions.includes("access.manage"));

  if (!allowed) {
    throw httpError(403, "You do not have permission to manage users and roles.");
  }

  return requester;
}

async function findTenantRole(tenantId, roleId, { requireActive = true } = {}) {
  const role = await Role.findOne({ _id: roleId, tenantId });
  if (!role || (requireActive && role.status !== "active")) {
    throw httpError(400, "Select a valid active company role.");
  }
  return role;
}

async function enforceAvailableUserSeat(tenantId) {
  const [tenant, usedSeats] = await Promise.all([
    Tenant.findById(tenantId).select("maxUsers"),
    User.countDocuments({ tenantId, status: { $ne: "inactive" } }),
  ]);

  if (!tenant) throw httpError(404, "Company not found.");

  const maxUsers = Number.isInteger(Number(tenant.maxUsers)) && Number(tenant.maxUsers) > 0
    ? Number(tenant.maxUsers)
    : 10;

  if (usedSeats >= maxUsers) {
    throw httpError(409, `Maximum user limit reached (${maxUsers}). Increase the company limit before activating another user.`);
  }
}

async function populatedUser(userId, tenantId) {
  return User.findOne({ _id: userId, tenantId })
    .populate("roleId", "name isSystemRole status")
    .lean();
}

export async function getAccessManagement(req, res, next) {
  try {
    await requireAccessManager(req);

    const [tenant, users, roles] = await Promise.all([
      Tenant.findById(req.auth.tenantId).select("businessName maxUsers").lean(),
      User.find({ tenantId: req.auth.tenantId })
        .populate("roleId", "name isSystemRole status")
        .sort({ createdAt: -1, name: 1 })
        .lean(),
      Role.find({ tenantId: req.auth.tenantId }).sort({ isSystemRole: -1, name: 1 }).lean(),
    ]);

    if (!tenant) return res.status(404).json({ message: "Company not found." });

    const userCountByRole = users.reduce((counts, user) => {
      const roleId = user.roleId?._id ? String(user.roleId._id) : String(user.roleId || "");
      if (roleId) counts.set(roleId, (counts.get(roleId) || 0) + 1);
      return counts;
    }, new Map());

    const maxUsers = Number.isInteger(Number(tenant.maxUsers)) && Number(tenant.maxUsers) > 0
      ? Number(tenant.maxUsers)
      : 10;
    const usedSeats = users.filter((user) => user.status !== "inactive").length;

    return res.status(200).json({
      company: {
        id: String(tenant._id),
        businessName: tenant.businessName,
        maxUsers,
        usedSeats,
        availableSeats: Math.max(0, maxUsers - usedSeats),
      },
      users: users.map(serializeUser),
      roles: roles.map((role) => serializeRole(role, userCountByRole.get(String(role._id)) || 0)),
      permissionOptions: accessPermissionOptions,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCompanyUser(req, res, next) {
  try {
    await requireAccessManager(req);

    const name = normalize(req.body.name);
    const email = normalizeEmail(req.body.email);
    const employeeCode = normalize(req.body.employeeCode).toUpperCase();
    const phone = normalize(req.body.phone);
    const password = String(req.body.password || "");
    const roleId = normalize(req.body.roleId);
    const status = normalize(req.body.status || "active").toLowerCase();

    if (!name || !email || !employeeCode || !password || !roleId) {
      return res.status(400).json({ message: "Name, email, employee code, password, and role are required." });
    }
    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    if (!userStatuses.includes(status)) {
      return res.status(400).json({ message: "Select a valid user status." });
    }

    const role = await findTenantRole(req.auth.tenantId, roleId);

    const [emailExists, employeeCodeExists] = await Promise.all([
      User.exists({ email }),
      User.exists({ tenantId: req.auth.tenantId, employeeCode }),
    ]);
    if (emailExists) return res.status(409).json({ message: "Email already exists." });
    if (employeeCodeExists) return res.status(409).json({ message: "Employee code already exists in this company." });

    if (status !== "inactive") {
      await enforceAvailableUserSeat(req.auth.tenantId);
    }

    const user = await User.create({
      tenantId: req.auth.tenantId,
      storeId: null,
      name,
      email,
      employeeCode,
      phone,
      password: await bcrypt.hash(password, 12),
      roleId: role._id,
      userType: "store_user",
      status,
    });

    const populated = await populatedUser(user._id, req.auth.tenantId);
    return res.status(201).json({ user: serializeUser(populated) });
  } catch (error) {
    const message = duplicateMessage(error);
    if (message) return res.status(409).json({ message });
    next(error);
  }
}

export async function updateCompanyUser(req, res, next) {
  try {
    await requireAccessManager(req);

    const user = await User.findOne({ _id: req.params.id, tenantId: req.auth.tenantId })
      .populate("roleId", "isSystemRole");
    if (!user) return res.status(404).json({ message: "User not found." });

    const name = normalize(req.body.name);
    const email = normalizeEmail(req.body.email);
    const employeeCode = normalize(req.body.employeeCode).toUpperCase();
    const phone = normalize(req.body.phone);
    const password = String(req.body.password || "");
    const roleId = normalize(req.body.roleId);
    const status = normalize(req.body.status || user.status).toLowerCase();

    if (!name || !email || !employeeCode || !roleId) {
      return res.status(400).json({ message: "Name, email, employee code, and role are required." });
    }
    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (password && password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    if (!userStatuses.includes(status)) {
      return res.status(400).json({ message: "Select a valid user status." });
    }

    const role = await findTenantRole(req.auth.tenantId, roleId);
    const changingOwnAccess = String(user._id) === String(req.auth.sub)
      && (String(user.roleId?._id || user.roleId) !== String(role._id) || status !== "active");
    if (changingOwnAccess) {
      return res.status(400).json({ message: "You cannot change your own role or deactivate your own account." });
    }

    const removesSystemAdmin = user.roleId?.isSystemRole
      && (!role.isSystemRole || status !== "active");
    if (removesSystemAdmin) {
      const otherSystemRoles = await Role.find({
        tenantId: req.auth.tenantId,
        isSystemRole: true,
      }).select("_id").lean();
      const otherActiveAdmins = await User.countDocuments({
        _id: { $ne: user._id },
        tenantId: req.auth.tenantId,
        roleId: { $in: otherSystemRoles.map((item) => item._id) },
        status: "active",
      });
      if (otherActiveAdmins === 0) {
        return res.status(409).json({ message: "At least one active Super Admin user is required." });
      }
    }

    const [emailExists, employeeCodeExists] = await Promise.all([
      User.exists({ _id: { $ne: user._id }, email }),
      User.exists({ _id: { $ne: user._id }, tenantId: req.auth.tenantId, employeeCode }),
    ]);
    if (emailExists) return res.status(409).json({ message: "Email already exists." });
    if (employeeCodeExists) return res.status(409).json({ message: "Employee code already exists in this company." });

    if (user.status === "inactive" && status !== "inactive") {
      await enforceAvailableUserSeat(req.auth.tenantId);
    }

    user.name = name;
    user.email = email;
    user.employeeCode = employeeCode;
    user.phone = phone;
    user.roleId = role._id;
    user.status = status;
    if (password) user.password = await bcrypt.hash(password, 12);
    await user.save();

    const populated = await populatedUser(user._id, req.auth.tenantId);
    return res.status(200).json({ user: serializeUser(populated) });
  } catch (error) {
    if (error?.name === "CastError") return res.status(404).json({ message: "User not found." });
    const message = duplicateMessage(error);
    if (message) return res.status(409).json({ message });
    next(error);
  }
}

export async function createCompanyRole(req, res, next) {
  try {
    await requireAccessManager(req);

    const name = normalize(req.body.name);
    const status = normalize(req.body.status || "active").toLowerCase();
    const permissions = normalizePermissions(req.body.permissions);

    if (!name) return res.status(400).json({ message: "Role name is required." });
    if (!roleStatuses.includes(status)) {
      return res.status(400).json({ message: "Select a valid role status." });
    }

    const exists = await Role.exists({
      tenantId: req.auth.tenantId,
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (exists) return res.status(409).json({ message: "Role name already exists." });

    const role = await Role.create({
      tenantId: req.auth.tenantId,
      name,
      roleType: "store",
      isSystemRole: false,
      permissions,
      status,
    });

    return res.status(201).json({ role: serializeRole(role) });
  } catch (error) {
    const message = duplicateMessage(error);
    if (message) return res.status(409).json({ message });
    next(error);
  }
}

export async function updateCompanyRole(req, res, next) {
  try {
    const requester = await requireAccessManager(req);

    const role = await Role.findOne({ _id: req.params.id, tenantId: req.auth.tenantId });
    if (!role) return res.status(404).json({ message: "Role not found." });
    if (role.isSystemRole) {
      return res.status(400).json({ message: "System roles cannot be edited." });
    }

    const name = normalize(req.body.name);
    const status = normalize(req.body.status || role.status).toLowerCase();
    const permissions = normalizePermissions(req.body.permissions);

    if (!name) return res.status(400).json({ message: "Role name is required." });
    if (!roleStatuses.includes(status)) {
      return res.status(400).json({ message: "Select a valid role status." });
    }

    const editingOwnRole = String(requester.roleId?._id || requester.roleId) === String(role._id);
    if (editingOwnRole && (status !== "active" || !permissions.includes("access.manage"))) {
      return res.status(400).json({ message: "You cannot remove access management permission from your own role." });
    }

    const nameExists = await Role.exists({
      _id: { $ne: role._id },
      tenantId: req.auth.tenantId,
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (nameExists) return res.status(409).json({ message: "Role name already exists." });

    if (status === "inactive") {
      const assignedActiveUsers = await User.countDocuments({
        tenantId: req.auth.tenantId,
        roleId: role._id,
        status: { $ne: "inactive" },
      });
      if (assignedActiveUsers > 0) {
        return res.status(409).json({ message: "Reassign or deactivate users before making this role inactive." });
      }
    }

    role.name = name;
    role.status = status;
    role.permissions = permissions;
    await role.save();

    const userCount = await User.countDocuments({ tenantId: req.auth.tenantId, roleId: role._id });
    return res.status(200).json({ role: serializeRole(role, userCount) });
  } catch (error) {
    if (error?.name === "CastError") return res.status(404).json({ message: "Role not found." });
    const message = duplicateMessage(error);
    if (message) return res.status(409).json({ message });
    next(error);
  }
}
