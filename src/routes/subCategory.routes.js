import express from 'express';
import {
  createSubCategory,
  getAllSubCategories,
  getByMainCategory,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  bulkDeleteSubCategories,
  toggleSubCategoryStatus,
  reorderSubCategories,
  searchSubCategories,
  getSubCategoryStats,
  duplicateSubCategory,
  exportSubCategories,
  importSubCategories
} from '../controllers/subCategory.controller.js';
import {
  createSubCategoryValidation,
  updateSubCategoryValidation,
  subCategoryIdValidation,
  getAllSubCategoriesValidation,
  bulkDeleteValidation,
  reorderValidation
} from '../validations/subCategory.validation.js';
import { validate } from '../middlewares/validation.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Special routes (should come before /:id routes)
router.get('/stats', getSubCategoryStats);
router.get('/search', searchSubCategories);
router.get('/export', exportSubCategories);
router.post('/import', importSubCategories);
router.get('/by-main-category/:mainCategoryId', getByMainCategory);
router.post('/reorder/:mainCategoryId', validate(reorderValidation), reorderSubCategories);

// Bulk operations
router.post('/bulk-delete', validate(bulkDeleteValidation), bulkDeleteSubCategories);

// CRUD routes
router
  .route('/')
  .get(validate(getAllSubCategoriesValidation), getAllSubCategories)
  .post(validate(createSubCategoryValidation), createSubCategory);

router
  .route('/:id')
  .get(validate(subCategoryIdValidation), getSubCategoryById)
  .put(validate(updateSubCategoryValidation), updateSubCategory)
  .delete(validate(subCategoryIdValidation), deleteSubCategory);

router.patch(
  '/:id/toggle-status',
  validate(subCategoryIdValidation),
  toggleSubCategoryStatus
);

router.post(
  '/:id/duplicate',
  validate(subCategoryIdValidation),
  duplicateSubCategory
);

export const subCategoryRouter= router;