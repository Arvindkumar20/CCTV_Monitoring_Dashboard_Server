// services/guardian.service.js
import mongoose from "mongoose";
import Guardian from "../models/guardian/index.js";
import Student from "../models/student/index.js";
import AppError from "../utils/appError.js";

class GuardianService {
  // Create new guardian
  async createGuardian(data, userId, reqInfo = {}) {
    // Check if guardian already exists
    const existingGuardian = await Guardian.findOne({
      $or: [
        { mobile: data.mobile },
        { email: data.email?.toLowerCase() }
      ]
    });

    if (existingGuardian) {
      throw new AppError("Guardian with this email or mobile already exists", 400);
    }

    // Create guardian instance
    const guardian = new Guardian({
      name: data.name,
      mobile: data.mobile,
      email: data.email?.toLowerCase(),
      occupation: data.occupation,
      annualIncome: data.annualIncome,
      alternatePhone: data.alternatePhone,
      emergencyContact: data.emergencyContact,
      address: data.address,
      photo: data.photo,
      status: data.status || "active",
      createdBy: userId,
    });

    // Set password (will be hashed automatically)
    await guardian.setPassword(data.password);

    // Save guardian
    await guardian.save();

    // Record initial login attempt if reqInfo provided
    if (reqInfo && Object.keys(reqInfo).length > 0) {
      await guardian.recordLoginAttempt({
        timestamp: new Date(),
        ipAddress: reqInfo.ipAddress || "system",
        userAgent: reqInfo.userAgent || "system",
        deviceInfo: reqInfo.deviceInfo || "system",
        status: "success",
      });
    }

    return this.getGuardianById(guardian._id);
  }

  // Get all guardians with filters
  async getAllGuardians(query = {}, pagination = {}, userId) {
    const {
      search,
      status,
      classId,
      sectionId,
      groupId,
      fromDate,
      toDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    if (status) filter.status = status;
    if (classId) filter["students.classId"] = classId;
    if (sectionId) filter["students.sectionId"] = sectionId;
    if (groupId) filter["students.groupId"] = groupId;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    // Search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { occupation: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const guardians = await Guardian.find(filter)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate({
        path: "students.studentId",
        select: "name classId sectionId groupId rollNumber admissionNumber status",
        populate: [
          { path: "classId", select: "name" },
          { path: "sectionId", select: "name" },
          { path: "groupId", select: "name" },
        ],
      })
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Guardian.countDocuments(filter);

    return {
      guardians,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get guardian by ID
  async getGuardianById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid guardian ID format", 400);
    }

    const guardian = await Guardian.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate({
        path: "students.studentId",
        select: "name dob gender classId sectionId groupId rollNumber admissionNumber mobile email photo status",
        populate: [
          { path: "classId", select: "name code" },
          { path: "sectionId", select: "name code" },
          { path: "groupId", select: "name code color" },
        ],
      });

    if (!guardian) {
      throw new AppError("Guardian not found", 404);
    }

