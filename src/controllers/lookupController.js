/**
 * Lookup Controller
 * Handles all lookup-related HTTP requests and responses
 */

const lookupService = require('../services/lookupService');

class LookupController {
  /**
   * GET /api/industries
   * Get all unique industries
   */
  async getIndustries(req, res, next) {
    try {
      const industries = await lookupService.extractUniqueValues('companies', 'industry_sector');

      res.status(200).json({
        success: true,
        message: 'Industries retrieved successfully',
        data: industries,
        count: industries.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tech-roles
   * Get all unique tech roles
   */
  async getTechRoles(req, res, next) {
    try {
      const techRoles = await lookupService.extractUniqueValues('companies', 'tech_roles_interest');

      res.status(200).json({
        success: true,
        message: 'Tech roles retrieved successfully',
        data: techRoles,
        count: techRoles.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tech-role-categories
   * Get tech role categories
   */
  async getTechRoleCategories(req, res, next) {
    try {
      const techRoles = await lookupService.extractUniqueValues('companies', 'tech_roles_interest');

      // Define categories
      const categories = {
        'Frontend': ['Frontend Developer', 'UI/UX Designer', 'Web Developer', 'Frontend Engineer'],
        'Backend': ['Backend Developer', 'Backend Engineer', 'API Developer', 'System Architect'],
        'Full Stack': ['Full Stack Developer', 'Full Stack Engineer', 'Web Developer'],
        'Mobile': ['Mobile Developer', 'iOS Developer', 'Android Developer', 'Mobile Engineer'],
        'Data': ['Data Scientist', 'Data Engineer', 'Data Analyst', 'Machine Learning Engineer'],
        'DevOps': ['DevOps Engineer', 'Site Reliability Engineer', 'Infrastructure Engineer', 'Cloud Engineer'],
        'Security': ['Security Engineer', 'Cybersecurity Analyst', 'Information Security Officer'],
        'QA/Testing': ['QA Engineer', 'Test Engineer', 'Quality Assurance Engineer', 'Automation Engineer'],
        'Management': ['Tech Lead', 'Engineering Manager', 'CTO', 'Product Manager', 'Project Manager'],
        'Other': []
      };

      // Categorize roles
      const categorizedRoles = {};
      const uncategorizedRoles = [];

      techRoles.forEach(role => {
        let categorized = false;

        for (const [category, keywords] of Object.entries(categories)) {
          if (category === 'Other') continue;

          for (const keyword of keywords) {
            if (role.toLowerCase().includes(keyword.toLowerCase())) {
              if (!categorizedRoles[category]) {
                categorizedRoles[category] = [];
              }
              categorizedRoles[category].push(role);
              categorized = true;
              break;
            }
          }
          if (categorized) break;
        }

        if (!categorized) {
          uncategorizedRoles.push(role);
        }
      });

      if (uncategorizedRoles.length > 0) {
        categorizedRoles['Other'] = uncategorizedRoles;
      }

      // Sort roles within each category
      Object.keys(categorizedRoles).forEach(category => {
        categorizedRoles[category].sort();
      });

      res.status(200).json({
        success: true,
        message: 'Tech role categories retrieved successfully',
        data: categorizedRoles,
        totalCategories: Object.keys(categorizedRoles).length,
        totalRoles: techRoles.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tech-roles/category/:category
   * Get tech roles by specific category
   */
  async getTechRolesByCategory(req, res, next) {
    try {
      const { category } = req.params;

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category parameter is required',
          data: null,
          timestamp: new Date().toISOString()
        });
      }

      const techRoles = await lookupService.extractUniqueValues('companies', 'tech_roles_interest');

      // Filter roles by category
      const categoryKeywords = {
        'frontend': ['Frontend', 'UI/UX', 'Web', 'Frontend Engineer'],
        'backend': ['Backend', 'API', 'System Architect'],
        'full-stack': ['Full Stack', 'Web Developer'],
        'mobile': ['Mobile', 'iOS', 'Android'],
        'data': ['Data Scientist', 'Data Engineer', 'Data Analyst', 'Machine Learning'],
        'devops': ['DevOps', 'Site Reliability', 'Infrastructure', 'Cloud'],
        'security': ['Security', 'Cybersecurity', 'Information Security'],
        'qa': ['QA', 'Test', 'Quality Assurance', 'Automation'],
        'management': ['Tech Lead', 'Engineering Manager', 'CTO', 'Product Manager', 'Project Manager']
      };

      const keywords = categoryKeywords[category.toLowerCase()];
      if (!keywords) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category. Valid categories: frontend, backend, full-stack, mobile, data, devops, security, qa, management',
          data: null,
          timestamp: new Date().toISOString()
        });
      }

      const filteredRoles = techRoles.filter(role => {
        return keywords.some(keyword => role.toLowerCase().includes(keyword.toLowerCase()));
      });

      res.status(200).json({
        success: true,
        message: `Tech roles for category '${category}' retrieved successfully`,
        data: filteredRoles,
        category,
        count: filteredRoles.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/search/industries
   * Search industries with query parameter
   */
  async searchIndustries(req, res, next) {
    try {
      const { q: query, limit = 10 } = req.query;

      const industries = await lookupService.extractUniqueValues('companies', 'industry_sector');
      const results = lookupService.searchInList(industries, query, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Industry search completed successfully',
        data: results,
        query,
        count: results.length,
        totalAvailable: industries.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/search/tech-roles
   * Search tech roles with query parameter
   */
  async searchTechRoles(req, res, next) {
    try {
      const { q: query, limit = 10 } = req.query;

      const techRoles = await lookupService.extractUniqueValues('companies', 'tech_roles_interest');
      const results = lookupService.searchInList(techRoles, query, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Tech role search completed successfully',
        data: results,
        query,
        count: results.length,
        totalAvailable: techRoles.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

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
   * POST /api/validate/tech-skills
   * Validate tech skills array
   */
  async validateTechSkills(req, res, next) {
    try {
      const { skills } = req.body;

      if (!Array.isArray(skills)) {
        return res.status(400).json({
          success: false,
          message: 'Skills must be an array',
          data: null,
          timestamp: new Date().toISOString()
        });
      }

      if (skills.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Skills array cannot be empty',
          data: null,
          timestamp: new Date().toISOString()
        });
      }

      if (skills.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 20 skills allowed',
          data: null,
          timestamp: new Date().toISOString()
        });
      }

      const techSkills = await lookupService.extractTechSkills();
      const validSkills = [];
      const invalidSkills = [];

      skills.forEach(skill => {
        if (typeof skill !== 'string' || skill.trim().length === 0) {
          invalidSkills.push({ skill, reason: 'Invalid or empty skill' });
        } else if (techSkills.includes(skill.trim())) {
          validSkills.push(skill.trim());
        } else {
          invalidSkills.push({ skill, reason: 'Skill not found in database' });
        }
      });

      const isValid = invalidSkills.length === 0;

      res.status(200).json({
        success: true,
        message: isValid ? 'All skills are valid' : 'Some skills are invalid',
        data: { validSkills, invalidSkills },
        isValid,
        totalSkills: skills.length,
        validCount: validSkills.length,
        invalidCount: invalidSkills.length,
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

      const industriesWithCount = await lookupService.getIndustriesWithCount();
      const popularIndustries = industriesWithCount.slice(0, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Popular industries retrieved successfully',
        data: popularIndustries,
        count: popularIndustries.length,
        totalAvailable: industriesWithCount.length,
        timestamp: new Date().toISOString()
      });
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

      const techRolesWithCount = await lookupService.getTechRolesWithCount();
      const popularTechRoles = techRolesWithCount.slice(0, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Popular tech roles retrieved successfully',
        data: popularTechRoles,
        count: popularTechRoles.length,
        totalAvailable: techRolesWithCount.length,
        timestamp: new Date().toISOString()
      });
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

      const techSkillsWithCount = await lookupService.getTechSkillsWithCount();
      const popularTechSkills = techSkillsWithCount.slice(0, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Popular tech skills retrieved successfully',
        data: popularTechSkills,
        count: popularTechSkills.length,
        totalAvailable: techSkillsWithCount.length,
        timestamp: new Date().toISOString()
      });
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
   * GET /api/universities
   * Get all unique universities
   */
  async getUniversities(req, res, next) {
    try {
      const universities = await lookupService.getUniversities();

      res.status(200).json({
        success: true,
        message: 'Universities retrieved successfully',
        data: universities,
        count: universities.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/majors
   * Get all unique majors
   */
  async getMajors(req, res, next) {
    try {
      const majors = await lookupService.getMajors();

      res.status(200).json({
        success: true,
        message: 'Majors retrieved successfully',
        data: majors,
        count: majors.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/search/universities
   * Search universities with query parameter
   */
  async searchUniversities(req, res, next) {
    try {
      const { q: query, limit = 10 } = req.query;

      const universities = await lookupService.getUniversities();
      const results = lookupService.searchInList(universities, query, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'University search completed successfully',
        data: results,
        query,
        count: results.length,
        totalAvailable: universities.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/search/majors
   * Search majors with query parameter
   */
  async searchMajors(req, res, next) {
    try {
      const { q: query, limit = 10 } = req.query;

      const majors = await lookupService.getMajors();
      const results = lookupService.searchInList(majors, query, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Major search completed successfully',
        data: results,
        query,
        count: results.length,
        totalAvailable: majors.length,
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

      const universitiesWithCount = await lookupService.getUniversitiesWithCount();
      const popularUniversities = universitiesWithCount.slice(0, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Popular universities retrieved successfully',
        data: popularUniversities,
        count: popularUniversities.length,
        totalAvailable: universitiesWithCount.length,
        timestamp: new Date().toISOString()
      });
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

      const majorsWithCount = await lookupService.getMajorsWithCount();
      const popularMajors = majorsWithCount.slice(0, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Popular majors retrieved successfully',
        data: popularMajors,
        count: popularMajors.length,
        totalAvailable: majorsWithCount.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/preferred-industries
   * Get all unique preferred industries
   */
  async getPreferredIndustries(req, res, next) {
    try {
      const preferredIndustries = await lookupService.getPreferredIndustries();

      res.status(200).json({
        success: true,
        message: 'Preferred industries retrieved successfully',
        data: preferredIndustries,
        count: preferredIndustries.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/search/preferred-industries
   * Search preferred industries with query parameter
   */
  async searchPreferredIndustries(req, res, next) {
    try {
      const { q: query, limit = 10 } = req.query;

      const preferredIndustries = await lookupService.getPreferredIndustries();
      const results = lookupService.searchInList(preferredIndustries, query, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Preferred industry search completed successfully',
        data: results,
        query,
        count: results.length,
        totalAvailable: preferredIndustries.length,
        timestamp: new Date().toISOString()
      });
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

      const preferredIndustriesWithCount = await lookupService.getPreferredIndustriesWithCount();
      const popularPreferredIndustries = preferredIndustriesWithCount.slice(0, parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Popular preferred industries retrieved successfully',
        data: popularPreferredIndustries,
        count: popularPreferredIndustries.length,
        totalAvailable: preferredIndustriesWithCount.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LookupController();