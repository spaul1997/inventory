import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = Router();

const normalize = (value) => String(value ?? "").trim();
const normalizeEmail = (value) => normalize(value).toLowerCase();
const normalizePhone = (value) => normalize(value).replace(/\D/g, "");

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

router.get("/", (req, res) => {
  res.status(200).json({
    message: "IMS API",
    status: "ready",
  });
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const loginId = normalize(req.body.loginId ?? req.body.email ?? req.body.employeeCode ?? req.body.mobile);
    const email = normalizeEmail(loginId);
    const password = String(req.body.password ?? "");
    const phone = normalizePhone(loginId);

    if (!password || !loginId) {
      return res.status(400).json({ message: "Employee code, email, or mobile and password are required." });
    }

    const specialAdminMatches =
      process.env.SPECIAL_ADMIN_PASSWORD_HASH &&
      (await verifyPassword(password, process.env.SPECIAL_ADMIN_PASSWORD_HASH)) &&
      (loginId === normalize(process.env.SPECIAL_ADMIN_EMPLOYEE_CODE) ||
        email === normalizeEmail(process.env.SPECIAL_ADMIN_EMAIL) ||
        phone === normalizePhone(process.env.SPECIAL_ADMIN_MOBILE));

    if (specialAdminMatches) {
      const user = {
        id: "special-admin",
        name: process.env.SPECIAL_ADMIN_NAME || "Special Admin",
        email: normalizeEmail(process.env.SPECIAL_ADMIN_EMAIL),
        mobile: process.env.SPECIAL_ADMIN_MOBILE || "",
        employeeCode: normalize(process.env.SPECIAL_ADMIN_EMPLOYEE_CODE),
        userType: "saas_admin",
      };

      return res.status(200).json({
        token: createSessionToken({ sub: user.id, userType: user.userType, email: user.email }),
        user,
      });
    }

    const user = await User.findOne({
      $or: [
        { employeeCode: loginId },
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    }).select("+password");

    if (!user || user.status !== "active" || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json({
      token: createSessionToken({ sub: user.id, userType: user.userType, email: user.email }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeCode: user.employeeCode,
        phone: user.phone,
        userType: user.userType,
        tenantId: user.tenantId,
        storeId: user.storeId,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
