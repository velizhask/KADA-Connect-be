const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const {
  validatePagination,
  validateCompanyId,
  validateSearchQuery,
  validateLogoUrl,
  sanitizeInput
} = require('../middlewares/validation');

// Apply sanitization middleware to all routes
router.use(sanitizeInput);

// GET /api/companies - List all companies with filtering and pagination
router.get('/', validatePagination, companyController.getCompanies);

// GET /api/companies/search - Search companies
router.get('/search', validateSearchQuery, validatePagination, companyController.searchCompanies);

// GET /api/companies/industries - Get all industries
router.get('/industries', companyController.getIndustries);

// GET /api/companies/tech-roles - Get all tech roles
router.get('/tech-roles', companyController.getTechRoles);

// GET /api/companies/stats - Get company statistics
router.get('/stats', companyController.getCompanyStats);

// POST /api/companies/validate-logo - Validate company logo
router.post('/validate-logo', validateLogoUrl, companyController.validateLogo);

// GET /api/companies/:id - Get company by ID
router.get('/:id', validateCompanyId, companyController.getCompanyById);

module.exports = router;
