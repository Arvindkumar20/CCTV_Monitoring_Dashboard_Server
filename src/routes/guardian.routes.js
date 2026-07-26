import express from "express";
import multer from "multer";
import {
  createGuardian,
  getAllGuardians,
  getGuardianById,
  updateGuardian,
  deleteGuardian,
  loginGuardian,
  getLoginHistory,
  toggleStatus,
  bulkDelete,
  bulkUpdateStatus,
  bulkUpload,
  importGuardians,
  exportGuardians,
  searchGuardians,
  getStats,
  lookupGuardian,
  resetPassword,
  // New controller functions
  addStudentToGuardian,
  removeStudentFromGuardian,
  getGuardianStudents,
  getClasses,
  getSectionsByClass,
  getGroupsBySection
} from "../controllers/guardian.controller.js";

// Validation imports
import {
  createGuardianValidation,
  updateGuardianValidation,
  guardianIdValidation,
  getAllGuardiansValidation,
  loginValidation,
  getLoginHistoryValidation,
  bulkDeleteValidation,
  bulkStatusUpdateValidation,
  bulkUploadValidation,
  importExcelValidation,
  // New validations
  addStudentValidation,
  getSectionsValidation,
  getGroupsValidation,
  studentIdValidation,
  classIdValidation,
  sectionIdValidation
} from "../validations/guardian.validation.js";

import { authenticate, restrictTo, authenticateGuardian } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ==================== PUBLIC ROUTES ====================
/**
 * @route POST /api/guardians/login
 * @desc Login guardian
 * @access Public
 */
router.post("/login", validate(loginValidation), loginGuardian);

// ==================== ALL ROUTES BELOW REQUIRE AUTHENTICATION ====================
router.use(authenticate);

// ==================== STATS & SEARCH ROUTES ====================
// These must come before /:id routes to avoid conflict

/**
 * @route GET /api/guardians/stats
 * @desc Get guardian statistics
 * @access Private (Admin, Principal)
 */
router.get("/stats", restrictTo("admin", "principal"), getStats);

/**
 * @route GET /api/guardians/search
 * @desc Search guardians
 * @access Private
 */
router.get("/search", searchGuardians);

/**
 * @route GET /api/guardians/lookup
 * @desc Lookup guardian by mobile/email
 * @access Private
 */
router.get("/lookup", lookupGuardian);

// ==================== EXPORT ROUTES ====================
/**
 * @route GET /api/guardians/export
 * @desc Export guardians to CSV/JSON
 * @access Private (Admin, Principal)
 */
router.get("/export", restrictTo("admin", "principal"), exportGuardians);

// ==================== HIERARCHY ROUTES ====================
/**
 * @route GET /api/guardians/classes
 * @desc Get all classes for dropdown
 * @access Private
 */
router.get("/classes", getClasses);

/**
 * @route GET /api/guardians/classes/:classId/sections
 * @desc Get sections by class ID
 * @access Private
 */
router.get("/classes/:classId/sections", 
  validate(classIdValidation), 
  getSectionsByClass
);

/**
 * @route GET /api/guardians/sections/:sectionId/groups
 * @desc Get groups by section ID
 * @access Private
 */
router.get("/sections/:sectionId/groups", 
  validate(sectionIdValidation), 
  getGroupsBySection
);

// ==================== BULK OPERATIONS ====================
// Admin/Principal only routes

/**
 * @route POST /api/guardians/bulk-delete
 * @desc Delete multiple guardians
 * @access Private (Admin, Principal)
 */
router.post("/bulk-delete", 
  restrictTo("admin", "principal"),
  validate(bulkDeleteValidation), 
  bulkDelete
);

/**
 * @route PATCH /api/guardians/bulk-status
 * @desc Update status of multiple guardians
 * @access Private (Admin, Principal)
 */
router.patch("/bulk-status", 
  restrictTo("admin", "principal"),
  validate(bulkStatusUpdateValidation), 
  bulkUpdateStatus
);

/**
 * @route POST /api/guardians/bulk-upload
 * @desc Bulk upload guardians (JSON array)
 * @access Private (Admin, Principal)
 */
router.post("/bulk-upload", 
  restrictTo("admin", "principal"),
  validate(bulkUploadValidation), 
  bulkUpload
);

