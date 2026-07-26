import mongoose from "mongoose";
import loginAttemptSchema from "./loginAttempt.schema.js";
import addressSchema from "../common/address.schema.js";
import deviceSchema from "../common/device.schema.js";

const guardianSchema = new mongoose.Schema(
  {
    // Personal Information
    name: {
      type: String,
      required: [true, "Guardian name is required"],
      trim: true,
      minlength: [3, "Guardian name must be at least 3 characters"],
      maxlength: [100, "Guardian name cannot exceed 100 characters"],
      index: true,
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
      match: [
        /^(\+91|0)?[6-9]\d{9}$/,
        "Please enter a valid Indian mobile number",
      ],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    
    // Professional Information
    occupation: String,
    annualIncome: Number,
    
    // Contact Information
    alternatePhone: String,
    emergencyContact: String,
    
    // Address
    address: addressSchema,
    
    // Photo
    photo: {
      type: String,
      default: null,
    },

    // Account Status
    status: {
      type: String,
      enum: ["pending", "active", "inactive", "locked", "suspended"],
      default: "active",
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },

    // Security & Login Tracking
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIp: String,
    lastLoginDevice: String,
    lastLoginUserAgent: String,
    lastLoginLocation: String,
    accountLockedUntil: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    mobileVerificationToken: String,
    mobileVerificationExpires: Date,

    // Login History
    loginHistory: [loginAttemptSchema],

    // Device Management
    trustedDevices: [deviceSchema],

    // Student References
    students: [{
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
      },
      relationship: {
        type: String,
      },
      isPrimaryContact: {
        type: Boolean,
        default: false,
      },
    }],

    // Metadata
    metaData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Timestamps
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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

export default guardianSchema;