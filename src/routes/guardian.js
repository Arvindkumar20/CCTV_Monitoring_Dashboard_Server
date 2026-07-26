// routes/guardian.routes.js
import express from "express";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createGuardian,
  getAllGuardians,
  getGuardianById,
  updateGuardian,
  deleteGuardian,
  // bulkDeleteGuardians,
  toggleGuardianStatus,
  unlockGuardianAccount,
  getGuardianStudents,
  addStudentToGuardian,
  removeStudentFromGuardian,
  // getGuardianLoginHistory,
  // removeGuardianDevice,
  // resetGuardianPassword,
  // getGuardianStatistics,
} from "../controllers/guardian.controller.js";
import {
  createGuardianValidation,
  updateGuardianSchema,
 
  // resetPasswordSchema,
} from "../validations/guardian.validation.js";

const router = express.Router();

// Protect all routes after this middleware


// Statistics route (before /:id routes)
// router.get("/statistics", restrictTo("admin", "superadmin"), getGuardianStatistics);

// Bulk operations
// router.post("/bulk-delete", restrictTo("admin", "superadmin"), bulkDeleteGuardians);

// CRUD operations
router
  .route("/")
  .get(restrictTo("admin", "superadmin", "teacher"), getAllGuardians)
  .post(restrictTo("admin", "superadmin"), validate(createGuardianValidation), createGuardian);

router
  .route("/:id")
  .get(restrictTo("admin", "superadmin", "teacher"), getGuardianById)
  .patch(restrictTo("admin", "superadmin"), validate(updateGuardianSchema), updateGuardian)
  .delete(restrictTo("admin", "superadmin"), deleteGuardian);

// Status management
router.patch("/:id/toggle-status", restrictTo("admin", "superadmin"), toggleGuardianStatus);
router.patch("/:id/unlock", restrictTo("admin", "superadmin"), unlockGuardianAccount);

// Student management
router.get("/:id/students", restrictTo("admin", "superadmin", "teacher"), getGuardianStudents);
router.post(
  "/:id/students",
  restrictTo("admin", "superadmin"),
  validate(addStudentSchema),
  addStudentToGuardian
);
router.delete("/:id/students/:studentId", restrictTo("admin", "superadmin"), removeStudentFromGuardian);

// Login history and devices
// router.get("/:id/login-history", restrictTo("admin", "superadmin"), getGuardianLoginHistory);
// router.get("/:id/devices", restrictTo("admin", "superadmin"), getGuardianDevices);
// router.delete("/:id/devices/:deviceId", restrictTo("admin", "superadmin"), removeGuardianDevice);

// Password management
// router.post(
//   "/:id/reset-password",
//   restrictTo("admin", "superadmin"),
//   validate(resetPasswordSchema),
//   // resetGuardianPassword
// );

export const guardianRoute= router;