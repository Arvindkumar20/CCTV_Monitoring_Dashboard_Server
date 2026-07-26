import SubCategory from '../models/subCategory.model.js';
import Category from '../models/category.model.js';
import AppError from '../utils/AppError.js';
import mongoose from 'mongoose';

class SubCategoryService {
  /**
   * Create a new sub category
   */
  async createSubCategory(data, userId) {
    // Verify main category exists and user has access
    const mainCategory = await Category.findOne({
      _id: data.mainCategoryId,
      $or: [
        { createdBy: userId },
        { isActive: true }
      ]
    });

    if (!mainCategory) {
      throw new AppError('Main category not found or you do not have access', 404);
    }

    // Check if subcategory with same name exists under this main category
    const existingSubCategory = await SubCategory.findOne({
      name: data.name,
      mainCategoryId: data.mainCategoryId,
      createdBy: userId
    });

    if (existingSubCategory) {
      throw new AppError('You already have a subcategory with this name under this main category', 400);
    }

    // Get max order for this main category
    const maxOrder = await SubCategory.findOne({ 
      mainCategoryId: data.mainCategoryId,
      createdBy: userId 
    }).sort('-order').select('order');

    const subCategory = await SubCategory.create({
      name: data.name,
      description: data.description || '',
      mainCategoryId: data.mainCategoryId,
      order: data.order ?? (maxOrder ? maxOrder.order + 1 : 0),
      createdBy: userId,
      updatedBy: userId
    });

    await subCategory.populate([
      { path: 'mainCategoryId', select: 'name color' },
      { path: 'createdBy', select: 'fullName email' },
      { path: 'updatedBy', select: 'fullName email' }
    ]);

    return subCategory;
  }

