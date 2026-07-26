import Camera from "../models/camera.model.js";
import Category from "../models/category.model.js";
import SubCategory from "../models/subCategory.model.js";
import NestedSubCategory from "../models/nestedSubCategory.model.js";
import AppError from "../utils/AppError.js";
import mongoose from "mongoose";
import url from "url";

class CameraService {
  /**
   * Create a new camera
   */
  async createCamera(data, userId) {
    // Verify main category exists
    const mainCategory = await Category.findById(data.mainCategoryId);
    console.log(mainCategory);
    if (!mainCategory) {
      throw new AppError("Main category not found", 404);
    }

    // Check access to main category
    if (mainCategory.createdBy.toString() !== userId.toString()) {
      throw new AppError(
        "You do not have permission to use this main category",
        403,
      );
    }

    // If sub category provided, verify it
    if (data.subCategoryId) {
      const subCategory = await SubCategory.findById(data.subCategoryId);
      if (!subCategory) {
        throw new AppError("Sub category not found", 404);
      }

      if (subCategory.mainCategoryId.toString() !== data.mainCategoryId) {
        throw new AppError(
          "Sub category does not belong to the selected main category",
          400,
        );
      }

      if (subCategory.createdBy.toString() !== userId.toString()) {
        throw new AppError(
          "You do not have permission to use this sub category",
          403,
        );
      }
    }

    // If nested sub category provided, verify it
    if (data.subSubCategoryId) {
      if (!data.subCategoryId) {
        throw new AppError(
          "Sub category is required when selecting nested sub category",
          400,
        );
      }

      const nestedSubCategory = await NestedSubCategory.findById(
        data.subSubCategoryId,
      );
      if (!nestedSubCategory) {
        throw new AppError("Nested sub category not found", 404);
      }

      if (nestedSubCategory.subCategoryId.toString() !== data.subCategoryId) {
        throw new AppError(
          "Nested sub category does not belong to the selected sub category",
          400,
        );
      }

      if (nestedSubCategory.mainCategoryId.toString() !== data.mainCategoryId) {
        throw new AppError(
          "Nested sub category does not belong to the selected main category",
          400,
        );
      }

      if (nestedSubCategory.createdBy.toString() !== userId.toString()) {
        throw new AppError(
          "You do not have permission to use this nested sub category",
          403,
        );
      }
    }

    // Check for duplicate camera name under same user
    const existingCamera = await Camera.findOne({
      name: data.name,
      createdBy: userId,
    });

    if (existingCamera) {
      throw new AppError("You already have a camera with this name", 400);
    }

    // Check for duplicate RTSP URL (optional - if you want to prevent duplicate streams)
    const existingRtsp = await Camera.findOne({
      rtspUrl: data.rtspUrl,
    });

    if (existingRtsp) {
      throw new AppError(
        "A camera with this RTSP URL already exists in the system",
        400,
      );
    }

    // Create camera
    let camera;
    try {
      camera = await Camera.create({
        name: data.name,
        rtspUrl: data.rtspUrl,
        mainCategoryId: data.mainCategoryId,
        subCategoryId: data.subCategoryId || null,
        subSubCategoryId: data.subSubCategoryId || null,
        status: data.status || "active",
        location: data.location || "",
        description: data.description || "",
        thumbnail: data.thumbnail || "",
        streamSettings: data.streamSettings || {
          protocol: "rtsp",
          port: 554,
          transport: "tcp",
          latency: 200,
          fps: 25,
          resolution: "1920x1080",
        },
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (error) {
      console.log(error);
    }

    await camera.populate([
      { path: "mainCategoryId", select: "name" },
      { path: "subCategoryId", select: "name" },
      { path: "subSubCategoryId", select: "name" },
      { path: "createdBy", select: "fullName email" },
      { path: "updatedBy", select: "fullName email" },
    ]);

    return camera;
  }

  /**
   * Get all cameras with filters
   */
  async getAllCameras(query, userId, userRole) {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      streamStatus,
      mainCategoryId,
      subCategoryId,
      subSubCategoryId,
      search,
      fromDate,
      toDate,
    } = query;

    // Build filter
    const filter = {};

    // Regular users only see their own
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // Stream status filter
    if (streamStatus && streamStatus !== "all") {
      filter.streamStatus = streamStatus;
    }

    // Category filters
    if (mainCategoryId) {
      filter.mainCategoryId = mainCategoryId;
    }

    if (subCategoryId) {
      filter.subCategoryId = subCategoryId;
    }

    if (subSubCategoryId) {
      filter.subSubCategoryId = subSubCategoryId;
    }

    // Date range filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        filter.createdAt.$lte = new Date(toDate);
      }
    }

    // Search by name, location, description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Pagination
    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);

