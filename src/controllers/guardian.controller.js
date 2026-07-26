import { guardianService } from "../services/guardian.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import AppError from "../utils/AppError.js";
import { getClientInfo } from "../utils/clientInfo.js";
import Guardian from "../models/guardian/index.js";
import Camera from "../models/camera.model.js";
import { streamService } from "../services/stream.service.js";

/**
 * Create new guardian
 * @route POST /api/guardians
 * @access Private
 */
export const createGuardian = asyncHandler(async (req, res) => {
  const clientInfo = getClientInfo(req);

  // Map old field names to new ones if needed
  const data = { ...req.body };
  if (data.guardianName && !data.name) {
    data.name = data.guardianName;
    delete data.guardianName;
  }
  if (data.guardianPhoto && !data.photo) {
    data.photo = data.guardianPhoto;
    delete data.guardianPhoto;
  }
  if (data.Class && !data.classId) {
    data.classId = data.Class;
    delete data.Class;
  }
  if (data.section && !data.sectionId) {
    data.sectionId = data.section;
    delete data.section;
  }
  if (data.group && !data.groupId) {
    data.groupId = data.group;
    delete data.group;
  }

  const guardian = await guardianService.createGuardian(
    data,
    req.user.userId,
    clientInfo,
  );

  return successResponse(res, "Guardian created successfully", guardian, 201);
});

/**
 * Get all guardians
 * @route GET /api/guardians
 * @access Private
 */
