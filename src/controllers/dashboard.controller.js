import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import Camera from "../models/camera.model.js";
import Guardian from "../models/guardian/index.js";
import Category from "../models/category.model.js";
import SubCategory from "../models/subCategory.model.js";
import NestedSubCategory from "../models/nestedSubCategory.model.js";

export const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const userRole = req.user.role;

  // Build filter based on user role
  const filter = userRole === "admin" ? {} : { createdBy: userId };

  // Fetch all data in parallel
  const [
    cameras,
    guardians,
    categories,
    subCategories,
    nestedSubCategories,
    activeGuardians,
    recentActivities
  ] = await Promise.all([
    // Camera stats
    Camera.find(filter).select("status streamStatus"),
    
    // Guardian stats
    Guardian.find(filter).select("status lastLoginAt"),
    
    // Category counts
    Category.countDocuments(filter),
    SubCategory.countDocuments(filter),
    NestedSubCategory.countDocuments(filter),
    
    // Active guardians (logged in last 24 hours)
    Guardian.countDocuments({
      ...filter,
      lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }),
    
    // Recent activities
    getRecentActivities(filter, userId)
  ]);

  // Calculate camera stats
  const cameraStats = {
    total: cameras.length,
    active: cameras.filter(c => c.status === "active").length,
    inactive: cameras.filter(c => c.status === "inactive").length,
    maintenance: cameras.filter(c => c.status === "maintenance").length,
    online: cameras.filter(c => c.streamStatus === "online").length,
    offline: cameras.filter(c => c.streamStatus === "offline").length,
    connecting: cameras.filter(c => c.streamStatus === "connecting").length
  };

  // Calculate guardian stats
  const guardianStats = {
    total: guardians.length,
    active: guardians.filter(g => g.status === "active").length,
    inactive: guardians.filter(g => g.status === "inactive").length,
    pending: guardians.filter(g => g.status === "pending").length,
    locked: guardians.filter(g => g.status === "locked").length,
    suspended: guardians.filter(g => g.status === "suspended").length
  };

  // Calculate storage stats (mock data for now)
  const storageStats = {
    total: 100, // GB
    used: 45,   // GB
    free: 55,   // GB
    percentage: 45
  };

  // Prepare dashboard data
  const dashboardData = {
    stats: [
      {
        title: "Total Cameras",
        value: cameraStats.total,
        subtitle: `${cameraStats.online} online · ${cameraStats.offline} offline`,
        icon: "Video",
        iconBg: "bg-blue-100",
        trend: "+12%",
        trendUp: true
      },
      {
        title: "Total Guardians",
        value: guardianStats.total,
        subtitle: `${guardianStats.active} active · ${guardianStats.pending} pending`,
        icon: "Users",
        iconBg: "bg-purple-100",
        trend: "+8%",
        trendUp: true
      },
      {
        title: "Categories",
        value: categories,
        subtitle: `${subCategories} sub-categories · ${nestedSubCategories} nested`,
        icon: "Layers",
        iconBg: "bg-amber-100",
        trend: "0%",
        trendUp: false
      }
    ],
    cameras: {
      total: cameraStats.total,
      active: cameraStats.active,
      online: cameraStats.online,
      offline: cameraStats.offline,
      byStatus: {
        active: cameraStats.active,
        inactive: cameraStats.inactive,
        maintenance: cameraStats.maintenance
      },
      byStream: {
        online: cameraStats.online,
        offline: cameraStats.offline,
        connecting: cameraStats.connecting
      }
    },
    guardians: guardianStats,
    categories: {
      total: categories,
      subCategories,
      nestedSubCategories
    },
    activeUsers: activeGuardians,
    storage: storageStats,
    activities: recentActivities
  };

  successResponse(res, "Dashboard data fetched successfully", dashboardData);
});