    // Execute queries
    const [cameras, total] = await Promise.all([
      Camera.find(filter)
        .populate("mainCategoryId", "name")
        .populate("subCategoryId", "name")
        .populate("subSubCategoryId", "name")
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Camera.countDocuments(filter),
    ]);

    // Add full path for each camera
    const camerasWithPath = await Promise.all(
      cameras.map(async (camera) => {
        const path = await this.getFullPath(camera._id);
        return {
          ...camera,
          fullPath: path,
        };
      }),
    );

    return {
      cameras: camerasWithPath,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get camera by ID
   */
  async getCameraById(id, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid camera ID format", 400);
    }

    const camera = await Camera.findById(id)
      .populate("mainCategoryId", "name")
      .populate("subCategoryId", "name")
      .populate("subSubCategoryId", "name")
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");

    if (!camera) {
      throw new AppError("Camera not found", 404);
    }

    // Check access
    if (userRole !== "admin" && camera.createdBy._id.toString() !== userId.toString()) {
      throw new AppError("You do not have permission to view this camera", 403);
    }

    // Get full path
    const fullPath = await this.getFullPath(id);

    return {
      ...camera.toObject(),
      fullPath,
    };
  }

  /**
   * Get full path (Category > SubCategory > NestedSubCategory > Camera)
   */
  async getFullPath(id) {
    const camera = await Camera.findById(id);
    if (!camera) return [];

    const path = [];

    // Get main category
    const mainCategory = await Category.findById(camera.mainCategoryId);
    if (mainCategory) {
      path.push({
        type: "category",
        id: mainCategory._id,
        name: mainCategory.name,
      });
    }

    // Get sub category
    if (camera.subCategoryId) {
      const subCategory = await SubCategory.findById(camera.subCategoryId);
      if (subCategory) {
        path.push({
          type: "subCategory",
          id: subCategory._id,
          name: subCategory.name,
        });
      }
    }

    // Get nested sub category
    if (camera.subSubCategoryId) {
      const nestedSubCategory = await NestedSubCategory.findById(
        camera.subSubCategoryId,
      );
      if (nestedSubCategory) {
        path.push({
          type: "nested",
          id: nestedSubCategory._id,
          name: nestedSubCategory.name,
        });
      }
    }

    // Add camera itself
    path.push({
      type: "camera",
      id: camera._id,
      name: camera.name,
    });

    return path;
  }

  /**
   * Update camera
   */
  async updateCamera(id, updateData, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid camera ID format", 400);
    }

    const camera = await Camera.findById(id);

    if (!camera) {
      throw new AppError("Camera not found", 404);
    }

    // Check permission
    if (!camera.canModify(userId, userRole)) {
      throw new AppError(
        "You do not have permission to update this camera",
        403,
      );
    }

    // If name is being changed, check for duplicates
    if (updateData.name && updateData.name !== camera.name) {
      const existingCamera = await Camera.findOne({
        name: updateData.name,
        createdBy: userId,
        _id: { $ne: id },
      });

      if (existingCamera) {
        throw new AppError("You already have a camera with this name", 400);
      }
    }

