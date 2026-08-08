// Simple in-memory rate limiter middleware for sensitive endpoints (delete/restore account)
const rateLimitMap = new Map();

/**
 * Creates a rate limiting middleware.
 * @param {number} maxHits - Maximum allowed requests per window
 * @param {number} windowMs - Window duration in milliseconds
 */
function rateLimiter(maxHits = 5, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const key = `${req.ip}_${req.baseUrl}${req.path}`;
    const now = Date.now();

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { hits: 1, resetAt: now + windowMs });
      return next();
    }

    const record = rateLimitMap.get(key);

    if (now > record.resetAt) {
      rateLimitMap.set(key, { hits: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.hits >= maxHits) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
      });
    }

    record.hits += 1;
    next();
  };
}

module.exports = { rateLimiter };
