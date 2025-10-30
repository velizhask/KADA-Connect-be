/**
 * Base64 Response Cache Service
 * Handles server-side caching of base64 data responses from database queries
 * to improve performance and reduce database load
 */

const NodeCache = require('node-cache');
const crypto = require('crypto');

class Base64ResponseCacheService {
  constructor(options = {}) {
    // Cache for base64 responses (2 hour TTL)
    this.responseCache = new NodeCache({
      stdTTL: 2 * 60 * 60, // 2 hours in seconds
      checkperiod: 30 * 60, // Check for expired keys every 30 minutes
      useClones: false, // Better performance for large base64 data
      maxKeys: 500 // Maximum number of cached responses
    });

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      totalCached: 0
    };

    // Maximum cache size in bytes (200MB for base64 responses)
    this.maxCacheSize = options.maxCacheSize || 200 * 1024 * 1024;
    this.currentCacheSize = 0;

    // Listen to cache events to track size
    this.responseCache.on('set', (key, value) => {
      this.currentCacheSize += this._getResponseSize(value);
      this.stats.totalCached++;
      this._enforceMaxCacheSize();
    });

    this.responseCache.on('del', (key, value) => {
      this.currentCacheSize -= this._getResponseSize(value);
      this.stats.totalCached--;
    });

    this.responseCache.on('expired', (key, value) => {
      this.currentCacheSize -= this._getResponseSize(value);
      this.stats.totalCached--;
    });
  }

  /**
   * Generate cache key for base64 response
   * Format: "student:id:profilePhoto" or "company:id:logo"
   */
  _generateResponseKey(entityType, entityId, fieldName) {
    return `${entityType}:${entityId}:${fieldName}`;
  }

  /**
   * Generate cache key for list responses
   * Format: "students:hash(filters)" or "companies:hash(filters)"
   */
  _generateListKey(entityType, filters = {}) {
    const filterString = JSON.stringify(filters);
    const hash = crypto.createHash('md5').update(filterString).digest('hex').substring(0, 8);
    return `${entityType}:list:${hash}`;
  }

  /**
   * Estimate size of cached response data
   */
  _getResponseSize(responseData) {
    if (typeof responseData === 'string') {
      return responseData.length;
    } else if (responseData && typeof responseData === 'object') {
      return JSON.stringify(responseData).length;
    }
    return 0;
  }

  /**
   * Enforce maximum cache size by removing least recently used items
   */
  _enforceMaxCacheSize() {
    if (this.currentCacheSize > this.maxCacheSize) {
      const keys = this.responseCache.keys();
      const targetSize = this.maxCacheSize * 0.8; // Reduce to 80% of max

      while (this.currentCacheSize > targetSize && keys.length > 0) {
        const oldestKey = keys.shift();
        const value = this.responseCache.get(oldestKey);
        if (value) {
          this.responseCache.del(oldestKey);
        }
      }
    }
  }

  /**
   * Store base64 response data in cache
   */
  setResponse(entityType, entityId, fieldName, base64Data) {
    const key = this._generateResponseKey(entityType, entityId, fieldName);
    const cacheData = {
      data: base64Data,
      timestamp: Date.now(),
      entityType,
      entityId,
      fieldName
    };

    this.responseCache.set(key, cacheData);
    return cacheData;
  }

  /**
   * Get base64 response data from cache
   */
  getResponse(entityType, entityId, fieldName) {
    const key = this._generateResponseKey(entityType, entityId, fieldName);
    const cached = this.responseCache.get(key);

    if (cached) {
      this.stats.hits++;
      return cached.data;
    } else {
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Store list response with base64 data in cache
   */
  setListResponse(entityType, filters, responseData) {
    const key = this._generateListKey(entityType, filters);
    const cacheData = {
      data: responseData,
      timestamp: Date.now(),
      entityType,
      filters
    };

    this.responseCache.set(key, cacheData);
    return cacheData;
  }

  /**
   * Get list response from cache
   */
  getListResponse(entityType, filters) {
    const key = this._generateListKey(entityType, filters);
    const cached = this.responseCache.get(key);

    if (cached) {
      this.stats.hits++;
      return cached.data;
    } else {
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Generate ETag for cached response
   */
  generateETag(data) {
    const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    return `"${hash.substring(0, 16)}"`; // Shorter ETag for efficiency
  }

  /**
   * Cache response with full metadata for API responses
   */
  setAPIResponse(endpointKey, params, responseData) {
    const paramString = JSON.stringify(params);
    const hash = crypto.createHash('md5').update(paramString).digest('hex').substring(0, 8);
    const key = `api:${endpointKey}:${hash}`;

    const cacheData = {
      data: responseData,
      timestamp: Date.now(),
      endpoint: endpointKey,
      params,
      eTag: this.generateETag(responseData)
    };

    this.responseCache.set(key, cacheData);
    return cacheData;
  }

  /**
   * Get cached API response
   */
  getAPIResponse(endpointKey, params) {
    const paramString = JSON.stringify(params);
    const hash = crypto.createHash('md5').update(paramString).digest('hex').substring(0, 8);
    const key = `api:${endpointKey}:${hash}`;

    const cached = this.responseCache.get(key);

    if (cached) {
      this.stats.hits++;
      return cached;
    } else {
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const cacheStats = this.responseCache.getStats();

    return {
      ...this.stats,
      cache: {
        keys: cacheStats.keys,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        ksize: cacheStats.ksize,
        vsize: cacheStats.vsize
      },
      currentCacheSizeBytes: this.currentCacheSize,
      maxCacheSizeBytes: this.maxCacheSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.responseCache.flushAll();
    this.currentCacheSize = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      totalCached: 0
    };
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    this.responseCache.flushExpired();
  }

  /**
   * Destroy cache service
   */
  destroy() {
    this.responseCache.close();
    this.currentCacheSize = 0;
  }
}

// Create singleton instance
const base64ResponseCache = new Base64ResponseCacheService();

module.exports = {
  Base64ResponseCacheService,
  base64ResponseCache
};