import { nestedSubCategoryService } from "../services/nestedSubCategory.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import AppError from "../utils/AppError.js";

/**
 * Create new nested sub category
 * @route POST /api/nested-subcategories
 * @access Private
 */
export const createNestedSubCategory = asyncHandler(async (req, res) => {
  console.log("req.body");
  console.log(req.body);
  const nestedSubCategory =
    await nestedSubCategoryService.createNestedSubCategory(
      req.body,
      req.user.userId,
    );

  return successResponse(
    res,
    "Nested sub category created successfully",
    nestedSubCategory,
    201,
  );
});

/**
 * Get all nested sub categories
 * @route GET /api/nested-subcategories
 * @access Private
 */
export const getAllNestedSubCategories = asyncHandler(async (req, res) => {
  const result = await nestedSubCategoryService.getAllNestedSubCategories(
    req.query,
    req.user.userId,
    req.user.role,
  );

  return successResponse(
    res,
    "Nested sub categories fetched successfully",
    result,
  );
});

/**
 * Get nested sub category by ID
 * @route GET /api/nested-subcategories/:id
 * @access Private
 */
export const getNestedSubCategoryById = asyncHandler(async (req, res) => {
  const nestedSubCategory =
    await nestedSubCategoryService.getNestedSubCategoryById(
      req.params.id,
      req.user.userId,
      req.user.role,
    );

  return successResponse(
    res,
    "Nested sub category fetched successfully",
    nestedSubCategory,
  );
});

/**
 * Update nested sub category
 * @route PUT /api/nested-subcategories/:id
 * @access Private
 */
export const updateNestedSubCategory = asyncHandler(async (req, res) => {
  const nestedSubCategory =
    await nestedSubCategoryService.updateNestedSubCategory(
      req.params.id,
      req.body,
      req.user.userId,
      req.user.role,
    );

  return successResponse(
    res,
    "Nested sub category updated successfully",
    nestedSubCategory,
  );
});

/**
 * Delete nested sub category
 * @route DELETE /api/nested-subcategories/:id
 * @access Private
 */
export const deleteNestedSubCategory = asyncHandler(async (req, res) => {
  const result = await nestedSubCategoryService.deleteNestedSubCategory(
    req.params.id,
    req.user.userId,
    req.user.role,
  );

  return successResponse(
    res,
    "Nested sub category deleted successfully",
    result,
  );
});

/**
 * Get by sub category
 * @route GET /api/nested-subcategories/by-sub-category/:subCategoryId
 * @access Private
 */
export const getBySubCategory = asyncHandler(async (req, res) => {
  const result = await nestedSubCategoryService.getBySubCategory(
    req.params.subCategoryId,
    req.user.userId,
    req.user.role,
  );

  return successResponse(
    res,
    "Nested sub categories fetched successfully",
    result,
  );
});

/**
 * Get by main category
 * @route GET /api/nested-subcategories/by-main-category/:mainCategoryId
 * @access Private
 */
export const getByMainCategory = asyncHandler(async (req, res) => {
  const result = await nestedSubCategoryService.getByMainCategory(
    req.params.mainCategoryId,
    req.user.userId,
    req.user.role,
  );

  return successResponse(
    res,
    "Nested sub categories fetched successfully",
    result,
  );
});

/**
 * Toggle status
 * @route PATCH /api/nested-subcategories/:id/toggle-status
 * @access Private
 */
export const toggleStatus = asyncHandler(async (req, res) => {
  const nestedSubCategory = await nestedSubCategoryService.toggleStatus(
    req.params.id,
    req.user.userId,
    req.user.role,
  );

  return successResponse(
    res,
    `Nested sub category ${nestedSubCategory.isActive ? "activated" : "deactivated"} successfully`,
    nestedSubCategory,
  );
});

/**
 * Bulk delete
 * @route POST /api/nested-subcategories/bulk-delete
 * @access Private
 */
export const bulkDelete = asyncHandler(async (req, res) => {
  const result = await nestedSubCategoryService.bulkDelete(
    req.body.nestedSubCategoryIds,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, result.message, result);
});

/**
 * Search nested sub categories
 * @route GET /api/nested-subcategories/search
 * @access Private
 */
export const searchNestedSubCategories = asyncHandler(async (req, res) => {
  const { q, ...filters } = req.query;

  if (!q || q.length < 2) {
    throw new AppError("Search query must be at least 2 characters", 400);
  }

  const results = await nestedSubCategoryService.search(
    q,
    req.user.userId,
    req.user.role,
    filters,
  );

  return successResponse(res, "Search results fetched successfully", results);
});

/**
 * Get statistics
 * @route GET /api/nested-subcategories/stats
 * @access Private
 */
export const getStats = asyncHandler(async (req, res) => {
  const stats = await nestedSubCategoryService.getStats(
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Statistics fetched successfully", stats);
});

/**
 * Get tree for a sub category
 * @route GET /api/nested-subcategories/tree/:subCategoryId
 * @access Private
 */
export const getTree = asyncHandler(async (req, res) => {
  const tree = await nestedSubCategoryService.getTree(
    req.params.subCategoryId,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Tree fetched successfully", tree);
});

/**
 * Get hierarchy
 * @route GET /api/nested-subcategories/:id/hierarchy
 * @access Private
 */
export const getHierarchy = asyncHandler(async (req, res) => {
  const hierarchy = await nestedSubCategoryService.getFullHierarchy(
    req.params.id,
  );

  return successResponse(res, "Hierarchy fetched successfully", hierarchy);
});

/**
 * Move nested sub category
 * @route POST /api/nested-subcategories/:id/move
 * @access Private
 */
export const moveNestedSubCategory = asyncHandler(async (req, res) => {
  const result = await nestedSubCategoryService.moveNestedSubCategory(
    req.params.id,
    req.body,
    req.user.userId,
    req.user.role,
  );

  return successResponse(res, "Nested sub category moved successfully", result);
});
