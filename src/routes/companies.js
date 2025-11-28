const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const companyFileController = require('../controllers/companyFileController');
const { validateRequest } = require('../middlewares/validation');
const { companySchemas } = require('../validators/schemas');
const {
  validatePagination,
  validateCompanyId,
  validateSearchQuery,
  validateLogoUrl,
  sanitizeInput
} = require('../middlewares/validation');
const {
  listCacheHeaders,
  resourceCacheHeaders,
  cacheStatsHeaders
} = require('../middlewares/cacheHeaders');
const { requireAuth } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');
const { uploadLogo, handleUploadError } = require('../middlewares/fileUpload');

// Apply sanitization middleware to all routes
router.use(sanitizeInput);

// Apply cache statistics headers to all routes
router.use(cacheStatsHeaders);

// GET /api/companies - List all companies with filtering and pagination
router.get(
  '/',
  requireAuth,
  roleCheck(['admin', 'student', 'company']),
  listCacheHeaders,
  validatePagination,
  companyController.getCompanies
);

// GET /api/companies/search - Search companies
router.get(
  '/search',
  requireAuth,
  roleCheck(['admin', 'student', 'company']),
  listCacheHeaders,
  validateSearchQuery,
  validatePagination,
  companyController.searchCompanies
);

// GET /api/companies/industries - Get all industries
router.get('/industries', companyController.getIndustries);

// GET /api/companies/tech-roles - Get all tech roles
router.get('/tech-roles', companyController.getTechRoles);

// GET /api/companies/stats - Get company statistics
router.get(
  '/stats',
  requireAuth,
  roleCheck(['admin', 'student', 'company']),
  companyController.getCompanyStats
);

// POST /api/companies/validate-logo - Validate company logo
router.post('/validate-logo', validateLogoUrl, companyController.validateLogo);

// GET /api/companies/:id - Get company by ID
router.get(
  '/:id',
  requireAuth,
  roleCheck(['admin', 'student', 'company']),
  resourceCacheHeaders,
  validateCompanyId,
  companyController.getCompanyById
);

// POST /api/companies - Create new company
router.post(
  '/',
  requireAuth,
  roleCheck(['admin', 'company']),
  validateRequest(companySchemas.create),
  companyController.createCompany
);

// PATCH /api/companies/:id - Update company (partial update only)
router.patch(
  '/:id',
  requireAuth,
  roleCheck(['admin', 'company']),
  validateCompanyId,
  validateRequest(companySchemas.update),
  companyController.patchCompany
);

// DELETE /api/companies/:id - Delete company
router.delete(
  '/:id',
  requireAuth,
  roleCheck(['admin', 'company']),
  validateCompanyId,
  companyController.deleteCompany
);

// ============== FILE UPLOAD ROUTES ==============

// POST /api/companies/:id/logo - Upload company logo
router.post(
  '/:id/logo',
  requireAuth,
  roleCheck(['admin', 'company']),
  validateCompanyId,
  uploadLogo,
  handleUploadError,
  companyFileController.uploadLogo
);

// DELETE /api/companies/:id/logo - Delete company logo
router.delete(
  '/:id/logo',
  requireAuth,
  roleCheck(['admin', 'company']),
  validateCompanyId,
  companyFileController.deleteLogo
);

// GET /api/companies/:id/logo - Get company logo info
router.get(
  '/:id/logo',
  requireAuth,
  roleCheck(['admin', 'student', 'company']),
  validateCompanyId,
  companyFileController.getLogo
);

module.exports = router;
