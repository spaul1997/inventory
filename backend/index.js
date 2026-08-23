import mongoose from "mongoose";
import app from "./src/app.js";
import connectDB from "./src/database/connect.js";

const port = Number.parseInt(process.env.PORT ?? "5000", 10);
const host = process.env.HOST ?? "0.0.0.0";

let server;
let isShuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Shutting down...`);

  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out.");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await mongoose.disconnect();
    clearTimeout(forceExit);
    console.log("Shutdown complete.");
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(forceExit);
    console.error("Shutdown failed:", error);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(port, host, () => {
      console.log(`IMS API running on http://${host}:${port}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  shutdown("uncaughtException", 1);
});

startServer();
