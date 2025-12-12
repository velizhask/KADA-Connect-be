/**
 * Lookup Controller
 * Handles all lookup-related HTTP requests and responses
 */

const lookupService = require('../services/lookupService');
const { responseCache } = require('../services/responseCacheService');

class LookupController {
  /**
   * GET /api/suggestions/tech-skills
   * Get tech skill suggestions
   */
  async getTechSkillSuggestions(req, res, next) {
    try {
      const { limit = 20 } = req.query;

      const techSkills = await lookupService.extractTechSkills();
      const suggestions = techSkills.slice(0, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Tech skill suggestions retrieved successfully',
        data: suggestions,
        count: suggestions.length,
        totalAvailable: techSkills.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/lookup/all
   * Get all lookup data in one call
   */
  async getAllLookupData(req, res, next) {
    try {
      const allData = await lookupService.getAllLookupData();

      res.status(200).json({
        success: true,
        message: 'All lookup data retrieved successfully',
        data: allData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/popular/industries
   * Get most popular industries by count
   */
  async getPopularIndustries(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const cacheKey = 'getPopularIndustries';
      const cacheParams = { limit };

      // Check cache first
      const cachedResponse = responseCache.getAPIResponse(cacheKey, cacheParams);
      if (cachedResponse) {
        return res.status(200).json(cachedResponse.data);
      }

      const industriesWithCount = await lookupService.getIndustriesWithCount();
      const popularIndustries = industriesWithCount.slice(0, parseInt(limit));

      const response = {
        success: true,
        message: 'Popular industries retrieved successfully',
        data: popularIndustries,
        count: popularIndustries.length,
        totalAvailable: industriesWithCount.length,
        timestamp: new Date().toISOString()
      };

      // Cache the response
      responseCache.setAPIResponse(cacheKey, cacheParams, response);

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/popular/tech-roles
   * Get most popular tech roles by count
   */
  async getPopularTechRoles(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const cacheKey = 'getPopularTechRoles';
      const cacheParams = { limit };

      // Check cache first
      const cachedResponse = responseCache.getAPIResponse(cacheKey, cacheParams);
      if (cachedResponse) {
        return res.status(200).json(cachedResponse.data);
      }

      const techRolesWithCount = await lookupService.getTechRolesWithCount();
      const popularTechRoles = techRolesWithCount.slice(0, parseInt(limit));

      const response = {
        success: true,
        message: 'Popular tech roles retrieved successfully',
        data: popularTechRoles,
        count: popularTechRoles.length,
        totalAvailable: techRolesWithCount.length,
        timestamp: new Date().toISOString()
      };

      // Cache the response
      responseCache.setAPIResponse(cacheKey, cacheParams, response);

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/popular/tech-skills
   * Get most popular tech skills by count
   */
  async getPopularTechSkills(req, res, next) {
    try {
      const { limit = 20 } = req.query;
      const cacheKey = 'getPopularTechSkills';
      const cacheParams = { limit };

      // Check cache first
      const cachedResponse = responseCache.getAPIResponse(cacheKey, cacheParams);
      if (cachedResponse) {
        return res.status(200).json(cachedResponse.data);
      }

      const techSkillsWithCount = await lookupService.getTechSkillsWithCount();
      const popularTechSkills = techSkillsWithCount.slice(0, parseInt(limit));

      const response = {
        success: true,
        message: 'Popular tech skills retrieved successfully',
        data: popularTechSkills,
        count: popularTechSkills.length,
        totalAvailable: techSkillsWithCount.length,
        timestamp: new Date().toISOString()
      };

      // Cache the response
      responseCache.setAPIResponse(cacheKey, cacheParams, response);

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/cache/clear
   * Clear lookup cache (admin only)
   */
  async clearCache(req, res, next) {
    try {
      // Check for admin key (simplified admin check)
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_API_KEY;

      if (!adminKey || adminKey !== expectedKey) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
          data: null,
          timestamp: new Date().toISOString()
        });
      }

      lookupService.clearCache();

      res.status(200).json({
        success: true,
        message: 'Lookup cache cleared successfully',
        data: null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cache/status
   * Get cache status
   */
  async getCacheStatus(req, res, next) {
    try {
      const cacheStatus = lookupService.getCacheStatus();

      res.status(200).json({
        success: true,
        message: 'Cache status retrieved successfully',
        data: cacheStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/popular/universities
   * Get most popular universities by count
   */
  async getPopularUniversities(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const cacheKey = 'getPopularUniversities';
      const cacheParams = { limit };

      // Check cache first
      const cachedResponse = responseCache.getAPIResponse(cacheKey, cacheParams);
      if (cachedResponse) {
        return res.status(200).json(cachedResponse.data);
      }

      const universitiesWithCount = await lookupService.getUniversitiesWithCount();
      const popularUniversities = universitiesWithCount.slice(0, parseInt(limit));

      const response = {
        success: true,
        message: 'Popular universities retrieved successfully',
        data: popularUniversities,
        count: popularUniversities.length,
        totalAvailable: universitiesWithCount.length,
        timestamp: new Date().toISOString()
      };

      // Cache the response
      responseCache.setAPIResponse(cacheKey, cacheParams, response);

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/popular/majors
   * Get most popular majors by count
   */
  async getPopularMajors(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const cacheKey = 'getPopularMajors';
      const cacheParams = { limit };

      // Check cache first
      const cachedResponse = responseCache.getAPIResponse(cacheKey, cacheParams);
      if (cachedResponse) {
        return res.status(200).json(cachedResponse.data);
      }

      const majorsWithCount = await lookupService.getMajorsWithCount();
      const popularMajors = majorsWithCount.slice(0, parseInt(limit));

      const response = {
        success: true,
        message: 'Popular majors retrieved successfully',
        data: popularMajors,
        count: popularMajors.length,
        totalAvailable: majorsWithCount.length,
        timestamp: new Date().toISOString()
      };

      // Cache the response
      responseCache.setAPIResponse(cacheKey, cacheParams, response);

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/popular/preferred-industries
   * Get most popular preferred industries by count
   */
  async getPopularPreferredIndustries(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const cacheKey = 'getPopularPreferredIndustries';
      const cacheParams = { limit };

      // Check cache first
      const cachedResponse = responseCache.getAPIResponse(cacheKey, cacheParams);
      if (cachedResponse) {
        return res.status(200).json(cachedResponse.data);
      }

      const preferredIndustriesWithCount = await lookupService.getPreferredIndustriesWithCount();
      const popularPreferredIndustries = preferredIndustriesWithCount.slice(0, parseInt(limit));

      const response = {
        success: true,
        message: 'Popular preferred industries retrieved successfully',
        data: popularPreferredIndustries,
        count: popularPreferredIndustries.length,
        totalAvailable: preferredIndustriesWithCount.length,
        timestamp: new Date().toISOString()
      };

      // Cache the response
      responseCache.setAPIResponse(cacheKey, cacheParams, response);

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LookupController();