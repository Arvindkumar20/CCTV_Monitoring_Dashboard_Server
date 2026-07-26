import { body, param, query } from "express-validator";
import mongoose from "mongoose";
import Category from "../models/category.model.js";
import SubCategory from "../models/subCategory.model.js";
import NestedSubCategory from "../models/nestedSubCategory.model.js";

export const createCameraValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Camera name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Camera name must be between 3 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      "Name can only contain letters, numbers, spaces, hyphens and underscores"
    ),

  body("rtspUrl")
    .trim()
    .notEmpty()
    .withMessage("RTSP URL is required")
    .custom((value) => {
      if (!value.startsWith("rtsp://") && !value.startsWith("rtsps://")) {
        throw new Error("RTSP URL must start with rtsp:// or rtsps://");
      }
      return true;
    })
    .isURL({
      protocols: ["rtsp", "rtsps"],
      require_tld: false,
      require_protocol: true,
    })
    .withMessage("Please enter a valid RTSP URL"),

  body("mainCategoryId")
    .notEmpty()
    .withMessage("Main category is required")
    .isMongoId()
    .withMessage("Invalid main category ID format")
    .custom(async (value, { req }) => {
      const category = await Category.findById(value);
      if (!category) {
        throw new Error("Main category not found");
      }

      // Check if user has access to this category
      if (category.createdBy.toString() !== req.user?.userId && req.user?.role !== "admin") {
        throw new Error("You do not have access to this category");
      }

      return true;
    }),

  body("subCategoryId")
    .optional()
    
    .custom(async (value, { req }) => {
      if (value) {
        const subCategory = await SubCategory.findById(value);
        if (!subCategory) {
          throw new Error("Sub category not found");
        }

        // Verify sub category belongs to selected main category
        if (subCategory.mainCategoryId.toString() !== req.body.mainCategoryId) {
          throw new Error("Sub category must belong to the selected main category");
        }

        // Check access
        if (subCategory.createdBy.toString() !== req.user?.userId && req.user?.role !== "admin") {
          throw new Error("You do not have access to this sub category");
        }
      }
      return true;
    }),

//   body("subSubCategoryId")
//     .optional()
//     .isMongoId()
//     .withMessage("Invalid nested sub category ID format")
//     .custom(async (value, { req }) => {
//       if (value) {
//         if (!req.body.subCategoryId) {
//           throw new Error("Sub category is required when selecting nested sub category");
//         }

//         const nestedSubCategory = await NestedSubCategory.findById(value);
//         if (!nestedSubCategory) {
//           throw new Error("Nested sub category not found");
//         }

//         // Verify nested sub category belongs to selected sub category
//         if (nestedSubCategory.subCategoryId.toString() !== req.body.subCategoryId) {
//           throw new Error("Nested sub category must belong to the selected sub category");
//         }

//         // Verify nested sub category belongs to selected main category
//         if (nestedSubCategory.mainCategoryId.toString() !== req.body.mainCategoryId) {
//           throw new Error("Nested sub category must belong to the selected main category");
//         }

//         // Check access
//         if (nestedSubCategory.createdBy.toString() !== req.user?.userId && req.user?.role !== "admin") {
//           throw new Error("You do not have access to this nested sub category");
//         }
//       }
//       return true;
//     }),

  body("status")
    .optional()
    .isIn(["active", "inactive", "maintenance"])
    .withMessage("Status must be active, inactive, or maintenance"),

  body("location")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Location cannot exceed 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("thumbnail")
    .optional()
    .isURL()
    .withMessage("Thumbnail must be a valid URL"),

  body("streamSettings")
    .optional()
    .isObject()
    .withMessage("Stream settings must be an object"),

  body("streamSettings.port")
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage("Port must be between 1 and 65535"),

  body("streamSettings.transport")
    .optional()
    .isIn(["tcp", "udp"])
    .withMessage("Transport must be tcp or udp"),

  body("streamSettings.latency")
    .optional()
    .isInt({ min: 0, max: 5000 })
    .withMessage("Latency must be between 0 and 5000 ms"),

  body("streamSettings.fps")
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage("FPS must be between 1 and 120"),

  body("streamSettings.resolution")
    .optional()
    .matches(/^\d+x\d+$/)
    .withMessage("Resolution must be in format WxH (e.g., 1920x1080)"),
];

