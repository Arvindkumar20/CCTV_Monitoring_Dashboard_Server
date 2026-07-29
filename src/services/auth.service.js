import { User } from "../models/user.model.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.utils.js";
import { generateTokens, verifyToken } from "../utils/jwt.utils.js";
import AppError from "../utils/AppError.js";
import logger from "../config/logger.js";
import { env } from "../config/env.js";
import crypto from "crypto";
// import { sendEmail } from '../utils/email.utils.js';

class AuthService {
  /**
   * Register new user
   */
  async register(userData, ipAddress = null) {
    try {
      // Check existing user
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email.toLowerCase() },
          { mobile: userData.mobile },
        ],
      }).select("+password");

      if (existingUser) {
        if (existingUser.email === userData.email.toLowerCase()) {
          throw new AppError("Email already registered", 409);
        }
        if (existingUser.mobile === userData.mobile) {
          throw new AppError("Mobile number already registered", 409);
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");

      // Create user
      const user = await User.create({
        fullName: userData.fullName,
        email: userData.email.toLowerCase(),
        mobile: userData.mobile,
        password: hashedPassword,
        role: userData.role || "principal",
        emailVerificationToken: crypto
          .createHash("sha256")
          .update(emailVerificationToken)
          .digest("hex"),
        emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
        createdBy: userData.createdBy,
      });

      // Log registration
      logger.info(`User registered: ${user.email}`, {
        userId: user._id,
        ip: ipAddress,
      });

      // Send verification email (async, don't await)
      // this.sendVerificationEmail(user, emailVerificationToken).catch(err => {
      //   logger.error('Failed to send verification email', { error: err, userId: user._id });
      // });

      return user.profile;
    } catch (error) {
      logger.error("Registration error", {
        error: error.message,
        body: userData,
      });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(mobile, password, ipAddress = null, userAgent = null) {
    try {
      // Find user with sensitive fields
      const user = await User.findOne({ mobile }).select(
        "+password +loginAttempts +lockUntil +refreshToken +isActive +isEmailVerified",
      );

      if (!user) {
        throw new AppError("Invalid credentials", 401);
      }

      // Check account status
      if (!user.isActive) {
        throw new AppError("Account deactivated. Contact admin", 403);
      }

      // Check email verification (if required)
      if (env.NODE_ENV === "production" && !user.isEmailVerified) {
        throw new AppError("Please verify your email first", 403);
      }

      // Check account lock
      if (user.isLocked) {
        const lockTime = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
        throw new AppError(
          `Account locked. Try after ${lockTime} minutes`,
          423,
        );
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        // Increment login attempts
        await user.incrementLoginAttempts();

        const remainingAttempts = env.MAX_LOGIN_ATTEMPTS - user.loginAttempts;
        const message =
          remainingAttempts > 0
            ? `Invalid credentials. ${remainingAttempts} attempts left`
            : "Too many attempts. Account locked for 30 minutes";

        throw new AppError(message, 401);
      }

      // Reset login attempts on success
      await user.resetLoginAttempts();

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const tokens = generateTokens(user._id, user.role);

      // Store refresh token with device info
      const decoded = verifyToken(tokens.refreshToken, env.JWT_REFRESH_SECRET);
      await User.updateOne(
        { _id: user._id },
        {
          $set: { refreshToken: tokens.refreshToken },
          $push: {
            refreshTokens: {
              token: tokens.refreshToken,
              device: userAgent?.platform,
              os: userAgent?.os,
              browser: userAgent?.browser,
              ipAddress,
              expiresAt: new Date(decoded.exp * 1000),
            },
          },
        },
      );
      console.log(userAgent);
      // Log login
      logger.info(`User logged in: ${user.email}`, {
        userId: user._id,
        ip: ipAddress,
      });

      return {
        user: user.profile,
        tokens,
      };
    } catch (error) {
      logger.error("Login error", {
        error: error.message,
        mobile,
        ip: ipAddress,
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken, ipAddress = null) {
    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken, env.JWT_REFRESH_SECRET);

      if (!decoded) {
        throw new AppError("Invalid refresh token", 401);
      }

      // Find user with token
      const user = await User.findOne({
        _id: decoded.userId,
        "refreshTokens.token": refreshToken,
      }).select("+refreshToken +isActive");

      if (!user || !user.isActive) {
        throw new AppError("Invalid refresh token", 401);
      }

      // Remove old token
      user.refreshTokens = user.refreshTokens.filter(
        (t) => t.token !== refreshToken,
      );

      // Generate new tokens
      const tokens = generateTokens(user._id, user.role);

      // Add new token
      const newDecoded = verifyToken(
        tokens.refreshToken,
        env.JWT_REFRESH_SECRET,
      );
      user.refreshTokens.push({
        token: tokens.refreshToken,
        expiresAt: new Date(newDecoded.exp * 1000),
        ipAddress,
      });
      user.refreshToken = tokens.refreshToken;

      await user.save();

      return tokens;
    } catch (error) {
      logger.error("Refresh token error", { error: error.message });
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId, refreshToken = null) {
    try {
      const update = refreshToken
        ? { $pull: { refreshTokens: { token: refreshToken } } }
        : { $set: { refreshTokens: [], refreshToken: null } };

      await User.findByIdAndUpdate(userId, update);

      logger.info(`User logged out`, { userId });
    } catch (error) {
      logger.error("Logout error", { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    try {
      await User.findByIdAndUpdate(userId, {
        $set: { refreshTokens: [], refreshToken: null },
      });

      logger.info(`User logged out from all devices`, { userId });
    } catch (error) {
      logger.error("Logout all error", { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user.profile;
  }

  /**
   * Update profile
   */
  async updateProfile(userId, updateData) {
    const restrictedFields = [
      "password",
      "role",
      "isActive",
      "loginAttempts",
      "lockUntil",
      "refreshToken",
      "refreshTokens",
      "emailVerificationToken",
      "passwordResetToken",
    ];

    // Remove restricted fields
    restrictedFields.forEach((field) => delete updateData[field]);

    // Check email/mobile uniqueness
    if (updateData.email || updateData.mobile) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          ...(updateData.email
            ? [{ email: updateData.email.toLowerCase() }]
            : []),
          ...(updateData.mobile ? [{ mobile: updateData.mobile }] : []),
        ],
      });

      if (existingUser) {
        if (existingUser.email === updateData.email?.toLowerCase()) {
          throw new AppError("Email already in use", 409);
        }
        if (existingUser.mobile === updateData.mobile) {
          throw new AppError("Mobile already in use", 409);
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { ...updateData, updatedBy: userId },
      { new: true, runValidators: true },
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    logger.info(`Profile updated`, { userId });

    return user.profile;
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      throw new AppError("Current password is incorrect", 401);
    }

    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    user.refreshTokens = []; // Invalidate all sessions
    user.refreshToken = null;
    await user.save();

    logger.info(`Password changed`, { userId });
  }

  /**
   * Forgot password
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send email
    const resetURL = `${env.CLIENT_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        template: "passwordReset",
        context: {
          name: user.fullName,
          resetURL,
          expiresIn: "10 minutes",
        },
      });
    } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      throw new AppError("Failed to send reset email", 500);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Invalidate all sessions
    user.refreshToken = null;
    await user.save();

    logger.info(`Password reset successful`, { userId: user._id });
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError("Invalid or expired verification token", 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    logger.info(`Email verified`, { userId: user._id });
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.isEmailVerified) {
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // Send email
    const verifyURL = `${env.CLIENT_URL}/verify-email/${verificationToken}`;

    await sendEmail({
      email: user.email,
      subject: "Email Verification",
      template: "emailVerification",
      context: {
        name: user.fullName,
        verifyURL,
        expiresIn: "24 hours",
      },
    });
  }

  /**
   * Admin: Get all users
   */
  async getAllUsers(options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = -1,
      role,
      isActive,
      search,
    } = options;

    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    const sort = { [sortBy]: sortOrder };
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    return {
      users: users.map((u) => ({
        id: u._id,
        fullName: u.fullName,
        email: u.email,
        mobile: u.mobile,
        role: u.role,
        isActive: u.isActive,
        isEmailVerified: u.isEmailVerified,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Admin: Update user
   */
  async adminUpdateUser(userId, updateData, adminId) {
    const allowedUpdates = ["role", "isActive", "isEmailVerified"];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    updates.updatedBy = adminId;

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    logger.info(`Admin updated user`, {
      adminId,
      targetUserId: userId,
      updates,
    });

    return user.profile;
  }

  /**
   * Admin: Delete user (soft delete by deactivating)
   */
  async deleteUser(userId, adminId) {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isActive: false,
        refreshTokens: [],
        refreshToken: null,
        updatedBy: adminId,
      },
      { new: true },
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    logger.info(`User deactivated`, { adminId, targetUserId: userId });

    return { message: "User deactivated successfully" };
  }

  /**
   * Private: Send verification email
   */
  //   async sendVerificationEmail(user, token) {
  //     const verifyURL = `${env.CLIENT_URL}/verify-email/${token}`;

  //     await sendEmail({
  //       email: user.email,
  //       subject: 'Welcome - Verify Your Email',
  //       template: 'welcome',
  //       context: {
  //         name: user.fullName,
  //         verifyURL,
  //         expiresIn: '24 hours',
  //       },
  //     });
  //   }
}

export const authService = new AuthService();
