import dotenv from 'dotenv';
import { cleanEnv, str, port, num, bool, email, url } from 'envalid';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

// Validate and clean environment variables
export const env = cleanEnv(process.env, {
  // ==================== APPLICATION ====================
  NODE_ENV: str({
    choices: ['development', 'test', 'production'],
    default: 'development',
    desc: 'Application environment',
  }),
  
  PORT: port({
    default: 5000,
    desc: 'Server port number',
  }),
  
  APP_NAME: str({
    default: 'School Management System',
    desc: 'Application name',
  }),
  
  API_PREFIX: str({
    default: '/api/v1',
    desc: 'API route prefix',
  }),

  // ==================== DATABASE ====================
  MONGODB_URI: str({
    desc: 'MongoDB connection string',
    example: 'mongodb://localhost:27017/school_management',
  }),
  
  MONGODB_URI_PROD: str({
    default: '',
    desc: 'Production MongoDB connection string',
  }),

  // ==================== JWT TOKENS ====================
  JWT_SECRET: str({
    desc: 'Secret key for JWT access tokens',
    min: 32,
    example: 'your-super-secret-jwt-key-min-32-chars-long',
  }),
  
  JWT_REFRESH_SECRET: str({
    desc: 'Secret key for JWT refresh tokens',
    min: 32,
    example: 'your-different-refresh-secret-key-min-32-chars',
  }),
  
  JWT_ACCESS_EXPIRE: str({
    default: '15m',
    desc: 'Access token expiration time',
    example: '15m, 1h, 7d',
  }),
  
  JWT_REFRESH_EXPIRE: str({
    default: '7d',
    desc: 'Refresh token expiration time',
    example: '7d, 30d',
  }),

  // ==================== SECURITY ====================
  BCRYPT_ROUNDS: num({
    default: 12,
    desc: 'Number of bcrypt salt rounds',
    min: 8,
    max: 15,
  }),
  
  MAX_LOGIN_ATTEMPTS: num({
    default: 5,
    desc: 'Maximum failed login attempts before lockout',
    min: 1,
    max: 10,
  }),
  
  LOCK_TIME: num({
    default: 30,
    desc: 'Account lock time in minutes',
    min: 5,
    max: 1440, // 24 hours
  }),
  
  SESSION_EXPIRE: num({
    default: 30,
    desc: 'Session expiration in days',
    min: 1,
    max: 90,
  }),

  // ==================== CORS ====================
  CLIENT_URL: url({
    desc: 'Client application URL',
    example: 'http://localhost:3000',
  }),
  
  CLIENT_URL_PROD: url({
    default: '',
    desc: 'Production client URL',
  }),
  
  ALLOWED_ORIGINS: str({
    default: '',
    desc: 'Comma-separated list of allowed origins',
    example: 'http://localhost:3000,https://yourdomain.com',
  }),

  // ==================== RATE LIMITING ====================
  RATE_LIMIT_WINDOW: num({
    default: 15,
    desc: 'Rate limit window in minutes',
    min: 1,
    max: 60,
  }),
  
  RATE_LIMIT_MAX: num({
    default: 100,
    desc: 'Maximum requests per window',
    min: 1,
    max: 1000,
  }),
  
  RATE_LIMIT_MAX_AUTH: num({
    default: 5,
    desc: 'Maximum authentication attempts per window',
    min: 1,
    max: 20,
  }),

  // ==================== EMAIL CONFIGURATION ====================
  SMTP_HOST: str({
    default: '',
    desc: 'SMTP server host',
    example: 'smtp.gmail.com',
  }),
  
  SMTP_PORT: num({
    default: 587,
    desc: 'SMTP server port',
    min: 1,
    max: 65535,
  }),
  
  SMTP_USER: str({
    default: '',
    desc: 'SMTP username/email',
  }),
  
  SMTP_PASS: str({
    default: '',
    desc: 'SMTP password/app password',
  }),
  
  EMAIL_FROM: email({
    default: 'noreply@schoolmanagement.com',
    desc: 'From email address',
  }),

  // ==================== REDIS (Optional) ====================
  REDIS_HOST: str({
    default: 'localhost',
    desc: 'Redis host',
  }),
  
  REDIS_PORT: port({
    default: 6379,
    desc: 'Redis port',
  }),
  
  REDIS_PASSWORD: str({
    default: '',
    desc: 'Redis password',
  }),

  // ==================== FILE UPLOAD ====================
  MAX_FILE_SIZE: num({
    default: 5242880, // 5MB
    desc: 'Maximum file upload size in bytes',
    min: 1024,
    max: 10485760, // 10MB
  }),
  
  ALLOWED_FILE_TYPES: str({
    default: 'image/jpeg,image/png,image/jpg',
    desc: 'Comma-separated list of allowed MIME types',
  }),
  
  UPLOAD_PATH: str({
    default: 'uploads/',
    desc: 'File upload directory path',
  }),

  // ==================== LOGGING ====================
  LOG_LEVEL: str({
    choices: ['error', 'warn', 'info', 'http', 'debug'],
    default: 'debug',
    desc: 'Logging level',
  }),
  
  LOG_FILE_PATH: str({
    default: 'logs/app.log',
    desc: 'Log file path',
  }),

  // ==================== API KEYS ====================
  SMS_API_KEY: str({
    default: '',
    desc: 'SMS service API key',
  }),
  
  SMS_API_SECRET: str({
    default: '',
    desc: 'SMS service API secret',
  }),
  
  SMS_SENDER_ID: str({
    default: '',
    desc: 'SMS sender ID',
  }),

  // ==================== BACKUP ====================
  BACKUP_PATH: str({
    default: 'backups/',
    desc: 'Database backup path',
  }),
  
  BACKUP_RETENTION_DAYS: num({
    default: 7,
    desc: 'Number of days to keep backups',
    min: 1,
    max: 30,
  }),

  // ==================== FEATURE FLAGS ====================
  ENABLE_EMAIL_VERIFICATION: bool({
    default: true,
    desc: 'Enable email verification',
  }),
  
  ENABLE_SMS_NOTIFICATIONS: bool({
    default: false,
    desc: 'Enable SMS notifications',
  }),
  
  ENABLE_2FA: bool({
    default: false,
    desc: 'Enable two-factor authentication',
  }),

  // ==================== CACHE ====================
  CACHE_TTL: num({
    default: 300,
    desc: 'Cache TTL in seconds',
    min: 0,
    max: 86400,
  }),
  
  ENABLE_REDIS_CACHE: bool({
    default: false,
    desc: 'Enable Redis caching',
  }),
});

