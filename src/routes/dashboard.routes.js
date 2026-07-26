import express from "express";
import {
  getDashboardData,
  getCameraStats,
  getGuardianStats,
  getCategoryStats,

} from "../controllers/dashboard.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";


const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

// Main dashboard data
router.get("/", getDashboardData);

// Individual stats endpoints
router.get("/cameras", getCameraStats);
router.get("/guardians", getGuardianStats);
router.get("/categories", getCategoryStats);
// router.get("/activities", getRecentActivities);

export const dashboardRouter= router;