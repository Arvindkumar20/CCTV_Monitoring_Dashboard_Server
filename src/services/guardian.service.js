import Guardian from "../models/guardian/index.js";
import Student from "../models/student/index.js";
import Category from "../models/category.model.js";
import SubCategory from "../models/subCategory.model.js";
import NestedSubCategory from "../models/nestedSubCategory.model.js";
import AppError from "../utils/AppError.js";
import mongoose from "mongoose";
import crypto from "crypto";
import xlsx from "xlsx";
import csv from "csv-parser";
import { Readable } from "stream";
import { getClientInfo } from "../utils/clientInfo.js";
import jwt from "jsonwebtoken";

class GuardianService {
  /**
   * Create a new guardian
   */
  async createGuardian(data, userId, reqInfo = {}) {
    // Validate class reference
    if (data.classId && !mongoose.Types.ObjectId.isValid(data.classId)) {
      throw new AppError("Invalid Class ID format", 400);
    }

    // Validate section reference
    if (data.sectionId && !mongoose.Types.ObjectId.isValid(data.sectionId)) {
      throw new AppError("Invalid Section ID format", 400);
    }

    // Validate group reference
    if (data.groupId && !mongoose.Types.ObjectId.isValid(data.groupId)) {
      throw new AppError("Invalid Group ID format", 400);
    }

    // Check if class exists
    if (data.classId) {
      const classExists = await Category.findById(data.classId);
      if (!classExists) {
        throw new AppError("Selected Class does not exist", 400);
      }
    }

    // Check if section exists and belongs to class
    if (data.sectionId) {
      const sectionExists = await SubCategory.findById(data.sectionId);
      if (!sectionExists) {
        throw new AppError("Selected Section does not exist", 400);
      }
    }

    // Check if group exists and belongs to section
    if (data?.groupId) {
      const groupExists = await NestedSubCategory.findById(data?.groupId);
      if (!groupExists) {
        throw new AppError("Selected Group does not exist", 400);
      }
    }

    // Check if guardian already exists by mobile or email
    let guardian = await Guardian.findOne({
      $or: [{ mobile: data.mobile }, { email: data.email?.toLowerCase() }],
    });

    let isNewGuardian = false;

    if (!guardian) {
      // Create new guardian instance (don't save yet)
      guardian = new Guardian({
        name: data.guardianName || data.name,
        mobile: data.mobile,
        email: data.email,
        occupation: data.occupation,
        annualIncome: data.annualIncome,
        alternatePhone: data.alternatePhone,
        emergencyContact: data.emergencyContact,
        address: data.address,
        photo: data.guardianPhoto,
        status: data.status || "active",
        createdBy: userId,
      });

      // Generate and set password using the new method
      // This will handle hashing automatically
      const guardianName = data.guardianName || data.name;
      const generatedPassword = await guardian.generateAndSetPassword(
        guardianName,
        data.mobile,
        data.password, // Optional: agar password provide kiya hai to use karega
      );

      // Save the guardian
      await guardian.save();

      isNewGuardian = true;

      // Record initial login attempt for new guardian
      if (reqInfo && Object.keys(reqInfo).length > 0) {
        await guardian.recordLoginAttempt({
          timestamp: new Date(),
          ipAddress: reqInfo.ipAddress || "system",
          userAgent: reqInfo.userAgent || "system",
          deviceInfo: reqInfo.deviceInfo || "system",
          browserInfo: reqInfo.browserInfo || "system",
          osInfo: reqInfo.osInfo || "system",
          status: "success",
          sessionId: `initial-${Date.now()}`,
        });
      }
    } else {
      // Update existing guardian's information if provided
      const updateFields = {};
      if (data.guardianName || data.name)
        updateFields.name = data.guardianName || data.name;
      if (data.occupation) updateFields.occupation = data.occupation;
      if (data.annualIncome) updateFields.annualIncome = data.annualIncome;
      if (data.alternatePhone)
        updateFields.alternatePhone = data.alternatePhone;
      if (data.emergencyContact)
        updateFields.emergencyContact = data.emergencyContact;
      if (data.address) updateFields.address = data.address;
      if (data.guardianPhoto) updateFields.photo = data.guardianPhoto;
      if (data.status) updateFields.status = data.status;

      // Agar password provide kiya hai to update karo
      if (data.password) {
        await guardian.setPassword(data.password);
        updateFields.password = guardian.password;
      }

      if (Object.keys(updateFields).length > 0) {
        await Guardian.findByIdAndUpdate(guardian._id, updateFields, {
          new: true,
        });
      }
    }

    // If student info provided, create or update student
    if (data.studentName && data.classId) {
      const studentData = {
        name: data.studentName,
        dob: data.dob,
        gender: data.gender || "male",
        classId: data.classId,
        sectionId: data.sectionId,
        groupId: data.groupId,
        rollNumber: data.rollNumber,
        admissionNumber: data.admissionNumber,
        mobile: data.studentMobile,
        email: data.studentEmail,
        photo: data.studentPhoto,
        createdBy: userId,
      };

      // Check if student already exists
      let student = await Student.findOne({
        $or: [
          { admissionNumber: studentData.admissionNumber },
          { rollNumber: studentData.rollNumber },
        ].filter(Boolean),
      });

      if (student) {
        // Check if already linked to avoid duplicate
        const alreadyLinked = await student.hasGuardian(guardian._id);
        if (!alreadyLinked) {
          // Link existing student to guardian
          await student.addGuardian(
            guardian._id,
            data.relationship || "guardian",
            true,
          );
          await guardian.addStudent(
            student._id,
            data.relationship || "guardian",
            true,
          );
        }
      } else {
        // Create new student
        student = await Student.create(studentData);
        await student.addGuardian(
          guardian._id,
          data.relationship || "guardian",
          true,
        );
        await guardian.addStudent(
          student._id,
          data.relationship || "guardian",
          true,
        );
      }
    }

    // Return guardian with populated data
    return this.getGuardianById(guardian._id, userId, "admin");
  }

