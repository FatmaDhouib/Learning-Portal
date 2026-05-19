/**
 * Centralized error handler middleware.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: "Validation failed", details: messages });
  }
  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `${field} already in use` });
  }
  // JWT error
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
};

module.exports = { errorHandler };
