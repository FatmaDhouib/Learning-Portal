/**
 * JWT authentication middleware.
 * Verifies tokens issued by this service.
 */
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

/**
 * requireAuth — attaches decoded user to req.user; returns 401 if invalid.
 */
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * requireRole — factory that checks for specific role(s).
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Role required: ${roles.join(" or ")}` });
  }
  next();
};

module.exports = { requireAuth, requireRole };