export const getAllGuardians = asyncHandler(async (req, res) => {
  const result = await guardianService.getAllGuardians(
    req.query,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Guardians fetched successfully", result);
});

/**
 * Get guardian by ID
 * @route GET /api/guardians/:id
 * @access Private
 */
export const getGuardianById = asyncHandler(async (req, res) => {
  const guardian = await guardianService.getGuardianById(
    req.params.id,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Guardian fetched successfully", guardian);
});

/**
 * Update guardian
 * @route PUT /api/guardians/:id
 * @access Private
 */
export const updateGuardian = asyncHandler(async (req, res) => {
  // Map old field names to new ones if needed
  const data = { ...req.body };
  if (data.guardianName && !data.name) {
    data.name = data.guardianName;
    delete data.guardianName;
  }
  if (data.guardianPhoto && !data.photo) {
    data.photo = data.guardianPhoto;
    delete data.guardianPhoto;
  }
  if (data.Class && !data.classId) {
    data.classId = data.Class;
    delete data.Class;
  }
  if (data.section && !data.sectionId) {
    data.sectionId = data.section;
    delete data.section;
  }
  if (data.group && !data.groupId) {
    data.groupId = data.group;
    delete data.group;
  }

  const guardian = await guardianService.updateGuardian(
    req.params.id,
    data,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Guardian updated successfully", guardian);
});

/**
 * Delete guardian
 * @route DELETE /api/guardians/:id
 * @access Private
 */
export const deleteGuardian = asyncHandler(async (req, res) => {
  const result = await guardianService.deleteGuardian(
    req.params.id,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Guardian deleted successfully", result);
});

/**
 * Login guardian
 * @route POST /api/guardians/login
 * @access Public
 */
export const loginGuardian = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  // 1️⃣ Login from service
  const result = await guardianService.login(identifier, password, req);

  const guardian = result.guardian;

  // 2️⃣ Get all student IDs for this guardian
  const studentIds = guardian.students?.map(s => s.studentId?._id).filter(Boolean) || [];

  // 3️⃣ Build camera filter based on all students' classes/sections/groups
  const filter = { $or: [] };

  // Get all students with their hierarchy
  const Student = (await import("../models/student/index.js")).default;
  const students = await Student.find({ _id: { $in: studentIds } })
    .select("classId sectionId groupId");

  // Add filters for each student
  students.forEach(student => {
    if (student.classId) {
      filter.$or.push({ mainCategoryId: student.classId });
    }
    if (student.sectionId) {
      filter.$or.push({ subCategoryId: student.sectionId });
    }
    if (student.groupId) {
      filter.$or.push({ subSubCategoryId: student.groupId });
    }
  });

  // If no students, return empty cameras
  if (filter.$or.length === 0) {
    filter.$or.push({ _id: null }); // This will return no results
  }

  // 4️⃣ Fetch Cameras for all students
  const cameras = await Camera.find(filter)
    .populate("mainCategoryId", "name")
    .populate("subCategoryId", "name")
    .populate("subSubCategoryId", "name")
    .select("name rtspUrl status streamStatus location description")
    .lean();

  // 5️⃣ Group cameras by student (optional)
  const camerasByStudent = {};
  students.forEach(student => {
    const studentCameras = cameras.filter(cam => 
      (student.classId && cam.mainCategoryId?._id?.toString() === student.classId?.toString()) ||
      (student.sectionId && cam.subCategoryId?._id?.toString() === student.sectionId?.toString()) ||
      (student.groupId && cam.subSubCategoryId?._id?.toString() === student.groupId?.toString())
    );
    camerasByStudent[student._id] = studentCameras;
  });

  // 6️⃣ Set Guardian Cookie
  res.cookie("guardianToken", result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // 7️⃣ Generate Streams
  const streams = streamService.getGuardianStreams(guardian._id);

  // 8️⃣ Send Success Response
  successResponse(res, "Login successful", {
    guardian: {
      _id: guardian._id,
      name: guardian.name,
      mobile: guardian.mobile,
      email: guardian.email,
      photo: guardian.photo,
      status: guardian.status,
      students: guardian.students?.map(s => ({
        id: s.studentId?._id,
        name: s.studentId?.name,
        class: s.studentId?.classId?.name,
        section: s.studentId?.sectionId?.name,
        group: s.studentId?.groupId?.name,
        rollNumber: s.studentId?.rollNumber,
        photo: s.studentId?.photo,
        relationship: s.relationship,
        isPrimary: s.isPrimaryContact,
      })) || [],
    },
    cameras: cameras.map((c) => ({
      _id: c._id,
      name: c.name,
      location: c.location,
      description: c.description,
      status: c.status,
      streamStatus: c.streamStatus,
      category: {
        main: c.mainCategoryId?.name,
        sub: c.subCategoryId?.name,
        nested: c.subSubCategoryId?.name,
      },
    })),
    camerasByStudent, // Optional: send cameras grouped by student
    streams,
  });
});

/**
 * Get login history
 * @route GET /api/guardians/:id/login-history
 * @access Private
 */
export const getLoginHistory = asyncHandler(async (req, res) => {
  const history = await guardianService.getLoginHistory(
    req.params.id,
    req.query,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Login history fetched successfully", history);
});

/**
 * Toggle guardian status
 * @route PATCH /api/guardians/:id/toggle-status
 * @access Private
 */
export const toggleStatus = asyncHandler(async (req, res) => {
  const guardian = await guardianService.updateGuardian(
    req.params.id,
    { status: req.body.status },
    req.user.userId,
    req.user.role,
  );

  return successResponse(
    res,
    `Guardian status updated to ${guardian.status}`,
    guardian,
  );
});

/**
 * Bulk delete guardians
 * @route POST /api/guardians/bulk-delete
 * @access Private
 */
export const bulkDelete = asyncHandler(async (req, res) => {
  const { guardianIds } = req.body;

  if (!guardianIds || !Array.isArray(guardianIds) || guardianIds.length === 0) {
    throw new AppError("Please provide an array of guardian IDs", 400);
  }

  const result = await guardianService.bulkDelete(
    guardianIds,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, result.message, result);
});

/**
 * Bulk update status
 * @route PATCH /api/guardians/bulk-status
 * @access Private
 */
export const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { guardianIds, status } = req.body;

  if (!guardianIds || !Array.isArray(guardianIds) || guardianIds.length === 0) {
    throw new AppError("Please provide an array of guardian IDs", 400);
  }

  if (!status) {
    throw new AppError("Please provide status", 400);
  }

  const result = await guardianService.bulkUpdateStatus(
    guardianIds,
    status,
    req.user.userId,
    req.user.role,
  );

  return successResponse(
    res,
    `${result.modifiedCount} guardians updated to ${status}`,
    result,
  );
});

/**
 * Bulk upload guardians
 * @route POST /api/guardians/bulk-upload
 * @access Private
 */
export const bulkUpload = asyncHandler(async (req, res) => {
  const { guardians } = req.body;

  if (!guardians || !Array.isArray(guardians) || guardians.length === 0) {
    throw new AppError("Please provide an array of guardians data", 400);
  }

  const clientInfo = getClientInfo(req);

  const result = await guardianService.bulkUpload(
    guardians,
    req.user.userId,
    clientInfo,
  );

  return successResponse(
    res,
    `Uploaded ${result.success.length} guardians successfully. ${result.failed.length} failed.`,
    result,
  );
});

/**
 * Import guardians from file
 * @route POST /api/guardians/import
 * @access Private
 */
export const importGuardians = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No file uploaded", 400);
  }

  const clientInfo = getClientInfo(req);
  const fileType = req.file.originalname.split(".").pop().toLowerCase();

  const result = await guardianService.importFromFile(
    req.file.buffer,
    fileType,
    req.user.userId,
    clientInfo,
  );

  return successResponse(
    res,
    result.message || `Imported ${result.data?.success?.length || 0} guardians successfully.`,
    result,
  );
});

