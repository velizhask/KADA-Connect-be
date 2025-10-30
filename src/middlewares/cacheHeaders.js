/**
 * Cache Headers Middleware
 * Adds proper caching headers to API responses for improved performance
 */

const { base64ResponseCache } = require('../services/base64ResponseCacheService');

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
    etag: useETag = true
  } = options;

  return (req, res, next) => {
    // Store original res.json method
    const originalJson = res.json;

    // Override res.json to add cache headers
    res.json = function(data) {
      // Add cache control header
      const cacheControl = [
        isPrivate ? 'private' : 'public',
        `max-age=${maxAge}`,
        'must-revalidate'
      ].join(', ');

      res.set('Cache-Control', cacheControl);

      // Add expires header for older browsers
      const expires = new Date();
      expires.setSeconds(expires.getSeconds() + maxAge);
      res.set('Expires', expires.toUTCString());

      // Add ETag if enabled and data is available
      if (useETag && data) {
        const eTag = base64ResponseCache.generateETag(data);
        res.set('ETag', eTag);

        // Handle If-None-Match for conditional requests
        const ifNoneMatch = req.get('If-None-Match');
        if (ifNoneMatch && ifNoneMatch === eTag) {
          return res.status(304).end();
        }
      }

      // Add Vary header to inform proxies about compression
      res.set('Vary', 'Accept-Encoding');

      // Add content encoding info for debugging
      res.set('X-Content-Encoding', res.get('Content-Encoding') || 'none');

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
  etag: true
});

/**
 * Middleware for list responses (students/companies)
 * Uses moderate cache time
 */
const listCacheHeaders = cacheHeaders({
  maxAge: 1 * 60 * 60, // 1 hour for lists
  private: false,
  etag: true
});

/**
 * Middleware for individual resource responses
 * Uses shorter cache time
 */
const resourceCacheHeaders = cacheHeaders({
  maxAge: 30 * 60, // 30 minutes for individual resources
  private: false,
  etag: true
});

/**
 * Middleware to disable caching for dynamic content
 */
const noCache = (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

/**
 * Middleware to add cache statistics headers
 */
const cacheStatsHeaders = (req, res, next) => {
  // Add cache stats for debugging
  const stats = base64ResponseCache.getStats();
  res.set('X-Cache-Stats', JSON.stringify({
    hitRate: Math.round(stats.hitRate * 100) / 100,
    cachedItems: stats.cache.keys,
    cacheSize: Math.round(stats.currentCacheSizeBytes / 1024) + 'KB'
  }));

  next();
};

module.exports = {
  cacheHeaders,
  base64CacheHeaders,
  listCacheHeaders,
  resourceCacheHeaders,
  noCache,
  cacheStatsHeaders
};