// Helper function to get recent activities
const getRecentActivities = async (filter, userId) => {
  const activities = [];

  // Get recent camera activities
  const recentCameras = await Camera.find(filter)
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate("createdBy", "fullName")
    .select("name status streamStatus updatedAt createdBy");

  recentCameras.forEach(camera => {
    activities.push({
      id: `cam_${camera._id}`,
      type: "camera",
      action: camera.status === "active" ? "Camera Activated" : "Camera Updated",
      description: `${camera.name} - ${camera.streamStatus}`,
      user: camera.createdBy?.fullName || "System",
      timestamp: camera.updatedAt,
      status: camera.streamStatus === "online" ? "success" : 
              camera.streamStatus === "offline" ? "error" : "warning"
    });
  });

  // Get recent guardian activities
  const recentGuardians = await Guardian.find(filter)
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate("createdBy", "fullName")
    .select("guardianName studentName status updatedAt createdBy lastLoginAt");

  recentGuardians.forEach(guardian => {
    if (guardian.lastLoginAt) {
      activities.push({
        id: `guardian_login_${guardian._id}`,
        type: "guardian",
        action: "Guardian Login",
        description: `${guardian.guardianName} logged in`,
        user: guardian.guardianName,
        timestamp: guardian.lastLoginAt,
        status: "success"
      });
    }

    activities.push({
      id: `guardian_${guardian._id}`,
      type: "guardian",
      action: guardian.status === "active" ? "Guardian Registered" : "Guardian Updated",
      description: `${guardian.guardianName} - ${guardian.studentName}`,
      user: guardian.createdBy?.fullName || "System",
      timestamp: guardian.updatedAt,
      status: guardian.status === "active" ? "success" : 
              guardian.status === "pending" ? "warning" : "error"
    });
  });

  // Get recent category activities
  const recentCategories = await Category.find(filter)
    .sort({ updatedAt: -1 })
    .limit(3)
    .populate("createdBy", "fullName")
    .select("name updatedAt createdBy");

  recentCategories.forEach(category => {
    activities.push({
      id: `cat_${category._id}`,
      type: "category",
      action: "Category Created",
      description: `New class: ${category.name}`,
      user: category.createdBy?.fullName || "System",
      timestamp: category.updatedAt,
      status: "info"
    });
  });

  // Sort by timestamp (newest first) and limit to 10
  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
};

// Individual stats endpoints (optional)
export const getCameraStats = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { createdBy: req.user.userId };
  
  const cameras = await Camera.find(filter).select("status streamStatus");
  
  const stats = {
    total: cameras.length,
    active: cameras.filter(c => c.status === "active").length,
    inactive: cameras.filter(c => c.status === "inactive").length,
    maintenance: cameras.filter(c => c.status === "maintenance").length,
    online: cameras.filter(c => c.streamStatus === "online").length,
    offline: cameras.filter(c => c.streamStatus === "offline").length,
    connecting: cameras.filter(c => c.streamStatus === "connecting").length
  };

  successResponse(res, "Camera stats fetched successfully", stats);
});

export const getGuardianStats = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { createdBy: req.user.userId };
  
  const guardians = await Guardian.find(filter).select("status");
  
  const stats = {
    total: guardians.length,
    active: guardians.filter(g => g.status === "active").length,
    inactive: guardians.filter(g => g.status === "inactive").length,
    pending: guardians.filter(g => g.status === "pending").length,
    locked: guardians.filter(g => g.status === "locked").length,
    suspended: guardians.filter(g => g.status === "suspended").length
  };

  successResponse(res, "Guardian stats fetched successfully", stats);
});

export const getCategoryStats = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { createdBy: req.user.userId };
  
  const [categories, subCategories, nestedSubCategories] = await Promise.all([
    Category.countDocuments(filter),
    SubCategory.countDocuments(filter),
    NestedSubCategory.countDocuments(filter)
  ]);

  successResponse(res, "Category stats fetched successfully", {
    categories,
    subCategories,
    nestedSubCategories
  });
});

// export const getRecentActivities = asyncHandler(async (req, res) => {
//   const filter = req.user.role === "admin" ? {} : { createdBy: req.user.userId };
//   const activities = await getRecentActivities(filter, req.user.userId);
  
//   successResponse(res, "Recent activities fetched successfully", activities);
// });