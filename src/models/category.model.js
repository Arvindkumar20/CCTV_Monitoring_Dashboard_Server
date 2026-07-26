import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Class category name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      default:""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Unique category name per user
categorySchema.index({ name: 1, createdBy: 1 }, { unique: true });

// Authorization method
categorySchema.methods.canModify = function (userId, userRole) {
  if (userRole === "admin") return true;
  return this.createdBy.toString() === userId.toString();
};

const Category = mongoose.model("Category", categorySchema);
export default Category;
