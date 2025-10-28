const express = require('express');
const router = express.Router();
const lookupController = require('../controllers/lookupController');
const { validateSearchQuery, sanitizeInput } = require('../middlewares/validation');

// Apply sanitization middleware to all routes
router.use(sanitizeInput);

/**
 * GET /api/industries
 * Get all unique industries
 */
router.get('/industries', lookupController.getIndustries);

/**
 * GET /api/tech-roles
 * Get all unique tech roles
 */
router.get('/tech-roles', lookupController.getTechRoles);

/**
 * GET /api/tech-role-categories
 * Get tech role categories
 */
router.get('/tech-role-categories', lookupController.getTechRoleCategories);

/**
 * GET /api/universities
 * Get all unique universities
 */
router.get('/universities', lookupController.getUniversities);

/**
 * GET /api/majors
 * Get all unique majors
 */
router.get('/majors', lookupController.getMajors);

/**
 * GET /api/tech-roles/category/:category
 * Get tech roles by specific category
 */
router.get('/tech-roles/category/:category', lookupController.getTechRolesByCategory);

/**
 * GET /api/search/industries
 * Search industries with query parameter
 */
router.get('/search/industries', validateSearchQuery, lookupController.searchIndustries);

/**
 * GET /api/search/tech-roles
 * Search tech roles with query parameter
 */
router.get('/search/tech-roles', validateSearchQuery, lookupController.searchTechRoles);

/**
 * GET /api/search/universities
 * Search universities with query parameter
 */
router.get('/search/universities', validateSearchQuery, lookupController.searchUniversities);

/**
 * GET /api/search/majors
 * Search majors with query parameter
 */
router.get('/search/majors', validateSearchQuery, lookupController.searchMajors);

/**
 * GET /api/suggestions/tech-skills
 * Get tech skill suggestions
 */
router.get('/suggestions/tech-skills', lookupController.getTechSkillSuggestions);

/**
 * POST /api/validate/tech-skills
 * Validate tech skills array
 */
router.post('/validate/tech-skills', lookupController.validateTechSkills);

/**
 * GET /api/lookup/all
 * Get all lookup data in one call
 */
router.get('/lookup/all', lookupController.getAllLookupData);

/**
 * GET /api/popular/industries
 * Get most popular industries by count
 */
router.get('/popular/industries', lookupController.getPopularIndustries);

/**
 * GET /api/popular/tech-roles
 * Get most popular tech roles by count
 */
router.get('/popular/tech-roles', lookupController.getPopularTechRoles);

/**
 * GET /api/popular/tech-skills
 * Get most popular tech skills by count
 */
router.get('/popular/tech-skills', lookupController.getPopularTechSkills);

/**
 * GET /api/popular/universities
 * Get most popular universities by count
 */
router.get('/popular/universities', lookupController.getPopularUniversities);

/**
 * GET /api/popular/majors
 * Get most popular majors by count
 */
router.get('/popular/majors', lookupController.getPopularMajors);

/**
 * POST /api/cache/clear
 * Clear lookup cache (admin only)
 */
router.post('/cache/clear', lookupController.clearCache);

/**
 * GET /api/cache/status
 * Get cache status
 */
router.get('/cache/status', lookupController.getCacheStatus);

module.exports = router;
