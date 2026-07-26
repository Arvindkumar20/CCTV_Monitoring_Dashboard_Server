import { body, param, query } from "express-validator";

// ==================== BASE VALIDATIONS ====================

export const guardianIdValidation = [
  param("id").isMongoId().withMessage("Invalid guardian ID format")
];

export const studentIdValidation = [
  param("studentId").isMongoId().withMessage("Invalid student ID format")
];

export const classIdValidation = [
  param("classId").isMongoId().withMessage("Invalid class ID format")
];

export const sectionIdValidation = [
  param("sectionId").isMongoId().withMessage("Invalid section ID format")
];

// ==================== AUTH VALIDATIONS ====================

export const loginValidation = [
  body("identifier")
    .notEmpty().withMessage("Mobile number or email is required")
    .isString().withMessage("Identifier must be a string"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
];

// ==================== CRUD VALIDATIONS ====================

export const createGuardianValidation = [
  // Guardian fields
  body("name")
    .notEmpty().withMessage("Guardian name is required")
    .isString().withMessage("Guardian name must be a string")
    .isLength({ min: 3, max: 100 }).withMessage("Guardian name must be between 3 and 100 characters"),
  
  body("mobile")
    .notEmpty().withMessage("Mobile number is required")
    .matches(/^(\+91|0)?[6-9]\d{9}$/).withMessage("Please enter a valid Indian mobile number"),
  
  body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email address")
    .normalizeEmail(),
  
  body("password")
    .optional()
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  
  body("occupation")
    .optional()
    .isString().withMessage("Occupation must be a string"),
  
  body("annualIncome")
    .optional()
    .isNumeric().withMessage("Annual income must be a number"),
  
  body("alternatePhone")
    .optional()
    .matches(/^(\+91|0)?[6-9]\d{9}$/).withMessage("Please enter a valid Indian mobile number"),
  
  body("emergencyContact")
    .optional()
    .isString().withMessage("Emergency contact must be a string"),
  
  body("address.street")
    .optional()
    .isString().withMessage("Street must be a string"),
  
  body("address.city")
    .optional()
    .isString().withMessage("City must be a string"),
  
  body("address.state")
    .optional()
    .isString().withMessage("State must be a string"),
  
  body("address.pincode")
    .optional()
    .isString().withMessage("Pincode must be a string"),
  
  // Student fields (optional for backward compatibility)
  body("studentName")
    .optional()
    .isString().withMessage("Student name must be a string")
    .isLength({ min: 3, max: 100 }).withMessage("Student name must be between 3 and 100 characters"),
  
  body("dob")
    .optional()
    .isISO8601().withMessage("Invalid date format for date of birth"),
  
  body("classId")
    .optional()
    .isMongoId().withMessage("Invalid class ID format"),
  
  body("sectionId")
    .optional()
    .isMongoId().withMessage("Invalid section ID format"),
  
  body("groupId")
    .optional()
   ,
  
  body("gender")
    .optional()
    .isIn(["male", "female", "other"]).withMessage("Gender must be male, female, or other"),
  
  body("rollNumber")
    .optional()
    .isString().withMessage("Roll number must be a string"),
  
  body("admissionNumber")
    .optional()
    .isString().withMessage("Admission number must be a string"),
  
  // Backward compatibility fields
  body("guardianName")
    .optional()
    .custom((value, { req }) => {
      if (value && !req.body.name) {
        req.body.name = value;
      }
      return true;
    }),
  
  body("Class")
    .optional()
    .custom((value, { req }) => {
      if (value && !req.body.classId) {
        req.body.classId = value;
      }
      return true;
    }),
  
  body("section")
    .optional()
    .custom((value, { req }) => {
      if (value && !req.body.sectionId) {
        req.body.sectionId = value;
      }
      return true;
    }),
  
  body("group")
    .optional()
    .custom((value, { req }) => {
      if (value && !req.body.groupId) {
        req.body.groupId = value;
      }
      return true;
    })
];

export const updateGuardianValidation = [
  body("name")
    .optional()
    .isString().withMessage("Guardian name must be a string")
    .isLength({ min: 3, max: 100 }).withMessage("Guardian name must be between 3 and 100 characters"),
  
  body("mobile")
    .optional()
    .matches(/^(\+91|0)?[6-9]\d{9}$/).withMessage("Please enter a valid Indian mobile number"),
  
  body("email")
    .optional()
    .isEmail().withMessage("Please enter a valid email address")
    .normalizeEmail(),
  
  body("password")
    .optional()
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  
  body("occupation")
    .optional()
    .isString().withMessage("Occupation must be a string"),
  
  body("annualIncome")
    .optional()
    .isNumeric().withMessage("Annual income must be a number"),
  
  body("alternatePhone")
    .optional()
    .matches(/^(\+91|0)?[6-9]\d{9}$/).withMessage("Please enter a valid Indian mobile number"),
  
  body("emergencyContact")
    .optional()
    .isString().withMessage("Emergency contact must be a string"),
  
  body("status")
    .optional()
    .isIn(["pending", "active", "inactive", "locked", "suspended"])
    .withMessage("Invalid status value"),
  
  // Student ID for linking
  body("studentId")
    .optional()
    .isMongoId().withMessage("Invalid student ID format"),
  
  body("relationship")
    .optional()
    .isIn(["father", "mother", "guardian", "other"])
    .withMessage("Relationship must be father, mother, guardian, or other"),
  
  body("isPrimary")
    .optional()
    .isBoolean().withMessage("isPrimary must be a boolean"),
  
  // Backward compatibility
  body("guardianName")
    .optional()
    .custom((value, { req }) => {
      if (value && !req.body.name) {
        req.body.name = value;
      }
      return true;
    })
];

// ==================== QUERY VALIDATIONS ====================

export const getAllGuardiansValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("Page must be a positive integer")
    .toInt(),
  
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100")
    .toInt(),
  
  query("sortBy")
    .optional()
    .isIn(["createdAt", "name", "mobile", "email", "status", "lastLoginAt"])
    .withMessage("Invalid sort field"),
  
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"]).withMessage("Sort order must be asc or desc"),
  
  query("status")
    .optional()
    .isIn(["pending", "active", "inactive", "locked", "suspended", "all"])
    .withMessage("Invalid status value"),
  
  query("classId")
    .optional()
    .isMongoId().withMessage("Invalid class ID format"),
  
  query("sectionId")
    .optional()
    .isMongoId().withMessage("Invalid section ID format"),
  
  query("groupId")
    .optional()
    .isMongoId().withMessage("Invalid group ID format"),
  
  query("search")
    .optional()
    .isString().withMessage("Search term must be a string")
    .isLength({ min: 2 }).withMessage("Search term must be at least 2 characters"),
  
  query("fromDate")
    .optional()
    .isISO8601().withMessage("Invalid from date format"),
  
  query("toDate")
    .optional()
    .isISO8601().withMessage("Invalid to date format")
];

