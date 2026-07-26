import { validationResult } from "express-validator";
import AppError from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Method 1: Validation using next() + Global Error Handler (Recommended)
 */
export const validate = (validations) => {
  return asyncHandler(async (req, res, next) => {
  console.log(req.body);

    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const formattedErrors = {};
    errors.array().forEach((error) => {
      formattedErrors[error.path] = error.msg;
    });

    // ✅ Pass errors directly in constructor
    return next(
      new AppError("Validation failed", 400, formattedErrors)
    );
  });
};

/**
 * Method 2: Direct Response (Without Global Error Handler)
 * Use only if you don't want centralized error handling
 */
export const validateWithResponse = (validations) => {
  return async (req, res, next) => {
    try {
      await Promise.all(validations.map((validation) => validation.run(req)));

      const errors = validationResult(req);

      if (errors.isEmpty()) {
        return next();
      }

      const formattedErrors = {};
      errors.array().forEach((error) => {
        formattedErrors[error.path] = error.msg;
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formattedErrors,
      });
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Method 3: Custom Validation (Zod / Joi / Other Schema Validators)
 */
export const validateCustom = (schema) => {
  return asyncHandler(async (req, res, next) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (err) {
      const formattedErrors = {};

      // Zod format
      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach((e) => {
          const field = e.path?.join(".") || "field";
          formattedErrors[field] = e.message;
        });
      }

      return next(
        new AppError("Validation failed", 400, formattedErrors)
      );
    }
  });
};