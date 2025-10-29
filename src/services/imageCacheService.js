/**
 * Image Cache Service
 * Handles server-side caching of images and Google Drive API responses
 * to improve performance and reduce external API calls
 */

const NodeCache = require('node-cache');
const crypto = require('crypto');

class ImageCacheService {
  constructor(options = {}) {
    // Cache for images (24 hour TTL)
    this.imageCache = new NodeCache({
      stdTTL: 24 * 60 * 60, // 24 hours in seconds
      checkperiod: 60 * 60, // Check for expired keys every hour
      useClones: false, // Better performance for large images
      maxKeys: 1000 // Maximum number of cached images
    });

    // Cache for Google Drive API responses (1 hour TTL)
    this.apiCache = new NodeCache({
      stdTTL: 60 * 60, // 1 hour in seconds
      checkperiod: 10 * 60, // Check for expired keys every 10 minutes
      useClones: true,
      maxKeys: 500 // Maximum number of cached API responses
    });

    // Cache statistics
    this.stats = {
      imageHits: 0,
      imageMisses: 0,
      apiHits: 0,
      apiMisses: 0
    };

    // Maximum cache size in bytes (500MB)
    this.maxCacheSize = options.maxCacheSize || 500 * 1024 * 1024;
    this.currentCacheSize = 0;

    // Listen to cache events to track size
    this.imageCache.on('set', (key, value) => {
      this.currentCacheSize += this._getImageSize(value);
      this._enforceMaxCacheSize();
    });

    this.imageCache.on('del', (key, value) => {
      this.currentCacheSize -= this._getImageSize(value);
    });

    this.imageCache.on('expired', (key, value) => {
      this.currentCacheSize -= this._getImageSize(value);
    });
  }

  /**
   * Generate cache key for an image URL
   */
  _generateImageKey(imageUrl) {
    return crypto.createHash('md5').update(imageUrl).digest('hex');
  }

  /**
   * Generate cache key for Google Drive API response
   */
  _generateAPIKey(fileId) {
    return `gdrive_${fileId}`;
  }

  /**
   * Estimate size of cached image data
   */
  _getImageSize(imageData) {
    if (Buffer.isBuffer(imageData.data)) {
      return imageData.data.length;
    } else if (typeof imageData.data === 'string') {
      return imageData.data.length;
    }
    return 0;
  }

  /**
   * Enforce maximum cache size by removing least recently used items
   */
  _enforceMaxCacheSize() {
    if (this.currentCacheSize > this.maxCacheSize) {
      const keys = this.imageCache.keys();
      const targetSize = this.maxCacheSize * 0.8; // Reduce to 80% of max

      while (this.currentCacheSize > targetSize && keys.length > 0) {
        const oldestKey = keys.shift();
        const value = this.imageCache.get(oldestKey);
        if (value) {
          this.imageCache.del(oldestKey);
        }
      }
    }
  }

  /**
   * Store image data in cache
   */
  setImage(imageUrl, imageData, contentType, eTag) {
    const key = this._generateImageKey(imageUrl);
    const cacheData = {
      data: imageData,
      contentType: contentType,
      eTag: eTag || this._generateETag(imageData),
      timestamp: Date.now(),
      originalUrl: imageUrl
    };

    this.imageCache.set(key, cacheData);
    return cacheData;
  }

  /**
   * Get image data from cache
   */
  getImage(imageUrl) {
    const key = this._generateImageKey(imageUrl);
    const cached = this.imageCache.get(key);

    if (cached) {
      this.stats.imageHits++;
      return cached;
    } else {
      this.stats.imageMisses++;
      return null;
    }
  }

  /**
   * Store Google Drive API response in cache
   */
  setAPIData(fileId, apiResponse) {
    const key = this._generateAPIKey(fileId);
    this.apiCache.set(key, apiResponse);
  }

  /**
   * Get Google Drive API response from cache
   */
  getAPIData(fileId) {
    const key = this._generateAPIKey(fileId);
    const cached = this.apiCache.get(key);

    if (cached) {
      this.stats.apiHits++;
      return cached;
    } else {
      this.stats.apiMisses++;
      return null;
    }
  }

  /**
   * Generate ETag for cached content
   */
  _generateETag(data) {
    const hash = crypto.createHash('md5').update(data).digest('hex');
    return `"${hash.substring(0, 16)}"`; // Shorter ETag for efficiency
  }

  /**
   * Check if cached image matches requested ETag
   */
  checkETag(imageUrl, ifNoneMatch) {
    if (!ifNoneMatch) return false;

    const cached = this.getImage(imageUrl);
    if (cached && cached.eTag === ifNoneMatch) {
      return true;
    }
    return false;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const imageStats = this.imageCache.getStats();
    const apiStats = this.apiCache.getStats();

    return {
      ...this.stats,
      imageCache: {
        keys: imageStats.keys,
        hits: imageStats.hits,
        misses: imageStats.misses,
        ksize: imageStats.ksize,
        vsize: imageStats.vsize
      },
      apiCache: {
        keys: apiStats.keys,
        hits: apiStats.hits,
        misses: apiStats.misses,
        ksize: apiStats.ksize,
        vsize: apiStats.vsize
      },
      currentCacheSizeBytes: this.currentCacheSize,
      maxCacheSizeBytes: this.maxCacheSize
    };
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.imageCache.flushAll();
    this.apiCache.flushAll();
    this.currentCacheSize = 0;
    this.stats = {
      imageHits: 0,
      imageMisses: 0,
      apiHits: 0,
      apiMisses: 0
    };
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    this.imageCache.flushExpired();
    this.apiCache.flushExpired();
  }

  /**
   * Destroy cache service
   */
  destroy() {
    this.imageCache.close();
    this.apiCache.close();
    this.currentCacheSize = 0;
  }
}

// Create singleton instance
const imageCache = new ImageCacheService();

module.exports = {
  ImageCacheService,
  imageCache
};