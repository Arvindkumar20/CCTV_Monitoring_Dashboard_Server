import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Custom format for files (no colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.uncolorize(),
  winston.format.json(),
  winston.format.printf(
    (info) => JSON.stringify({
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      ...(info.metadata && { metadata: info.metadata }),
    })
  ),
);

// Define which transports to use based on environment
const getTransports = () => {
  const transports = [];

  // Console transport for all environments
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: env.LOG_LEVEL || 'debug',
    })
  );

  // File transports for production
  if (env.NODE_ENV === 'production') {
    // Error log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true,
      })
    );

    // Combined log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true,
      })
    );

    // HTTP requests log file (optional)
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'http.log'),
        level: 'http',
        format: fileFormat,
        maxsize: 5242880,
        maxFiles: 3,
      })
    );
  } else {
    // Development: Also log to file for debugging
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'dev.log'),
        format: fileFormat,
        maxsize: 5242880,
        maxFiles: 2,
      })
    );
  }

  return transports;
};

// Create the logger
const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'debug',
  levels,
  transports: getTransports(),
  // Don't exit on error
  exitOnError: false,
});

// Stream for Morgan HTTP logger
export const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Custom logging methods with metadata support
export default {
  error: (message, metadata = {}) => {
    logger.error(message, { metadata });
  },
  
  warn: (message, metadata = {}) => {
    logger.warn(message, { metadata });
  },
  
  info: (message, metadata = {}) => {
    logger.info(message, { metadata });
  },
  
  http: (message, metadata = {}) => {
    logger.http(message, { metadata });
  },
  
  debug: (message, metadata = {}) => {
    logger.debug(message, { metadata });
  },

  // Log with custom level
  log: (level, message, metadata = {}) => {
    logger.log(level, message, { metadata });
  },

  // Log API request
  logRequest: (req, metadata = {}) => {
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.userId || 'unauthenticated',
      ...metadata,
    };

    logger.http(`${req.method} ${req.originalUrl}`, { metadata: logData });
  },

  // Log API response
  logResponse: (req, res, responseTime, metadata = {}) => {
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.userId || 'unauthenticated',
      ...metadata,
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode}`, { metadata: logData });
  },

  // Log database operations
  logDB: (operation, collection, metadata = {}) => {
    logger.debug(`DB ${operation} on ${collection}`, { metadata: { operation, collection, ...metadata } });
  },

  // Log authentication events
  logAuth: (action, userId, metadata = {}) => {
    logger.info(`Auth: ${action}`, { metadata: { action, userId, ...metadata } });
  },

  // Log security events
  logSecurity: (event, metadata = {}) => {
    logger.warn(`Security: ${event}`, { metadata: { event, ...metadata } });
  },

  // Log with child logger (for module-specific logging)
  child: (options) => {
    return {
      error: (message, metadata = {}) => logger.error(message, { metadata: { ...options, ...metadata } }),
      warn: (message, metadata = {}) => logger.warn(message, { metadata: { ...options, ...metadata } }),
      info: (message, metadata = {}) => logger.info(message, { metadata: { ...options, ...metadata } }),
      debug: (message, metadata = {}) => logger.debug(message, { metadata: { ...options, ...metadata } }),
    };
  },

  // Get all logs (for admin/debug purposes)
  getLogs: async (options = {}) => {
    const { level = 'error', limit = 100, from, to } = options;
    
    // This is a simple implementation - in production you might want
    // to use a log management service like ELK, Datadog, etc.
    try {
      const logFile = path.join(logsDir, `${level}.log`);
      if (!fs.existsSync(logFile)) {
        return [];
      }

      const logs = fs.readFileSync(logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line };
          }
        });

      // Filter by date if provided
      let filteredLogs = logs;
      if (from) {
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(from));
      }
      if (to) {
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(to));
      }

      return filteredLogs.slice(-limit);
    } catch (error) {
      logger.error('Failed to read logs', { error: error.message });
      return [];
    }
  },

  // Clear old logs
  clearOldLogs: (daysToKeep = 7) => {
    try {
      const files = fs.readdirSync(logsDir);
      const now = Date.now();

      files.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

        if (fileAge > daysToKeep) {
          fs.unlinkSync(filePath);
          logger.info(`Deleted old log file: ${file}`);
        }
      });
    } catch (error) {
      logger.error('Failed to clear old logs', { error: error.message });
    }
  },
};

// Performance monitoring
export const performanceLogger = {
  start: (label) => {
    const start = process.hrtime();
    return {
      end: (metadata = {}) => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
        logger.debug(`Performance: ${label}`, { metadata: { ...metadata, duration: `${duration.toFixed(2)}ms` } });
        return duration;
      },
    };
  },
};

// Audit logger for compliance
export const auditLogger = {
  log: (action, userId, resource, metadata = {}) => {
    const auditData = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      resource,
      ...metadata,
    };

    // Write to audit log file
    const auditPath = path.join(logsDir, 'audit.log');
    fs.appendFileSync(auditPath, JSON.stringify(auditData) + '\n');

    // Also log to main logger
    logger.info(`AUDIT: ${action}`, { metadata: auditData });
  },

  // Get audit trail for user
  getUserAuditTrail: (userId, limit = 100) => {
    try {
      const auditPath = path.join(logsDir, 'audit.log');
      if (!fs.existsSync(auditPath)) {
        return [];
      }

      const logs = fs.readFileSync(auditPath, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .filter(log => log.userId === userId)
        .slice(-limit);

      return logs;
    } catch (error) {
      logger.error('Failed to get audit trail', { error: error.message });
      return [];
    }
  },
};

// Schedule log cleanup (run daily in production)
if (env.NODE_ENV === 'production') {
  setInterval(() => {
    logger.clearOldLogs(7); // Keep logs for 7 days
  }, 24 * 60 * 60 * 1000); // Run every 24 hours
}