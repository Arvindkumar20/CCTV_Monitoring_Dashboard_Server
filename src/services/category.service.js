import Category from "../models/category.model.js";
import AppError from "../utils/AppError.js";
import mongoose from "mongoose";

class CategoryService {
  /**
   * Create a new category
   * @param {Object} categoryData - { name }
   * @param {string} userId - User ID creating the category
   * @returns {Promise<Object>} Created category
   */
  async createCategory(categoryData, userId) {
    console.log(categoryData);
    // Check if category with same name exists for this user
    const existingCategory = await Category.findOne({
      name: categoryData.name,
      createdBy: userId,
    });

    if (existingCategory) {
      throw new AppError("You already have a category with this name", 400);
    }

    // Create new category
    const category = await Category.create({
      name: categoryData.name,
      description: categoryData.description,
      createdBy: userId,
      updatedBy: userId,
    });

    // Populate user details
    await category.populate([
      { path: "createdBy", select: "fullName email" },
      { path: "updatedBy", select: "fullName email" },
    ]);

    return category;
  }

  /**
   * Get all categories with pagination and filters
   * @param {Object} query - Query params (page, limit, sortBy, sortOrder, search)
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Categories with pagination
   */
  async getAllCategories(query, userId, userRole) {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
    } = query;

    // Build filter
    const filter = {};

