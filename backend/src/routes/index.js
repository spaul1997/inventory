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
import {
  createPurchaseDocument,
  listPurchaseDocuments,
  updatePurchaseDocument,
} from "../controllers/purchaseManagement.controller.js";
import {
  createStockDocument,
  getStockState,
  listStockDocuments,
  updateStockDocument,
  updateStockState,
} from "../controllers/stockManagement.controller.js";
import {
  exportInventoryReport,
  getInventoryReport,
} from "../controllers/inventoryReports.controller.js";
import {
  createCompanyRole,
  createCompanyUser,
  getAccessManagement,
  updateCompanyRole,
  updateCompanyUser,
} from "../controllers/accessManagement.controller.js";

const router = Router();

const companyModuleKeys = ["purchase", "sales", "manufacturing"];
const companyStatuses = ["active", "inactive", "suspended"];
const subscriptionStatuses = ["trial", "active", "expired", "cancelled", "suspended"];

const normalize = (value) => String(value ?? "").trim();
const normalizeEmail = (value) => normalize(value).toLowerCase();
const normalizePhone = (value) => normalize(value).replace(/\D/g, "");
const normalizeCompanyModules = (value, fallback = companyModuleKeys) => {
  if (!Array.isArray(value)) return [...fallback];
  return [...new Set(value.map((item) => normalize(item).toLowerCase()))]
    .filter((item) => companyModuleKeys.includes(item));
};
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
    maxUsers: Number.isInteger(Number(tenant.maxUsers)) && Number(tenant.maxUsers) > 0
      ? Number(tenant.maxUsers)
      : 10,
    monthlyAmount: Number.isFinite(Number(tenant.monthlyAmount)) && Number(tenant.monthlyAmount) >= 0
      ? Number(tenant.monthlyAmount)
      : 0,
    enabledModules: normalizeCompanyModules(tenant.enabledModules),
    status: tenant.status,
    subscriptionStatus: tenant.subscriptionStatus,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
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
      .populate("tenantId", "businessName ownerName email phone address gstNumber maxUsers monthlyAmount enabledModules status subscriptionStatus")
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
      .populate("tenantId", "businessName ownerName email phone address gstNumber maxUsers monthlyAmount enabledModules status subscriptionStatus");

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
      .select("businessName ownerName email phone address gstNumber maxUsers monthlyAmount enabledModules status subscriptionStatus createdAt updatedAt")
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

router.get("/master/access-management", requireAuth, requireCompanyUser, getAccessManagement);

router.post("/master/users", requireAuth, requireCompanyUser, createCompanyUser);

router.put("/master/users/:id", requireAuth, requireCompanyUser, updateCompanyUser);

router.post("/master/roles", requireAuth, requireCompanyUser, createCompanyRole);

router.put("/master/roles/:id", requireAuth, requireCompanyUser, updateCompanyRole);

router.get("/master/:masterEntity", requireAuth, requireCompanyUser, listMasterRows);

router.post("/master/:masterEntity", requireAuth, requireCompanyUser, createMasterRow);

router.put("/master/:masterEntity/:code", requireAuth, requireCompanyUser, updateMasterRow);

router.get("/purchase-management/:entityKey", requireAuth, requireCompanyUser, listPurchaseDocuments);

router.post("/purchase-management/:entityKey", requireAuth, requireCompanyUser, createPurchaseDocument);

router.put("/purchase-management/:entityKey/:id", requireAuth, requireCompanyUser, updatePurchaseDocument);

router.get("/stock-management/state", requireAuth, requireCompanyUser, getStockState);

router.put("/stock-management/state", requireAuth, requireCompanyUser, updateStockState);

router.get("/stock-management/documents/:entityKey", requireAuth, requireCompanyUser, listStockDocuments);

router.post("/stock-management/documents/:entityKey", requireAuth, requireCompanyUser, createStockDocument);

router.put("/stock-management/documents/:entityKey/:id", requireAuth, requireCompanyUser, updateStockDocument);

router.get("/inventory-reports/:reportKey/export", requireAuth, requireCompanyUser, exportInventoryReport);

