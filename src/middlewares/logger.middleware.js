import morgan from 'morgan';
import logger, { stream } from '../config/logger.js';
import { env } from '../config/env.js';

// Morgan token for custom logging
morgan.token('userId', (req) => {
  return req.user?.userId || 'guest';
});

morgan.token('userRole', (req) => {
  return req.user?.role || 'none';
});

morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    // Don't log passwords
    const body = { ...req.body };
    if (body.password) body.password = '[REDACTED]';
    if (body.currentPassword) body.currentPassword = '[REDACTED]';
    if (body.newPassword) body.newPassword = '[REDACTED]';
    return JSON.stringify(body);
  }
  return '';
});

// Development format
const devFormat = ':method :url :status :response-time ms - :userId(:userRole)';

// Production format with more details
const prodFormat = JSON.stringify({
  timestamp: ':date[iso]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time ms',
  contentLength: ':res[content-length]',
  userId: ':userId',
  userRole: ':userRole',
  userAgent: ':user-agent',
  ip: ':remote-addr',
});

// Morgan middleware
export const requestLogger = morgan(
  env.NODE_ENV === 'production' ? prodFormat : devFormat,
  { stream }
);

// Detailed request/response logger
export const detailedLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.logRequest(req);

  // Log response when finished
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    logger.logResponse(req, res, responseTime);
  });

  next();
};

// Error logger
export const errorLogger = (err, req, res, next) => {
  const errorData = {
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.userId,
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params,
  };

  // Don't log passwords
  if (errorData.body?.password) errorData.body.password = '[REDACTED]';

  logger.error(`Error: ${err.message}`, errorData);

  next(err);
};