    // Regular users only see their own categories, admin can see all
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    // Search by name
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Pagination
    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);

    // Execute queries
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Category.countDocuments(filter),
    ]);

    return {
      categories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get category by ID
   * @param {string} categoryId - Category ID
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Category
   */
  async getCategoryById(categoryId, userId, userRole) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new AppError("Invalid category ID format", 400);
    }

    const category = await Category.findById(categoryId)
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    // Check if user has access
    if (userRole !== "admin" && category.createdBy._id.toString() !== userId) {
      throw new AppError(
        "You do not have permission to view this category",
        403,
      );
    }

    return category;
  }

  /**
   * Update category
   * @param {string} categoryId - Category ID
   * @param {Object} updateData - { name }
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Updated category
   */
  async updateCategory(categoryId, updateData, userId, userRole) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new AppError("Invalid category ID format", 400);
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    // Check permission
    if (!category.canModify(userId, userRole)) {
      throw new AppError(
        "You do not have permission to update this category",
        403,
      );
    }

    // Check if name is being updated and if it's unique
    if (updateData.name && updateData.name !== category.name) {
      const existingCategory = await Category.findOne({
        name: updateData.name,
        createdBy: userId,
        _id: { $ne: categoryId },
      });

      if (existingCategory) {
        throw new AppError("You already have a category with this name", 400);
      }
    }

    // Update category
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        name: updateData.name || category.name,
        description: updateData.description || category.description,
        updatedBy: userId,
      },
      { new: true, runValidators: true },
    )
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");

    return updatedCategory;
  }

  /**
   * Delete category
   * @param {string} categoryId - Category ID
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCategory(categoryId, userId, userRole) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new AppError("Invalid category ID format", 400);
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    // Check permission
    if (!category.canModify(userId, userRole)) {
      throw new AppError(
        "You do not have permission to delete this category",
        403,
      );
    }

    // Check if category is being used (if you have any references)
    // const itemsCount = await Item.countDocuments({ category: categoryId });
    // if (itemsCount > 0) {
    //   throw new AppError('Cannot delete category that has items assigned to it', 400);
    // }

    await category.deleteOne();

    return {
      message: "Category deleted successfully",
      deletedCategory: {
        id: category._id,
        name: category.name,
      },
    };
  }

  /**
   * Bulk delete categories (admin only)
   * @param {Array} categoryIds - Array of category IDs
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Bulk deletion result
   */
  async bulkDeleteCategories(categoryIds, userId, userRole) {
    // Check if user is admin
    if (userRole !== "admin") {
      throw new AppError("Only admins can perform bulk delete", 403);
    }

    // Validate all IDs
    const invalidIds = categoryIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );
    if (invalidIds.length > 0) {
      throw new AppError(
        `Invalid category ID format: ${invalidIds.join(", ")}`,
        400,
      );
    }

    const categories = await Category.find({ _id: { $in: categoryIds } });

    if (categories.length === 0) {
      throw new AppError("No categories found with the provided IDs", 404);
    }

    // Check if any categories are in use
    // const usedCategories = await Item.distinct('category', { category: { $in: categoryIds } });
    // if (usedCategories.length > 0) {
    //   throw new AppError('Some categories are in use and cannot be deleted', 400);
    // }

    const result = await Category.deleteMany({ _id: { $in: categoryIds } });

    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} categories deleted successfully`,
    };
  }

  /**
   * Search categories
   * @param {string} searchTerm - Search term
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<Array>} Matching categories
   */
  async searchCategories(searchTerm, userId, userRole) {
    if (!searchTerm || searchTerm.length < 2) {
      throw new AppError("Search term must be at least 2 characters long", 400);
    }

    const filter = {
      name: { $regex: searchTerm, $options: "i" },
    };

    // Regular users only search their own categories
    if (userRole !== "admin") {
      filter.createdBy = userId;
    }

    const categories = await Category.find(filter)
      .select("name createdBy")
      .populate("createdBy", "fullName email")
      .limit(20)
      .lean();

    return categories;
  }

  /**
   * Get categories created by specific user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User's categories
   */
  async getUserCategories(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID format", 400);
    }

    const categories = await Category.find({ createdBy: userId })
      .select("name createdAt updatedAt")
      .populate("createdBy", "fullName email")
      .sort("name")
      .lean();

    return categories;
  }

  /**
   * Get category statistics
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Category statistics
   */
  async getCategoryStats(userId, userRole) {
    const filter = userRole === "admin" ? {} : { createdBy: userId };

    const stats = await Category.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCategories: { $sum: 1 },
          oldestCategory: { $min: "$createdAt" },
          newestCategory: { $max: "$createdAt" },
        },
      },
      {
        $project: {
          _id: 0,
          totalCategories: 1,
          oldestCategory: 1,
          newestCategory: 1,
        },
      },
    ]);

    // Get recent categories
    const recentCategories = await Category.find(filter)
      .select("name createdAt")
      .populate("createdBy", "fullName")
      .sort("-createdAt")
      .limit(5)
      .lean();

    return {
      stats: stats[0] || { totalCategories: 0 },
      recentCategories,
    };
  }

  /**
   * Check if category exists and user has access
   * @param {string} categoryId - Category ID
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<boolean>} True if exists and accessible
   */
  async verifyCategoryAccess(categoryId, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return false;
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      return false;
    }

    if (userRole === "admin") {
      return true;
    }

    return category.createdBy.toString() === userId;
  }

  /**
   * Get or create category (useful for bulk operations)
   * @param {string} categoryName - Category name
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Category
   */
  async getOrCreateCategory(categoryName, userId) {
    let category = await Category.findOne({
      name: categoryName,
      createdBy: userId,
    });

    if (!category) {
      category = await Category.create({
        name: categoryName,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    return category;
  }

  /**
   * Export categories (for data export feature)
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Promise<Array>} All categories for export
   */
  async exportCategories(userId, userRole) {
    const filter = userRole === "admin" ? {} : { createdBy: userId };

    const categories = await Category.find(filter)
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email")
      .sort("name")
      .lean();

    return categories.map((cat) => ({
      id: cat._id,
      name: cat.name,
      createdBy: cat.createdBy?.fullName || "Unknown",
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));
  }

  /**
   * Import categories (bulk create)
   * @param {Array} categoryNames - Array of category names
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Import result
   */
  async importCategories(categoryNames, userId) {
    const results = {
      created: [],
      skipped: [],
      failed: [],
    };

    for (const name of categoryNames) {
      try {
        // Check if category already exists
        const existing = await Category.findOne({
          name: name.trim(),
          createdBy: userId,
        });

        if (existing) {
          results.skipped.push({ name, reason: "Already exists" });
          continue;
        }

        // Create new category
        const category = await Category.create({
          name: name.trim(),
          createdBy: userId,
          updatedBy: userId,
        });

        results.created.push({
          id: category._id,
          name: category.name,
        });
      } catch (error) {
        results.failed.push({ name, reason: error.message });
      }
    }

    return {
      ...results,
      totalCreated: results.created.length,
      totalSkipped: results.skipped.length,
      totalFailed: results.failed.length,
    };
  }
}

// Create and export singleton instance
export const categoryService = new CategoryService();