  /**
   * Get all guardians with filters
   */
  async getAllGuardians(query, userId, userRole) {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      classId,
      sectionId,
      groupId,
      search,
      fromDate,
      toDate,
    } = query;

    // Build filter
    const filter = {};

    // Regular users only see their own
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    // Search by name, mobile, email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Date range filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    // If class/section/group filters provided, filter by students
    if (classId || sectionId || groupId) {
      const studentFilter = {};
      if (classId) studentFilter.classId = classId;
      if (sectionId) studentFilter.sectionId = sectionId;
      if (groupId) studentFilter.groupId = groupId;

      const students = await Student.find(studentFilter).select("_id");
      const studentIds = students.map((s) => s._id);

      filter["students.studentId"] = { $in: studentIds };
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Pagination
    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);

    // Execute queries
    const [guardians, total] = await Promise.all([
      Guardian.find(filter)
        .select("-password -loginHistory -trustedDevices")
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email")
        .populate({
          path: "students.studentId",
          model: "Student",
          select: "name classId sectionId groupId rollNumber photo",
          populate: [
            { path: "classId", model: "Category", select: "name" },
            { path: "sectionId", model: "SubCategory", select: "name" },
            { path: "groupId", model: "NestedSubCategory", select: "name" },
          ],
        })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Guardian.countDocuments(filter),
    ]);

    // Transform data
    const guardiansWithInfo = guardians.map((guardian) => ({
      ...guardian,
      // Get primary student info (first student or primary contact)
      primaryStudent:
        guardian.students?.find((s) => s.isPrimaryContact)?.studentId ||
        guardian.students?.[0]?.studentId ||
        null,

      // Student details array
      students:
        guardian.students?.map((s) => ({
          id: s.studentId._id,
          name: s.studentId.name,
          class: s.studentId.classId?.name,
          section: s.studentId.sectionId?.name,
          group: s.studentId.groupId?.name,
          rollNumber: s.studentId.rollNumber,
          photo: s.studentId.photo,
          relationship: s.relationship,
          isPrimary: s.isPrimaryContact,
        })) || [],

      loginStats: {
        totalAttempts: guardian.loginHistory?.length || 0,
        lastLogin: guardian.lastLoginAt,
      },
    }));

