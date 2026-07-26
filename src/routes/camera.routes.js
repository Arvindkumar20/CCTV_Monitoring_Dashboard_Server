import express from "express";
import {
  createCamera,
  getAllCameras,
  getCameraById,
  updateCamera,
  deleteCamera,
  getByCategory,
  getByMainCategory,
  getBySubCategory,
  getByNestedSubCategory,
  toggleStatus,
  updateStreamStatus,
  bulkDelete,
  bulkUpdateStatus,
  searchCameras,
  getStats,
  validateRtspUrl,
  getByRtspUrl,
  getRecentCameras,
  getStreamSummary,
  exportCameras,
} from "../controllers/camera.controller.js";
import {
  createCameraValidation,
  updateCameraValidation,
  cameraIdValidation,
  getAllCamerasValidation,
  bulkDeleteValidation,
  bulkStatusUpdateValidation,
  getByCategoryValidation,
  updateStreamStatusValidation,
  validateRtspUrlValidation,
} from "../validations/camera.validation.js";


// import { checkPermission } from "../middleware/permission.js";
import { validate } from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Public routes (within authenticated)
router.get("/stats", getStats);
router.get("/search", searchCameras);
router.get("/recent", getRecentCameras);
router.get("/stream-summary", getStreamSummary);
router.get("/export", exportCameras);
router.post("/validate-rtsp", validate(validateRtspUrlValidation), validateRtspUrl);
router.get("/by-rtsp/:rtspUrl", getByRtspUrl);
router.get("/by-category/:categoryType/:categoryId", validate(getByCategoryValidation), getByCategory);
router.get("/by-main-category/:mainCategoryId", getByMainCategory);
router.get("/by-sub-category/:subCategoryId", getBySubCategory);
router.get("/by-nested-sub-category/:nestedSubCategoryId", getByNestedSubCategory);

// CRUD routes
router.route("/")
  .get(
    validate(getAllCamerasValidation),
    getAllCameras
  )
  .post(
    validate(createCameraValidation),
    createCamera
  );

router.route("/bulk-delete")
  .post(
    validate(bulkDeleteValidation),
    bulkDelete
  );

router.route("/bulk-status")
  .patch(
    validate(bulkStatusUpdateValidation),
    bulkUpdateStatus
  );

router.route("/:id")
  .get(
    validate(cameraIdValidation),
    getCameraById
  )
  .patch(
    validate([...cameraIdValidation, ...updateCameraValidation]),
    updateCamera
  )
  .delete(
    validate(cameraIdValidation),
    deleteCamera
  );

router.route("/:id/toggle-status")
  .patch(
    validate(cameraIdValidation),
    toggleStatus
  );

router.route("/:id/stream-status")
  .patch(
    validate([...cameraIdValidation, ...updateStreamStatusValidation]),
    updateStreamStatus
  );

export const cameraRoter= router;