  /**
   * Get all sub categories with pagination and filters
   */
  async getAllSubCategories(query, userId, userRole) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      mainCategoryId,
      isActive,
      search
    } = query;

    // Build filter
    const filter = {};

    // Regular users only see their own, admin can see all
    if (userRole !== 'admin') {
      filter.createdBy = userId;
    }

    if (mainCategoryId) {
      filter.mainCategoryId = mainCategoryId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Search by name or description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);

    // Execute queries
    const [subCategories, total] = await Promise.all([
      SubCategory.find(filter)
        .populate('mainCategoryId', 'name color icon')
        .populate('createdBy', 'fullName email')
        .populate('updatedBy', 'fullName email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SubCategory.countDocuments(filter)
    ]);

    // Group by main category if needed
    const groupedByCategory = {};
    subCategories.forEach(sub => {
      const catId = sub.mainCategoryId._id.toString();
      if (!groupedByCategory[catId]) {
        groupedByCategory[catId] = {
          category: sub.mainCategoryId,
          subCategories: []
        };
      }
      groupedByCategory[catId].subCategories.push(sub);
    });

    return {
      subCategories,
      groupedByCategory: Object.values(groupedByCategory),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get sub categories by main category
   */
  async getByMainCategory(mainCategoryId, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(mainCategoryId)) {
      throw new AppError('Invalid main category ID format', 400);
    }

    // Verify main category exists
    const mainCategory = await Category.findById(mainCategoryId);
    if (!mainCategory) {
      throw new AppError('Main category not found', 404);
    }

    const filter = { mainCategoryId };

    // Regular users only see their own
    if (userRole !== 'admin') {
      filter.createdBy = userId;
    }

    const subCategories = await SubCategory.find(filter)
      .populate('mainCategoryId', 'name color')
      .populate('createdBy', 'fullName')
      .sort('order name')
      .lean();

    return {
      mainCategory,
      subCategories
    };
  }

  /**
   * Get sub category by ID
   */
  async getSubCategoryById(subCategoryId, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      throw new AppError('Invalid sub category ID format', 400);
    }

    const subCategory = await SubCategory.findById(subCategoryId)
      .populate('mainCategoryId', 'name color icon')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email');

    if (!subCategory) {
      throw new AppError('Sub category not found', 404);
    }

    // Check if user has access
    if (userRole !== 'admin' && subCategory.createdBy._id.toString() !== userId) {
      throw new AppError('You do not have permission to view this sub category', 403);
    }

    return subCategory;
  }

  /**
   * Update sub category
   */
  async updateSubCategory(subCategoryId, updateData, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      throw new AppError('Invalid sub category ID format', 400);
    }

    const subCategory = await SubCategory.findById(subCategoryId);

    if (!subCategory) {
      throw new AppError('Sub category not found', 404);
    }

    // Check permission
    if (!subCategory.canModify(userId, userRole)) {
      throw new AppError('You do not have permission to update this sub category', 403);
    }

    // If main category is being changed, verify new category exists
    if (updateData.mainCategoryId && updateData.mainCategoryId !== subCategory.mainCategoryId.toString()) {
      const mainCategory = await Category.findOne({
        _id: updateData.mainCategoryId,
        $or: [
          { createdBy: userId },
          { isActive: true }
        ]
      });

      if (!mainCategory) {
        throw new AppError('New main category not found or you do not have access', 404);
      }
    }

    // Check if name is being updated and if it's unique under its main category
    if (updateData.name && updateData.name !== subCategory.name) {
      const existingSubCategory = await SubCategory.findOne({
        name: updateData.name,
        mainCategoryId: updateData.mainCategoryId || subCategory.mainCategoryId,
        createdBy: userId,
        _id: { $ne: subCategoryId }
      });

      if (existingSubCategory) {
        throw new AppError('You already have a subcategory with this name under this main category', 400);
      }
    }

    // Update sub category
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      subCategoryId,
      {
        ...updateData,
        updatedBy: userId
      },
      { new: true, runValidators: true }
    ).populate('mainCategoryId', 'name color')
     .populate('createdBy', 'fullName email')
     .populate('updatedBy', 'fullName email');

    return updatedSubCategory;
  }

  /**
   * Delete sub category
   */
  async deleteSubCategory(subCategoryId, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      throw new AppError('Invalid sub category ID format', 400);
    }

    const subCategory = await SubCategory.findById(subCategoryId);

    if (!subCategory) {
      throw new AppError('Sub category not found', 404);
    }

    // Check permission
    if (!subCategory.canModify(userId, userRole)) {
      throw new AppError('You do not have permission to delete this sub category', 403);
    }

    // Check if sub category is in use
    // const itemsCount = await Item.countDocuments({ subCategory: subCategoryId });
    // if (itemsCount > 0) {
    //   throw new AppError('Cannot delete sub category that has items assigned to it', 400);
    // }

    await subCategory.deleteOne();

    return { 
      message: 'Sub category deleted successfully',
      deletedSubCategory: {
        id: subCategory._id,
        name: subCategory.name
      }
    };
  }

  /**
   * Bulk delete sub categories
   */
  async bulkDeleteSubCategories(subCategoryIds, userId, userRole) {
    if (userRole !== 'admin') {
      // Verify all sub categories belong to user
      const subCategories = await SubCategory.find({ 
        _id: { $in: subCategoryIds },
        createdBy: userId 
      });

      if (subCategories.length !== subCategoryIds.length) {
        throw new AppError('Some sub categories do not belong to you', 403);
      }
    }

    const result = await SubCategory.deleteMany({ _id: { $in: subCategoryIds } });

    return { 
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} sub categories deleted successfully`
    };
  }

  /**
   * Toggle sub category status
   */
  async toggleSubCategoryStatus(subCategoryId, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      throw new AppError('Invalid sub category ID format', 400);
    }

    const subCategory = await SubCategory.findById(subCategoryId);

    if (!subCategory) {
      throw new AppError('Sub category not found', 404);
    }

    if (!subCategory.canModify(userId, userRole)) {
      throw new AppError('You do not have permission to modify this sub category', 403);
    }

    subCategory.isActive = !subCategory.isActive;
    subCategory.updatedBy = userId;
    await subCategory.save();

    return subCategory;
  }

  /**
   * Reorder sub categories
   */
  async reorderSubCategories(mainCategoryId, orderedIds, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(mainCategoryId)) {
      throw new AppError('Invalid main category ID format', 400);
    }

    // Verify main category exists
    const mainCategory = await Category.findById(mainCategoryId);
    if (!mainCategory) {
      throw new AppError('Main category not found', 404);
    }

    // Get all sub categories
    const subCategories = await SubCategory.find({
      _id: { $in: orderedIds },
      mainCategoryId
    });

    if (subCategories.length !== orderedIds.length) {
      throw new AppError('Some sub categories not found', 404);
    }

    // Check permissions
    for (const sub of subCategories) {
      if (!sub.canModify(userId, userRole)) {
        throw new AppError(`You do not have permission to reorder "${sub.name}"`, 403);
      }
    }

    // Update order
    const updates = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index, updatedBy: userId } }
      }
    }));

    await SubCategory.bulkWrite(updates);

    return this.getByMainCategory(mainCategoryId, userId, userRole);
  }

  /**
   * Search sub categories
   */
  async searchSubCategories(searchTerm, userId, userRole, mainCategoryId = null) {
    if (!searchTerm || searchTerm.length < 2) {
      throw new AppError('Search term must be at least 2 characters', 400);
    }

    const filter = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    if (userRole !== 'admin') {
      filter.createdBy = userId;
    }

    if (mainCategoryId) {
      filter.mainCategoryId = mainCategoryId;
    }

    const subCategories = await SubCategory.find(filter)
      .populate('mainCategoryId', 'name color')
      .populate('createdBy', 'fullName')
      .limit(20)
      .sort('order name')
      .lean();

    return subCategories;
  }

  /**
   * Get sub categories statistics
   */
  async getStats(userId, userRole) {
    const filter = userRole === 'admin' ? {} : { createdBy: userId };

    const [total, active, inactive, byMainCategory] = await Promise.all([
      SubCategory.countDocuments(filter),
      SubCategory.countDocuments({ ...filter, isActive: true }),
      SubCategory.countDocuments({ ...filter, isActive: false }),
      SubCategory.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$mainCategoryId',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $project: {
            category: { $arrayElemAt: ['$category.name', 0] },
            count: 1
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    return {
      total,
      active,
      inactive,
      byMainCategory,
      completionRate: total > 0 ? ((active / total) * 100).toFixed(2) : 0
    };
  }

  /**
   * Get or create sub category
   */
  async getOrCreateSubCategory(name, mainCategoryId, userId) {
    let subCategory = await SubCategory.findOne({
      name,
      mainCategoryId,
      createdBy: userId
    });

    if (!subCategory) {
      subCategory = await this.createSubCategory({
        name,
        mainCategoryId,
        description: ''
      }, userId);
    }

    return subCategory;
  }

  /**
   * Duplicate sub category
   */
  async duplicateSubCategory(subCategoryId, userId, userRole) {
    const original = await this.getSubCategoryById(subCategoryId, userId, userRole);

    const newName = `${original.name} (Copy)`;

    const newSubCategory = await this.createSubCategory({
      name: newName,
      description: original.description,
      mainCategoryId: original.mainCategoryId._id || original.mainCategoryId,
      order: original.order + 1
    }, userId);

    return newSubCategory;
  }

  /**
   * Export sub categories
   */
  async exportSubCategories(userId, userRole, mainCategoryId = null) {
    const filter = userRole === 'admin' ? {} : { createdBy: userId };
    
    if (mainCategoryId) {
      filter.mainCategoryId = mainCategoryId;
    }

    const subCategories = await SubCategory.find(filter)
      .populate('mainCategoryId', 'name')
      .populate('createdBy', 'fullName email')
      .sort('mainCategoryId order')
      .lean();

    return subCategories.map(sub => ({
      id: sub._id,
      name: sub.name,
      description: sub.description,
      mainCategory: sub.mainCategoryId?.name || 'Unknown',
      status: sub.isActive ? 'Active' : 'Inactive',
      createdBy: sub.createdBy?.fullName || 'Unknown',
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt
    }));
  }

  /**
   * Import sub categories
   */
  async importSubCategories(importData, userId) {
    const results = {
      created: [],
      failed: [],
      skipped: []
    };

    for (const item of importData) {
      try {
        // Find or verify main category
        const mainCategory = await Category.findOne({
          name: item.mainCategoryName,
          createdBy: userId
        });

        if (!mainCategory) {
          results.failed.push({ 
            name: item.name, 
            reason: `Main category "${item.mainCategoryName}" not found` 
          });
          continue;
        }

        // Check if sub category already exists
        const existing = await SubCategory.findOne({
          name: item.name,
          mainCategoryId: mainCategory._id,
          createdBy: userId
        });

        if (existing) {
          results.skipped.push({ name: item.name, reason: 'Already exists' });
          continue;
        }

        // Create sub category
        const subCategory = await SubCategory.create({
          name: item.name,
          description: item.description || '',
          mainCategoryId: mainCategory._id,
          isActive: item.isActive !== false,
          createdBy: userId,
          updatedBy: userId
        });

        results.created.push({
          id: subCategory._id,
          name: subCategory.name,
          mainCategory: mainCategory.name
        });
      } catch (error) {
        results.failed.push({ 
          name: item.name, 
          reason: error.message 
        });
      }
    }

    return results;
  }
}

export const subCategoryService = new SubCategoryService();