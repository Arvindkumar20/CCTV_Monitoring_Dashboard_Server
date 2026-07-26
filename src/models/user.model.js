import mongoose from "mongoose";
import crypto from "crypto";
import { env } from "../config/env.js";
import { type } from "os";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [3, "Full name must be at least 3 characters"],
      maxlength: [50, "Full name cannot exceed 50 characters"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid email",
      ],
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      index: true,
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit mobile number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    userType: {
      type: String,
      default: "school",
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "principal", "teacher", "security"],
        message: "{VALUE} is not a valid role",
      },
      default: "admin",
      index: true,
    },
    schoolName: {
      type: String,
    },
    userProfilePic: {
      type: String,
    },
    schoolLogo: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    refreshTokens: [
      {
        token: {
          type: String,
          required: true,
          select: false,
        },
        device: String,
        os: String,
        browser: String,
        ipAddress: String,
        lastUsed: {
          type: Date,
          default: Date.now,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
      },
    ],
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for performance
userSchema.index({ email: 1, mobile: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ "refreshTokens.expiresAt": 1 }, { expireAfterSeconds: 0 });

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for full profile
userSchema.virtual("profile").get(function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    mobile: this.mobile,
    role: this.role,
    userType: this.userType,
    schoolName: this.schoolName,
    userProfilePic: this.userProfilePic,
    schoolLogo: this.schoolLogo,
    isActive: this.isActive,
    isEmailVerified: this.isEmailVerified,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
});

// Methods
userSchema.methods = {
  // Check if password was changed after JWT issued
  isPasswordChangedAfter: function (JWTTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(
        this.passwordChangedAt.getTime() / 1000,
        10,
      );
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  },

  // Create password reset token
  createPasswordResetToken: function () {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
  },

  // Create email verification token
  createEmailVerificationToken: function () {
    const verificationToken = crypto.randomBytes(32).toString("hex");

    this.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    return verificationToken;
  },

  // Increment login attempts
  incrementLoginAttempts: function () {
    this.loginAttempts += 1;

    if (this.loginAttempts >= env.MAX_LOGIN_ATTEMPTS) {
      this.lockUntil = Date.now() + env.LOCK_TIME * 60 * 1000;
    }

    return this.save();
  },

  // Reset login attempts
  resetLoginAttempts: function () {
    this.loginAttempts = 0;
    this.lockUntil = null;
    return this.save();
  },
};

// Statics
userSchema.statics = {
  // Find user by email or mobile
  async findByEmailOrMobile(identifier) {
    return this.findOne({
      $or: [{ email: identifier.toLowerCase() }, { mobile: identifier }],
    });
  },

  // Get active users count by role
  async getCountByRole(role) {
    return this.countDocuments({ role, isActive: true });
  },
};

// Middlewarejj
export const User = mongoose.model("User", userSchema);
