/**
 * Cache Headers Middleware
 * Adds proper caching headers to API responses for improved performance
 */

const { responseCache } = require("../services/responseCacheService");

/**
 * Middleware to add cache headers to API responses
 * @param {Object} options - Configuration options
 * @param {number} options.maxAge - Maximum age in seconds (default: 2 hours)
 * @param {boolean} options.private - Whether response is private (default: false)
 * @param {boolean} options.etag - Whether to add ETag header (default: true)
 */
const cacheHeaders = (options = {}) => {
  const {
    maxAge = 2 * 60 * 60, // 2 hours default
    private: isPrivate = false,
    etag: useETag = true,
  } = options;

  return (req, res, next) => {
    // Store original res.json method
    const originalJson = res.json;

    // Override res.json to add cache headers
    res.json = function (data) {
      // Add cache control header
      const cacheControl = [
        isPrivate ? "private" : "public",
        `max-age=${maxAge}`,
        "must-revalidate",
      ].join(", ");

      res.set("Cache-Control", cacheControl);

      // Add expires header for older browsers
      const expires = new Date();
      expires.setSeconds(expires.getSeconds() + maxAge);
      res.set("Expires", expires.toUTCString());

      // Add ETag if enabled and data is available
      if (useETag && data) {
        const eTag = responseCache.generateETag(data);
        res.set("ETag", eTag);

        // Handle If-None-Match for conditional requests
        const ifNoneMatch = req.get("If-None-Match");
        if (ifNoneMatch && ifNoneMatch === eTag) {
          return res.status(304).end();
        }
      }

      // Add Vary header to inform proxies about compression
      res.set("Vary", "Accept-Encoding");

      // Add content encoding info for debugging
      res.set("X-Content-Encoding", res.get("Content-Encoding") || "none");

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware specifically for API responses with base64 data
 * Uses longer cache times for base64 content
 */
const base64CacheHeaders = cacheHeaders({
  maxAge: 4 * 60 * 60, // 4 hours for base64 data
  private: false,
  etag: true,
});

/**
 * Middleware for static lookup data (industries, majors, universities)
 * Uses very long cache time for rarely changing data
 */
const staticCacheHeaders = cacheHeaders({
  maxAge: 24 * 60 * 60, // 24 hours for static lookup data
  private: false,
  etag: true,
});

/**
 * Middleware for popular endpoints (aggregation queries)
 * Uses long cache time for computed popular data
 */
const popularCacheHeaders = cacheHeaders({
  maxAge: 12 * 60 * 60, // 12 hours for popular endpoints
  private: false,
  etag: true,
});

/**
 * Middleware for list responses (students/companies)
 * Uses extended cache time for filtered lists
 */
const listCacheHeaders = cacheHeaders({
  maxAge: 6 * 60 * 60, // 6 hours for lists (increased from 1 hour)
  private: false,
  etag: true,
});

/**
 * Middleware for individual resource responses
 * Uses moderate cache time
 */
const resourceCacheHeaders = cacheHeaders({
  maxAge: 2 * 60 * 60, // 2 hours for individual resources (increased from 30 mins)
  private: false,
  etag: true,
});

/**
 * Middleware to disable caching for dynamic content
 */
const noCache = (req, res, next) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
};

/**
 * Middleware to add cache statistics headers
 */
const cacheStatsHeaders = (req, res, next) => {
  // Add cache stats for debugging
  const stats = responseCache.getStats();
  res.set(
    "X-Cache-Stats",
    JSON.stringify({
      hitRate: Math.round(stats.hitRate * 100) / 100,
      cachedItems: stats.cache.keys,
      cacheSize: Math.round(stats.currentCacheSizeBytes / 1024) + "KB",
    })
  );

  next();
};

module.exports = {
  cacheHeaders,
  base64CacheHeaders,
  staticCacheHeaders,
  popularCacheHeaders,
  listCacheHeaders,
  resourceCacheHeaders,
  noCache,
  cacheStatsHeaders,
};
