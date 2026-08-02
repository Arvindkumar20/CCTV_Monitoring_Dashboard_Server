// // routes/settingsRoutes.js
// import express from "express";
// import { settingsController } from "../controllers/settings.controller.js";
// import { authenticate } from "../middlewares/auth.middleware.js";


// const router = express.Router();

// // All routes are protected with auth middleware
// router.use(authenticate);
// router.post("/", settingsController.createSettings);
// // Get settings
// router.get("/", settingsController.getSettings);
// router.get("/:schoolId", settingsController.getSettings);

// // Update settings
// router.put("/", settingsController.updateSettings);

// // Update specific sections
// router.put("/school-info", settingsController.updateSchoolInfo);
// router.put("/preferences", settingsController.updatePreferences);
// router.put("/security", settingsController.updateSecurity);

// // Change password
// router.put("/change-password", settingsController.changePassword);

// // Toggle features
// router.put("/toggle-3rd-level", settingsController.toggle3rdLevel);

// // Update storage
// router.put("/storage", settingsController.updateStorage);

// export const settingsRoutes = router;

// routes/settingsRoutes.js
import express from "express";
import { settingsController } from "../controllers/settings.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes are protected with auth middleware
router.use(authenticate);

// Settings CRUD
router.post("/", settingsController.createSettings);
router.get("/", settingsController.getSettings);
router.get("/:schoolId", settingsController.getSettings);
router.put("/", settingsController.updateSettings);

// School Info
router.put("/school-info", settingsController.updateSchoolInfo);

// Branding
router.put("/branding", settingsController.updateBranding);

// Profile
router.put("/profile", settingsController.updateProfile);

// Preferences
router.put("/preferences", settingsController.updatePreferences);

// Security
router.put("/security", settingsController.updateSecurity);

// Password Management
router.put("/change-password", settingsController.changePassword);

// Features
router.put("/toggle-3rd-level", settingsController.toggle3rdLevel);

// Storage
router.put("/storage", settingsController.updateStorage);

export const settingsRoutes = router;