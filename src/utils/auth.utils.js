import { User } from '../models/user.model.js';
import AppError from './AppError.js';
import logger from '../config/logger.js';

/**
 * Role hierarchy for permissions
 */
const ROLE_HIERARCHY = {
  admin: 100,
  principal: 80,
  teacher: 50,
  security: 20,
};

/**
 * Permission matrix - defines what each role can do
 */
const PERMISSIONS = {
  // User management
  'manage-users': ['admin'],
  'view-users': ['admin', 'principal'],
  'create-user': ['admin', 'principal'],
  'update-user': ['admin', 'principal'],
  'delete-user': ['admin'],
  
  // Attendance
  'mark-attendance': ['teacher', 'principal'],
  'view-attendance': ['teacher', 'principal', 'security'],
  'manage-attendance': ['principal', 'admin'],
  
  // Reports
  'generate-reports': ['principal', 'admin'],
  'view-reports': ['principal', 'teacher', 'admin'],
  
  // Settings
  'manage-settings': ['admin'],
  'view-settings': ['admin', 'principal'],
};

/**
 * Validate user access with multiple checks
 */
export const validateUserAccess = async (
  userId, 
  resourceOwnerId = null, 
  requiredRole = null,
  requiredPermission = null
) => {
  try {
    // Get user with role
    const user = await User.findById(userId).select('role isActive');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    // Admin has full access
    if (user.role === 'admin') {
      return true;
    }

    // Check resource ownership
    if (resourceOwnerId && userId.toString() === resourceOwnerId.toString()) {
      return true;
    }

    // Check role hierarchy
    if (requiredRole) {
      const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
      const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 0;
      
      if (userRoleLevel >= requiredRoleLevel) {
        return true;
      }
    }

    // Check specific permission
    if (requiredPermission) {
      const allowedRoles = PERMISSIONS[requiredPermission] || [];
      if (allowedRoles.includes(user.role)) {
        return true;
      }
    }

    // If none of the checks passed, deny access
    logger.warn('Access denied', {
      userId,
      resourceOwnerId,
      requiredRole,
      requiredPermission,
      userRole: user.role,
    });

    throw new AppError('You do not have permission to perform this action', 403);
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    logger.error('Access validation error', { error: error.message, userId });
    throw new AppError('Error validating access', 500);
  }
};

/**
 * Check if user has required role
 */
export const hasRole = (user, requiredRole) => {
  if (!user || !requiredRole) return false;
  
  const userLevel = ROLE_HIERARCHY[user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (userRole, permission) => {
  const allowedRoles = PERMISSIONS[permission] || [];
  return allowedRoles.includes(userRole);
};

/**
 * Format user response (remove sensitive data)
 */
export const formatUserResponse = (user) => {
  if (!user) return null;

  // Handle both Mongoose document and plain object
  const userObj = user.toObject ? user.toObject() : { ...user };

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'refreshToken',
    'refreshTokens',
    'loginAttempts',
    'lockUntil',
    'passwordResetToken',
    'passwordResetExpires',
    'emailVerificationToken',
    'emailVerificationExpires',
    '__v',
    'createdBy',
    'updatedBy',
  ];

  sensitiveFields.forEach(field => delete userObj[field]);

  // Ensure _id is converted to id
  if (userObj._id) {
    userObj.id = userObj._id.toString();
    delete userObj._id;
  }

  return userObj;
};

/**
 * Get user's accessible data based on role
 */
export const getAccessibleData = (user, data, dataType) => {
  if (!user || !data) return null;

  // Admin sees everything
  if (user.role === 'admin') return data;

  // Define field restrictions based on role and data type
  const restrictions = {
    user: {
      principal: ['loginAttempts', 'lockUntil', 'refreshToken'],
      teacher: ['email', 'mobile', 'loginAttempts', 'lockUntil', 'refreshToken'],
      security: ['email', 'mobile', 'role', 'loginAttempts', 'lockUntil', 'refreshToken'],
    },
    attendance: {
      teacher: ['studentContact'],
      security: ['studentDetails', 'teacherNotes'],
    },
  };

  const fieldsToRemove = restrictions[dataType]?.[user.role] || [];
  
  if (Array.isArray(data)) {
    return data.map(item => {
      const itemObj = { ...item };
      fieldsToRemove.forEach(field => delete itemObj[field]);
      return itemObj;
    });
  }

  const dataObj = { ...data };
  fieldsToRemove.forEach(field => delete dataObj[field]);
  
  return dataObj;
};

/**
 * Validate multiple users access in batch
 */
export const validateBatchAccess = async (userId, resourceIds, requiredRole = null) => {
  const user = await User.findById(userId).select('role');
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Admin can access all
  if (user.role === 'admin') {
    return resourceIds;
  }

  // Check role hierarchy
  if (requiredRole) {
    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    
    if (userLevel >= requiredLevel) {
      return resourceIds;
    }
  }

  // For non-admin, only return their own resources
  return resourceIds.filter(id => id.toString() === userId.toString());
};

/**
 * Get role hierarchy level
 */
export const getRoleLevel = (role) => {
  return ROLE_HIERARCHY[role] || 0;
};

/**
 * Check if role is above another role
 */
export const isRoleAbove = (role1, role2) => {
  return (ROLE_HIERARCHY[role1] || 0) > (ROLE_HIERARCHY[role2] || 0);
};

/**
 * Get all permissions for a role
 */
export const getPermissionsForRole = (role) => {
  const permissions = [];
  
  for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
    if (allowedRoles.includes(role)) {
      permissions.push(permission);
    }
  }
  
  return permissions;
};