import { cameraService } from "../services/camera.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import AppError from "../utils/AppError.js";

/**
 * Create new camera
 * @route POST /api/cameras
 * @access Private
 */
export const createCamera = asyncHandler(async (req, res) => {
    console.log(req.body)
  const camera = await cameraService.createCamera(
    req.body,
    req.user.userId
  );

  return successResponse(
    res,
    "Camera created successfully",
    camera,
    201
  );
});

/**
 * Get all cameras
 * @route GET /api/cameras
 * @access Private
 */
export const getAllCameras = asyncHandler(async (req, res) => {
  const result = await cameraService.getAllCameras(
    req.query,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    "Cameras fetched successfully",
    result
  );
});

/**
 * Get camera by ID
 * @route GET /api/cameras/:id
 * @access Private
 */
export const getCameraById = asyncHandler(async (req, res) => {
  const camera = await cameraService.getCameraById(
    req.params.id,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    "Camera fetched successfully",
    camera
  );
});

/**
 * Update camera
 * @route PUT /api/cameras/:id
 * @access Private
 */
export const updateCamera = asyncHandler(async (req, res) => {
  const camera = await cameraService.updateCamera(
    req.params.id,
    req.body,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    "Camera updated successfully",
    camera
  );
});

/**
 * Delete camera
 * @route DELETE /api/cameras/:id
 * @access Private
 */
export const deleteCamera = asyncHandler(async (req, res) => {
  const result = await cameraService.deleteCamera(
    req.params.id,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    "Camera deleted successfully",
    result
  );
});

/**
 * Get cameras by category
 * @route GET /api/cameras/by-category/:categoryType/:categoryId
 * @access Private
 */
export const getByCategory = asyncHandler(async (req, res) => {
  const { categoryType, categoryId } = req.params;

  const result = await cameraService.getByCategory(
    categoryId,
    categoryType,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    "Cameras fetched successfully",
    result
  );
});

/**
 * Get cameras by main category
 * @route GET /api/cameras/by-main-category/:mainCategoryId
 * @access Private
 */
export const getByMainCategory = asyncHandler(async (req, res) => {
  const result = await cameraService.getByMainCategory(
    req.params.mainCategoryId,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    "Cameras fetched successfully",
    result
  );
});

/**
 * Get cameras by sub category
 * @route GET /api/cameras/by-sub-category/:subCategoryId
 * @access Private
 */
export const getBySubCategory = asyncHandler(async (req, res) => {
  const result = await cameraService.getBySubCategory(
    req.params.subCategoryId,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    "Cameras fetched successfully",
    result
  );
});

/**
 * Get cameras by nested sub category
 * @route GET /api/cameras/by-nested-sub-category/:nestedSubCategoryId
 * @access Private
 */
export const getByNestedSubCategory = asyncHandler(async (req, res) => {
  const result = await cameraService.getByNestedSubCategory(
    req.params.nestedSubCategoryId,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    "Cameras fetched successfully",
    result
  );
});

/**
 * Toggle camera status
 * @route PATCH /api/cameras/:id/toggle-status
 * @access Private
 */
export const toggleStatus = asyncHandler(async (req, res) => {
  const camera = await cameraService.toggleStatus(
    req.params.id,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    `Camera ${camera.status === "active" ? "activated" : camera.status === "inactive" ? "deactivated" : "set to maintenance"} successfully`,
    camera
  );
});

/**
 * Update stream status
 * @route PATCH /api/cameras/:id/stream-status
 * @access Private
 */
export const updateStreamStatus = asyncHandler(async (req, res) => {
  const camera = await cameraService.updateStreamStatus(
    req.params.id,
    req.body.status,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    `Stream status updated to ${camera.streamStatus} successfully`,
    camera
  );
});

/**
 * Bulk delete cameras
 * @route POST /api/cameras/bulk-delete
 * @access Private
 */
export const bulkDelete = asyncHandler(async (req, res) => {
  const result = await cameraService.bulkDelete(
    req.body.cameraIds,
    req.user.userId,
    req.user.role
  );

  return successResponse(res, result.message, result);
});

/**
 * Bulk update status
 * @route PATCH /api/cameras/bulk-status
 * @access Private
 */
export const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { cameraIds, status } = req.body;

  const result = await cameraService.bulkUpdateStatus(
    cameraIds,
    status,
    req.user.userId,
    req.user.role
  );

  return successResponse(
    res,
    `${result.modifiedCount} cameras updated to ${status} successfully`,
    result
  );
});

/**
 * Search cameras
 * @route GET /api/cameras/search
 * @access Private
 */
export const searchCameras = asyncHandler(async (req, res) => {
  const { q, ...filters } = req.query;

  if (!q || q.length < 2) {
    throw new AppError("Search query must be at least 2 characters", 400);
  }

  const results = await cameraService.search(
    q,
    req.user.userId,
    req.user.role,
    filters
  );

  return successResponse(res, "Search results fetched successfully", results);
});

/**
 * Get statistics
 * @route GET /api/cameras/stats
 * @access Private
 */
export const getStats = asyncHandler(async (req, res) => {
  const stats = await cameraService.getStats(
    req.user.userId,
    req.user.role
  );

  return successResponse(res, "Statistics fetched successfully", stats);
});

/**
 * Validate RTSP URL
 * @route POST /api/cameras/validate-rtsp
 * @access Private
 */
export const validateRtspUrl = asyncHandler(async (req, res) => {
  const { rtspUrl } = req.body;

  const result = await cameraService.validateRtspUrl(rtspUrl);

  return successResponse(res, "RTSP URL validation completed", result);
});

/**
 * Get camera by RTSP URL
 * @route GET /api/cameras/by-rtsp/:rtspUrl
 * @access Private
 */
export const getByRtspUrl = asyncHandler(async (req, res) => {
  const rtspUrl = decodeURIComponent(req.params.rtspUrl);

  const camera = await cameraService.getByRtspUrl(
    rtspUrl,
    req.user.userId,
    req.user.role
  );

  return successResponse(res, "Camera fetched successfully", camera);
});

/**
 * Get recently added cameras
 * @route GET /api/cameras/recent
 * @access Private
 */
export const getRecentCameras = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const cameras = await cameraService.getRecentCameras(
    parseInt(limit),
    req.user.userId,
    req.user.role
  );

  return successResponse(res, "Recent cameras fetched successfully", cameras);
});

/**
 * Get online/offline summary
 * @route GET /api/cameras/stream-summary
 * @access Private
 */
export const getStreamSummary = asyncHandler(async (req, res) => {
  const summary = await cameraService.getStreamSummary(
    req.user.userId,
    req.user.role
  );

  return successResponse(res, "Stream summary fetched successfully", summary);
});

/**
 * Export cameras data
 * @route GET /api/cameras/export
 * @access Private
 */
export const exportCameras = asyncHandler(async (req, res) => {
  const { format = "json" } = req.query;

  const data = await cameraService.exportCameras(
    req.user.userId,
    req.user.role,
    req.query
  );

  if (format === "csv") {
    // Convert to CSV and send as file
    // Implementation depends on your CSV library
    return successResponse(res, "Export data fetched successfully", data);
  }

  return successResponse(res, "Export data fetched successfully", data);
});