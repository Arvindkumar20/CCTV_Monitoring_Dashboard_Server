import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import Guardian from "../models/guardian/index.js";
import logger from "../config/logger.js";

/**
 * Authentication middleware - Verifies JWT token and attaches user to request
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check if token exists in headers or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new AppError("You are not logged in. Please log in to access this resource.", 401);
  }

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Check if user exists in database
    let user = null;
    let userType = decoded.type || "user";

    if (userType === "guardian") {
      user = await Guardian.findById(decoded.id).select("-password -loginHistory -trustedDevices");
    } else {
      user = await User.findById(decoded.userId || decoded.id).select("+isActive +passwordChangedAt");
    }

    if (!user) {
      throw new AppError("User no longer exists", 401);
    }

    // 4. Check if user is active
    if (user.status === "inactive" || user.status === "locked" || user.status === "suspended") {
      throw new AppError("Your account is not active. Please contact admin.", 403);
    }

    // 5. Check if user is active (for User model)
    if (user.isActive === false) {
      throw new AppError("Account deactivated", 403);
    }

    // 6. Check if password was changed after token was issued
    if (user.passwordChangedAt && decoded.iat) {
      const passwordChangedAt = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      if (passwordChangedAt > decoded.iat) {
        throw new AppError("Password changed recently. Please login again", 401);
      }
    }

    // 7. Attach user to request
    req.user = {
      userId: user._id,
      id: user._id,
      role: userType === "guardian" ? "guardian" : (decoded.role || user.role || "user"),
      email: user.email,
      name: user.name || user.fullName,
      type: userType,
      ...(userType === "guardian" ? { guardian: user } : { userData: user })
    };

    // Log authenticated request in development
    if (process.env.NODE_ENV === "development") {
      logger.debug(`Authenticated user: ${user._id}`, { path: req.path, type: userType });
    }

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new AppError("Invalid token. Please log in again.", 401);
    } else if (error.name === "TokenExpiredError") {
      throw new AppError("Your token has expired. Please log in again.", 401);
    } else {
      throw error;
    }
  }
});

/**
 * Authorization middleware - Restricts access to specific roles
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'principal', 'teacher', 'guardian')
 * @returns {Function} Middleware function
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user exists (authenticate should run before this)
    if (!req.user) {
      return next(new AppError("You are not authenticated. Please log in first.", 401));
    }

    // Check if user role is allowed
    if (!roles.includes(req.user.role)) {
      logger.warn("Unauthorized access attempt", {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path,
      });

      return next(
        new AppError(
          `You do not have permission to perform this action. Required roles: ${roles.join(", ")}`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Guardian authentication middleware
 * Specifically for guardian routes
 */
export const authenticateGuardian = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from cookie or header
  if (req.cookies?.guardianToken) {
    token = req.cookies.guardianToken;
  } else if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please login.",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token type
    if (decoded.type !== "guardian") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token.",
      });
    }

    // Find guardian with populated students
    const guardian = await Guardian.findById(decoded.id)
      .select("-password -loginHistory -trustedDevices")
      .populate({
        path: "students.studentId",
        model: "Student",
        populate: [
          { path: "classId", select: "name" },
          { path: "sectionId", select: "name" },
          { path: "groupId", select: "name" },
        ],
      });

    if (!guardian) {
      return res.status(401).json({
        success: false,
        message: "Account not found.",
      });
    }

    // Check account status
    if (guardian.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Your account is ${guardian.status}. Please contact admin.`,
      });
    }

    // Attach to request
    req.guardian = guardian;
    req.user = {
      userId: guardian._id,
      id: guardian._id,
      role: "guardian",
      name: guardian.name,
      email: guardian.email,
      type: "guardian",
      guardian: guardian
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid. Please login again.",
      });
    }
    throw error;
  }
});

/**
 * Optional authentication - Attaches user if token exists, but doesn't require it
 */
export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.cookies?.guardianToken) {
    token = req.cookies.guardianToken;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userType = decoded.type || "user";

      if (userType === "guardian") {
        const guardian = await Guardian.findById(decoded.id)
          .select("-password -loginHistory -trustedDevices");
        if (guardian && guardian.status === "active") {
          req.user = {
            userId: guardian._id,
            id: guardian._id,
            role: "guardian",
            name: guardian.name,
            type: "guardian",
          };
          req.guardian = guardian;
        }
      } else {
        const user = await User.findById(decoded.userId || decoded.id)
          .select("+isActive");
        if (user && user.isActive !== false) {
          req.user = {
            userId: user._id,
            id: user._id,
            role: decoded.role || user.role,
            email: user.email,
            name: user.fullName,
            type: "user",
          };
        }
      }
    } catch (error) {
      // Silently fail - user remains unauthenticated
      if (process.env.NODE_ENV === "development") {
        logger.debug("Optional auth failed:", error.message);
      }
    }
  }

  next();
});

/**
 * Check resource ownership or admin
 * For routes where users can only access their own resources
 */
export const checkOwnership = (resourceIdParam = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];

      if (!resourceId) {
        return next(new AppError("Resource ID not provided", 400));
      }

      // Admin can access any resource
      if (req.user?.role === "admin") {
        return next();
      }

      // Check if user owns the resource
      if (req.user?.userId?.toString() !== resourceId) {
        return next(new AppError("You can only access your own resources", 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Rate limit based on user role
 */
export const roleBasedRateLimit = (limits = {}) => {
  const defaultLimits = {
    admin: 1000,
    principal: 500,
    teacher: 200,
    security: 100,
    guardian: 150,
  };

  const roleLimits = { ...defaultLimits, ...limits };

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const limit = roleLimits[req.user.role] || 100;

    // This is just setting the limit, actual rate limiting should be done
    // by a proper rate limiter middleware using this value
    req.rateLimit = {
      max: limit,
      windowMs: 15 * 60 * 1000, // 15 minutes
    };

    next();
  };
};

/**
 * Validate session (check if token exists in DB)
 * Optional: Use if you want to validate against stored sessions
 */
export const validateSession = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token && req.user) {
      const user = await User.findOne({
        _id: req.user.userId,
        "refreshTokens.token": token,
      });

      if (!user) {
        throw new AppError("Session expired. Please login again", 401);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has any of the required permissions
 */
export const hasPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    // Admin has all permissions
    if (req.user.role === "admin") {
      return next();
    }

    // Check if user has any of the required permissions
    const userPermissions = req.user.permissions || [];
    const hasAnyPermission = permissions.some(p => userPermissions.includes(p));

    if (!hasAnyPermission) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }

    next();
  };
};

/**
 * Check if guardian has access to specific student
 */
export const checkGuardianStudentAccess = asyncHandler(async (req, res, next) => {
  const studentId = req.params.studentId || req.body.studentId;

  if (!studentId) {
    return next(new AppError("Student ID not provided", 400));
  }

  // Admin can access any student
  if (req.user?.role === "admin") {
    return next();
  }

  // Check if guardian has this student
  if (req.user?.role === "guardian" && req.guardian) {
    const hasStudent = req.guardian.students?.some(
      s => s.studentId?._id?.toString() === studentId
    );

    if (!hasStudent) {
      return next(new AppError("You do not have access to this student", 403));
    }

    return next();
  }

  next(new AppError("Access denied", 403));
});

export default {
  authenticate,
  restrictTo,
  authenticateGuardian,
  optionalAuthenticate,
  checkOwnership,
  roleBasedRateLimit,
  validateSession,
  hasPermission,
  checkGuardianStudentAccess
};