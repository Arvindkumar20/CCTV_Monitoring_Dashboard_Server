import NestedSubCategory from "../models/nestedSubCategory.model.js";
import SubCategory from "../models/subCategory.model.js";
import Category from "../models/category.model.js";
import AppError from "../utils/AppError.js";
import mongoose from "mongoose";

class NestedSubCategoryService {
  /**
   * Create a new nested sub category
   */
  async createNestedSubCategory(data, userId) {
    // Verify sub category exists
    const subCategory = await SubCategory.findById(data.subCategoryId);
    if (!subCategory) {
      throw new AppError("Parent sub category not found", 404);
    }

    // Verify main category exists and matches
    const mainCategory = await Category.findById(data.mainCategoryId);
    if (!mainCategory) {
      throw new AppError("Main category not found", 404);
    }

    if (subCategory.mainCategoryId.toString() !== data.mainCategoryId) {
      throw new AppError(
        "Sub category does not belong to the selected main category",
        400,
      );
    }
    console.log(subCategory.createdBy.toString());
    console.log(userId);
    // Check if user has access to sub category
    if (subCategory.createdBy.toString() !== userId.toString()) {
      throw new AppError(
        "You do not have permission to create under this sub category",
        403,
      );
    }

    // If parentNestedId is provided, verify it
    if (data.parentNestedId) {
      const parentNested = await NestedSubCategory.findById(
        data.parentNestedId,
      );
      if (!parentNested) {
        throw new AppError("Parent nested category not found", 404);
      }

      if (parentNested.subCategoryId.toString() !== data.subCategoryId) {
        throw new AppError(
          "Parent nested category does not belong to the selected sub category",
          400,
        );
      }
    }

    // Check for duplicate under same parent
    const filter = {
      name: data.name,
      subCategoryId: data.subCategoryId,
      createdBy: userId,
    };

    if (data.parentNestedId) {
      filter.parentNestedId = data.parentNestedId;
    } else {
      filter.parentNestedId = null;
    }

    const existing = await NestedSubCategory.findOne(filter);
    if (existing) {
      throw new AppError(
        "You already have a nested sub category with this name under the same parent",
        400,
      );
    }

    // Create nested sub category
    const nestedSubCategory = await NestedSubCategory.create({
      name: data.name,
      description: data.description || "",
      subCategoryId: data.subCategoryId,
      mainCategoryId: data.mainCategoryId,
      parentNestedId: data.parentNestedId || null,
      color: data.color || subCategory.color || "#3b82f6",
      icon: data.icon || "folder",
      order: data.order || 0,
      createdBy: userId,
      updatedBy: userId,
    });

    await nestedSubCategory.populate([
      { path: "subCategoryId", select: "name color" },
      { path: "mainCategoryId", select: "name" },
      { path: "parentNestedId", select: "name level" },
      { path: "createdBy", select: "fullName email" },
      { path: "updatedBy", select: "fullName email" },
    ]);

    return nestedSubCategory;
  }

  /**
   * Get all nested sub categories with filters
   */
  async getAllNestedSubCategories(query, userId, userRole) {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      subCategoryId,
      mainCategoryId,
      parentNestedId,
      level,
      isActive,
      search,
    } = query;

    // Build filter
    const filter = {};

    // Regular users only see their own
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    if (subCategoryId) {
      filter.subCategoryId = subCategoryId;
    }

    if (mainCategoryId) {
      filter.mainCategoryId = mainCategoryId;
    }

    if (parentNestedId !== undefined) {
      if (parentNestedId === "null") {
        filter.parentNestedId = null;
      } else if (parentNestedId) {
        filter.parentNestedId = parentNestedId;
      }
    }

