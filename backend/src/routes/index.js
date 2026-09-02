import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import "../models/Plan.js";
import SaasPayment from "../models/SaasPayment.js";
import Subscription from "../models/Subscription.js";
import Tenant from "../models/Tenant.js";
import Role from "../models/Role.js";
import User from "../models/User.js";
import { listStateDistricts } from "../controllers/location.controller.js";
import {
  createCategory,
  createMasterRow,
  createProductItem,
  listCategories,
  listMasterRows,
  listProductItems,
  updateCategory,
  updateMasterRow,
  updateProductItem,
} from "../controllers/master.controller.js";

const router = Router();

const normalize = (value) => String(value ?? "").trim();
const normalizeEmail = (value) => normalize(value).toLowerCase();
const normalizePhone = (value) => normalize(value).replace(/\D/g, "");
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPhoneRegex = (phone) => {
  if (!phone) return null;

  const digits = phone.split("").map(escapeRegex).join("\\D*");
  const optionalCountryCode = phone.length >= 10 ? "(?:\\d{1,3}\\D*)?" : "";

  return new RegExp(`^\\D*${optionalCountryCode}${digits}\\D*$`);
};

const slugCode = (value) =>
  normalize(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);

const hashValue = (value, algorithm) =>
  crypto.createHash(algorithm).update(String(value)).digest("hex");

const timingSafeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const verifyPassword = async (password, storedPassword) => {
  if (!password || !storedPassword) return false;

  const stored = String(storedPassword);

  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return bcrypt.compare(password, stored);
  }

  const candidates = [
    password,
    hashValue(password, "sha256"),
    hashValue(password, "sha512"),
  ];

  return candidates.some((candidate) => timingSafeEqual(candidate, stored));
};

const createSessionToken = (payload) => {
  const secret = process.env.JWT_SECRET || "ims-development-secret";
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
};

const verifySessionToken = (token) => {
  const [encodedPayload, signature] = String(token || "").split(".");
  if (!encodedPayload || !signature) return null;

  const secret = process.env.JWT_SECRET || "ims-development-secret";
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  if (!timingSafeEqual(signature, expectedSignature)) return null;

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

const requireSpecialAdmin = (req, res, next) => {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const payload = verifySessionToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (payload.role !== "special_admin") {
    return res.status(403).json({ message: "Special admin access required." });
  }

  req.auth = payload;
  return next();
};

const requireAuth = (req, res, next) => {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const payload = verifySessionToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Authentication required." });
  }

  req.auth = payload;
  return next();
};

const requireCompanyUser = (req, res, next) => {
  if (!req.auth?.tenantId) {
    return res.status(403).json({ message: "Company access required." });
  }

  return next();
};

const serializeCompany = (tenant) => {
  if (!tenant) return null;

  return {
    _id: tenant._id,
    businessName: tenant.businessName,
    ownerName: tenant.ownerName,
    email: tenant.email,
    phone: tenant.phone,
    address: tenant.address,
    gstNumber: tenant.gstNumber,
    status: tenant.status,
    subscriptionStatus: tenant.subscriptionStatus,
  };
};

const formatDuplicateError = (error) => {
  if (error?.code !== 11000) return null;

  const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "record";
  return `${field} already exists.`;
};

router.get("/", (req, res) => {
  res.status(200).json({
    message: "IMS API",
    status: "ready",
  });
});

router.get("/locations/state-districts", listStateDistricts);

