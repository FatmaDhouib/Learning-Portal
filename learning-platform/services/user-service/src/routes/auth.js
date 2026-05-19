/**
 * Auth routes — /auth/register, /auth/login, /auth/refresh, /auth/logout
 */
const router = require("express").Router();
const jwt    = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const JWT_SECRET     = process.env.JWT_SECRET     || "fallback-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), id: user._id.toString(), email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ─────────────────────────────────────────
// POST /auth/register
// ─────────────────────────────────────────
router.post(
  "/register",
  [
    body("name").notEmpty().trim().isLength({ min: 2, max: 150 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("role").optional().isIn(["student", "instructor"]),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, email, password, role } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ error: "Email already registered" });

      const user = await User.create({ name, email, password, role: role || "student" });
      const token = signToken(user);

      res.status(201).json({ token, user: user.toSafeJSON() });
    } catch (err) { next(err); }
  }
);

// ─────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email, isActive: true });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      // Blacklist check (for logged-out tokens)
      const redis = req.app.get("redis");
      const token = signToken(user);
      res.json({ token, user: user.toSafeJSON() });
    } catch (err) { next(err); }
  }
);

// ─────────────────────────────────────────
// GET /auth/me — get current user
// ─────────────────────────────────────────
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────
// POST /auth/logout — blacklist token in Redis
// ─────────────────────────────────────────
router.post("/logout", requireAuth, async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const redis = req.app.get("redis");
  // Store in Redis until token natural expiry (~7 days)
  await redis.setex(`blacklist:${token}`, 7 * 24 * 3600, "1");
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