    return {
      guardians: guardiansWithInfo,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get guardian by ID
   */
  async getGuardianById(id, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid guardian ID format", 400);
    }

    const guardian = await Guardian.findById(id)
      .select("-password -loginHistory -trustedDevices")
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email")
      .populate({
        path: "students.studentId",
        model: "Student",
        populate: [
          { path: "classId", model: "Category", select: "name description" },
          {
            path: "sectionId",
            model: "SubCategory",
            select: "name description",
          },
          {
            path: "groupId",
            model: "NestedSubCategory",
            select: "name description color icon",
          },
        ],
      });

    if (!guardian) {
      throw new AppError("Guardian not found", 404);
    }

    // Check access
    if (userRole !== "admin" && guardian.createdBy._id.toString() !== userId) {
      throw new AppError(
        "You do not have permission to view this guardian",
        403,
      );
    }

    // Get cameras for all students
    const cameras = await guardian.allCameras;

    const guardianObj = guardian.toObject();

    return {
      ...guardianObj,
      students:
        guardianObj.students?.map((s) => ({
          id: s.studentId._id,
          name: s.studentId.name,
          dob: s.studentId.dob,
          gender: s.studentId.gender,
          class: {
            id: s.studentId.classId?._id,
            name: s.studentId.classId?.name,
          },
          section: s.studentId.sectionId
            ? {
                id: s.studentId.sectionId._id,
                name: s.studentId.sectionId.name,
              }
            : null,
          group: s.studentId.groupId
            ? {
                id: s.studentId.groupId._id,
                name: s.studentId.groupId.name,
                color: s.studentId.groupId.color,
                icon: s.studentId.groupId.icon,
              }
            : null,
          rollNumber: s.studentId.rollNumber,
          photo: s.studentId.photo,
          relationship: s.relationship,
          isPrimary: s.isPrimaryContact,
        })) || [],
      cameras: cameras || [],
    };
  }

  /**
   * Update guardian
   */
  async updateGuardian(id, updateData, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid guardian ID format", 400);
    }

    const guardian = await Guardian.findById(id);

    if (!guardian) {
      throw new AppError("Guardian not found", 404);
    }

    const roles = ["admin", "principal", "teacher", "security"];
    if (!roles.includes(userRole) && guardian.createdBy.toString() !== userId) {
      throw new AppError(
        "You do not have permission to update this guardian",
        403,
      );
    }

    // Check if mobile/email already exists
    if (updateData.mobile && updateData.mobile !== guardian.mobile) {
      const existingMobile = await Guardian.findOne({
        mobile: updateData.mobile,
        _id: { $ne: id },
      });
      if (existingMobile) {
        throw new AppError("Mobile number already in use", 400);
      }
    }

