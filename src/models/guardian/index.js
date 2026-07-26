import mongoose from "mongoose";
import guardianSchema from "./guardian.model.js";
import applyVirtuals from "./virtuals.js";
import applyMethods from "./methods.js";
import applyStatics from "./statics.js";
// import guardianSchema from "./guardian.model.js";
// import applyVirtuals from "./virtuals.js";
// import applyMethods from "./methods.js";
// import applyStatics from "./statics.js";
// import applyMiddleware from "./middleware.js";

// Apply extensions
applyVirtuals(guardianSchema);
applyMethods(guardianSchema);
applyStatics(guardianSchema);
// applyMiddleware(guardianSchema);

// Indexes
guardianSchema.index({ mobile: 1, email: 1 });
guardianSchema.index({ status: 1, loginAttempts: 1 });
guardianSchema.index({ createdAt: -1 });
guardianSchema.index({ "loginHistory.timestamp": -1 });
guardianSchema.index({ "students.studentId": 1 });

const Guardian = mongoose.model("Guardian", guardianSchema);
export default Guardian;