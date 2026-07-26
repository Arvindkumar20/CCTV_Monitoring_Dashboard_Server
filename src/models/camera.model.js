import mongoose from "mongoose";

const cameraSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Camera name is required"],
      trim: true,
      minlength: [3, "Camera name must be at least 3 characters"],
      maxlength: [100, "Camera name cannot exceed 100 characters"],
    },
    rtspUrl: {
      type: String,
      required: [true, "RTSP URL is required"],
      trim: true,
      validate: {
        validator: function(v) {
          return v.startsWith('rtsp://') || v.startsWith('rtsps://');
        },
        message: 'RTSP URL must start with rtsp:// or rtsps://'
      }
    },
    mainCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Main category is required"],
      index: true,
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      default: null,
      index: true,
    },
    subSubCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NestedSubCategory",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
      index: true,
    },
    streamStatus: {
      type: String,
      enum: ["online", "offline", "unknown", "connecting"],
      default: "online",
      index: true,
    },
    lastPingAt: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, "Location cannot exceed 200 characters"],
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    streamSettings: {
      type: {
        protocol: { type: String, default: "rtsp" },
        port: { type: Number, default: 554 },
        transport: { type: String, enum: ["tcp", "udp"], default: "tcp" },
        latency: { type: Number, default: 200 },
        fps: { type: Number, default: 25 },
        resolution: { type: String, default: "1920x1080" },
      },
      default: {},
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for unique camera name under same user
cameraSchema.index(
  { name: 1, createdBy: 1 },
  { unique: true }
);

// Index for RTSP URL (for quick lookups)
cameraSchema.index({ rtspUrl: 1 });

// Compound indexes for common queries
cameraSchema.index({ mainCategoryId: 1, status: 1 });
cameraSchema.index({ subCategoryId: 1, status: 1 });
cameraSchema.index({ subSubCategoryId: 1, status: 1 });
cameraSchema.index({ streamStatus: 1, lastPingAt: -1 });
cameraSchema.index({ createdAt: -1 });

// Pre-save middleware
cameraSchema.pre("save", async function(next) {
  // Import models
  const Category = mongoose.model("Category");
  const SubCategory = mongoose.model("SubCategory");
  const NestedSubCategory = mongoose.model("NestedSubCategory");

  // Verify main category exists
  const mainCategory = await Category.findById(this.mainCategoryId);
  if (!mainCategory) {
    throw new Error("Main category not found");
  }

  // If sub category provided, verify it belongs to main category
  if (this.subCategoryId) {
    const subCategory = await SubCategory.findById(this.subCategoryId);
    if (!subCategory) {
      throw new Error("Sub category not found");
    }
    if (subCategory.mainCategoryId.toString() !== this.mainCategoryId.toString()) {
      throw new Error("Sub category must belong to the selected main category");
    }
  }

  // If nested sub category provided, verify it belongs to sub category
  if (this.subSubCategoryId) {
    if (!this.subCategoryId) {
      throw new Error("Sub category is required when selecting nested sub category");
    }

    const nestedSubCategory = await NestedSubCategory.findById(this.subSubCategoryId);
    if (!nestedSubCategory) {
      throw new Error("Nested sub category not found");
    }
    
    if (nestedSubCategory.subCategoryId.toString() !== this.subCategoryId.toString()) {
      throw new Error("Nested sub category must belong to the selected sub category");
    }

    if (nestedSubCategory.mainCategoryId.toString() !== this.mainCategoryId.toString()) {
      throw new Error("Nested sub category must belong to the selected main category");
    }
  }
});

// Virtual for full category path
cameraSchema.virtual("categoryPath").get(function() {
  return {
    main: this.mainCategoryId,
    sub: this.subCategoryId,
    subSub: this.subSubCategoryId,
  };
});

// Virtual for full path name
cameraSchema.virtual("fullPath").get(async function() {
  const path = [];
  const Category = mongoose.model("Category");
  const SubCategory = mongoose.model("SubCategory");
  const NestedSubCategory = mongoose.model("NestedSubCategory");

  // Get main category
  const mainCategory = await Category.findById(this.mainCategoryId);
  if (mainCategory) {
    path.push(mainCategory.name);
  }

  // Get sub category
  if (this.subCategoryId) {
    const subCategory = await SubCategory.findById(this.subCategoryId);
    if (subCategory) {
      path.push(subCategory.name);
    }
  }

  // Get nested sub category
  if (this.subSubCategoryId) {
    const nestedSubCategory = await NestedSubCategory.findById(this.subSubCategoryId);
    if (nestedSubCategory) {
      path.push(nestedSubCategory.name);
    }
  }

  return path.join(" > ");
});

// Method to check if user can modify
cameraSchema.methods.canModify = function(userId, userRole) {
  if (userRole === "admin") return true;
  return this.createdBy.toString() === userId.toString();
};

// Method to update stream status
cameraSchema.methods.updateStreamStatus = async function(status) {
  this.streamStatus = status;
  this.lastPingAt = new Date();
  await this.save();
  return this;
};

// Static method to get cameras by category
cameraSchema.statics.getByCategory = async function(categoryId, categoryType, userId, userRole) {
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

  return this.find(filter)
    .populate("mainCategoryId", "name")
    .populate("subCategoryId", "name")
    .populate("subSubCategoryId", "name")
    .populate("createdBy", "fullName email")
    .sort("-createdAt");
};

// Static method to get statistics
cameraSchema.statics.getStats = async function(userId, userRole) {
  const filter = userRole === "admin" ? {} : { createdBy: userId };

  const [total, active, inactive, maintenance, online, offline, byCategory] = await Promise.all([
    this.countDocuments(filter),
    this.countDocuments({ ...filter, status: "active" }),
    this.countDocuments({ ...filter, status: "inactive" }),
    this.countDocuments({ ...filter, status: "maintenance" }),
    this.countDocuments({ ...filter, streamStatus: "online" }),
    this.countDocuments({ ...filter, streamStatus: "offline" }),
    this.aggregate([
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

  return {
    total,
    active,
    inactive,
    maintenance,
    online,
    offline,
    byCategory,
  };
};

const Camera = mongoose.model("Camera", cameraSchema);

export default Camera;