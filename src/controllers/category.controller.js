import { categoryService } from '../services/category.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/response.js';
import AppError from '../utils/AppError.js';

/**
 * Create new category
 * @route POST /api/categories
 * @access Private
 */
export const createCategory = asyncHandler(async (req, res) => {
    // console.log({name: req.body.name,description:req.body.description})
  const category = await categoryService.createCategory(
    { name: req.body.name,description:req.body.description },
    req.user.userId
  );

  return successResponse(
    res,
    'Category created successfully',
    category,
    201
  );
});

/**
 * Get all categories
 * @route GET /api/categories
 * @access Private
 */
export const getAllCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.getAllCategories(
    req.query,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Categories fetched successfully',
    result
  );
});

/**
 * Get category by ID
 * @route GET /api/categories/:id
 * @access Private
 */
export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(
    req.params.id,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Category fetched successfully',
    category
  );
});

/**
 * Update category
 * @route PUT /api/categories/:id
 * @access Private
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(
    req.params.id,
    { name: req.body.name,description:req.body.description },
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Category updated successfully',
    category
  );
});

/**
 * Delete category
 * @route DELETE /api/categories/:id
 * @access Private
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.deleteCategory(
    req.params.id,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Category deleted successfully',
    result
  );
});

/**
 * Bulk delete categories (admin only)
 * @route POST /api/categories/bulk-delete
 * @access Private (Admin only)
 */
export const bulkDeleteCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.bulkDeleteCategories(
    req.body.categoryIds,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    result.message,
    result
  );
});

/**
 * Search categories
 * @route GET /api/categories/search
 * @access Private
 */
export const searchCategories = asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const categories = await categoryService.searchCategories(
    q,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Search results fetched successfully',
    categories
  );
});

/**
 * Get my categories (for current user)
 * @route GET /api/categories/my-categories
 * @access Private
 */
export const getMyCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getUserCategories(req.user.userId);

  return successResponse(
    res,
    'Your categories fetched successfully',
    categories
  );
});

/**
 * Get category statistics
 * @route GET /api/categories/stats
 * @access Private
 */
export const getCategoryStats = asyncHandler(async (req, res) => {
  const stats = await categoryService.getCategoryStats(
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Category statistics fetched successfully',
    stats
  );
});

/**
 * Export categories
 * @route GET /api/categories/export
 * @access Private
 */
export const exportCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.exportCategories(
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Categories exported successfully',
    categories
  );
});

/**
 * Import categories
 * @route POST /api/categories/import
 * @access Private
 */
export const importCategories = asyncHandler(async (req, res) => {
  const { categoryNames } = req.body;

  if (!Array.isArray(categoryNames) || categoryNames.length === 0) {
    throw new AppError('Please provide an array of category names', 400);
  }

  const result = await categoryService.importCategories(
    categoryNames,
    req.user.userId
  );

  return successResponse(
    res,
    `Imported ${result.totalCreated} categories`,
    result,
    201
  );
});

/**
 * Verify category access
 * @route GET /api/categories/:id/verify-access
 * @access Private
 */
export const verifyCategoryAccess = asyncHandler(async (req, res) => {
  const hasAccess = await categoryService.verifyCategoryAccess(
    req.params.id,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Category access verified',
    { hasAccess }
  );
});