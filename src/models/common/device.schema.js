import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema({
  deviceId: String,
  deviceName: String,
  lastUsedAt: Date,
  userAgent: String,
  ipAddress: String,
}, { _id: false });

export default deviceSchema;