const express = require('express');
const router = express.Router();
const lookupController = require('../controllers/lookupController');
const { validateSearchQuery, sanitizeInput } = require('../middlewares/validation');
const { staticCacheHeaders, popularCacheHeaders, listCacheHeaders, cacheStatsHeaders } = require('../middlewares/cacheHeaders');
const { requireAuth } = require('../middlewares/auth');

// Apply sanitization middleware to all routes
router.use(sanitizeInput);

// Apply cache statistics headers to all routes
router.use(cacheStatsHeaders);

/**
 * GET /api/popular/industries
 * Get most popular industries by count
 */
router.get('/popular/industries', popularCacheHeaders, lookupController.getPopularIndustries);

/**
 * GET /api/popular/tech-roles
 * Get most popular tech roles by count
 */
router.get('/popular/tech-roles', popularCacheHeaders, lookupController.getPopularTechRoles);

/**
 * GET /api/popular/tech-skills
 * Get most popular tech skills by count
 */
router.get('/popular/tech-skills', popularCacheHeaders, lookupController.getPopularTechSkills);

/**
 * GET /api/popular/universities
 * Get most popular universities by count
 */
router.get('/popular/universities', popularCacheHeaders, lookupController.getPopularUniversities);

/**
 * GET /api/popular/majors
 * Get most popular majors by count
 */
router.get('/popular/majors', popularCacheHeaders, lookupController.getPopularMajors);

/**
 * GET /api/popular/preferred-industries
 * Get most popular preferred industries by count
 */
router.get('/popular/preferred-industries', popularCacheHeaders, lookupController.getPopularPreferredIndustries);

/**
 * POST /api/cache/clear
 * Clear lookup cache (admin only)
 */
router.post('/cache/clear', requireAuth, lookupController.clearCache);

/**
 * GET /api/cache/status
 * Get cache status
 */
router.get('/cache/status', requireAuth, lookupController.getCacheStatus);

module.exports = router;
