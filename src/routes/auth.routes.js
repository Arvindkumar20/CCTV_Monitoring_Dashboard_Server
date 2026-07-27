import express from 'express';
import { 
  register, 
  login, 
  refreshToken, 
  logout, 
  getProfile,
  updateProfile,
  changePassword
} from '../controllers/auth.controller.js';
import { 
  registerValidation, 
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
} from '../validations/auth.validation.js';
import { validate } from '../middlewares/validation.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes with validation
router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);

// Protected routes (all routes below this will require authentication)
router.post('/refresh-token', refreshToken);
router.use(authenticate);
router.get('/profile', getProfile);
router.patch('/profile', validate(updateProfileValidation), updateProfile);
router.post('/change-password', validate(changePasswordValidation), changePassword);
router.post('/logout', logout);

export default router;