    if (updateData.email && updateData.email !== guardian.email) {
      const existingEmail = await Guardian.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existingEmail) {
        throw new AppError("Email already in use", 400);
      }
    }

    // Handle student updates if provided
    if (updateData.studentId) {
      if (!guardian.hasStudent(updateData.studentId)) {
        // Add new student to guardian
        await guardian.addStudent(
          updateData.studentId,
          updateData.relationship || "guardian",
          updateData.isPrimary || false,
        );

        // Also add guardian to student
        const Student = mongoose.model("Student");
        const student = await Student.findById(updateData.studentId);
        if (student && !student.hasGuardian(id)) {
          await student.addGuardian(
            id,
            updateData.relationship || "guardian",
            updateData.isPrimary || false,
          );
        }
      }
      delete updateData.studentId;
      delete updateData.relationship;
      delete updateData.isPrimary;
    }

    // Map old field names to new ones
    if (updateData.guardianName) {
      updateData.name = updateData.guardianName;
      delete updateData.guardianName;
    }

    if (updateData.guardianPhoto) {
      updateData.photo = updateData.guardianPhoto;
      delete updateData.guardianPhoto;
    }

    // Update
    Object.assign(guardian, updateData);
    guardian.updatedBy = userId;
    await guardian.save();

    return this.getGuardianById(guardian._id, userId, userRole);
  }

  /**
   * Delete guardian
   */
  async deleteGuardian(id, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid guardian ID format", 400);
    }

    const guardian = await Guardian.findById(id);

    if (!guardian) {
      throw new AppError("Guardian not found", 404);
    }

    // Check permission
    if (userRole !== "admin" && guardian.createdBy.toString() !== userId) {
      throw new AppError(
        "You do not have permission to delete this guardian",
        403,
      );
    }

    // Remove guardian from all students
    const Student = mongoose.model("Student");
    for (const student of guardian.students) {
      const studentDoc = await Student.findById(student.studentId);
      if (studentDoc) {
        await studentDoc.removeGuardian(id);
      }
    }

    await guardian.deleteOne();

    return {
      message: "Guardian deleted successfully",
      deletedItem: {
        id: guardian._id,
        name: guardian.name,
      },
    };
  }

  /**
   * Login guardian
   */
  async login(identifier, password, req) {
    const reqInfo = getClientInfo(req);

    // Find guardian by mobile or email
    const guardian = await Guardian.findOne({
      $or: [{ mobile: identifier }, { email: identifier.toLowerCase() }],
    }).select("+password");

    if (!guardian) {
      await this.recordFailedAttempt(null, reqInfo, "invalid_credentials");
      throw new AppError("Invalid credentials", 401);
    }

    // Check if account can login
    const loginCheck = guardian.canLogin();
    if (!loginCheck.allowed) {
      await guardian.recordLoginAttempt({
        ...reqInfo,
        status: "failed",
        failureReason: "account_locked",
        failureDetails: loginCheck.reason,
      });
      throw new AppError(loginCheck.reason, 403);
    }

    // Compare password
    const isMatch = await guardian.comparePassword(password);

    if (!isMatch) {
      await guardian.recordLoginAttempt({
        ...reqInfo,
        status: "failed",
        failureReason: "invalid_password",
        failureDetails: "Incorrect password",
      });
      throw new AppError("Invalid credentials", 401);
    }

    // Record successful login
    await guardian.recordLoginAttempt({
      ...reqInfo,
      status: "success",
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: guardian._id,
        type: "guardian",
        name: guardian.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Get populated guardian data with students
    const guardianData = await Guardian.findById(guardian._id)
      .populate({
        path: "students.studentId",
        model: "Student",
        select: "name classId sectionId groupId",
        populate: [
          { path: "classId", select: "name" },
          { path: "sectionId", select: "name" },
          { path: "groupId", select: "name" },
        ],
      })
      .select("-password -loginHistory -trustedDevices");

    return {
      guardian: guardianData,
      token,
    };
  }

  /**
   * Record failed login attempt
   */
  async recordFailedAttempt(guardianId, reqInfo, reason) {
    const attemptData = {
      ...reqInfo,
      status: "failed",
      failureReason: reason,
    };

    if (guardianId) {
      const guardian = await Guardian.findById(guardianId);
      if (guardian) {
        await guardian.recordLoginAttempt(attemptData);
      }
    }
  }

  /**
   * Get login history
   */
  async getLoginHistory(id, query, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid guardian ID format", 400);
    }

    const guardian = await Guardian.findById(id)
      .select("loginHistory name students")
      .populate("students.studentId", "name");

    if (!guardian) {
      throw new AppError("Guardian not found", 404);
    }

    // Check permission
    if (userRole !== "admin" && guardian.createdBy?.toString() !== userId) {
      throw new AppError(
        "You do not have permission to view login history",
        403,
      );
    }

    const { page = 1, limit = 20, status, fromDate, toDate } = query;

    let history = guardian.loginHistory || [];

    // Apply filters
    if (status && status !== "all") {
      history = history.filter((entry) => entry.status === status);
    }

    if (fromDate) {
      history = history.filter(
        (entry) => new Date(entry.timestamp) >= new Date(fromDate),
      );
    }

    if (toDate) {
      history = history.filter(
        (entry) => new Date(entry.timestamp) <= new Date(toDate),
      );
    }

    // Sort by timestamp descending
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    const paginatedHistory = history.slice(startIndex, endIndex);

    return {
      guardianId: guardian._id,
      guardianName: guardian.name,
      students:
        guardian.students?.map((s) => s.studentId?.name).filter(Boolean) || [],
      history: paginatedHistory,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: history.length,
        pages: Math.ceil(history.length / limitNum),
      },
    };
  }

  /**
   * Bulk delete guardians
   */
  async bulkDelete(ids, userId, userRole) {
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new AppError(`Invalid IDs: ${invalidIds.join(", ")}`, 400);
    }

    const filter = { _id: { $in: ids } };
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    const guardians = await Guardian.find(filter);

    if (guardians.length === 0) {
      throw new AppError("No guardians found", 404);
    }

    // Remove guardians from students
    const Student = mongoose.model("Student");
    for (const guardian of guardians) {
      for (const student of guardian.students || []) {
        const studentDoc = await Student.findById(student.studentId);
        if (studentDoc) {
          await studentDoc.removeGuardian(guardian._id);
        }
      }
    }

    const result = await Guardian.deleteMany({ _id: { $in: ids } });

    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} guardians deleted successfully`,
    };
  }

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(ids, status, userId, userRole) {
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new AppError(`Invalid IDs: ${invalidIds.join(", ")}`, 400);
    }

    const filter = { _id: { $in: ids } };
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    const guardians = await Guardian.find(filter);

    if (guardians.length === 0) {
      throw new AppError("No guardians found", 404);
    }

    const result = await Guardian.updateMany(
      { _id: { $in: ids } },
      {
        status,
        updatedBy: userId,
      },
    );

    return {
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} guardians updated to ${status}`,
    };
  }

  /**
   * Bulk upload guardians
   */
  async bulkUpload(guardiansData, userId, reqInfo = {}) {
    const results = {
      success: [],
      failed: [],
      total: guardiansData.length,
    };

    for (const data of guardiansData) {
      try {
        // Check if guardian already exists
        const existingGuardian = await Guardian.findOne({
          $or: [{ mobile: data.mobile }, { email: data.email?.toLowerCase() }],
        });

        if (existingGuardian) {
          results.failed.push({
            data,
            reason: "Guardian with this mobile or email already exists",
          });
          continue;
        }

        // Create guardian
        const guardian = await this.createGuardian(data, userId, reqInfo);

        results.success.push({
          id: guardian._id,
          name: guardian.name,
          mobile: guardian.mobile,
        });
      } catch (error) {
        results.failed.push({
          data,
          reason: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Import from file
   */
  async importFromFile(fileBuffer, fileType, userId, reqInfo = {}) {
    console.log("📁 Starting file import...");

    const {
      normalizeFieldNames,
      parseDate,
      cleanMobile,
      generateEmail,
      parseExcelFile,
      parseCSVFile,
      validateRecord,
    } = await import("../utils/fileImportUtils.js");

    const results = {
      success: [],
      failed: [],
      skipped: [],
      total: 0,
      created: {
        categories: [],
        subCategories: [],
        nestedSubCategories: [],
      },
    };

    try {
      // Parse file
      let rawData = [];
      if (fileType === "xlsx" || fileType === "xls") {
        rawData = parseExcelFile(fileBuffer);
      } else if (fileType === "csv") {
        rawData = await parseCSVFile(fileBuffer);
      } else {
        throw new AppError(
          "Unsupported file format. Please upload Excel or CSV file.",
          400,
        );
      }

      if (rawData.length === 0) {
        throw new AppError("No data found in file", 400);
      }

      console.log(`📊 Found ${rawData.length} records in file`);

      // Normalize field names
      const normalizedData = normalizeFieldNames(rawData);

      // Process each record
      for (let i = 0; i < normalizedData.length; i++) {
        try {
          const record = normalizedData[i];
          console.log(`\n🔄 Processing record ${i + 1}:`, record);

          // Validate record
          const validation = validateRecord(record);
          if (!validation.isValid) {
            throw new Error(
              `Validation failed: ${validation.errors.join(", ")}`,
            );
          }

          // Prepare data
          const guardianName =
            record.guardianName?.trim() || record.name?.trim();
          const mobile = cleanMobile(record.mobile);
          const email = generateEmail(guardianName, record.email);
          const studentName = record.studentName?.trim();
          const dob = parseDate(record.dob);
          const className = record.class?.trim();
          const sectionName = record.section?.trim();
          const groupName = record.group?.trim();

          // Handle Category (Class)
          let mainCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${className}$`, "i") },
            createdBy: userId,
          });

          if (!mainCategory) {
            console.log(`➕ Creating new class: ${className}`);
            mainCategory = await Category.create({
              name: className,
              code: className.toUpperCase().replace(/\s+/g, "_"),
              description: `Created from bulk upload`,
              level: 1,
              createdBy: userId,
            });
            results.created.categories.push({
              name: className,
              id: mainCategory._id,
            });
          }

          // Handle SubCategory (Section)
          let subCategory = null;
          if (sectionName) {
            subCategory = await SubCategory.findOne({
              name: { $regex: new RegExp(`^${sectionName}$`, "i") },
              mainCategoryId: mainCategory._id,
              createdBy: userId,
            });

            if (!subCategory) {
              console.log(`➕ Creating new section: ${sectionName}`);
              subCategory = await SubCategory.create({
                name: sectionName,
                mainCategoryId: mainCategory._id,
                description: `Created from bulk upload`,
                createdBy: userId,
              });
              results.created.subCategories.push({
                name: sectionName,
                id: subCategory._id,
              });
            }
          }

          // Handle NestedSubCategory (Group)
          let nestedSubCategory = null;
          if (groupName && subCategory) {
            nestedSubCategory = await NestedSubCategory.findOne({
              name: { $regex: new RegExp(`^${groupName}$`, "i") },
              subCategoryId: subCategory._id,
              mainCategoryId: mainCategory._id,
              createdBy: userId,
            });

            if (!nestedSubCategory) {
              console.log(`➕ Creating new group: ${groupName}`);
              nestedSubCategory = await NestedSubCategory.create({
                name: groupName,
                subCategoryId: subCategory._id,
                mainCategoryId: mainCategory._id,
                description: `Created from bulk upload`,
                createdBy: userId,
              });
              results.created.nestedSubCategories.push({
                name: groupName,
                id: nestedSubCategory._id,
              });
            }
          }

          // Check for existing guardian
          const existingGuardian = await Guardian.findOne({ mobile });

          if (existingGuardian) {
            console.log(
              `⏭️ Skipping record ${i + 1}: Guardian with mobile ${mobile} already exists`,
            );
            results.skipped.push({
              row: i + 1,
              data: rawData[i],
              reason: `Already exists (mobile: ${mobile})`,
            });
            continue;
          }

          // Generate password
          const generatePassword = (studentName, dob) => {
            const first3 = studentName.substring(0, 3).toLowerCase();
            const dateObj = new Date(dob);
            const day = String(dateObj.getDate()).padStart(2, "0");
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            return (
              first3.charAt(0).toUpperCase() + first3.slice(1) + day + month
            );
          };

          const plainPassword = generatePassword(studentName, dob);

          // Create guardian
          const guardianData = {
            name: guardianName,
            mobile,
            email,
            password: plainPassword,
            createdBy: userId,
            status: "active",
          };

          const guardian = await Guardian.create(guardianData);

          // Create student
          const studentData = {
            name: studentName,
            dob,
            gender: record.gender || "male",
            classId: mainCategory._id,
            sectionId: subCategory?._id || null,
            groupId: nestedSubCategory?._id || null,
            rollNumber: record.rollNumber,
            admissionNumber: record.admissionNumber,
            createdBy: userId,
          };

          const student = await Student.create(studentData);

          // Link guardian and student
          await guardian.addStudent(
            student._id,
            record.relationship || "guardian",
            true,
          );
          await student.addGuardian(
            guardian._id,
            record.relationship || "guardian",
            true,
          );

          results.success.push({
            id: guardian._id,
            guardianName,
            studentName,
            mobile,
            email,
            class: className,
            section: sectionName,
            group: groupName,
          });

          console.log(`✅ Successfully created guardian: ${guardianName}`);
        } catch (error) {
          console.error(`❌ Failed record ${i + 1}:`, error.message);
          results.failed.push({
            row: i + 1,
            data: rawData[i],
            reason: error.message,
          });
        }
      }

      results.total = rawData.length;

      return {
        success: true,
        data: results,
        message:
          `✅ Imported ${results.success.length} of ${results.total} records. ` +
          `${results.skipped.length} skipped, ${results.failed.length} failed. ` +
          `Created ${results.created.categories.length} classes, ` +
          `${results.created.subCategories.length} sections, ` +
          `${results.created.nestedSubCategories.length} groups.`,
      };
    } catch (error) {
      console.error("💥 Fatal error in import:", error);
      throw new AppError(
        error.message || "Failed to import file",
        error.statusCode || 400,
      );
    }
  }

  /**
   * Export guardians
   */
  async exportGuardians(format, filters, userId, userRole) {
    const { guardians } = await this.getAllGuardians(filters, userId, userRole);

    const exportData = guardians.map((g) => ({
      "Guardian Name": g.name,
      Mobile: g.mobile,
      Email: g.email,
      Students: g.students?.map((s) => s.name).join("; ") || "",
      "Primary Student": g.primaryStudent?.name || "",
      Status: g.status,
      "Last Login": g.lastLoginAt
        ? new Date(g.lastLoginAt).toLocaleString()
        : "Never",
      "Created At": new Date(g.createdAt).toLocaleDateString(),
    }));

    if (format === "csv") {
      const headers = Object.keys(exportData[0]).join(",");
      const rows = exportData.map((row) =>
        Object.values(row)
          .map((val) =>
            typeof val === "string" && val.includes(",") ? `"${val}"` : val,
          )
          .join(","),
      );
      return [headers, ...rows].join("\n");
    } else {
      return exportData;
    }
  }

  /**
   * Get statistics
   */
  async getStats(userId, userRole) {
    const filter = userRole === "admin" ? {} : { createdBy: userId };

    const [
      total,
      pending,
      active,
      inactive,
      locked,
      suspended,
      recentRegistrations,
      loginStats,
    ] = await Promise.all([
      Guardian.countDocuments(filter),
      Guardian.countDocuments({ ...filter, status: "pending" }),
      Guardian.countDocuments({ ...filter, status: "active" }),
      Guardian.countDocuments({ ...filter, status: "inactive" }),
      Guardian.countDocuments({ ...filter, status: "locked" }),
      Guardian.countDocuments({ ...filter, status: "suspended" }),

      // Recent registrations
      Guardian.aggregate([
        {
          $match: {
            ...filter,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Login stats
      Guardian.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalLogins: { $sum: { $size: "$loginHistory" } },
            uniqueDevices: { $addToSet: "$lastLoginDevice" },
            activeToday: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      "$lastLoginAt",
                      new Date(Date.now() - 24 * 60 * 60 * 1000),
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            totalLogins: 1,
            uniqueDevices: { $size: "$uniqueDevices" },
            activeToday: 1,
          },
        },
      ]),
    ]);

    return {
      overview: {
        total,
        pending,
        active,
        inactive,
        locked,
        suspended,
        activeToday: loginStats[0]?.activeToday || 0,
      },
      recentRegistrations,
      loginStats: {
        totalLogins: loginStats[0]?.totalLogins || 0,
        uniqueDevices: loginStats[0]?.uniqueDevices || 0,
      },
    };
  }

  /**
   * Search guardians
   */
  async search(searchTerm, userId, userRole, filters = {}) {
    if (!searchTerm || searchTerm.length < 2) {
      throw new AppError("Search term must be at least 2 characters", 400);
    }

    const filter = {
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { mobile: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
      ],
    };

    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    if (filters.status) {
      filter.status = filters.status;
    }

    const guardians = await Guardian.find(filter)
      .select("name mobile email students status lastLoginAt")
      .populate("students.studentId", "name classId")
      .limit(20)
      .sort("-createdAt")
      .lean();

    return guardians.map((g) => ({
      ...g,
      students: g.students?.map((s) => s.studentId?.name).filter(Boolean) || [],
    }));
  }

  /**
   * Get classes for dropdown
   */
  async getClasses(userId, userRole) {
    const filter = userRole === "admin" ? {} : { createdBy: userId };
    return await Category.find(filter).select("name description").sort("name");
  }

  /**
   * Get sections by class
   */
  async getSectionsByClass(classId, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new AppError("Invalid Class ID format", 400);
    }

    const filter = { mainCategoryId: classId, isActive: true };
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    return await SubCategory.find(filter)
      .select("name description order")
      .sort("order name");
  }

  /**
   * Get groups by section
   */
  async getGroupsBySection(sectionId, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      throw new AppError("Invalid Section ID format", 400);
    }

    const filter = { subCategoryId: sectionId, isActive: true, level: 1 };
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    return await NestedSubCategory.find(filter)
      .select("name description color icon order")
      .sort("order name");
  }

  /**
   * Add student to guardian
   */
  async addStudentToGuardian(
    guardianId,
    studentId,
    relationship,
    isPrimary,
    userId,
    userRole,
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(guardianId) ||
      !mongoose.Types.ObjectId.isValid(studentId)
    ) {
      throw new AppError("Invalid ID format", 400);
    }

    const guardian = await Guardian.findById(guardianId);
    if (!guardian) {
      throw new AppError("Guardian not found", 404);
    }

    if (userRole !== "admin" && guardian.createdBy.toString() !== userId) {
      throw new AppError("You do not have permission", 403);
    }

    const Student = mongoose.model("Student");
    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    await guardian.addStudent(studentId, relationship, isPrimary);
    await student.addGuardian(guardianId, relationship, isPrimary);

    return this.getGuardianById(guardianId, userId, userRole);
  }

  /**
   * Remove student from guardian
   */
  async removeStudentFromGuardian(guardianId, studentId, userId, userRole) {
    if (
      !mongoose.Types.ObjectId.isValid(guardianId) ||
      !mongoose.Types.ObjectId.isValid(studentId)
    ) {
      throw new AppError("Invalid ID format", 400);
    }

    const guardian = await Guardian.findById(guardianId);
    if (!guardian) {
      throw new AppError("Guardian not found", 404);
    }

    if (userRole !== "admin" && guardian.createdBy.toString() !== userId) {
      throw new AppError("You do not have permission", 403);
    }

    const Student = mongoose.model("Student");
    const student = await Student.findById(studentId);
    if (student) {
      await student.removeGuardian(guardianId);
    }

    await guardian.removeStudent(studentId);

    return this.getGuardianById(guardianId, userId, userRole);
  }
}

export const guardianService = new GuardianService();