// ==================== DERIVED CONFIGURATIONS ====================

// CORS origins array
export const corsOrigins = (() => {
  const origins = [];
  
  if (env.CLIENT_URL) {
    origins.push(env.CLIENT_URL);
  }
  
  if (env.CLIENT_URL_PROD) {
    origins.push(env.CLIENT_URL_PROD);
  }
  
  if (env.ALLOWED_ORIGINS) {
    origins.push(...env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
  }
  
  // Add localhost for development
  if (env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000', 'http://localhost:5000');
  }
  
  return [...new Set(origins)]; // Remove duplicates
})();

// Database URI based on environment
export const dbUri = env.NODE_ENV === 'production' && env.MONGODB_URI_PROD
  ? env.MONGODB_URI_PROD
  : env.MONGODB_URI;

// File upload configuration
export const uploadConfig = {
  maxSize: env.MAX_FILE_SIZE,
  allowedTypes: env.ALLOWED_FILE_TYPES.split(',').map(t => t.trim()),
  path: env.UPLOAD_PATH,
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW * 60 * 1000,
  max: env.RATE_LIMIT_MAX,
  authMax: env.RATE_LIMIT_MAX_AUTH,
};

// JWT configuration
export const jwtConfig = {
  accessSecret: env.JWT_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessExpire: env.JWT_ACCESS_EXPIRE,
  refreshExpire: env.JWT_REFRESH_EXPIRE,
};

// Email configuration
export const emailConfig = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  from: env.EMAIL_FROM,
};

// ==================== EXPORT ALL CONFIGS ====================
export default {
  ...env,
  corsOrigins,
  dbUri,
  uploadConfig,
  rateLimitConfig,
  jwtConfig,
  emailConfig,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
};