    // If RTSP URL is being changed, check for duplicates
    if (updateData.rtspUrl && updateData.rtspUrl !== camera.rtspUrl) {
      const existingRtsp = await Camera.findOne({
        rtspUrl: updateData.rtspUrl,
        _id: { $ne: id },
      });

      if (existingRtsp) {
        throw new AppError("A camera with this RTSP URL already exists", 400);
      }
    }

    // If main category is being changed, verify new main category
    if (
      updateData.mainCategoryId &&
      updateData.mainCategoryId !== camera.mainCategoryId.toString()
    ) {
      const newMainCategory = await Category.findById(
        updateData.mainCategoryId,
      );
      if (!newMainCategory) {
        throw new AppError("New main category not found", 404);
      }

      if (newMainCategory.createdBy.toString() !== userId.toString()) {
        throw new AppError(
          "You do not have permission to use this main category",
          403,
        );
      }
    }

    // If sub category is being changed, verify it
    if (updateData.subCategoryId !== undefined) {
      const targetSubCategoryId = updateData.subCategoryId;
      const targetMainCategoryId =
        updateData.mainCategoryId || camera.mainCategoryId;

      if (targetSubCategoryId) {
        const subCategory = await SubCategory.findById(targetSubCategoryId);
        if (!subCategory) {
          throw new AppError("Sub category not found", 404);
        }

        if (
          subCategory.mainCategoryId.toString() !==
          targetMainCategoryId.toString()
        ) {
          throw new AppError(
            "Sub category does not belong to the selected main category",
            400,
          );
        }

        if (subCategory.createdBy.toString() !== userId.toString()) {
          throw new AppError(
            "You do not have permission to use this sub category",
            403,
          );
        }
      }
    }

    // If nested sub category is being changed, verify it
    if (updateData.subSubCategoryId !== undefined) {
      const targetSubCategoryId =
        updateData.subCategoryId !== undefined
          ? updateData.subCategoryId
          : camera.subCategoryId;

      const targetMainCategoryId =
        updateData.mainCategoryId || camera.mainCategoryId;

      if (updateData.subSubCategoryId) {
        if (!targetSubCategoryId) {
          throw new AppError(
            "Sub category is required when selecting nested sub category",
            400,
          );
        }

        const nestedSubCategory = await NestedSubCategory.findById(
          updateData.subSubCategoryId,
        );
        if (!nestedSubCategory) {
          throw new AppError("Nested sub category not found", 404);
        }

        if (
          nestedSubCategory.subCategoryId.toString() !==
          targetSubCategoryId.toString()
        ) {
          throw new AppError(
            "Nested sub category does not belong to the selected sub category",
            400,
          );
        }

        if (
          nestedSubCategory.mainCategoryId.toString() !==
          targetMainCategoryId.toString()
        ) {
          throw new AppError(
            "Nested sub category does not belong to the selected main category",
            400,
          );
        }

        if (nestedSubCategory.createdBy.toString() !== userId.toString()) {
          throw new AppError(
            "You do not have permission to use this nested sub category",
            403,
          );
        }
      } else {
        // If removing nested sub category, ensure sub category exists
        if (!targetSubCategoryId) {
          throw new AppError(
            "Sub category is required when nested sub category is not selected",
            400,
          );
        }
      }
    }

    // Update
    Object.assign(camera, updateData);
    camera.updatedBy = userId;
    await camera.save();

    await camera.populate([
      { path: "mainCategoryId", select: "name" },
      { path: "subCategoryId", select: "name" },
      { path: "subSubCategoryId", select: "name" },
      { path: "createdBy", select: "fullName email" },
      { path: "updatedBy", select: "fullName email" },
    ]);

