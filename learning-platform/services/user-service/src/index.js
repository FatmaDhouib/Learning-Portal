/**
 * User Service — Express application entry point.
 * Handles authentication, JWT issuance, user profiles and roles.
 * Port: 8002
 */
require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const mongoose   = require("mongoose");
const Redis      = require("ioredis");
const rateLimit  = require("express-rate-limit");

const authRoutes  = require("./routes/auth");
const usersRoutes = require("./routes/users");
const { errorHandler } = require("./middleware/errorHandler");

const app  = express();
const PORT = process.env.PORT || 8002;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"] }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

// Rate limiting – stricter on auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Too many requests" } });
const globalLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 200 });
app.use(globalLimiter);

// ── Redis ────────────────────────────────────────────────────────────────────
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/1");
app.set("redis", redis);

// ── MongoDB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/userdb")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => { console.error("❌ MongoDB connection error:", err); process.exit(1); });

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/auth",  authLimiter, authRoutes);
app.use("/users", usersRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", service: "user-service" }));

// ── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => console.log(`🚀 User Service running on port ${PORT}`));

module.exports = app;
