// utils/AppError.js se custom error class import karo
// (agar already bana rakha hai to path adjust kar lena)
import AppError from "../utils/AppError.js";

/**
 * Helper: Send standardized error response
 */
const sendError = (res, statusCode, message, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

/**
 * MongoDB Cast Error (Invalid ObjectId)
 */
const handleCastErrorDB = (err) => {
  return {
    statusCode: 400,
    message: `Invalid ${err.path}: ${err.value}`,
  };
};

/**
 * MongoDB Duplicate Key Error
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];

  return {
    statusCode: 400,
    message: `${field} already exists.`,
    errors: {
      [field]: `${value} is already in use`,
    },
  };
};

/**
 * Mongoose Validation Error
 */
const handleValidationErrorDB = (err) => {
  const errors = {};

  Object.values(err.errors).forEach((el) => {
    errors[el.path] = el.message;
  });

  return {
    statusCode: 400,
    message: "Validation failed",
    errors,
  };
};

/**
 * JWT Invalid Token
 */
const handleJWTError = () => ({
  statusCode: 401,
  message: "Session invalid. Please login again.",
});

/**
 * JWT Expired Token
 */
const handleJWTExpiredError = () => ({
  statusCode: 401,
  message: "Session expired. Please login again.",
});

/**
 * 🔥 Global Error Handler (Production Level)
 */
export const errorHandler = (err, req, res, next) => {
  let error = {
    statusCode: err.statusCode || 500,
    message: err.message || "Something went wrong. Please try again later.",
    errors: err.errors || null,
  };

  // Development Logging
  if (process.env.NODE_ENV === "development") {
    console.error("FULL ERROR DETAILS 💥", err);
  }

  /**
   * ✅ If custom AppError (Operational Error)
   * Directly send safe message to client
   */
  if (err instanceof AppError || err.isOperational) {
    return sendError(res, error.statusCode, error.message, error.errors);
  }

  /**
   * Handle Known Errors
   */

  // MongoDB Invalid ID
  if (err.name === "CastError") {
    error = handleCastErrorDB(err);
  }

  // MongoDB Duplicate Key
  else if (err.code === 11000) {
    error = handleDuplicateFieldsDB(err);
  }

  // Mongoose Validation Error
  else if (err.name === "ValidationError") {
    error = handleValidationErrorDB(err);
  }

  // JWT Errors
  else if (err.name === "JsonWebTokenError") {
    error = handleJWTError();
  }

  else if (err.name === "TokenExpiredError") {
    error = handleJWTExpiredError();
  }

  // Send Final Safe Response
  return sendError(res, error.statusCode, error.message, error.errors);
};

/**
 * 404 Not Found Handler
 */
export const notFound = (req, res) => {
  return sendError(res, 404, "The requested resource was not found.");
};