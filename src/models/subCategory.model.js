import mongoose from 'mongoose';

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sub category name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  mainCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Main category is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // For ordering within main category
  order: {
    type: Number,
    default: 0
  },
  // Additional metadata
  metaData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Unique subcategory name per main category
subCategorySchema.index({ name: 1, mainCategoryId: 1, createdBy: 1 }, { unique: true });

// Index for faster queries
subCategorySchema.index({ mainCategoryId: 1 });
subCategorySchema.index({ createdBy: 1 });
subCategorySchema.index({ isActive: 1 });

// Virtual for items count (if you have items)
subCategorySchema.virtual('itemsCount', {
  ref: 'Item',
  localField: '_id',
  foreignField: 'subCategory',
  count: true
});

// Pre-save middleware to check main category exists and user has access
subCategorySchema.pre('save', async function () {
  const Category = mongoose.model('Category');

  const mainCategory = await Category.findOne({
    _id: this.mainCategoryId,
    $or: [
      { createdBy: this.createdBy },
      { isActive: true }
    ]
  });

  if (!mainCategory) {
    throw new Error('Main category not found or you do not have access');
  }

  const existingSubCategory = await this.constructor.findOne({
    name: this.name,
    mainCategoryId: this.mainCategoryId,
    createdBy: this.createdBy,
    _id: { $ne: this._id }
  });

  if (existingSubCategory) {
    throw new Error('You already have a subcategory with this name under this main category');
  }
});
// Authorization method
subCategorySchema.methods.canModify = function(userId, userRole) {
  if (userRole === 'admin') return true;
  return this.createdBy.toString() === userId.toString();
};

const SubCategory = mongoose.model('SubCategory', subCategorySchema);
export default SubCategory;