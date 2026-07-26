import express from 'express';
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  bulkDeleteCategories,
  searchCategories,
  getMyCategories
} from '../controllers/category.controller.js';
import {
  createCategoryValidation,
  updateCategoryValidation,
  categoryIdValidation,
  getAllCategoriesValidation,
  bulkDeleteValidation
} from '../validations/category.validation.js';
import { validate } from '../middlewares/validation.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All category routes require authentication
router.use(authenticate);

// Special routes (should come before /:id routes)
router.get('/search', searchCategories);
router.get('/my-categories', getMyCategories);

// Bulk operations (admin only)
router.post(
  '/bulk-delete',
  validate(bulkDeleteValidation),
  bulkDeleteCategories
);

// CRUD routes
router
  .route('/')
  .get(validate(getAllCategoriesValidation), getAllCategories)
  .post(validate(createCategoryValidation), createCategory);

router
  .route('/:id')
  .get(validate(categoryIdValidation), getCategoryById)
  .put(validate(updateCategoryValidation), updateCategory)
  .delete(validate(categoryIdValidation), deleteCategory);

export const categoryRouter=router;