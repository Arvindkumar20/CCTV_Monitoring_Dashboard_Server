import rateLimit from "express-rate-limit";
// Different limits for different routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts
  message: "Too many login attempts, please try again later in 15 minutes",
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // General API limit
  message: "Too many requests",
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Very strict for sensitive endpoints
  message: "You have exceeded hourly request limit",
});

// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // limit each IP to 100 requests
//     message: 'Too many requests from this IP, please try again later.',
//     standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//     legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// });

// Apply different limits
// app.use('/api/auth/login', authLimiter);
// app.use('/api/payments', strictLimiter);
// app.use('/api/', apiLimiter);
