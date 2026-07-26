import mongoose from "mongoose";

const loginAttemptSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    deviceInfo: {
      type: String,
      default: "Unknown",
    },
    browserInfo: {
      type: String,
      default: "Unknown",
    },
    osInfo: {
      type: String,
      default: "Unknown",
    },
    location: {
      country: String,
      city: String,
      latitude: Number,
      longitude: Number,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
    failureReason: {
      type: String,
      enum: [
        "invalid_password",
        "account_locked",
        "invalid_credentials",
        "account_inactive",
        "too_many_attempts",
        "session_expired",
        "other",
      ],
    },
    failureDetails: String,
    sessionId: String,
    deviceId: String,
  },
  {
    timestamps: true,
  },
);

export default loginAttemptSchema;