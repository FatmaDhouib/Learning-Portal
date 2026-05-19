/**
 * User model — MongoDB / Mongoose.
 * Stores auth credentials and profile data.
 */
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true, maxlength: 150 },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role:     { type: String, enum: ["student", "instructor", "admin"], default: "student" },
    avatar:   { type: String, default: null },
    bio:      { type: String, maxlength: 500, default: "" },
    isActive: { type: Boolean, default: true },
    // Instructor-specific
    expertise:    [String],
    socialLinks: {
      website: String,
      linkedin: String,
      twitter: String,
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password helper
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
