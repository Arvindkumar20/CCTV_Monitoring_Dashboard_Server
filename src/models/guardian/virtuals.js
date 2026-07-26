import mongoose from "mongoose";

export default function applyVirtuals(schema) {
  // Virtual for getting all students
  schema.virtual("studentDetails", {
    ref: "Student",
    localField: "students.studentId",
    foreignField: "_id",
  });

  // Virtual for getting cameras of all students
  schema.virtual("allCameras").get(async function() {
    const Student = mongoose.model("Student");
    const Camera = mongoose.model("Camera");
    
    // Get all students of this guardian
    const students = await Student.find({
      "guardians.guardianId": this._id
    }).select("classId sectionId groupId");

    // Collect all unique camera queries
    const queries = students.flatMap(student => [
      { mainCategoryId: student.classId },
      ...(student.sectionId ? [{ subCategoryId: student.sectionId }] : []),
      ...(student.groupId ? [{ subSubCategoryId: student.groupId }] : [])
    ]);

    if (queries.length === 0) return [];

    return Camera.find({
      $or: queries
    })
    .populate("mainCategoryId", "name")
    .populate("subCategoryId", "name")
    .populate("subSubCategoryId", "name")
    .select("name rtspUrl status streamStatus location description");
  });
}