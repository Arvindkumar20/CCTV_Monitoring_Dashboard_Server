import mongoose from "mongoose";

const nestedSubCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Nested sub category name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    subCategoryId: {  // Changed from parentId to subCategoryId
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",  // Now references SubCategory model
      required: [true, "Parent sub category is required"],
      index: true,
    },
    mainCategoryId: {  // Added for quick access
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Main category is required"],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // For nested structure within itself (if you want further nesting)
    parentNestedId: {  // Optional - for further nesting within nested sub categories
      type: mongoose.Schema.Types.ObjectId,
      ref: "NestedSubCategory",
      default: null,
      // index: true,
    },
    level: {
      type: Number,
      default: 1,  // Changed: 1 = direct under subCategory, 2+ = under another nested
      min: 1,
      index: true,
    },
    path: {
      type: String,
      default: "",
      index: true,
    },
    ancestors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NestedSubCategory",
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: "#3b82f6",
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"],
    },
    icon: {
      type: String,
      default: "folder",
    },
    metaData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique name under same parent
nestedSubCategorySchema.index(
  { name: 1, subCategoryId: 1, createdBy: 1, parentNestedId: 1 },
  { unique: true }
);

// Index for path queries
// nestedSubCategorySchema.index({ path: 1 });

// Index for ancestor queries
nestedSubCategorySchema.index({ ancestors: 1 });

// Pre-save middleware
nestedSubCategorySchema.pre("save", async function () {
  // Import models
  const SubCategory = mongoose.model("SubCategory");
  const Category = mongoose.model("Category");

  // Verify sub category exists and belongs to user
  const subCategory = await SubCategory.findById(this.subCategoryId);
  if (!subCategory) {
    throw new Error("Parent sub category not found");
  }

  // Verify main category exists and matches sub category's main category
  if (subCategory.mainCategoryId.toString() !== this.mainCategoryId.toString()) {
    throw new Error("Main category does not match sub category's main category");
  }

  // Set level based on parentNestedId
  if (this.parentNestedId) {
    const parentNested = await this.constructor.findById(this.parentNestedId);
    if (parentNested) {
      this.level = (parentNested.level || 1) + 1;
      this.ancestors = [...(parentNested.ancestors || []), this.parentNestedId];
      this.path = parentNested.path
        ? `${parentNested.path}/${this._id}`
        : `/${parentNested._id}/${this._id}`;
    } else {
      this.level = 1;
      this.ancestors = [];
      this.path = `/${this._id}`;
    }
  } else {
    this.level = 1; // Direct under sub category
    this.ancestors = [];
    this.path = `/${this._id}`;
  }

  // Check for duplicate name under same parent
  const filter = {
    name: this.name,
    subCategoryId: this.subCategoryId,
    createdBy: this.createdBy,
    _id: { $ne: this._id },
  };
  
  if (this.parentNestedId) {
    filter.parentNestedId = this.parentNestedId;
  } else {
    filter.parentNestedId = null;
  }

  const existing = await this.constructor.findOne(filter);

  if (existing) {
    throw new Error(
      "You already have a nested sub category with this name under the same parent"
    );
  }
});

// Pre-remove middleware
nestedSubCategorySchema.pre("remove", async function () {
  // Check if this category has children
  const childrenCount = await this.constructor.countDocuments({
    parentNestedId: this._id,
  });
  if (childrenCount > 0) {
    throw new Error("Cannot delete category that has child categories");
  }
});

// Virtual for children
nestedSubCategorySchema.virtual("children", {
  ref: "NestedSubCategory",
  localField: "_id",
  foreignField: "parentNestedId",
});

// Virtual for parent sub category
nestedSubCategorySchema.virtual("subCategory", {
  ref: "SubCategory",
  localField: "subCategoryId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for main category
nestedSubCategorySchema.virtual("mainCategory", {
  ref: "Category",
  localField: "mainCategoryId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for parent nested
nestedSubCategorySchema.virtual("parentNested", {
  ref: "NestedSubCategory",
  localField: "parentNestedId",
  foreignField: "_id",
  justOne: true,
});

// Method to get full hierarchy
nestedSubCategorySchema.methods.getHierarchy = async function () {
  const hierarchy = [];
  const SubCategory = mongoose.model("SubCategory");
  const Category = mongoose.model("Category");

  // Add main category
  const mainCategory = await Category.findById(this.mainCategoryId);
  if (mainCategory) {
    hierarchy.unshift({
      type: "category",
      id: mainCategory._id,
      name: mainCategory.name,
      level: 0,
    });
  }

  // Add sub category
  const subCategory = await SubCategory.findById(this.subCategoryId);
  if (subCategory) {
    hierarchy.push({
      type: "subCategory",
      id: subCategory._id,
      name: subCategory.name,
      level: 1,
    });
  }

  // Add nested categories hierarchy
  let current = this;
  const nestedPath = [];

  while (current) {
    nestedPath.unshift({
      type: "nested",
      id: current._id,
      name: current.name,
      level: current.level,
    });

    if (current.parentNestedId) {
      current = await this.constructor.findById(current.parentNestedId);
    } else {
      break;
    }
  }

  return [...hierarchy, ...nestedPath];
};

// Method to get all descendants
nestedSubCategorySchema.methods.getDescendants = async function () {
  if (this.path) {
    return this.constructor
      .find({
        path: new RegExp(`^${this.path}`),
        _id: { $ne: this._id },
      })
      .sort("path");
  }
  return [];
};

// Method to check if user can modify
nestedSubCategorySchema.methods.canModify = function (userId, userRole) {
  if (userRole === "admin") return true;
  return this.createdBy.toString() === userId.toString();
};

// Static method to build tree for a specific sub category
nestedSubCategorySchema.statics.buildTree = async function (subCategoryId, filter = {}) {
  const categories = await this.find({ 
    subCategoryId, 
    ...filter 
  }).lean();

  const map = {};
  const roots = [];

  // First pass: create map
  categories.forEach((cat) => {
    map[cat._id] = { ...cat, children: [] };
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    if (cat.parentNestedId && map[cat.parentNestedId]) {
      map[cat.parentNestedId].children.push(map[cat._id]);
    } else {
      roots.push(map[cat._id]);
    }
  });

  // Sort by order
  const sortItems = (items) => {
    items.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    items.forEach((item) => {
      if (item.children.length > 0) {
        sortItems(item.children);
      }
    });
  };

  sortItems(roots);
  return roots;
};

// Static method to get full path
nestedSubCategorySchema.statics.getFullPath = async function (id) {
  const item = await this.findById(id);
  if (!item) return [];

  const path = [];
  const SubCategory = mongoose.model("SubCategory");
  const Category = mongoose.model("Category");

  // Get main category
  const mainCategory = await Category.findById(item.mainCategoryId);
  if (mainCategory) {
    path.push({ type: "category", id: mainCategory._id, name: mainCategory.name });
  }

  // Get sub category
  const subCategory = await SubCategory.findById(item.subCategoryId);
  if (subCategory) {
    path.push({ type: "subCategory", id: subCategory._id, name: subCategory.name });
  }

  // Get nested hierarchy
  let current = item;
  const nestedItems = [];

  while (current) {
    nestedItems.unshift({ 
      type: "nested", 
      id: current._id, 
      name: current.name 
    });
    if (current.parentNestedId) {
      current = await this.findById(current.parentNestedId);
    } else {
      break;
    }
  }

  return [...path, ...nestedItems];
};

const NestedSubCategory = mongoose.model(
  "NestedSubCategory",
  nestedSubCategorySchema
);

export default NestedSubCategory;