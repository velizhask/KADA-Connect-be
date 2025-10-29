/**
 * Simple Rate Limiting Middleware
 * Protects endpoints from abuse by limiting request frequency
 */

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    this.maxRequests = options.maxRequests || 100; // Limit each IP to 100 requests per windowMs
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.message = options.message || 'Too many requests, please try again later.';

    // Store requests by IP address
    this.requests = new Map();

    // Clean up old entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.windowMs);
  }

  /**
   * Clean up old request records
   */
  cleanup() {
    const now = Date.now();
    for (const [ip, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp =>
        now - timestamp < this.windowMs
      );

      if (validRequests.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, validRequests);
      }
    }
  }

  /**
   * Middleware function to check rate limits
   */
  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      const now = Date.now();

      // Get existing requests for this IP
      let ipRequests = this.requests.get(ip) || [];

      // Filter out old requests outside the window
      ipRequests = ipRequests.filter(timestamp =>
        now - timestamp < this.windowMs
      );

      // Check if limit exceeded
      if (ipRequests.length >= this.maxRequests) {
        const resetTime = Math.ceil((ipRequests[0] + this.windowMs - now) / 1000);

        return res.status(429).json({
          error: 'Too Many Requests',
          message: this.message,
          retryAfter: resetTime,
          limit: this.maxRequests,
          windowMs: this.windowMs
        });
      }

      // Add current request timestamp
      ipRequests.push(now);
      this.requests.set(ip, ipRequests);

      // Add rate limit headers to response
      res.set({
        'X-RateLimit-Limit': this.maxRequests,
        'X-RateLimit-Remaining': Math.max(0, this.maxRequests - ipRequests.length),
        'X-RateLimit-Reset': new Date(now + this.windowMs).toISOString()
      });

      next();
    };
  }

  /**
   * Destroy the rate limiter and clean up interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Create different rate limiters for different use cases
const createRateLimiter = (options) => new RateLimiter(options);

// Pre-configured limiters
const defaultLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again in 15 minutes.'
});

const imageProxyLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 300, // 300 requests per 15 minutes (generous for multi-page galleries)
  message: 'Too many image proxy requests from this IP, please try again in 15 minutes.'
});

const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 200, // 200 requests per 15 minutes (more lenient for general API)
  message: 'Too many API requests from this IP, please try again in 15 minutes.'
});

module.exports = {
  RateLimiter,
  createRateLimiter,
  defaultLimiter,
  imageProxyLimiter,
  apiLimiter
};