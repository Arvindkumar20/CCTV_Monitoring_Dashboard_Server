import mongoose from "mongoose";

export default function applyStatics(schema) {
  // Find by mobile or email
  schema.statics.findByMobileOrEmail = function (identifier) {
    return this.findOne({
      $or: [{ mobile: identifier }, { email: identifier.toLowerCase() }],
    });
  };

  // Get guardians with their students
  schema.statics.getWithStudents = function() {
    return this.aggregate([
      {
        $lookup: {
          from: "students",
          localField: "students.studentId",
          foreignField: "_id",
          as: "studentDetails"
        }
      }
    ]);
  };

  // Get login statistics
  schema.statics.getLoginStats = async function (guardianId) {
    const guardian = await this.findById(guardianId).select(
      "loginHistory loginAttempts"
    );
    
    if (!guardian) return null;

    const totalAttempts = guardian.loginHistory.length;
    const successfulAttempts = guardian.loginHistory.filter(
      (a) => a.status === "success"
    ).length;
    const failedAttempts = guardian.loginHistory.filter(
      (a) => a.status === "failed"
    ).length;

    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentAttempts = guardian.loginHistory.filter(
      (a) => a.timestamp > last7Days
    );

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate: totalAttempts
        ? ((successfulAttempts / totalAttempts) * 100).toFixed(2)
        : 0,
      recentAttempts: recentAttempts.length,
      currentLoginAttempts: guardian.loginAttempts,
      isLocked: guardian.status === "locked",
    };
  };

  // Get guardians by student
  schema.statics.findByStudent = function(studentId) {
    return this.find({
      "students.studentId": studentId
    });
  };
}