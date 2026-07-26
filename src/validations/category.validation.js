import { body, param, query } from 'express-validator';

export const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Class category name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/).withMessage('Name can only contain letters, numbers, spaces, hyphens and underscores')
];

export const updateCategoryValidation = [
  param('id')
    .isMongoId().withMessage('Invalid category ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/).withMessage('Name can only contain letters, numbers, spaces, hyphens and underscores')
];

export const categoryIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid category ID')
];

export const getAllCategoriesValidation = [
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
    .isIn(['name', 'createdAt', 'updatedAt']).withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),

  query('search')
    .optional()
    .isString().withMessage('Search must be a string')
    .trim()
];

export const bulkDeleteValidation = [
  body('categoryIds')
    .isArray({ min: 1 }).withMessage('Category IDs must be a non-empty array')
    .custom((value) => value.every(id => mongoose.Types.ObjectId.isValid(id)))
    .withMessage('All category IDs must be valid MongoDB IDs')
];