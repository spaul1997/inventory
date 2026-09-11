import cors from "cors";
import express from "express";
import helmet from "helmet";
import routes from "./routes/index.js";

const app = express();

const corsOrigins = [
  ...(process.env.CORS_ORIGIN || "").split(","),
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
]
  .map((origin) => String(origin || "").trim().replace(/\/$/, ""))
  .filter(Boolean);

const devCorsOrigins = ["http://localhost:5173", "https://ims.deplocode.com"];
const allowedCorsOrigins = new Set([
  ...corsOrigins,
  ...(process.env.NODE_ENV === "production" ? [] : devCorsOrigins),
]);

app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/$/, "");
      if (allowedCorsOrigins.size === 0 || allowedCorsOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

app.use((error, req, res, next) => {
  const statusCode = Number.isInteger(error.statusCode)
    ? error.statusCode
    : 500;

  res.status(statusCode).json({
    message: error.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  });
});

export default app;