router.get("/auth/me", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role === "special_admin") {
      return res.status(200).json({
        user: {
          id: "special-admin",
          name: process.env.SPECIAL_ADMIN_NAME || "Special Admin",
          email: normalizeEmail(process.env.SPECIAL_ADMIN_EMAIL),
          phone: process.env.SPECIAL_ADMIN_MOBILE || "",
          employeeCode: normalize(process.env.SPECIAL_ADMIN_EMPLOYEE_CODE),
          role: "special_admin",
          userType: "saas_admin",
        },
      });
    }

    const user = await User.findById(req.auth.sub)
      .populate("roleId", "name roleType permissions")
      .populate("tenantId", "businessName ownerName email phone address gstNumber status subscriptionStatus")
      .select("-password -refreshToken");

    if (
      !user ||
      user.status !== "active" ||
      (user.userType === "store_user" && !user.tenantId) ||
      user.tenantId?.status !== "active"
    ) {
      return res.status(401).json({ message: "Session is no longer active." });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeCode: user.employeeCode,
        phone: user.phone,
        role: user.roleId?.name || user.userType,
        permissions: user.roleId?.permissions || [],
        userType: user.userType,
        tenantId: user.tenantId?._id,
        storeId: user.storeId,
        company: serializeCompany(user.tenantId),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const loginId = normalize(
      req.body.loginId ??
        req.body.username ??
        req.body.email ??
        req.body.employeeCode ??
        req.body.phone ??
        req.body.mobile
    );
    const email = normalizeEmail(loginId);
    const password = String(req.body.password ?? "");
    const phone = normalizePhone(loginId);
    const phoneRegex = buildPhoneRegex(phone);

    if (!password || !loginId) {
      return res.status(400).json({ message: "Employee code, email, or phone and password are required." });
    }

    const specialAdminEmployeeCode = normalize(process.env.SPECIAL_ADMIN_EMPLOYEE_CODE);
    const specialAdminEmail = normalizeEmail(process.env.SPECIAL_ADMIN_EMAIL);
    const specialAdminPhone = normalizePhone(process.env.SPECIAL_ADMIN_MOBILE);
    const specialAdminPasswordMatches =
      (process.env.SPECIAL_ADMIN_PASSWORD_HASH &&
        (await verifyPassword(password, process.env.SPECIAL_ADMIN_PASSWORD_HASH))) ||
      (process.env.SPECIAL_ADMIN_PASSWORD &&
        timingSafeEqual(password, process.env.SPECIAL_ADMIN_PASSWORD));
    const specialAdminIdentifierMatches =
      (specialAdminEmployeeCode &&
        loginId.toLowerCase() === specialAdminEmployeeCode.toLowerCase()) ||
      (specialAdminEmail && email === specialAdminEmail) ||
      (specialAdminPhone && phone === specialAdminPhone);
    const specialAdminMatches = specialAdminPasswordMatches && specialAdminIdentifierMatches;

    if (specialAdminMatches) {
      const user = {
        id: "special-admin",
        name: process.env.SPECIAL_ADMIN_NAME || "Special Admin",
        email: specialAdminEmail,
        phone: process.env.SPECIAL_ADMIN_MOBILE || "",
        mobile: process.env.SPECIAL_ADMIN_MOBILE || "",
        employeeCode: specialAdminEmployeeCode,
        role: "special_admin",
        userType: "saas_admin",
      };

      return res.status(200).json({
        token: createSessionToken({ sub: user.id, role: user.role, userType: user.userType, email: user.email }),
        user,
      });
    }

    const user = await User.findOne({
      $or: [
        { employeeCode: new RegExp(`^${escapeRegex(loginId)}$`, "i") },
        { email },
        ...(phone ? [{ phone }, { phone: phoneRegex }] : []),
      ],
    })
      .select("+password")
      .populate("roleId", "name roleType permissions")
      .populate("tenantId", "businessName ownerName email phone address gstNumber status subscriptionStatus");

    if (
      !user ||
      user.status !== "active" ||
      (user.userType === "store_user" && !user.tenantId) ||
      user.tenantId?.status !== "active" ||
      !(await verifyPassword(password, user.password))
    ) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json({
      token: createSessionToken({
        sub: user.id,
        role: user.roleId?.name || user.userType,
        userType: user.userType,
        email: user.email,
        tenantId: user.tenantId?._id,
        storeId: user.storeId,
      }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeCode: user.employeeCode,
        phone: user.phone,
        role: user.roleId?.name || user.userType,
        permissions: user.roleId?.permissions || [],
        userType: user.userType,
        tenantId: user.tenantId?._id,
        storeId: user.storeId,
        company: serializeCompany(user.tenantId),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/company/profile", requireAuth, requireCompanyUser, async (req, res, next) => {
  try {
    const company = await Tenant.findById(req.auth.tenantId)
      .select("businessName ownerName email phone address gstNumber status subscriptionStatus createdAt updatedAt")
      .lean();

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    return res.status(200).json({ company });
  } catch (error) {
    next(error);
  }
});

router.get("/master/product-items", requireAuth, requireCompanyUser, listProductItems);

router.post("/master/product-items", requireAuth, requireCompanyUser, createProductItem);

router.put("/master/product-items/:code", requireAuth, requireCompanyUser, updateProductItem);

router.get("/master/categories", requireAuth, requireCompanyUser, listCategories);

router.post("/master/categories", requireAuth, requireCompanyUser, createCategory);

router.put("/master/categories/:code", requireAuth, requireCompanyUser, updateCategory);

router.get("/master/:masterEntity", requireAuth, requireCompanyUser, listMasterRows);

router.post("/master/:masterEntity", requireAuth, requireCompanyUser, createMasterRow);

router.put("/master/:masterEntity/:code", requireAuth, requireCompanyUser, updateMasterRow);

router.get("/saas-admin/dashboard", requireSpecialAdmin, async (req, res, next) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      trialCompanies,
      suspendedCompanies,
      activeSubscriptions,
      pendingPayments,
      paymentSummary,
      recentCompanies,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: "active" }),
      Tenant.countDocuments({ subscriptionStatus: "trial" }),
      Tenant.countDocuments({ status: "suspended" }),
      Subscription.countDocuments({ status: "active" }),
      SaasPayment.countDocuments({ paymentStatus: "pending" }),
      SaasPayment.aggregate([
        { $match: { paymentStatus: "success" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            paymentCount: { $sum: 1 },
          },
        },
      ]),
      Tenant.find({})
        .select("businessName ownerName email phone status subscriptionStatus createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return res.status(200).json({
      summary: {
        totalCompanies,
        activeCompanies,
        trialCompanies,
        suspendedCompanies,
        activeSubscriptions,
        pendingPayments,
        totalRevenue: paymentSummary[0]?.totalRevenue || 0,
        paymentCount: paymentSummary[0]?.paymentCount || 0,
      },
      recentCompanies,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/saas-admin/companies", requireSpecialAdmin, async (req, res, next) => {
  try {
    const companies = await Tenant.find({})
      .select("businessName ownerName email phone address gstNumber status subscriptionStatus createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({ companies });
  } catch (error) {
    next(error);
  }
});

router.post("/saas-admin/companies", requireSpecialAdmin, async (req, res, next) => {
  const createdIds = {
    tenantId: null,
    roleId: null,
    userId: null,
  };

  try {
    const businessName = normalize(req.body.businessName);
    const ownerName = normalize(req.body.ownerName);
    const email = normalizeEmail(req.body.email);
    const phone = normalize(req.body.phone);
    const address = normalize(req.body.address);
    const gstNumber = normalize(req.body.gstNumber).toUpperCase();
    const adminName = normalize(req.body.adminName) || ownerName;
    const adminEmail = normalizeEmail(req.body.adminEmail || email);
    const adminPhone = normalize(req.body.adminPhone) || phone;
    const adminEmployeeCode =
      normalize(req.body.adminEmployeeCode) ||
      `${slugCode(businessName) || "COMP"}-ADMIN`;
    const adminPassword = String(req.body.adminPassword || "");

    if (!businessName || !ownerName || !email || !phone || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        message: "Company details and super admin credentials are required.",
      });
    }

    if (adminPassword.length < 8) {
      return res.status(400).json({
        message: "Super admin password must be at least 8 characters.",
      });
    }

    const tenant = await Tenant.create({
      businessName,
      ownerName,
      email,
      phone,
      address,
      gstNumber,
      status: "active",
      subscriptionStatus: "trial",
    });
    createdIds.tenantId = tenant._id;

    const role = await Role.create({
      tenantId: tenant._id,
      name: "Super Admin",
      roleType: "store",
      isSystemRole: true,
      permissions: ["*"],
      status: "active",
    });
    createdIds.roleId = role._id;

    const user = await User.create({
      tenantId: tenant._id,
      storeId: null,
      name: adminName,
      email: adminEmail,
      employeeCode: adminEmployeeCode,
      phone: adminPhone,
      password: await bcrypt.hash(adminPassword, 12),
      roleId: role._id,
      userType: "store_user",
      status: "active",
    });
    createdIds.userId = user._id;

    tenant.createdBy = user._id;
    await tenant.save();

    return res.status(201).json({
      company: {
        _id: tenant._id,
        businessName: tenant.businessName,
        ownerName: tenant.ownerName,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        gstNumber: tenant.gstNumber,
        status: tenant.status,
        subscriptionStatus: tenant.subscriptionStatus,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
      superAdmin: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeCode: user.employeeCode,
        phone: user.phone,
        role: role.name,
        userType: user.userType,
      },
    });
  } catch (error) {
    if (createdIds.userId) {
      await User.findByIdAndDelete(createdIds.userId).catch(() => {});
    }
    if (createdIds.roleId) {
      await Role.findByIdAndDelete(createdIds.roleId).catch(() => {});
    }
    if (createdIds.tenantId) {
      await Tenant.findByIdAndDelete(createdIds.tenantId).catch(() => {});
    }

    const duplicateMessage = formatDuplicateError(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage });
    }

    next(error);
  }
});

router.get("/saas-admin/payments", requireSpecialAdmin, async (req, res, next) => {
  try {
    const payments = await SaasPayment.find({})
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(200)
      .populate("tenantId", "businessName email phone")
      .populate("planId", "planName planCode monthlyPrice yearlyPrice")
      .lean();

    return res.status(200).json({ payments });
  } catch (error) {
    next(error);
  }
});

export default router;
