/**
 * Image Proxy Route
 * Proxies image requests to bypass CORS restrictions
 * Particularly useful for Google Drive images
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const googleDriveService = require('../services/googleDriveService');
const { imageProxyLimiter } = require('../middlewares/rateLimiter');
const { imageCache } = require('../services/imageCacheService');
const router = express.Router();

// Security settings
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB max file size
const MAX_URL_LENGTH = 2048; // Maximum URL length
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

/**
 * GET /api/proxy/image
 * Proxies image requests to external sources
 * Query parameters:
 * - url: The URL of the image to proxy (required, URL encoded)
 */
router.get('/image', imageProxyLimiter.middleware(), async (req, res) => {
  // Generate request ID at the very beginning for use in all logging (including catch block)
  const requestID = crypto.randomBytes(8).toString('hex');

  try {
    const { url } = req.query;

    // Validate the URL parameter
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'URL parameter is required and must be a valid string'
      });
    }

    // Check URL length
    if (url.length > MAX_URL_LENGTH) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `URL length exceeds maximum allowed size of ${MAX_URL_LENGTH} characters`
      });
    }

    // Decode the URL
    let imageUrl;
    try {
      imageUrl = decodeURIComponent(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid URL encoding'
      });
    }

    // Validate URL format
    try {
      const parsedUrl = new URL(imageUrl);

      // Only allow HTTP/HTTPS protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Only HTTP and HTTPS URLs are allowed'
        });
      }

      // Optional: Restrict to certain domains for security
      const allowedDomains = [
        'drive.google.com',
        'lh3.googleusercontent.com', // Google Drive direct image URLs
        'cdn.pixabay.com',
        'images.unsplash.com',
        'images.pexels.com'
      ];

      const domain = parsedUrl.hostname.toLowerCase();
      console.log(`[PROXY-${requestID}] Checking domain: ${domain} against allowed domains: ${allowedDomains.join(', ')}`);

      if (!allowedDomains.some(allowed => domain.includes(allowed))) {
        console.log(`[PROXY-${requestID}] Domain ${domain} not in allowed list`);
        return res.status(403).json({
          error: 'Forbidden',
          message: `Domain ${domain} not allowed for proxying. Allowed domains: ${allowedDomains.join(', ')}`
        });
      }

    } catch (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid URL format'
      });
    }

    // Log the request for security monitoring
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

    console.log(`[PROXY-${requestID}] Request from IP: ${clientIP} for image: ${imageUrl}`);

    // Check for conditional request (ETag support)
    const ifNoneMatch = req.headers['if-none-match'];

    // Check cache first
    const cachedImage = imageCache.getImage(imageUrl);
    if (cachedImage) {
      console.log(`[PROXY-${requestID}] Cache hit for image: ${imageUrl}`);

      // Check if ETag matches (conditional request)
      if (ifNoneMatch && cachedImage.eTag === ifNoneMatch) {
        console.log(`[PROXY-${requestID}] ETag match, returning 304 Not Modified`);
        return res.status(304).end();
      }

      // Return cached image
      res.set({
        'Content-Type': cachedImage.contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*', // Allow CORS
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'ETag': cachedImage.eTag,
        'X-Proxy-Cache': 'HIT',
        'X-Google-Drive-Processed': 'true' // Cached images are from Google Drive
      });

      console.log(`[PROXY-${requestID}] Successfully served cached image: ${imageUrl}`);
      return res.send(cachedImage.data);
    }

    console.log(`[PROXY-${requestID}] Cache miss, fetching image: ${imageUrl}`);

    let response;
    let isGoogleDriveProcessed = false;

    // Check if this is a Google Drive URL and handle it with the API
    if (googleDriveService.isGoogleDriveUrl(imageUrl) && googleDriveService.isReady()) {
      try {
        console.log(`[PROXY] Processing Google Drive URL: ${imageUrl}`);

        // Try to get direct download URL first
        const directUrl = await googleDriveService.getDirectDownloadUrl(imageUrl);

        if (directUrl) {
          console.log(`[PROXY-${requestID}] Using direct Google Drive URL: ${directUrl}`);
          response = await axios.get(directUrl, {
            responseType: 'arraybuffer',
            timeout: 15000, // Longer timeout for Google Drive
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'image/*,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            }
          });
          isGoogleDriveProcessed = true;
        }
      } catch (googleDriveError) {
        console.warn(`[PROXY-${requestID}] Google Drive API failed, falling back to direct request: ${googleDriveError.message}`);
        // Fall back to direct request if Google Drive API fails
      }
    }

    // If not Google Drive processed or Google Drive API failed, try direct request
    if (!isGoogleDriveProcessed) {
      response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
    }

    // Get content type from response
    const contentType = response.headers['content-type'];
    const contentLength = response.headers['content-length'];

    // Validate content length if available
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `File size exceeds maximum allowed size of ${MAX_REQUEST_SIZE / (1024 * 1024)}MB`
      });
    }

    // Validate that it's an allowed image type
    if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType.toLowerCase())) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `URL does not point to a valid image. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      });
    }

    // Generate ETag for the image
    const eTag = imageCache._generateETag(response.data);

    // Cache the image for future requests
    imageCache.setImage(imageUrl, response.data, contentType, eTag);
    console.log(`[PROXY-${requestID}] Image cached for future requests: ${imageUrl}`);

    // Set appropriate headers for the response
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*', // Allow CORS
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'ETag': eTag,
      'X-Proxy-Cache': 'MISS',
      'X-Google-Drive-Processed': isGoogleDriveProcessed ? 'true' : 'false'
    });

    // Send the image data
    res.send(response.data);
    const processingMethod = isGoogleDriveProcessed ? 'Google Drive API' : 'Direct request';
    console.log(`[PROXY-${requestID}] Successfully proxied image (${processingMethod}): ${imageUrl}`);

  } catch (error) {
    // Use the requestID from earlier in the function
    console.error(`[PROXY-${requestID}] Error fetching image:`, error.message);

    // Handle different types of errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const statusCode = error.response.status;

      if (statusCode === 404) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Image not found at the specified URL'
        });
      } else if (statusCode === 403) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access to the image is forbidden'
        });
      } else {
        return res.status(statusCode).json({
          error: 'External Server Error',
          message: `External server responded with status ${statusCode}`
        });
      }
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Unable to reach the external image server'
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process the image request'
      });
    }
  }
});

/**
 * GET /api/proxy/cache/stats
 * Get cache statistics and performance metrics
 */
router.get('/cache/stats', (req, res) => {
  try {
    const stats = imageCache.getStats();

    const cacheStats = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      cache: {
        image: {
          hits: stats.imageHits,
          misses: stats.imageMisses,
          hitRate: stats.imageHits / (stats.imageHits + stats.imageMisses) * 100 || 0,
          keys: stats.imageCache.keys,
          size: stats.currentCacheSizeBytes,
          maxSize: stats.maxCacheSizeBytes,
          utilizationPercent: (stats.currentCacheSizeBytes / stats.maxCacheSizeBytes * 100).toFixed(2)
        },
        api: {
          hits: stats.apiHits,
          misses: stats.apiMisses,
          hitRate: stats.apiHits / (stats.apiHits + stats.apiMisses) * 100 || 0,
          keys: stats.apiCache.keys
        }
      },
      performance: {
        totalRequests: stats.imageHits + stats.imageMisses,
        cacheHitRate: ((stats.imageHits / (stats.imageHits + stats.imageMisses)) * 100 || 0).toFixed(2) + '%'
      }
    };

    res.status(200).json(cacheStats);
  } catch (error) {
    console.error('[CACHE-STATS] Error getting cache statistics:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve cache statistics'
    });
  }
});

/**
 * POST /api/proxy/cache/clear
 * Clear all caches (admin only)
 */
router.post('/cache/clear', (req, res) => {
  try {
    const beforeStats = imageCache.getStats();
    imageCache.clearAll();
    const afterStats = imageCache.getStats();

    console.log('[CACHE-CLEAR] All caches cleared');

    res.status(200).json({
      status: 'OK',
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString(),
      before: {
        imageKeys: beforeStats.imageCache.keys,
        apiKeys: beforeStats.apiCache.keys,
        cacheSize: beforeStats.currentCacheSizeBytes
      },
      after: {
        imageKeys: afterStats.imageCache.keys,
        apiKeys: afterStats.apiCache.keys,
        cacheSize: afterStats.currentCacheSizeBytes
      }
    });
  } catch (error) {
    console.error('[CACHE-CLEAR] Error clearing cache:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to clear cache'
    });
  }
});

/**
 * Health check for the proxy endpoint
 */
router.get('/health', (req, res) => {
  const cacheStats = imageCache.getStats();

  const healthStatus = {
    status: 'OK',
    message: 'Image proxy is running',
    timestamp: new Date().toISOString(),
    services: {
      googleDrive: {
        status: googleDriveService.isReady() ? 'ready' : 'not_configured',
        message: googleDriveService.isReady() ? 'Google Drive service is operational' : 'Google Drive credentials not configured'
      },
      cache: {
        status: 'operational',
        imageCacheSize: cacheStats.currentCacheSizeBytes,
        imageCacheKeys: cacheStats.imageCache.keys,
        maxCacheSize: cacheStats.maxCacheSizeBytes,
        utilizationPercent: (cacheStats.currentCacheSizeBytes / cacheStats.maxCacheSizeBytes * 100).toFixed(2) + '%'
      }
    },
    rateLimit: {
      imageProxy: '300 requests per 15 minutes',
      general: '100 requests per 15 minutes',
      api: '200 requests per 15 minutes'
    },
    version: '1.0.0'
  };

  res.status(200).json(healthStatus);
});

module.exports = router;