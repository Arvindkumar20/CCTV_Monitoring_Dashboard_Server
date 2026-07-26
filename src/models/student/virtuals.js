import mongoose from "mongoose";

export default function applyVirtuals(schema) {
  // Virtual for getting all cameras accessible to student
  schema.virtual("cameras", {
    ref: "Camera",
    localField: "classId",
    foreignField: "mainCategoryId",
    options: { lean: true },
  });

  // Virtual for getting all guardians
  schema.virtual("guardianDetails", {
    ref: "Guardian",
    localField: "guardians.guardianId",
    foreignField: "_id",
  });

  // Virtual for getting primary guardian
  schema.virtual("primaryGuardian").get(function() {
    const primary = this.guardians?.find(g => g.isPrimary);
    return primary ? primary.guardianId : null;
  });

  // Virtual for student's age
  schema.virtual("age").get(function() {
    if (!this.dob) return null;
    const today = new Date();
    const birthDate = new Date(this.dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  });
}