import { body, param, query } from "express-validator";
import mongoose from "mongoose";
import SubCategory from "../models/subCategory.model.js";
import Category from "../models/category.model.js";
import NestedSubCategory from "../models/nestedSubCategory.model.js";

export const createNestedSubCategoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Nested sub category name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      "Name can only contain letters, numbers, spaces, hyphens and underscores"
    ),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("subCategoryId")
    .notEmpty()
    .withMessage("Parent sub category is required")
    .isMongoId()
    .withMessage("Invalid sub category ID format")
    .custom(async (value, { req }) => {
      const subCategory = await SubCategory.findById(value);
      if (!subCategory) {
        throw new Error("Parent sub category not found");
      }

      // Check if user has access to this sub category
      // if (subCategory.createdBy.toString() !== req.user?.userId) {
      //   throw new Error("You do not have access to this sub category");
      // }

      return true;
    }),

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

      // Verify that the parent sub category belongs to this main category
      if (req.body.subCategoryId) {
        const subCategory = await SubCategory.findById(req.body.subCategoryId);
        if (subCategory && subCategory.mainCategoryId.toString() !== value) {
          throw new Error(
            "Parent sub category does not belong to the selected main category"
          );
        }
      }

      return true;
    }),

  // body("parentNestedId")
  //   .optional()
  //   .isMongoId()
  //   .withMessage("Invalid parent nested ID format")
  //   .custom(async (value, { req }) => {
  //     if (value) {
  //       const parentNested = await NestedSubCategory.findById(value);
  //       if (!parentNested) {
  //         throw new Error("Parent nested category not found");
  //       }

  //       // Check if parent nested belongs to same sub category
  //       if (parentNested.subCategoryId.toString() !== req.body.subCategoryId) {
  //         throw new Error("Parent nested category does not belong to the selected sub category");
  //       }
  //     }
  //     return true;
  //   }),

  body("color")
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Invalid color format"),

  body("icon")
    .optional()
    .isString()
    .withMessage("Icon must be a string"),

  body("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a positive number"),
];

export const updateNestedSubCategoryValidation = [
  param("id").isMongoId().withMessage("Invalid nested sub category ID"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      "Name can only contain letters, numbers, spaces, hyphens and underscores"
    ),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("subCategoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid sub category ID format")
    .custom(async (value, { req }) => {
      const subCategory = await SubCategory.findById(value);
      if (!subCategory) {
        throw new Error("Sub category not found");
      }
      return true;
    }),

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

  body("parentNestedId")
    .optional()
    .isMongoId()
    .withMessage("Invalid parent nested ID format")
    .custom(async (value, { req }) => {
      if (value === req.params.id) {
        throw new Error("Category cannot be its own parent");
      }

      if (value) {
        const parentNested = await NestedSubCategory.findById(value);
        if (!parentNested) {
          throw new Error("Parent nested category not found");
        }

        // Check for circular reference
        let current = parentNested;
        while (current) {
          if (current._id.toString() === req.params.id) {
            throw new Error("Circular reference detected");
          }
          if (current.parentNestedId) {
            current = await NestedSubCategory.findById(current.parentNestedId);
          } else {
            break;
          }
        }
      }

      return true;
    }),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  body("color")
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Invalid color format"),

  body("icon")
    .optional()
    .isString()
    .withMessage("Icon must be a string"),

  body("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a positive number"),
];

export const nestedSubCategoryIdValidation = [
  param("id").isMongoId().withMessage("Invalid nested sub category ID"),
];

export const getAllNestedSubCategoriesValidation = [
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
    .isIn(["name", "createdAt", "updatedAt", "level", "order"])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),

  query("subCategoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid sub category ID"),

  query("mainCategoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid main category ID"),

  query("parentNestedId")
    .optional()
    .isMongoId()
    .withMessage("Invalid parent nested ID"),

  query("level")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Level must be at least 1")
    .toInt(),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean")
    .toBoolean(),

  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .trim(),
];

export const bulkDeleteValidation = [
  body("nestedSubCategoryIds")
    .isArray({ min: 1 })
    .withMessage("Nested sub category IDs must be a non-empty array")
    .custom((value) => value.every((id) => mongoose.Types.ObjectId.isValid(id)))
    .withMessage("All nested sub category IDs must be valid MongoDB IDs"),
];

export const getBySubCategoryValidation = [
  param("subCategoryId")
    .isMongoId()
    .withMessage("Invalid sub category ID"),
];

export const getByMainCategoryValidation = [
  param("mainCategoryId")
    .isMongoId()
    .withMessage("Invalid main category ID"),
];

export const moveNestedSubCategoryValidation = [
  param("id").isMongoId().withMessage("Invalid nested sub category ID"),

  body("newParentNestedId")
    .optional()
    .isMongoId()
    .withMessage("Invalid parent nested ID")
    .custom((value, { req }) => {
      if (value === req.params.id) {
        throw new Error("Category cannot be its own parent");
      }
      return true;
    }),

  body("newSubCategoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid sub category ID"),
];