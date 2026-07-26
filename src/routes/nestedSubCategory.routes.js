import express from "express";
import {
  createNestedSubCategory,
  getAllNestedSubCategories,
  getNestedSubCategoryById,
  updateNestedSubCategory,
  deleteNestedSubCategory,
  getBySubCategory,
  getByMainCategory,
  toggleStatus,
  bulkDelete,
  searchNestedSubCategories,
  getStats,
  getTree,
  getHierarchy,
  moveNestedSubCategory,
} from "../controllers/nestedSubCategory.controller.js";
import {
  createNestedSubCategoryValidation,
  updateNestedSubCategoryValidation,
  nestedSubCategoryIdValidation,
  getAllNestedSubCategoriesValidation,
  bulkDeleteValidation,
  getBySubCategoryValidation,
  getByMainCategoryValidation,
  moveNestedSubCategoryValidation,
} from "../validations/nestedSubCategory.validation.js";
import { validate } from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Special routes
router.get("/stats", getStats);
router.get("/search", searchNestedSubCategories);
router.get("/by-sub-category/:subCategoryId", validate(getBySubCategoryValidation), getBySubCategory);
router.get("/by-main-category/:mainCategoryId", validate(getByMainCategoryValidation), getByMainCategory);
router.get("/tree/:subCategoryId", validate(getBySubCategoryValidation), getTree);

// Bulk operations
router.post("/bulk-delete", validate(bulkDeleteValidation), bulkDelete);

// CRUD routes
router
  .route("/")
  .get(validate(getAllNestedSubCategoriesValidation), getAllNestedSubCategories)
  .post(validate(createNestedSubCategoryValidation), createNestedSubCategory);

router
  .route("/:id")
  .get(validate(nestedSubCategoryIdValidation), getNestedSubCategoryById)
  .put(validate(updateNestedSubCategoryValidation), updateNestedSubCategory)
  .delete(validate(nestedSubCategoryIdValidation), deleteNestedSubCategory);

router.patch(
  "/:id/toggle-status",
  validate(nestedSubCategoryIdValidation),
  toggleStatus
);

router.get(
  "/:id/hierarchy",
  validate(nestedSubCategoryIdValidation),
  getHierarchy
);

router.post(
  "/:id/move",
  validate(nestedSubCategoryIdValidation),
  validate(moveNestedSubCategoryValidation),
  moveNestedSubCategory
);

export const nestedSubCategoryRoutes= router;