router.get("/inventory-reports/:reportKey", requireAuth, requireCompanyUser, getInventoryReport);

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
        .select("businessName ownerName email phone maxUsers monthlyAmount enabledModules status subscriptionStatus createdAt")
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
      recentCompanies: recentCompanies.map(serializeCompany),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/saas-admin/companies", requireSpecialAdmin, async (req, res, next) => {
  try {
    const companies = await Tenant.find({})
      .select("businessName ownerName email phone address gstNumber maxUsers monthlyAmount enabledModules status subscriptionStatus createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({ companies: companies.map(serializeCompany) });
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
    const maxUsers = Number(req.body.maxUsers);
    const monthlyAmount = Number(req.body.monthlyAmount);
    const enabledModules = normalizeCompanyModules(req.body.enabledModules);
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

    if (!Number.isInteger(maxUsers) || maxUsers < 1) {
      return res.status(400).json({
        message: "Maximum users must be a whole number greater than zero.",
      });
    }

    if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
      return res.status(400).json({
        message: "Monthly amount must be greater than zero.",
      });
    }

    if (enabledModules.length === 0) {
      return res.status(400).json({
        message: "Select at least one company module.",
      });
    }

    const tenant = await Tenant.create({
      businessName,
      ownerName,
      email,
      phone,
      address,
      gstNumber,
      maxUsers,
      monthlyAmount,
      enabledModules,
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
      company: serializeCompany(tenant),
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

router.put("/saas-admin/companies/:id", requireSpecialAdmin, async (req, res, next) => {
  try {
    const businessName = normalize(req.body.businessName);
    const ownerName = normalize(req.body.ownerName);
    const email = normalizeEmail(req.body.email);
    const phone = normalize(req.body.phone);
    const address = normalize(req.body.address);
    const gstNumber = normalize(req.body.gstNumber).toUpperCase();
    const maxUsers = Number(req.body.maxUsers);
    const monthlyAmount = Number(req.body.monthlyAmount);
    const enabledModules = normalizeCompanyModules(req.body.enabledModules, []);
    const status = normalize(req.body.status).toLowerCase();
    const subscriptionStatus = normalize(req.body.subscriptionStatus).toLowerCase();

    if (!businessName || !ownerName || !email || !phone) {
      return res.status(400).json({ message: "Business name, owner, email, and phone are required." });
    }

    if (enabledModules.length === 0) {
      return res.status(400).json({ message: "Select at least one company module." });
    }

    if (!Number.isInteger(maxUsers) || maxUsers < 1) {
      return res.status(400).json({ message: "Maximum users must be a whole number greater than zero." });
    }

    if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
      return res.status(400).json({ message: "Monthly amount must be greater than zero." });
    }

    if (!companyStatuses.includes(status)) {
      return res.status(400).json({ message: "Select a valid company status." });
    }

    if (!subscriptionStatuses.includes(subscriptionStatus)) {
      return res.status(400).json({ message: "Select a valid subscription status." });
    }

    const company = await Tenant.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    company.businessName = businessName;
    company.ownerName = ownerName;
    company.email = email;
    company.phone = phone;
    company.address = address;
    company.gstNumber = gstNumber;
    company.maxUsers = maxUsers;
    company.monthlyAmount = monthlyAmount;
    company.enabledModules = enabledModules;
    company.status = status;
    company.subscriptionStatus = subscriptionStatus;
    await company.save();

    return res.status(200).json({ company: serializeCompany(company) });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ message: "Company not found." });
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
    const [payments, companies] = await Promise.all([
      SaasPayment.find({})
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(200)
        .populate("tenantId", "businessName ownerName email phone address gstNumber")
        .populate("planId", "planName planCode monthlyPrice yearlyPrice")
        .populate("subscriptionId", "billingCycle startDate endDate amount status")
        .lean(),
      Tenant.find({})
        .select("businessName ownerName email phone monthlyAmount status")
        .sort({ businessName: 1 })
        .lean(),
    ]);

    return res.status(200).json({ payments, companies });
  } catch (error) {
    next(error);
  }
});