/**
 * Export guardians
 * @route GET /api/guardians/export
 * @access Private
 */
export const exportGuardians = asyncHandler(async (req, res) => {
  const { format = "json" } = req.query;

  const data = await guardianService.exportGuardians(
    format,
    req.query,
    req.user.userId,
    req.user.role,
  );

  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=guardians_${new Date().toISOString().split('T')[0]}.csv`,
    );
    return res.send(data);
  }

  return successResponse(res, "Export data fetched successfully", data);
});

/**
 * Search guardians
 * @route GET /api/guardians/search
 * @access Private
 */
export const searchGuardians = asyncHandler(async (req, res) => {
  const { q, ...filters } = req.query;

  if (!q || q.length < 2) {
    throw new AppError("Search query must be at least 2 characters", 400);
  }

  const results = await guardianService.search(
    q,
    req.user.userId,
    req.user.role,
    filters,
  );

  return successResponse(res, "Search results fetched successfully", results);
});

/**
 * Get statistics
 * @route GET /api/guardians/stats
 * @access Private
 */
export const getStats = asyncHandler(async (req, res) => {
  const stats = await guardianService.getStats(req.user.userId, req.user.role);

  return successResponse(res, "Statistics fetched successfully", stats);
});

/**
 * Get guardian by mobile or email
 * @route GET /api/guardians/lookup
 * @access Private
 */
export const lookupGuardian = asyncHandler(async (req, res) => {
  const { identifier } = req.query;

  if (!identifier) {
    throw new AppError("Identifier (mobile/email) is required", 400);
  }

  const guardian = await Guardian.findOne({
    $or: [{ mobile: identifier }, { email: identifier.toLowerCase() }],
  })
    .select("-password -loginHistory -trustedDevices")
    .populate({
      path: "students.studentId",
      model: "Student",
      select: "name classId sectionId groupId",
      populate: [
        { path: "classId", select: "name" },
        { path: "sectionId", select: "name" },
        { path: "groupId", select: "name" },
      ],
    });

  if (!guardian) {
    throw new AppError("Guardian not found", 404);
  }

  // Transform response
  const guardianObj = guardian.toObject();
  guardianObj.students = guardianObj.students?.map(s => ({
    id: s.studentId?._id,
    name: s.studentId?.name,
    class: s.studentId?.classId?.name,
    section: s.studentId?.sectionId?.name,
    group: s.studentId?.groupId?.name,
    relationship: s.relationship,
    isPrimary: s.isPrimaryContact,
  })) || [];

  return successResponse(res, "Guardian found", guardianObj);
});

/**
 * Reset guardian password
 * @route POST /api/guardians/:id/reset-password
 * @access Private
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const guardian = await Guardian.findById(req.params.id).select("+password");

  if (!guardian) {
    throw new AppError("Guardian not found", 404);
  }

  let newPassword;
  const { password: providedPassword } = req.body;

  // Agar client side se password provide kiya hai to use karo
  if (providedPassword) {
    newPassword = providedPassword;
  } else {
    // Nahi to guardian ke name aur mobile se generate karo
    const guardianName = guardian.name;
    const mobile = guardian.mobile;
    
    if (!guardianName || !mobile) {
      throw new AppError("Guardian name or mobile not found to generate password", 400);
    }

    // Get first 3 letters of guardian name
    const first3 = guardianName.substring(0, 3).toLowerCase();
    
    // Get last 4 digits of mobile number
    const mobileStr = String(mobile).replace(/\D/g, ''); // Remove non-digits
    const last4Digits = mobileStr.slice(-4); // Get last 4 digits
    
    if (last4Digits.length !== 4) {
      throw new AppError("Invalid mobile number format", 400);
    }
    
    newPassword = first3.charAt(0).toUpperCase() +
                  first3.slice(1) +
                  last4Digits;
  }

  // Use the model's setPassword method to handle hashing
  await guardian.setPassword(newPassword);
  guardian.passwordChangedAt = new Date();
  guardian.updatedBy = req.user?.userId;
  await guardian.save();

  // In production, send via email/SMS instead of returning
  return successResponse(
    res,
    "Password reset successfully",
    { 
      message: "New password has been set",
      // Remove this in production:
      newPassword: providedPassword ? "********" : newPassword, // Hide if provided by client
      generatedFrom: providedPassword ? "user-provided" : "guardian-name+mobile"
    },
  );
});

/**
 * Add student to guardian
 * @route POST /api/guardians/:guardianId/students/:studentId
 * @access Private
 */
export const addStudentToGuardian = asyncHandler(async (req, res) => {
  const { guardianId, studentId } = req.params;
  const { relationship, isPrimary } = req.body;

  const guardian = await guardianService.addStudentToGuardian(
    guardianId,
    studentId,
    relationship || "guardian",
    isPrimary || false,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Student added to guardian successfully", guardian);
});

/**
 * Remove student from guardian
 * @route DELETE /api/guardians/:guardianId/students/:studentId
 * @access Private
 */
export const removeStudentFromGuardian = asyncHandler(async (req, res) => {
  const { guardianId, studentId } = req.params;

  const guardian = await guardianService.removeStudentFromGuardian(
    guardianId,
    studentId,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Student removed from guardian successfully", guardian);
});

/**
 * Get guardian's students
 * @route GET /api/guardians/:id/students
 * @access Private
 */
export const getGuardianStudents = asyncHandler(async (req, res) => {
  const guardian = await guardianService.getGuardianById(
    req.params.id,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Students fetched successfully", {
    guardianId: guardian._id,
    guardianName: guardian.name,
    students: guardian.students || [],
  });
});

/**
 * Get classes for dropdown
 * @route GET /api/guardians/classes
 * @access Private
 */
export const getClasses = asyncHandler(async (req, res) => {
  const classes = await guardianService.getClasses(
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Classes fetched successfully", classes);
});

/**
 * Get sections by class
 * @route GET /api/guardians/classes/:classId/sections
 * @access Private
 */
export const getSectionsByClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  const sections = await guardianService.getSectionsByClass(
    classId,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Sections fetched successfully", sections);
});

/**
 * Get groups by section
 * @route GET /api/guardians/sections/:sectionId/groups
 * @access Private
 */
export const getGroupsBySection = asyncHandler(async (req, res) => {
  const { sectionId } = req.params;

  const groups = await guardianService.getGroupsBySection(
    sectionId,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Groups fetched successfully", groups);
});


