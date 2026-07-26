import { subCategoryService } from '../services/subCategory.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/response.js';
import AppError from '../utils/AppError.js';

/**
 * Create new sub category
 * @route POST /api/sub-categories
 * @access Private
 */
export const createSubCategory = asyncHandler(async (req, res) => {
  const subCategory = await subCategoryService.createSubCategory(
    req.body,
    req.user.userId
  );

  return successResponse(
    res,
    'Sub category created successfully',
    subCategory,
    201
  );
});

/**
 * Get all sub categories
 * @route GET /api/sub-categories
 * @access Private
 */
export const getAllSubCategories = asyncHandler(async (req, res) => {
  const result = await subCategoryService.getAllSubCategories(
    req.query,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Sub categories fetched successfully',
    result
  );
});

/**
 * Get sub categories by main category
 * @route GET /api/sub-categories/by-main-category/:mainCategoryId
 * @access Private
 */
export const getByMainCategory = asyncHandler(async (req, res) => {
  const result = await subCategoryService.getByMainCategory(
    req.params.mainCategoryId,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Sub categories fetched successfully',
    result
  );
});

/**
 * Get sub category by ID
 * @route GET /api/sub-categories/:id
 * @access Private
 */
export const getSubCategoryById = asyncHandler(async (req, res) => {
  const subCategory = await subCategoryService.getSubCategoryById(
    req.params.id,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Sub category fetched successfully',
    subCategory
  );
});

/**
 * Update sub category
 * @route PUT /api/sub-categories/:id
 * @access Private
 */
export const updateSubCategory = asyncHandler(async (req, res) => {
  const subCategory = await subCategoryService.updateSubCategory(
    req.params.id,
    req.body,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Sub category updated successfully',
    subCategory
  );
});

/**
 * Delete sub category
 * @route DELETE /api/sub-categories/:id
 * @access Private
 */
export const deleteSubCategory = asyncHandler(async (req, res) => {
  const result = await subCategoryService.deleteSubCategory(
    req.params.id,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Sub category deleted successfully',
    result
  );
});

/**
 * Bulk delete sub categories
 * @route POST /api/sub-categories/bulk-delete
 * @access Private
 */
export const bulkDeleteSubCategories = asyncHandler(async (req, res) => {
  const result = await subCategoryService.bulkDeleteSubCategories(
    req.body.subCategoryIds,
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
 * Toggle sub category status
 * @route PATCH /api/sub-categories/:id/toggle-status
 * @access Private
 */
export const toggleSubCategoryStatus = asyncHandler(async (req, res) => {
  const subCategory = await subCategoryService.toggleSubCategoryStatus(
    req.params.id,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    `Sub category ${subCategory.isActive ? 'activated' : 'deactivated'} successfully`,
    subCategory
  );
});

/**
 * Reorder sub categories
 * @route POST /api/sub-categories/reorder/:mainCategoryId
 * @access Private
 */
export const reorderSubCategories = asyncHandler(async (req, res) => {
  const result = await subCategoryService.reorderSubCategories(
    req.params.mainCategoryId,
    req.body.orderedIds,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Sub categories reordered successfully',
    result
  );
});

/**
 * Search sub categories
 * @route GET /api/sub-categories/search
 * @access Private
 */
export const searchSubCategories = asyncHandler(async (req, res) => {
  const { q, mainCategoryId } = req.query;

  if (!q || q.length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const subCategories = await subCategoryService.searchSubCategories(
    q,
    req.user.userId,
    req.user.role,
    mainCategoryId
  );

  return successResponse(
    res,
    'Search results fetched successfully',
    subCategories
  );
});

/**
 * Get sub categories statistics
 * @route GET /api/sub-categories/stats
 * @access Private
 */
export const getSubCategoryStats = asyncHandler(async (req, res) => {
  const stats = await subCategoryService.getStats(
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Statistics fetched successfully',
    stats
  );
});

/**
 * Duplicate sub category
 * @route POST /api/sub-categories/:id/duplicate
 * @access Private
 */
export const duplicateSubCategory = asyncHandler(async (req, res) => {
  const newSubCategory = await subCategoryService.duplicateSubCategory(
    req.params.id,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    'Sub category duplicated successfully',
    newSubCategory,
    201
  );
});

/**
 * Export sub categories
 * @route GET /api/sub-categories/export
 * @access Private
 */
export const exportSubCategories = asyncHandler(async (req, res) => {
  const { mainCategoryId } = req.query;
  
  const data = await subCategoryService.exportSubCategories(
    req.user.userId,
    req.user.role,
    mainCategoryId
  );

  return successResponse(
    res,
    'Data exported successfully',
    data
  );
});

/**
 * Import sub categories
 * @route POST /api/sub-categories/import
 * @access Private
 */
export const importSubCategories = asyncHandler(async (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data) || data.length === 0) {
    throw new AppError('Please provide an array of sub categories to import', 400);
  }

  const results = await subCategoryService.importSubCategories(
    data,
    req.user.userId
  );

  return successResponse(
    res,
    `Imported ${results.created.length} sub categories`,
    results,
    201
  );
});