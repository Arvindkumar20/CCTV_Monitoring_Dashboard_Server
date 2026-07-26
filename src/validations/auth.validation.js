// validations/auth.validation.js
import { body } from 'express-validator';
import { User } from '../models/user.model.js';

export const registerValidation = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 3, max: 50 }).withMessage('Full name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Full name can only contain letters and spaces'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail()
    .custom(async (email) => {
      // You can add async validation here if needed

      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        throw new Error('Email already in use');
      }
      return true;
    }),

  body('mobile')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit mobile number')
    .custom(async (mobile) => {

      const user = await User.findOne({ mobile });
      if (user) {
        throw new Error('Mobile number already registered');
      }
      return true;
    }),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

//   body('confirmPassword')
//     .notEmpty().withMessage('Please confirm your password')
//     .custom((value, { req }) => value === req.body.password)
//     .withMessage('Passwords do not match'),

  body('role')
    .optional()
    .isIn(['admin', 'principal', 'teacher', 'security']).withMessage('Invalid role selected')
];

export const loginValidation = [
  body('mobile')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit mobile number'),

  body('password')
    .notEmpty().withMessage('Password is required')
];

export const updateProfileValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Full name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Full name can only contain letters and spaces'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail()
    .custom(async (email, { req }) => {

      const user = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.user.userId }
      });
      if (user) {
        throw new Error('Email already in use by another account');
      }
      return true;
    }),

  body('mobile')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit mobile number')
    .custom(async (mobile, { req }) => {

      const user = await User.findOne({ 
        mobile,
        _id: { $ne: req.user.userId }
      });
      if (user) {
        throw new Error('Mobile number already in use by another account');
      }
      return true;
    })
];

export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password'),

];