    return guardian;
  }

  // Update guardian
  async updateGuardian(id, updateData, userId) {
    const guardian = await this.getGuardianById(id);

    // Fields that can be updated
    const allowedUpdates = [
      "name",
      "occupation",
      "annualIncome",
      "alternatePhone",
      "emergencyContact",
      "address",
      "photo",
      "status",
    ];

    // Apply updates
    allowedUpdates.forEach((field) => {
      if (updateData[field] !== undefined) {
        guardian[field] = updateData[field];
      }
    });

    // Handle email update (if changed)
    if (updateData.email && updateData.email.toLowerCase() !== guardian.email) {
      const existingGuardian = await Guardian.findOne({ email: updateData.email.toLowerCase() });
      if (existingGuardian && existingGuardian._id.toString() !== id) {
        throw new AppError("Email already in use by another guardian", 400);
      }
      guardian.email = updateData.email.toLowerCase();
      guardian.isEmailVerified = false;
    }

    // Handle mobile update (if changed)
    if (updateData.mobile && updateData.mobile !== guardian.mobile) {
      const existingGuardian = await Guardian.findOne({ mobile: updateData.mobile });
      if (existingGuardian && existingGuardian._id.toString() !== id) {
        throw new AppError("Mobile number already in use by another guardian", 400);
      }
      guardian.mobile = updateData.mobile;
      guardian.isMobileVerified = false;
    }

    // Handle password update
    if (updateData.password) {
      await guardian.setPassword(updateData.password);
      guardian.passwordChangedAt = new Date();
    }

    guardian.updatedBy = userId;
    await guardian.save();

    return this.getGuardianById(id);
  }

  // Delete guardian
  async deleteGuardian(id) {
    const guardian = await this.getGuardianById(id);

    // Check if guardian has any students
    if (guardian.students && guardian.students.length > 0) {
      throw new AppError("Cannot delete guardian with linked students. Remove students first.", 400);
    }

    await Guardian.findByIdAndDelete(id);
    return { message: "Guardian deleted successfully" };
  }

  // Bulk delete guardians
  async bulkDeleteGuardians(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError("Please provide an array of guardian IDs", 400);
    }

    // Check for guardians with students
    const guardiansWithStudents = await Guardian.find({
      _id: { $in: ids },
      "students.0": { $exists: true },
    });

    if (guardiansWithStudents.length > 0) {
      const names = guardiansWithStudents.map(g => g.name).join(", ");
      throw new AppError(`Cannot delete guardians with students: ${names}`, 400);
    }

    const result = await Guardian.deleteMany({ _id: { $in: ids } });
    return { deletedCount: result.deletedCount };
  }

  // Toggle guardian status
  async toggleStatus(id, userId) {
    const guardian = await this.getGuardianById(id);
    
    guardian.status = guardian.status === "active" ? "inactive" : "active";
    guardian.updatedBy = userId;
    await guardian.save();

    return guardian;
  }

  // Unlock guardian account
  async unlockAccount(id, userId) {
    const guardian = await this.getGuardianById(id);
    
    guardian.status = "active";
    guardian.loginAttempts = 0;
    guardian.accountLockedUntil = null;
    guardian.updatedBy = userId;
    await guardian.save();

    return guardian;
  }

  // Get guardian students
  async getGuardianStudents(id) {
    const guardian = await this.getGuardianById(id);
    
    const students = await Student.find({
      _id: { $in: guardian.students.map(s => s.studentId) },
    }).populate("classId sectionId groupId", "name code");

    return students;
  }

  // Add student to guardian
  async addStudent(guardianId, studentData, userId) {
    const guardian = await this.getGuardianById(guardianId);

    // Check if student already exists with same admission/roll number
    let student;
    if (studentData.admissionNumber) {
      student = await Student.findOne({ admissionNumber: studentData.admissionNumber });
    }

    if (!student && studentData.rollNumber && studentData.classId) {
      student = await Student.findOne({
        rollNumber: studentData.rollNumber,
        classId: studentData.classId,
      });
    }

    if (student) {
      // Check if already linked
      const alreadyLinked = guardian.students.some(
        s => s.studentId.toString() === student._id.toString()
      );

      if (!alreadyLinked) {
        guardian.students.push({
          studentId: student._id,
          relationship: studentData.relationship || "parent",
          isPrimaryContact: studentData.isPrimaryContact || false,
        });
        await guardian.save();

        // Add guardian to student
        await student.addGuardian(guardianId, studentData.relationship || "parent", studentData.isPrimaryContact);
      }
    } else {
      // Create new student
      student = await Student.create({
        ...studentData,
        createdBy: userId,
      });

      // Link to guardian
      guardian.students.push({
        studentId: student._id,
        relationship: studentData.relationship || "parent",
        isPrimaryContact: studentData.isPrimaryContact || false,
      });
      await guardian.save();

      // Add guardian to student
      await student.addGuardian(guardianId, studentData.relationship || "parent", studentData.isPrimaryContact);
    }

    return student;
  }

  // Remove student from guardian
  async removeStudent(guardianId, studentId) {
    const guardian = await this.getGuardianById(guardianId);

    guardian.students = guardian.students.filter(
      s => s.studentId.toString() !== studentId
    );
    await guardian.save();

    // Remove guardian from student
    const student = await Student.findById(studentId);
    if (student) {
      await student.removeGuardian(guardianId);
    }

    return { message: "Student removed from guardian" };
  }

  // Get guardian login history
  async getLoginHistory(id, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const guardian = await Guardian.findById(id)
      .select("loginHistory")
      .slice("loginHistory", [skip, limit]);

    const total = await Guardian.findById(id).select("loginHistory").then(g => g.loginHistory.length);

    return {
      history: guardian?.loginHistory || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get guardian devices
  async getDevices(id) {
    const guardian = await Guardian.findById(id).select("trustedDevices");
    return guardian?.trustedDevices || [];
  }

  // Remove device
  async removeDevice(id, deviceId) {
    const guardian = await Guardian.findById(id);
    
    guardian.trustedDevices = guardian.trustedDevices.filter(
      d => d._id.toString() !== deviceId
    );
    await guardian.save();

    return { message: "Device removed successfully" };
  }

  // Reset password
  async resetPassword(id, newPassword, userId) {
    const guardian = await this.getGuardianById(id);
    
    await guardian.setPassword(newPassword);
    guardian.passwordChangedAt = new Date();
    guardian.updatedBy = userId;
    await guardian.save();

    return { message: "Password reset successfully" };
  }

  // Get guardian statistics
  async getStatistics() {
    const [
      total,
      active,
      inactive,
      locked,
      withStudents,
      withoutStudents,
    ] = await Promise.all([
      Guardian.countDocuments(),
      Guardian.countDocuments({ status: "active" }),
      Guardian.countDocuments({ status: "inactive" }),
      Guardian.countDocuments({ status: "locked" }),
      Guardian.countDocuments({ "students.0": { $exists: true } }),
      Guardian.countDocuments({ students: { $size: 0 } }),
    ]);

    return {
      total,
      active,
      inactive,
      locked,
      withStudents,
      withoutStudents,
      recent: await Guardian.find()
        .sort("-createdAt")
        .limit(5)
        .select("name email mobile status createdAt"),
    };
  }
}

export default new GuardianService();