router.post("/saas-admin/payments", requireSpecialAdmin, async (req, res, next) => {
  let createdSubscriptionId = null;
  let createdPaymentId = null;

  try {
    const tenantId = normalize(req.body.tenantId);
    const billingMonth = normalize(req.body.billingMonth);
    const amount = Number(req.body.amount);
    const paymentMode = normalize(req.body.paymentMode).toLowerCase();
    const paymentStatus = normalize(req.body.paymentStatus).toLowerCase();
    const transactionId = normalize(req.body.transactionId);
    const notes = normalize(req.body.notes);
    const paymentDateValue = normalize(req.body.paymentDate);
    const paymentModes = ["cash", "bank", "upi", "card", "razorpay", "stripe", "other"];
    const paymentStatuses = ["pending", "success", "failed"];

    if (!tenantId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(billingMonth)) {
      return res.status(400).json({ message: "Company and billing month are required." });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Enter a valid invoice amount greater than zero." });
    }

    if (!paymentModes.includes(paymentMode)) {
      return res.status(400).json({ message: "Select a valid payment mode." });
    }

    if (!paymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: "Select a valid payment status." });
    }

    const paymentDate = paymentDateValue
      ? new Date(`${paymentDateValue}T00:00:00.000Z`)
      : new Date();
    if (Number.isNaN(paymentDate.getTime())) {
      return res.status(400).json({ message: "Select a valid payment date." });
    }

    const [year, month] = billingMonth.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const company = await Tenant.findById(tenantId);

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    if (paymentStatus === "success") {
      const existingSubscription = await Subscription.findOne({
        tenantId: company._id,
        billingCycle: "monthly",
        startDate: { $lt: endDate },
        endDate: { $gte: startDate },
        status: "active",
      }).lean();

      if (existingSubscription) {
        return res.status(409).json({ message: "An active monthly subscription already exists for this billing month." });
      }
    }

    const subscription = await Subscription.create({
      tenantId: company._id,
      planId: null,
      billingCycle: "monthly",
      startDate,
      endDate,
      amount,
      status: paymentStatus === "success" ? "active" : "suspended",
      autoRenew: false,
      notes,
    });
    createdSubscriptionId = subscription._id;

    const invoiceNumber = `SINV-${billingMonth.replace("-", "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const payment = await SaasPayment.create({
      invoiceNumber,
      tenantId: company._id,
      subscriptionId: subscription._id,
      planId: null,
      amount,
      paymentDate,
      paymentMode,
      transactionId,
      paymentStatus,
      notes,
    });
    createdPaymentId = payment._id;

    if (paymentStatus === "success") {
      company.subscriptionStatus = "active";
      await company.save();
      await Subscription.updateMany(
        { tenantId: company._id, _id: { $ne: subscription._id }, status: "active", endDate: { $lt: startDate } },
        { $set: { status: "expired" } }
      ).catch(() => {});
    }

    const populatedPayment = {
      ...payment.toObject(),
      tenantId: {
        _id: company._id,
        businessName: company.businessName,
        ownerName: company.ownerName,
        email: company.email,
        phone: company.phone,
        address: company.address,
        gstNumber: company.gstNumber,
      },
      planId: null,
      subscriptionId: {
        _id: subscription._id,
        billingCycle: subscription.billingCycle,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: subscription.amount,
        status: subscription.status,
      },
    };

    return res.status(201).json({
      payment: populatedPayment,
      company: serializeCompany(company),
    });
  } catch (error) {
    if (createdPaymentId) {
      await SaasPayment.findByIdAndDelete(createdPaymentId).catch(() => {});
    }
    if (createdSubscriptionId) {
      await Subscription.findByIdAndDelete(createdSubscriptionId).catch(() => {});
    }

    if (error?.name === "CastError") {
      return res.status(400).json({ message: "Select a valid company." });
    }

    const duplicateMessage = formatDuplicateError(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage });
    }

    next(error);
  }
});

router.patch("/saas-admin/payments/:id/status", requireSpecialAdmin, async (req, res, next) => {
  try {
    const paymentStatus = normalize(req.body.paymentStatus).toLowerCase();
    const paymentStatuses = ["pending", "success", "failed", "refunded"];

    if (!paymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: "Select a valid payment status." });
    }

    const payment = await SaasPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment invoice not found." });
    }

    const [subscription, company] = await Promise.all([
      Subscription.findById(payment.subscriptionId),
      Tenant.findById(payment.tenantId),
    ]);

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    if (paymentStatus === "success" && subscription) {
      const overlappingSubscription = await Subscription.findOne({
        _id: { $ne: subscription._id },
        tenantId: company._id,
        billingCycle: "monthly",
        startDate: { $lte: subscription.endDate },
        endDate: { $gte: subscription.startDate },
        status: "active",
      }).lean();

      if (overlappingSubscription) {
        return res.status(409).json({ message: "An active monthly subscription already exists for this billing month." });
      }
    }

    payment.paymentStatus = paymentStatus;

    if (subscription) {
      subscription.status = paymentStatus === "success"
        ? "active"
        : paymentStatus === "refunded"
          ? "cancelled"
          : "suspended";
      await subscription.save();
    }

    if (paymentStatus === "success") {
      company.subscriptionStatus = "active";
    } else if (subscription) {
      const now = new Date();
      const coversToday = subscription.startDate <= now && subscription.endDate >= now;

      if (coversToday) {
        const anotherCurrentSubscription = await Subscription.exists({
          _id: { $ne: subscription._id },
          tenantId: company._id,
          status: "active",
          startDate: { $lte: now },
          endDate: { $gte: now },
        });

        if (!anotherCurrentSubscription) {
          company.subscriptionStatus = paymentStatus === "refunded" ? "cancelled" : "suspended";
        }
      }
    }

    await Promise.all([payment.save(), company.save()]);

    const populatedPayment = await SaasPayment.findById(payment._id)
      .populate("tenantId", "businessName ownerName email phone address gstNumber")
      .populate("planId", "planName planCode monthlyPrice yearlyPrice")
      .populate("subscriptionId", "billingCycle startDate endDate amount status")
      .lean();

    return res.status(200).json({
      payment: populatedPayment,
      company: serializeCompany(company),
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ message: "Payment invoice not found." });
    }

    next(error);
  }
});

export default router;