    if (level !== undefined) {
      filter.level = level;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Search by name or description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
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
    const [nestedSubCategories, total] = await Promise.all([
      NestedSubCategory.find(filter)
        .populate("subCategoryId", "name color")
        .populate("mainCategoryId", "name")
        .populate("parentNestedId", "name level")
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email")
        .populate({
          path: "children",
          select: "name level isActive color",
        })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      NestedSubCategory.countDocuments(filter),
    ]);

    // Get full hierarchy for each
    const nestedWithInfo = await Promise.all(
      nestedSubCategories.map(async (item) => {
        const hierarchy = await this.getFullHierarchy(item._id);
        return {
          ...item,
          hierarchy,
          hasChildren: item.children && item.children.length > 0,
        };
      }),
    );

    return {
      nestedSubCategories: nestedWithInfo,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get nested sub category by ID
   */
  async getNestedSubCategoryById(id, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid nested sub category ID format", 400);
    }

    const nestedSubCategory = await NestedSubCategory.findById(id)
      .populate("subCategoryId", "name color description")
      .populate("mainCategoryId", "name")
      .populate("parentNestedId", "name level")
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email")
      .populate({
        path: "children",
        select: "name description level isActive color icon order",
        options: { sort: { order: 1, name: 1 } },
      });

    if (!nestedSubCategory) {
      throw new AppError("Nested sub category not found", 404);
    }

    // Check access
    if (
      userRole !== "admin" &&
      nestedSubCategory.createdBy._id.toString() !== userId
    ) {
      throw new AppError(
        "You do not have permission to view this nested sub category",
        403,
      );
    }

    // Get full hierarchy
    const hierarchy = await this.getFullHierarchy(id);

    // Get descendants
    const descendants = await nestedSubCategory.getDescendants();

    return {
      ...nestedSubCategory.toObject(),
      hierarchy,
      descendantsCount: descendants.length,
      hasChildren: nestedSubCategory.children.length > 0,
    };
  }

  /**
   * Update nested sub category
   */
  async updateNestedSubCategory(id, updateData, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid nested sub category ID format", 400);
    }

    const nestedSubCategory = await NestedSubCategory.findById(id);

    if (!nestedSubCategory) {
      throw new AppError("Nested sub category not found", 404);
    }

    // Check permission
    if (!nestedSubCategory.canModify(userId, userRole)) {
      throw new AppError(
        "You do not have permission to update this nested sub category",
        403,
      );
    }

    // If subCategoryId is being changed, verify new sub category
    if (
      updateData.subCategoryId &&
      updateData.subCategoryId !== nestedSubCategory.subCategoryId.toString()
    ) {
      const newSubCategory = await SubCategory.findById(
        updateData.subCategoryId,
      );
      if (!newSubCategory) {
        throw new AppError("New sub category not found", 404);
      }

      if (newSubCategory.createdBy.toString() !== userId) {
        throw new AppError(
          "You do not have permission to use this sub category",
          403,
        );
      }

      // Verify main category matches
      if (updateData.mainCategoryId) {
        if (
          newSubCategory.mainCategoryId.toString() !== updateData.mainCategoryId
        ) {
          throw new AppError(
            "New sub category does not belong to the selected main category",
            400,
          );
        }
      } else {
        if (
          newSubCategory.mainCategoryId.toString() !==
          nestedSubCategory.mainCategoryId.toString()
        ) {
          throw new AppError(
            "New sub category does not belong to the current main category",
            400,
          );
        }
      }
    }

    // If parentNestedId is being changed, verify it
    if (updateData.parentNestedId !== undefined) {
      if (updateData.parentNestedId === null) {
        // Moving to root under sub category
        updateData.level = 1;
        updateData.ancestors = [];
      } else if (updateData.parentNestedId) {
        if (updateData.parentNestedId === id) {
          throw new AppError("Category cannot be its own parent", 400);
        }

        const newParent = await NestedSubCategory.findById(
          updateData.parentNestedId,
        );
        if (!newParent) {
          throw new AppError("New parent nested category not found", 404);
        }

        // Check for circular reference
        let current = newParent;
        while (current) {
          if (current._id.toString() === id) {
            throw new AppError("Circular reference detected", 400);
          }
          if (current.parentNestedId) {
            current = await NestedSubCategory.findById(current.parentNestedId);
          } else {
            break;
          }
        }

        // Verify parent belongs to same sub category
        const targetSubCategoryId =
          updateData.subCategoryId || nestedSubCategory.subCategoryId;
        if (
          newParent.subCategoryId.toString() !== targetSubCategoryId.toString()
        ) {
          throw new AppError(
            "New parent does not belong to the same sub category",
            400,
          );
        }
      }
    }

    // Check name uniqueness under new parent
    if (updateData.name && updateData.name !== nestedSubCategory.name) {
      const newSubCategoryId =
        updateData.subCategoryId || nestedSubCategory.subCategoryId;
      const newParentNestedId =
        updateData.parentNestedId !== undefined
          ? updateData.parentNestedId
          : nestedSubCategory.parentNestedId;

      const filter = {
        name: updateData.name,
        subCategoryId: newSubCategoryId,
        createdBy: userId,
        _id: { $ne: id },
      };

      if (newParentNestedId) {
        filter.parentNestedId = newParentNestedId;
      } else {
        filter.parentNestedId = null;
      }

      const existing = await NestedSubCategory.findOne(filter);
      if (existing) {
        throw new AppError(
          "You already have a nested sub category with this name under the same parent",
          400,
        );
      }
    }

    // Update
    Object.assign(nestedSubCategory, updateData);
    nestedSubCategory.updatedBy = userId;
    await nestedSubCategory.save();

    await nestedSubCategory.populate([
      { path: "subCategoryId", select: "name color" },
      { path: "mainCategoryId", select: "name" },
      { path: "parentNestedId", select: "name level" },
      { path: "createdBy", select: "fullName email" },
      { path: "updatedBy", select: "fullName email" },
      { path: "children", select: "name level" },
    ]);

    return nestedSubCategory;
  }