export const getLoginHistoryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("Page must be a positive integer")
    .toInt(),
  
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100")
    .toInt(),
  
  query("status")
    .optional()
    .isIn(["success", "failed", "all"]).withMessage("Status must be success, failed, or all"),
  
  query("fromDate")
    .optional()
    .isISO8601().withMessage("Invalid from date format"),
  
  query("toDate")
    .optional()
    .isISO8601().withMessage("Invalid to date format")
];

// ==================== BULK OPERATION VALIDATIONS ====================

export const bulkDeleteValidation = [
  body("guardianIds")
    .isArray({ min: 1 }).withMessage("Guardian IDs must be a non-empty array")
    .custom((ids) => ids.every(id => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage("All guardian IDs must be valid MongoDB IDs")
];

export const bulkStatusUpdateValidation = [
  body("guardianIds")
    .isArray({ min: 1 }).withMessage("Guardian IDs must be a non-empty array")
    .custom((ids) => ids.every(id => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage("All guardian IDs must be valid MongoDB IDs"),
  
  body("status")
    .notEmpty().withMessage("Status is required")
    .isIn(["pending", "active", "inactive", "locked", "suspended"])
    .withMessage("Invalid status value")
];

export const bulkUploadValidation = [
  body("guardians")
    .isArray({ min: 1 }).withMessage("Guardians data must be a non-empty array")
];

// ==================== STUDENT MANAGEMENT VALIDATIONS ====================

export const addStudentValidation = [
  param("guardianId").isMongoId().withMessage("Invalid guardian ID format"),
  param("studentId").isMongoId().withMessage("Invalid student ID format"),
  body("relationship")
    .optional()
    .isIn(["father", "mother", "guardian", "other"])
    .withMessage("Relationship must be father, mother, guardian, or other"),
  body("isPrimary")
    .optional()
    .isBoolean().withMessage("isPrimary must be a boolean")
];

// ==================== HIERARCHY VALIDATIONS ====================

export const getSectionsValidation = [
  param("classId").isMongoId().withMessage("Invalid class ID format")
];

export const getGroupsValidation = [
  param("sectionId").isMongoId().withMessage("Invalid section ID format")
];

// ==================== IMPORT VALIDATIONS ====================

export const importExcelValidation = [
  body().custom((value, { req }) => {
    if (!req.file) {
      throw new Error("No file uploaded");
    }
    const fileType = req.file.originalname.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(fileType)) {
      throw new Error("Only Excel (.xlsx, .xls) and CSV files are allowed");
    }
    return true;
  })
];

// Export all validations
export default {
  guardianIdValidation,
  studentIdValidation,
  classIdValidation,
  sectionIdValidation,
  loginValidation,
  createGuardianValidation,
  updateGuardianValidation,
  getAllGuardiansValidation,
  getLoginHistoryValidation,
  bulkDeleteValidation,
  bulkStatusUpdateValidation,
  bulkUploadValidation,
  addStudentValidation,
  getSectionsValidation,
  getGroupsValidation,
  importExcelValidation
};