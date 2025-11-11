/**
 * Response Cache Service
 * Handles server-side caching of API responses from database queries
 * to improve performance and reduce database load
 */

const NodeCache = require('node-cache');
const crypto = require('crypto');

class ResponseCacheService {
  constructor(options = {}) {
    // Cache version for privacy changes (phone number removal)
    this.cacheVersion = 'privacy-v2'; // Updated for phone number exclusion from public endpoints

    // Cache for API responses (1 hour TTL - optimized for memory)
    this.responseCache = new NodeCache({
      stdTTL: 1 * 60 * 60, // 1 hour in seconds (reduced from 2 hours)
      checkperiod: 15 * 60, // Check for expired keys every 15 minutes
      useClones: false, // Better performance for large response data
      maxKeys: 200 // Maximum number of cached responses (reduced from 500)
    });

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      totalCached: 0
    };

    // Maximum cache size in bytes (50MB for API responses - optimized for free tier)
    this.maxCacheSize = options.maxCacheSize || 50 * 1024 * 1024;
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
   * Generate cache key for response data
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
   * Store response data in cache
   */
  setResponse(entityType, entityId, fieldName, responseData) {
    // Check memory pressure before caching
    this.checkMemoryPressure();

    const key = this._generateResponseKey(entityType, entityId, fieldName);
    const cacheData = {
      data: responseData,
      timestamp: Date.now(),
      entityType,
      entityId,
      fieldName
    };

    this.responseCache.set(key, cacheData);
    return cacheData;
  }

  /**
   * Get response data from cache
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
   * Store list response with data in cache
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
    // Check memory pressure before caching
    this.checkMemoryPressure();

    const paramString = JSON.stringify(params);
    const hash = crypto.createHash('md5').update(paramString).digest('hex').substring(0, 8);
    const key = `api:${this.cacheVersion}:${endpointKey}:${hash}`;

    const cacheData = {
      data: responseData,
      timestamp: Date.now(),
      endpoint: endpointKey,
      params,
      cacheVersion: this.cacheVersion,
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
    const key = `api:${this.cacheVersion}:${endpointKey}:${hash}`;

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
    const statsBefore = this.getStats();
    this.responseCache.flushAll();
    this.currentCacheSize = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      totalCached: 0
    };

    }

  /**
   * Clear cache for specific table/entity type
   * @param {string} tableType - 'students', 'companies', or 'lookup'
   * @param {string} recordId - Optional specific record ID
   * @param {Array} specificPatterns - Optional specific patterns to clear
   */
  clearByTable(tableType, recordId = null, specificPatterns = null) {
    const keys = this.responseCache.keys();
    let clearedCount = 0;

    // Define comprehensive patterns for different table types
    const patterns = {
      students: [
        'api:privacy-v2:getAllStudents:',
        'api:privacy-v2:getStudentById:',
        'api:privacy-v2:searchStudents:',
        'api:privacy-v2:getStudentsByStatus:',
        'api:privacy-v2:getStudentsStats:',
        'api:privacy-v2:getFeaturedStudents:'
      ],
      companies: [
        'api:privacy-v2:getAllCompanies:',
        'api:privacy-v2:getCompanyById:',
        'api:privacy-v2:searchCompanies:',
        'api:privacy-v2:getCompanyStats:',
        'api:privacy-v2:getIndustries:', 
        'api:privacy-v2:getTechRoles:'  
      ],
      lookup: [
        'api:privacy-v2:getAllLookupData:',
        'api:privacy-v2:getIndustries:',
        'api:privacy-v2:getTechRoles:',
        'api:privacy-v2:getTechSkills:',
        'api:privacy-v2:getUniversities:',
        'api:privacy-v2:getMajors:',
        'api:privacy-v2:getPreferredIndustries:',
        'api:privacy-v2:getPopularIndustries:',
        'api:privacy-v2:getPopularTechRoles:',
        'api:privacy-v2:getPopularTechSkills:',
        'api:privacy-v2:getPopularUniversities:',
        'api:privacy-v2:getPopularMajors:',
        'api:privacy-v2:getPopularPreferredIndustries:'
      ]
    };

    const targetPatterns = specificPatterns || patterns[tableType] || [];

    for (const key of keys) {
      const shouldClear = targetPatterns.some(pattern => key.includes(pattern)) ||
                         (recordId && key.includes(`:${recordId}`));

      if (shouldClear) {
        this.responseCache.del(key);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Clear cache for employment status changes (affects multiple tables)
   * @param {string} reason - Reason for the clear
   */
  clearEmploymentStatusCache(reason = 'Employment status change') {
    // Employment status changes affect students and all lookup data
    const studentsCleared = this.clearByTable('students');
    const lookupCleared = this.clearByTable('lookup');

    return studentsCleared + lookupCleared;
  }

  /**
   * Clear cache for visibility changes (companies)
   * @param {string} reason - Reason for the clear
   */
  clearVisibilityCache(reason = 'Visibility change') {
    const companiesCleared = this.clearByTable('companies');

    return companiesCleared;
  }

  /**
   * Format bytes for human-readable output
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get detailed cache statistics with breakdown
   */
  getDetailedStats() {
    const basicStats = this.getStats();
    const keys = this.responseCache.keys();

    // Count entries by type
    const entryTypes = {
      students: 0,
      companies: 0,
      lookup: 0,
      other: 0
    };

    keys.forEach(key => {
      if (key.includes('Student') || key.includes('students')) {
        entryTypes.students++;
      } else if (key.includes('Company') || key.includes('companies')) {
        entryTypes.companies++;
      } else if (key.includes('Universities') || key.includes('Majors') ||
                 key.includes('Industries') || key.includes('Skills') ||
                 key.includes('getTechRoles') || key.includes('getCompanyIndustries')) {
        entryTypes.lookup++;
      } else {
        entryTypes.other++;
      }
    });

    return {
      ...basicStats,
      entryBreakdown: entryTypes,
      totalKeys: keys.length,
      version: this.cacheVersion
    };
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    this.responseCache.flushExpired();
  }

  /**
   * Check memory pressure and clear cache if necessary
   */
  checkMemoryPressure() {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemoryMB = memoryUsage.rss / 1024 / 1024;
      const totalMemoryPercent = (totalMemoryMB / 512) * 100; // Free tier is 512MB

      // Clear cache if memory usage is high (>80% of 512MB)
      if (totalMemoryPercent > 80) {
        this.clearAll();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[MEMORY] Error checking memory pressure:', error.message);
      return false;
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemoryMB = memoryUsage.rss / 1024 / 1024;
      const cacheMemoryMB = this.currentCacheSize / 1024 / 1024;

      return {
        total: totalMemoryMB.toFixed(1),
        cache: cacheMemoryMB.toFixed(1),
        cachePercent: ((cacheMemoryMB / totalMemoryMB) * 100).toFixed(1),
        systemPercent: ((totalMemoryMB / 512) * 100).toFixed(1),
        warning: totalMemoryMB > 400 // Warning if >400MB used
      };
    } catch (error) {
      return { error: error.message };
    }
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
const responseCache = new ResponseCacheService();

module.exports = {
  ResponseCacheService,
  responseCache
};