export const updateCameraValidation = [
  param("id").isMongoId().withMessage("Invalid camera ID"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Camera name must be between 3 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      "Name can only contain letters, numbers, spaces, hyphens and underscores"
    ),

  body("rtspUrl")
    .optional()
    .trim()
    .custom((value) => {
      if (!value.startsWith("rtsp://") && !value.startsWith("rtsps://")) {
        throw new Error("RTSP URL must start with rtsp:// or rtsps://");
      }
      return true;
    })
    .isURL({
      protocols: ["rtsp", "rtsps"],
      require_tld: false,
      require_protocol: true,
    })
    .withMessage("Please enter a valid RTSP URL"),

  body("mainCategoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid main category ID format")
    .custom(async (value, { req }) => {
      const category = await Category.findById(value);
      if (!category) {
        throw new Error("Main category not found");
      }
      return true;
    }),

  body("subCategoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid sub category ID format")
    .custom(async (value, { req }) => {
      if (value) {
        const subCategory = await SubCategory.findById(value);
        if (!subCategory) {
          throw new Error("Sub category not found");
        }

        // Verify sub category belongs to selected main category
        const mainCategoryId = req.body.mainCategoryId || req.camera?.mainCategoryId;
        if (subCategory.mainCategoryId.toString() !== mainCategoryId) {
          throw new Error("Sub category must belong to the selected main category");
        }
      }
      return true;
    }),

  body("subSubCategoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid nested sub category ID format")
    .custom(async (value, { req }) => {
      if (value) {
        const subCategoryId = req.body.subCategoryId || req.camera?.subCategoryId;
        if (!subCategoryId) {
          throw new Error("Sub category is required when selecting nested sub category");
        }

        const nestedSubCategory = await NestedSubCategory.findById(value);
        if (!nestedSubCategory) {
          throw new Error("Nested sub category not found");
        }

        // Verify nested sub category belongs to selected sub category
        if (nestedSubCategory.subCategoryId.toString() !== subCategoryId.toString()) {
          throw new Error("Nested sub category must belong to the selected sub category");
        }

        // Verify nested sub category belongs to selected main category
        const mainCategoryId = req.body.mainCategoryId || req.camera?.mainCategoryId;
        if (nestedSubCategory.mainCategoryId.toString() !== mainCategoryId) {
          throw new Error("Nested sub category must belong to the selected main category");
        }
      }
      return true;
    }),

  body("status")
    .optional()
    .isIn(["active", "inactive", "maintenance"])
    .withMessage("Status must be active, inactive, or maintenance"),

  body("streamStatus")
    .optional()
    .isIn(["online", "offline", "unknown", "connecting"])
    .withMessage("Invalid stream status"),

  body("location")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Location cannot exceed 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("thumbnail")
    .optional()
    .isURL()
    .withMessage("Thumbnail must be a valid URL"),

  body("streamSettings")
    .optional()
    .isObject()
    .withMessage("Stream settings must be an object"),
];

export const cameraIdValidation = [
  param("id").isMongoId().withMessage("Invalid camera ID"),
];

export const getAllCamerasValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),

  query("sortBy")
    .optional()
    .isIn(["name", "createdAt", "updatedAt", "status", "streamStatus", "lastPingAt"])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),

  query("status")
    .optional()
    .isIn(["active", "inactive", "maintenance", "all"])
    .withMessage("Invalid status filter"),

  query("streamStatus")
    .optional()
    .isIn(["online", "offline", "unknown", "connecting", "all"])
    .withMessage("Invalid stream status filter"),

  query("mainCategoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid main category ID"),

  query("subCategoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid sub category ID"),

  query("subSubCategoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid nested sub category ID"),

  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .trim(),

  query("fromDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid from date format"),

  query("toDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid to date format"),
];

export const bulkDeleteValidation = [
  body("cameraIds")
    .isArray({ min: 1 })
    .withMessage("Camera IDs must be a non-empty array")
    .custom((value) => value.every((id) => mongoose.Types.ObjectId.isValid(id)))
    .withMessage("All camera IDs must be valid MongoDB IDs"),
];

export const bulkStatusUpdateValidation = [
  body("cameraIds")
    .isArray({ min: 1 })
    .withMessage("Camera IDs must be a non-empty array")
    .custom((value) => value.every((id) => mongoose.Types.ObjectId.isValid(id)))
    .withMessage("All camera IDs must be valid MongoDB IDs"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["active", "inactive", "maintenance"])
    .withMessage("Status must be active, inactive, or maintenance"),
];

export const getByCategoryValidation = [
  param("categoryId").isMongoId().withMessage("Invalid category ID"),
  param("categoryType")
    .isIn(["main", "sub", "nested"])
    .withMessage("Category type must be main, sub, or nested"),
];

export const updateStreamStatusValidation = [
  param("id").isMongoId().withMessage("Invalid camera ID"),
  body("status")
    .notEmpty()
    .withMessage("Stream status is required")
    .isIn(["online", "offline", "unknown", "connecting"])
    .withMessage("Invalid stream status"),
];

export const validateRtspUrlValidation = [
  body("rtspUrl")
    .trim()
    .notEmpty()
    .withMessage("RTSP URL is required")
    .custom((value) => {
      if (!value.startsWith("rtsp://") && !value.startsWith("rtsps://")) {
        throw new Error("RTSP URL must start with rtsp:// or rtsps://");
      }
      return true;
    })
    .isURL({
      protocols: ["rtsp", "rtsps"],
      require_tld: false,
      require_protocol: true,
    })
    .withMessage("Please enter a valid RTSP URL"),
];