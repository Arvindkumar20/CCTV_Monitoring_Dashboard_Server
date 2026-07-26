import AppError from "../utils/AppError.js";

export const checkPermission = (resourceType) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Admins can do anything
      if (userRole === "admin") {
        return next();
      }

      // Get the resource based on type
      let resource;
      switch (resourceType) {
        case "camera":
          resource = await Camera.findById(id);
          break;
        case "category":
          resource = await Category.findById(id);
          break;
        case "subCategory":
          resource = await SubCategory.findById(id);
          break;
        case "nestedSubCategory":
          resource = await NestedSubCategory.findById(id);
          break;
        default:
          return next();
      }

      if (!resource) {
        return next(new AppError("Resource not found", 404));
      }

      // Check if user owns the resource
      if (resource.createdBy.toString() !== userId) {
        return next(
          new AppError("You do not have permission to access this resource", 403)
        );
      }

      // Attach resource to request for later use
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};