  /**
   * Delete nested sub category
   */
  async deleteNestedSubCategory(id, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid nested sub category ID format", 400);
    }

    const nestedSubCategory = await NestedSubCategory.findById(id);

    if (!nestedSubCategory) {
      throw new AppError("Nested sub category not found", 404);
    }

    // Check permission
    if (!nestedSubCategory.canModify(userId, userRole)) {
      throw new AppError(
        "You do not have permission to delete this nested sub category",
        403,
      );
    }

    // Check for children
    const childrenCount = await NestedSubCategory.countDocuments({
      parentNestedId: id,
    });
    if (childrenCount > 0) {
      throw new AppError(
        "Cannot delete nested sub category that has child categories",
        400,
      );
    }

    await nestedSubCategory.deleteOne();

    return {
      message: "Nested sub category deleted successfully",
      deletedItem: {
        id: nestedSubCategory._id,
        name: nestedSubCategory.name,
      },
    };
  }

  /**
   * Get full hierarchy (Category > SubCategory > NestedSubCategory)
   */
  async getFullHierarchy(id) {
    const nested = await NestedSubCategory.findById(id);
    if (!nested) return [];

    const hierarchy = [];

    // Get main category
    const mainCategory = await Category.findById(nested.mainCategoryId);
    if (mainCategory) {
      hierarchy.push({
        type: "category",
        id: mainCategory._id,
        name: mainCategory.name,
      });
    }

    // Get sub category
    const subCategory = await SubCategory.findById(nested.subCategoryId);
    if (subCategory) {
      hierarchy.push({
        type: "subCategory",
        id: subCategory._id,
        name: subCategory.name,
      });
    }

    // Get nested hierarchy
    let current = nested;
    const nestedPath = [];

    while (current) {
      nestedPath.unshift({
        type: "nested",
        id: current._id,
        name: current.name,
      });
      if (current.parentNestedId) {
        current = await NestedSubCategory.findById(current.parentNestedId);
      } else {
        break;
      }
    }

    return [...hierarchy, ...nestedPath];
  }

  /**
   * Get nested sub categories by sub category
   */
  async getBySubCategory(subCategoryId, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      throw new AppError("Invalid sub category ID", 400);
    }

    const filter = { subCategoryId };
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    const nestedSubCategories = await NestedSubCategory.find(filter)
      .populate("parentNestedId", "name")
      .populate("mainCategoryId", "name")
      .populate("createdBy", "fullName")
      .sort("order name")
      .lean();

    // Build tree for this sub category
    const tree = await NestedSubCategory.buildTree(subCategoryId, filter);

    // Get the parent sub category
    const subCategory = await SubCategory.findById(subCategoryId).populate(
      "mainCategoryId",
      "name",
    );

    return {
      subCategory,
      nestedSubCategories,
      tree,
    };
  }

  /**
   * Get nested sub categories by main category
   */
  async getByMainCategory(mainCategoryId, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(mainCategoryId)) {
      throw new AppError("Invalid main category ID", 400);
    }

    const filter = { mainCategoryId };
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    const nestedSubCategories = await NestedSubCategory.find(filter)
      .populate("subCategoryId", "name color")
      .populate("parentNestedId", "name")
      .populate("createdBy", "fullName")
      .sort("order name")
      .lean();

    // Group by sub category
    const groupedBySubCategory = {};

    for (const item of nestedSubCategories) {
      const subCatId = item.subCategoryId?._id?.toString() || "unknown";
      if (!groupedBySubCategory[subCatId]) {
        const subCategory = await SubCategory.findById(subCatId).select(
          "name description color",
        );

        groupedBySubCategory[subCatId] = {
          subCategory: subCategory || { name: "Unknown", _id: subCatId },
          items: [],
          tree: await NestedSubCategory.buildTree(subCatId, {
            mainCategoryId,
            ...filter,
          }),
        };
      }
      groupedBySubCategory[subCatId].items.push(item);
    }

    return {
      mainCategoryId,
      groupedBySubCategory: Object.values(groupedBySubCategory),
    };
  }

  /**
   * Toggle status
   */
  async toggleStatus(id, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid nested sub category ID format", 400);
    }

    const nestedSubCategory = await NestedSubCategory.findById(id);

    if (!nestedSubCategory) {
      throw new AppError("Nested sub category not found", 404);
    }

    if (!nestedSubCategory.canModify(userId, userRole)) {
      throw new AppError(
        "You do not have permission to modify this nested sub category",
        403,
      );
    }

    nestedSubCategory.isActive = !nestedSubCategory.isActive;
    nestedSubCategory.updatedBy = userId;
    await nestedSubCategory.save();

    return nestedSubCategory;
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
    const items = await NestedSubCategory.find({ _id: { $in: ids } });

    if (items.length === 0) {
      throw new AppError("No nested sub categories found", 404);
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

    // Check for children
    for (const item of items) {
      const childrenCount = await NestedSubCategory.countDocuments({
        parentNestedId: item._id,
        _id: { $nin: ids },
      });

      if (childrenCount > 0) {
        throw new AppError(
          `"${item.name}" has child items that are not being deleted`,
          400,
        );
      }
    }

    const result = await NestedSubCategory.deleteMany({ _id: { $in: ids } });

    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} nested sub categories deleted successfully`,
    };
  }

  /**
   * Search nested sub categories
   */
  async search(searchTerm, userId, userRole, filters = {}) {
    if (!searchTerm || searchTerm.length < 2) {
      throw new AppError("Search term must be at least 2 characters", 400);
    }

    const filter = {
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
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

    const results = await NestedSubCategory.find(filter)
      .populate("subCategoryId", "name")
      .populate("mainCategoryId", "name")
      .populate("createdBy", "fullName")
      .limit(20)
      .sort("name")
      .lean();

    // Add full path for display
    const resultsWithPath = await Promise.all(
      results.map(async (item) => {
        const hierarchy = await this.getFullHierarchy(item._id);
        return {
          ...item,
          path: hierarchy.map((h) => h.name).join(" > "),
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

    const [total, active, inactive, byLevel, bySubCategory] = await Promise.all(
      [
        NestedSubCategory.countDocuments(filter),
        NestedSubCategory.countDocuments({ ...filter, isActive: true }),
        NestedSubCategory.countDocuments({ ...filter, isActive: false }),
        NestedSubCategory.aggregate([
          { $match: filter },
          {
            $group: {
              _id: "$level",
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        NestedSubCategory.aggregate([
          { $match: filter },
          {
            $group: {
              _id: "$subCategoryId",
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "subcategories",
              localField: "_id",
              foreignField: "_id",
              as: "subCategory",
            },
          },
          {
            $project: {
              subCategoryName: { $arrayElemAt: ["$subCategory.name", 0] },
              count: 1,
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ],
    );

    // Get tree depth stats
    const maxDepth = await NestedSubCategory.findOne(filter)
      .sort("-level")
      .select("level")
      .lean();

    return {
      total,
      active,
      inactive,
      byLevel,
      bySubCategory,
      maxDepth: maxDepth?.level || 0,
    };
  }

  /**
   * Get tree for a sub category
   */
  async getTree(subCategoryId, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      throw new AppError("Invalid sub category ID", 400);
    }

    const filter = { subCategoryId };
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    return NestedSubCategory.buildTree(subCategoryId, filter);
  }

  /**
   * Move nested sub category to new parent or sub category
   */
  async moveNestedSubCategory(id, moveData, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid nested sub category ID format", 400);
    }

    const nestedSubCategory = await NestedSubCategory.findById(id);

    if (!nestedSubCategory) {
      throw new AppError("Nested sub category not found", 404);
    }

    if (!nestedSubCategory.canModify(userId, userRole)) {
      throw new AppError(
        "You do not have permission to move this nested sub category",
        403,
      );
    }

    // If moving to a different sub category
    if (moveData.newSubCategoryId) {
      const newSubCategory = await SubCategory.findById(
        moveData.newSubCategoryId,
      );
      if (!newSubCategory) {
        throw new AppError("New sub category not found", 404);
      }

      if (newSubCategory.createdBy.toString() !== userId) {
        throw new AppError(
          "You do not have permission to use this sub category",
          403,
        );
      }

      nestedSubCategory.subCategoryId = moveData.newSubCategoryId;
      nestedSubCategory.mainCategoryId = newSubCategory.mainCategoryId;
    }

    // If moving to a new parent nested
    if (moveData.newParentNestedId !== undefined) {
      if (moveData.newParentNestedId === null) {
        // Move to root under sub category
        nestedSubCategory.parentNestedId = null;
      } else if (moveData.newParentNestedId) {
        if (moveData.newParentNestedId === id) {
          throw new AppError("Category cannot be its own parent", 400);
        }

        const newParent = await NestedSubCategory.findById(
          moveData.newParentNestedId,
        );
        if (!newParent) {
          throw new AppError("New parent nested category not found", 404);
        }

        // Check for circular reference
        let current = newParent;
        while (current) {
          if (current._id.toString() === id) {
            throw new AppError("Circular reference detected", 400);
          }
          if (current.parentNestedId) {
            current = await NestedSubCategory.findById(current.parentNestedId);
          } else {
            break;
          }
        }

        // Verify parent belongs to same sub category
        const targetSubCategoryId =
          moveData.newSubCategoryId || nestedSubCategory.subCategoryId;
        if (
          newParent.subCategoryId.toString() !== targetSubCategoryId.toString()
        ) {
          throw new AppError(
            "New parent does not belong to the same sub category",
            400,
          );
        }

        nestedSubCategory.parentNestedId = moveData.newParentNestedId;
      }
    }

    nestedSubCategory.updatedBy = userId;
    await nestedSubCategory.save();

    return this.getNestedSubCategoryById(id, userId, userRole);
  }
}

export const nestedSubCategoryService = new NestedSubCategoryService();
