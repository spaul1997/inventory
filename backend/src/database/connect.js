import mongoose from "mongoose";

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_STRING || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Missing MONGODB_STRING. Add it to backend/.env.");
  }

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: toPositiveNumber(process.env.DB_MAX_POOL_SIZE, 50),
      minPoolSize: toPositiveNumber(process.env.DB_MIN_POOL_SIZE, 5),
      serverSelectionTimeoutMS: toPositiveNumber(
        process.env.DB_SERVER_SELECTION_TIMEOUT_MS,
        10000
      ),
      socketTimeoutMS: toPositiveNumber(process.env.DB_SOCKET_TIMEOUT_MS, 45000),
      connectTimeoutMS: toPositiveNumber(
        process.env.DB_CONNECT_TIMEOUT_MS,
        10000
      ),
    });

    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDB;
