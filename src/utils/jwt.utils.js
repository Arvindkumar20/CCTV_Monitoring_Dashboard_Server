import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

/**
 * Generate access and refresh tokens
 */
export const generateTokens = (userId, role, sessionId = null) => {
  try {
    const payload = { 
      userId, 
      role,
      sessionId: sessionId || crypto.randomBytes(16).toString('hex'),
    };

    // Access token - short lived
    const accessToken = jwt.sign(
      payload,
      env.JWT_SECRET,
      { 
        expiresIn: env.JWT_ACCESS_EXPIRE,
        audience: 'your-app-audience',
        issuer: 'your-app-issuer',
      }
    );

    // Refresh token - long lived
    const refreshToken = jwt.sign(
      payload,
      env.JWT_REFRESH_SECRET,
      { 
        expiresIn: env.JWT_REFRESH_EXPIRE,
        audience: 'your-app-audience',
        issuer: 'your-app-issuer',
      }
    );

    return { accessToken, refreshToken, sessionId: payload.sessionId };
  } catch (error) {
    logger.error('Token generation error', { error: error.message, userId });
    throw new Error('Failed to generate tokens');
  }
};

/**
 * Verify JWT token
 */
export const verifyToken = (token, secret = env.JWT_SECRET) => {
  try {
    const decoded = jwt.verify(token, secret, {
      audience: 'your-app-audience',
      issuer: 'your-app-issuer',
    });
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Token expired');
      return null;
    }
    if (error.name === 'JsonWebTokenError') {
      logger.debug('Invalid token', { error: error.message });
      return null;
    }
    
    logger.error('Token verification error', { error: error.message });
    return null;
  }
};

/**
 * Decode token without verification
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Set token cookies in response
 */
export const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'strict' : 'lax';

  // Access token cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
    domain: isProduction ? '.yourdomain.com' : undefined,
  });

  // Refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh-token', // Only sent to refresh endpoint
    domain: isProduction ? '.yourdomain.com' : undefined,
  });

  // Optional: Non-httpOnly token for client-side (if needed)
  if (!isProduction) {
    res.cookie('accessTokenClient', accessToken, {
      httpOnly: false,
      secure: false,
      sameSite,
      maxAge: 15 * 60 * 1000,
    });
  }
};

/**
 * Clear token cookies
 */
export const clearTokenCookies = (res) => {
  const isProduction = env.NODE_ENV === 'production';

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    path: '/',
    domain: isProduction ? '.yourdomain.com' : undefined,
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    path: '/api/auth/refresh-token',
    domain: isProduction ? '.yourdomain.com' : undefined,
  });

  res.clearCookie('accessTokenClient', {
    httpOnly: false,
    secure: false,
    path: '/',
  });
};

/**
 * Extract token from request
 */
export const extractToken = (req) => {
  // Check cookies first
  let token = req.cookies?.accessToken;
  
  // Check Authorization header
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }
  }

  // Check query params (less secure, but sometimes needed)
  if (!token && req.query?.token) {
    token = req.query.token;
  }

  return token;
};

/**
 * Refresh token validation
 */
export const isValidRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    return !!decoded;
  } catch {
    return false;
  }
};

/**
 * Get token expiration time
 */
export const getTokenExpiry = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  } catch {
    return null;
  }
};