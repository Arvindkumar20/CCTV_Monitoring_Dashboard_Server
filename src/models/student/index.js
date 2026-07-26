import mongoose from "mongoose";
import studentSchema from "./student.model.js";
import applyVirtuals from "./virtuals.js";
import applyMethods from "./methods.js";
import applyStatics from "./statics.js";

// Apply extensions
applyVirtuals(studentSchema);
applyMethods(studentSchema);
applyStatics(studentSchema);

// Indexes
studentSchema.index({ classId: 1, sectionId: 1, rollNumber: 1 }, { unique: true, sparse: true });
// studentSchema.index({ admissionNumber: 1 }, { unique: true, sparse: true });
studentSchema.index({ "guardians.guardianId": 1 });
studentSchema.index({ status: 1, classId: 1 });
studentSchema.index({ createdAt: -1 });

const Student = mongoose.model("Student", studentSchema);
export default Student;