    return camera;
  }

  /**
   * Delete camera
   */
  async deleteCamera(id, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid camera ID format", 400);
    }

    const camera = await Camera.findById(id);

    if (!camera) {
      throw new AppError("Camera not found", 404);
    }

    // Check permission
    if (!camera.canModify(userId, userRole)) {
      throw new AppError(
        "You do not have permission to delete this camera",
        403,
      );
    }

    await camera.deleteOne();

    return {
      message: "Camera deleted successfully",
      deletedItem: {
        id: camera._id,
        name: camera.name,
      },
    };
  }

  /**
   * Get cameras by category
   */
  async getByCategory(categoryId, categoryType, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new AppError("Invalid category ID", 400);
    }

    const filter = {};

    if (categoryType === "main") {
      filter.mainCategoryId = categoryId;
    } else if (categoryType === "sub") {
      filter.subCategoryId = categoryId;
    } else if (categoryType === "nested") {
      filter.subSubCategoryId = categoryId;
    }

    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    const cameras = await Camera.find(filter)
      .populate("mainCategoryId", "name")
      .populate("subCategoryId", "name")
      .populate("subSubCategoryId", "name")
      .populate("createdBy", "fullName")
      .sort("-createdAt");

    // Get category info
    let categoryInfo = null;
    if (categoryType === "main") {
      categoryInfo = await Category.findById(categoryId).select("name");
    } else if (categoryType === "sub") {
      categoryInfo = await SubCategory.findById(categoryId)
        .populate("mainCategoryId", "name")
        .select("name mainCategoryId");
    } else if (categoryType === "nested") {
      categoryInfo = await NestedSubCategory.findById(categoryId)
        .populate("subCategoryId", "name")
        .populate("mainCategoryId", "name")
        .select("name subCategoryId mainCategoryId");
    }

    return {
      category: categoryInfo,
      cameras,
      total: cameras.length,
    };
  }

  /**
   * Get cameras by main category
   */
  async getByMainCategory(mainCategoryId, userId, userRole) {
    return this.getByCategory(mainCategoryId, "main", userId, userRole);
  }

  /**
   * Get cameras by sub category
   */
  async getBySubCategory(subCategoryId, userId, userRole) {
    return this.getByCategory(subCategoryId, "sub", userId, userRole);
  }

  /**
   * Get cameras by nested sub category
   */
  async getByNestedSubCategory(nestedSubCategoryId, userId, userRole) {
    return this.getByCategory(nestedSubCategoryId, "nested", userId, userRole);
  }

  /**
   * Toggle status
   */
  async toggleStatus(id, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid camera ID format", 400);
    }

    const camera = await Camera.findById(id);

    if (!camera) {
      throw new AppError("Camera not found", 404);
    }

    if (!camera.canModify(userId, userRole)) {
      throw new AppError(
        "You do not have permission to modify this camera",
        403,
      );
    }

    const statusCycle = {
      active: "inactive",
      inactive: "maintenance",
      maintenance: "active",
    };

    camera.status = statusCycle[camera.status];
    camera.updatedBy = userId;
    await camera.save();

    return camera;
  }

  /**
   * Update stream status
   */
  async updateStreamStatus(id, status, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid camera ID format", 400);
    }

    const camera = await Camera.findById(id);

    if (!camera) {
      throw new AppError("Camera not found", 404);
    }

    // Check permission (admins can update any, users can update their own)
    if (userRole !== "admin" && camera.createdBy.toString() !== userId.toString()) {
      throw new AppError(
        "You do not have permission to update this camera's stream status",
        403,
      );
    }

    camera.streamStatus = status;
    camera.lastPingAt = new Date();
    await camera.save();

    return camera;
  }

  /**
   * Bulk delete
   */
  async bulkDelete(ids, userId, userRole) {
    // Validate all IDs
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new AppError(`Invalid IDs: ${invalidIds.join(", ")}`, 400);
    }

    // Get all items
    const filter = { _id: { $in: ids } };
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    const items = await Camera.find(filter);

    if (items.length === 0) {
      throw new AppError("No cameras found", 404);
    }

    // Check permissions
    for (const item of items) {
      if (!item.canModify(userId, userRole)) {
        throw new AppError(
          `You do not have permission to delete "${item.name}"`,
          403,
        );
      }
    }

    const result = await Camera.deleteMany({ _id: { $in: ids } });

    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} cameras deleted successfully`,
    };
  }

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(ids, status, userId, userRole) {
    // Validate all IDs
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new AppError(`Invalid IDs: ${invalidIds.join(", ")}`, 400);
    }

    // Get all items to check permissions
    const filter = { _id: { $in: ids } };
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    const items = await Camera.find(filter);

    if (items.length === 0) {
      throw new AppError("No cameras found", 404);
    }

    // Check permissions
    for (const item of items) {
      if (!item.canModify(userId, userRole)) {
        throw new AppError(
          `You do not have permission to update "${item.name}"`,
          403,
        );
      }
    }

    const result = await Camera.updateMany(
      { _id: { $in: ids } },
      {
        status,
        updatedBy: userId,
      },
    );

    return {
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} cameras updated to ${status}`,
    };
  }

  /**
   * Search cameras
   */
  async search(searchTerm, userId, userRole, filters = {}) {
    if (!searchTerm || searchTerm.length < 2) {
      throw new AppError("Search term must be at least 2 characters", 400);
    }

    const filter = {
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { location: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { rtspUrl: { $regex: searchTerm, $options: "i" } },
      ],
    };

    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    if (filters.mainCategoryId) {
      filter.mainCategoryId = filters.mainCategoryId;
    }

    if (filters.subCategoryId) {
      filter.subCategoryId = filters.subCategoryId;
    }

    if (filters.status) {
      filter.status = filters.status;
    }

    const results = await Camera.find(filter)
      .populate("mainCategoryId", "name")
      .populate("subCategoryId", "name")
      .populate("subSubCategoryId", "name")
      .populate("createdBy", "fullName")
      .limit(20)
      .sort("-createdAt")
      .lean();

    // Add full path for display
    const resultsWithPath = await Promise.all(
      results.map(async (item) => {
        const path = await this.getFullPath(item._id);
        return {
          ...item,
          fullPath: path.map((p) => p.name).join(" > "),
        };
      }),
    );

    return resultsWithPath;
  }

  /**
   * Get statistics
   */
  async getStats(userId, userRole) {
    const filter = userRole === "admin" ? {} : { createdBy: userId };

    const [
      total,
      active,
      inactive,
      maintenance,
      online,
      offline,
      connecting,
      unknown,
      byStatus,
      byStreamStatus,
      byMainCategory,
    ] = await Promise.all([
      Camera.countDocuments(filter),
      Camera.countDocuments({ ...filter, status: "active" }),
      Camera.countDocuments({ ...filter, status: "inactive" }),
      Camera.countDocuments({ ...filter, status: "maintenance" }),
      Camera.countDocuments({ ...filter, streamStatus: "online" }),
      Camera.countDocuments({ ...filter, streamStatus: "offline" }),
      Camera.countDocuments({ ...filter, streamStatus: "connecting" }),
      Camera.countDocuments({ ...filter, streamStatus: "unknown" }),
      Camera.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Camera.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$streamStatus",
            count: { $sum: 1 },
          },
        },
      ]),
      Camera.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$mainCategoryId",
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $project: {
            categoryName: { $arrayElemAt: ["$category.name", 0] },
            count: 1,
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Get recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await Camera.countDocuments({
      ...filter,
      lastPingAt: { $gte: last24Hours },
    });

    return {
      total,
      active,
      inactive,
      maintenance,
      online,
      offline,
      connecting,
      unknown,
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byStreamStatus: byStreamStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      topCategories: byMainCategory,
      recentActivity,
    };
  }

  /**
   * Validate RTSP URL
   */
  async validateRtspUrl(rtspUrl) {
    try {
      const parsedUrl = new URL(rtspUrl);

      const isValid =
        (parsedUrl.protocol === "rtsp:" || parsedUrl.protocol === "rtsps:") &&
        parsedUrl.hostname &&
        parsedUrl.port;

      // Here you could also attempt to connect to the stream
      // This would require additional libraries like ffmpeg or node-rtsp-stream

      return {
        isValid,
        protocol: parsedUrl.protocol.replace(":", ""),
        hostname: parsedUrl.hostname,
        port:
          parsedUrl.port || (parsedUrl.protocol === "rtsp:" ? "554" : "322"),
        path: parsedUrl.pathname,
        username: parsedUrl.username,
        hasAuth: !!(parsedUrl.username || parsedUrl.password),
        message: isValid
          ? "RTSP URL format is valid"
          : "Invalid RTSP URL format",
      };
    } catch (error) {
      return {
        isValid: false,
        message: "Invalid RTSP URL format",
      };
    }
  }

  /**
   * Get camera by RTSP URL
   */
  async getByRtspUrl(rtspUrl, userId, userRole) {
    const filter = { rtspUrl };

    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    const camera = await Camera.findOne(filter)
      .populate("mainCategoryId", "name")
      .populate("subCategoryId", "name")
      .populate("subSubCategoryId", "name")
      .populate("createdBy", "fullName email");

    if (!camera) {
      throw new AppError("Camera not found", 404);
    }

    return camera;
  }

  /**
   * Get recent cameras
   */
  async getRecentCameras(limit, userId, userRole) {
    const filter = userRole === "admin" ? {} : { createdBy: userId };

    const cameras = await Camera.find(filter)
      .populate("mainCategoryId", "name")
      .populate("subCategoryId", "name")
      .populate("subSubCategoryId", "name")
      .sort("-createdAt")
      .limit(limit)
      .lean();

    return cameras;
  }

  /**
   * Get stream summary
   */
  async getStreamSummary(userId, userRole) {
    const filter = userRole === "admin" ? {} : { createdBy: userId };

    const [online, offline, connecting, unknown] = await Promise.all([
      Camera.countDocuments({ ...filter, streamStatus: "online" }),
      Camera.countDocuments({ ...filter, streamStatus: "offline" }),
      Camera.countDocuments({ ...filter, streamStatus: "connecting" }),
      Camera.countDocuments({ ...filter, streamStatus: "unknown" }),
    ]);

    const total = online + offline + connecting + unknown;

    return {
      total,
      online,
      offline,
      connecting,
      unknown,
      onlinePercentage: total > 0 ? Math.round((online / total) * 100) : 0,
      offlinePercentage: total > 0 ? Math.round((offline / total) * 100) : 0,
    };
  }

  /**
   * Export cameras
   */
  async exportCameras(userId, userRole, filters = {}) {
    const filter = userRole === "admin" ? {} : { createdBy: userId };

    // Apply filters
    if (filters.mainCategoryId) {
      filter.mainCategoryId = filters.mainCategoryId;
    }
    if (filters.subCategoryId) {
      filter.subCategoryId = filters.subCategoryId;
    }
    if (filters.status) {
      filter.status = filters.status;
    }
    if (filters.streamStatus) {
      filter.streamStatus = filters.streamStatus;
    }

    const cameras = await Camera.find(filter)
      .populate("mainCategoryId", "name")
      .populate("subCategoryId", "name")
      .populate("subSubCategoryId", "name")
      .populate("createdBy", "fullName email")
      .sort("-createdAt")
      .lean();

    // Add full path to each camera
    const camerasWithPath = await Promise.all(
      cameras.map(async (camera) => {
        const path = await this.getFullPath(camera._id);
        return {
          ...camera,
          fullPath: path.map((p) => p.name).join(" > "),
          categoryNames: {
            main: camera.mainCategoryId?.name || "",
            sub: camera.subCategoryId?.name || "",
            nested: camera.subSubCategoryId?.name || "",
          },
        };
      }),
    );

    return camerasWithPath;
  }
}

export const cameraService = new CameraService();
