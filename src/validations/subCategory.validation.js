import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

export const createSubCategoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Sub category name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/).withMessage('Name can only contain letters, numbers, spaces, hyphens and underscores'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('mainCategoryId')
    .notEmpty().withMessage('Main category is required')
    .isMongoId().withMessage('Invalid main category ID format')
    .custom(async (value) => {
      const Category = mongoose.model('Category');
      const category = await Category.findById(value);
      if (!category) {
        throw new Error('Main category not found');
      }
      return true;
    }),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a positive number')
];

export const updateSubCategoryValidation = [
  param('id')
    .isMongoId().withMessage('Invalid sub category ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/).withMessage('Name can only contain letters, numbers, spaces, hyphens and underscores'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('mainCategoryId')
    .optional()
    .isMongoId().withMessage('Invalid main category ID format')
    .custom(async (value) => {
      const Category = mongoose.model('Category');
      const category = await Category.findById(value);
      if (!category) {
        throw new Error('Main category not found');
      }
      return true;
    }),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a positive number')
];

export const subCategoryIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid sub category ID')
];

export const getAllSubCategoriesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'updatedAt', 'order']).withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),

  query('mainCategoryId')
    .optional()
    .isMongoId().withMessage('Invalid main category ID'),

  query('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),

  query('search')
    .optional()
    .isString().withMessage('Search must be a string')
    .trim()
];

export const bulkDeleteValidation = [
  body('subCategoryIds')
    .isArray({ min: 1 }).withMessage('Sub category IDs must be a non-empty array')
    .custom((value) => value.every(id => mongoose.Types.ObjectId.isValid(id)))
    .withMessage('All sub category IDs must be valid MongoDB IDs')
];

export const reorderValidation = [
  body('orderedIds')
    .isArray().withMessage('Ordered IDs must be an array')
    .custom((value) => value.every(id => mongoose.Types.ObjectId.isValid(id)))
    .withMessage('All IDs must be valid MongoDB IDs')
];