/**
 * @route POST /api/guardians/import
 * @desc Import guardians from Excel/CSV file
 * @access Private (Admin, Principal)
 */
router.post("/import", 
  restrictTo("admin", "principal"),
  upload.single("file"), 
  validate(importExcelValidation),
  importGuardians
);

// ==================== STUDENT MANAGEMENT ROUTES ====================

/**
 * @route POST /api/guardians/:guardianId/students/:studentId
 * @desc Add student to guardian
 * @access Private (Admin, Principal, Teacher)
 */
router.post("/:guardianId/students/:studentId",
  restrictTo("admin", "principal", "teacher"),
  validate(addStudentValidation),
  addStudentToGuardian
);

/**
 * @route DELETE /api/guardians/:guardianId/students/:studentId
 * @desc Remove student from guardian
 * @access Private (Admin, Principal, Teacher)
 */
router.delete("/:guardianId/students/:studentId",
  restrictTo("admin", "principal", "teacher"),
  validate([...guardianIdValidation, ...studentIdValidation]),
  removeStudentFromGuardian
);

/**
 * @route GET /api/guardians/:id/students
 * @desc Get all students of a guardian
 * @access Private
 */
router.get("/:id/students",
  validate(guardianIdValidation),
  getGuardianStudents
);

// ==================== CRUD ROUTES ====================

/**
 * @route GET /api/guardians
 * @desc Get all guardians with filters
 * @access Private
 */
router.get("/",
  validate(getAllGuardiansValidation),
  getAllGuardians
);

/**
 * @route POST /api/guardians
 * @desc Create new guardian
 * @access Private (Admin, Principal, Teacher)
 */
router.post("/",
  restrictTo("admin", "principal", "teacher"),
  validate(createGuardianValidation),
  createGuardian
);

/**
 * @route GET /api/guardians/:id
 * @desc Get guardian by ID
 * @access Private
 */
router.get("/:id",
  validate(guardianIdValidation),
  getGuardianById
);

/**
 * @route PATCH /api/guardians/:id
 * @desc Update guardian
 * @access Private (Admin, Principal, Teacher)
 */
router.patch("/:id",
  restrictTo("admin", "principal", "teacher"),
  validate([...guardianIdValidation, ...updateGuardianValidation]),
  updateGuardian
);

/**
 * @route DELETE /api/guardians/:id
 * @desc Delete guardian
 * @access Private (Admin, Principal)
 */
router.delete("/:id",
  restrictTo("admin", "principal"),
  validate(guardianIdValidation),
  deleteGuardian
);

// ==================== LOGIN HISTORY ====================

/**
 * @route GET /api/guardians/:id/login-history
 * @desc Get guardian login history
 * @access Private (Admin, Principal)
 */
router.get("/:id/login-history",
  restrictTo("admin", "principal"),
  validate([...guardianIdValidation, ...getLoginHistoryValidation]),
  getLoginHistory
);

// ==================== STATUS MANAGEMENT ====================

/**
 * @route PATCH /api/guardians/:id/toggle-status
 * @desc Toggle guardian status
 * @access Private (Admin, Principal)
 */
router.patch("/:id/toggle-status",
  restrictTo("admin", "principal"),
  validate(guardianIdValidation),
  toggleStatus
);

// ==================== PASSWORD MANAGEMENT ====================

/**
 * @route POST /api/guardians/:id/reset-password
 * @desc Reset guardian password
 * @access Private (Admin, Principal)
 */
router.post("/:id/reset-password",
  restrictTo("admin", "principal"),
  validate(guardianIdValidation),
  resetPassword
);

// ==================== GUARDIAN SPECIFIC ROUTES (with guardian auth) ====================

/**
 * @route GET /api/guardians/me/dashboard
 * @desc Get guardian dashboard (own view)
 * @access Private (Guardian only)
 */
router.get("/me/dashboard", 
  authenticateGuardian, 
  (req, res) => {
    successResponse(res, "Dashboard data fetched successfully", {
      guardian: req.guardian,
      students: req.guardian.students
    });
  }
);

/**
 * @route GET /api/guardians/me/students
 * @desc Get guardian's own students
 * @access Private (Guardian only)
 */
router.get("/me/students", 
  authenticateGuardian, 
  getGuardianStudents
);

// Export router
export const guardianRouter = router;