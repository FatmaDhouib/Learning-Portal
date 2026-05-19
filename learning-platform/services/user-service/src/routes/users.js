/**
 * Users routes — profile management, admin user listing.
 */
const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");

// ─────────────────────────────────────────
// GET /users/profile/:id — public profile
// ─────────────────────────────────────────
router.get("/profile/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password -email");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────
// PATCH /users/me — update own profile
// ─────────────────────────────────────────
router.patch(
  "/me",
  requireAuth,
  [
    body("name").optional().trim().isLength({ min: 2, max: 150 }),
    body("bio").optional().isLength({ max: 500 }),
    body("avatar").optional().isURL(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const allowed = ["name", "bio", "avatar", "expertise", "socialLinks"];
      const updates = {};
      allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

      const user = await User.findByIdAndUpdate(
        req.user.id, updates, { new: true, runValidators: true }
      ).select("-password");
      res.json(user);
    } catch (err) { next(err); }
  }
);

// ─────────────────────────────────────────
// PATCH /users/me/password — change password
// ─────────────────────────────────────────
router.patch(
  "/me/password",
  requireAuth,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 6 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const user = await User.findById(req.user.id);
      if (!(await user.comparePassword(req.body.currentPassword))) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      user.password = req.body.newPassword;
      await user.save();
      res.json({ message: "Password updated" });
    } catch (err) { next(err); }
  }
);

// ─────────────────────────────────────────
// Admin routes
// ─────────────────────────────────────────
router.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) filter.$or = [
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
    ];
    const users = await User.find(filter)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    const total = await User.countDocuments(filter);
    res.json({ total, page: Number(page), users });
  } catch (err) { next(err); }
});

router.patch("/:id/role", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["student", "instructor", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) { next(err); }
});

module.exports = router;
