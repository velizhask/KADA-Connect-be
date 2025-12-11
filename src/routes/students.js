const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const studentFileController = require("../controllers/studentFileController");
const { validateRequest } = require("../middlewares/validation");
const { studentSchemas } = require("../validators/schemas");
const {
  validatePagination,
  validateStudentId,
  validateSearchQuery,
  sanitizeInput,
} = require("../middlewares/validation");
const {
  listCacheHeaders,
  resourceCacheHeaders,
  cacheStatsHeaders,
} = require("../middlewares/cacheHeaders");
const { requireAuth } = require("../middlewares/auth");
const roleCheck = require("../middlewares/roleCheck");
const { requireAdmin } = require("../middlewares/roleCheck");
const { uploadCV, uploadPhoto, handleUploadError } = require("../middlewares/fileUpload");

// Apply sanitization middleware to all routes
router.use(sanitizeInput);

// Apply cache statistics headers to all routes
router.use(cacheStatsHeaders);

// GET /api/students - List all students with filtering and pagination
router.get(
  "/",
  requireAuth,
  roleCheck(['admin', 'student', 'company']),
  listCacheHeaders,
  validatePagination,
  studentController.getStudents
);

// GET /api/students/search - Search students
router.get(
  "/search",
  requireAuth,
  listCacheHeaders,
  validateSearchQuery,
  validatePagination,
  studentController.searchStudents
);

// GET /api/students/status/:status - Get students by status
router.get(
  "/status/:status",
  requireAuth,
  listCacheHeaders,
  studentController.getStudentsByStatus
);

// GET /api/students/universities - Get all universities
router.get("/universities", studentController.getUniversities);

// GET /api/students/majors - Get all majors
router.get("/majors", studentController.getMajors);

// GET /api/students/industries - Get preferred industries
router.get("/industries", studentController.getIndustries);

// GET /api/students/skills - Get tech skills
router.get("/skills", studentController.getSkills);

// GET /api/students/stats - Get student statistics
router.get(
  "/stats",
  requireAuth,
  roleCheck(['admin', 'student', 'company']),
  studentController.getStudentStats
);

// GET /api/students/:id - Get student by ID
router.get(
  "/:id",
  requireAuth,
  roleCheck(['admin', 'student', 'company']),
  resourceCacheHeaders,
  validateStudentId,
  studentController.getStudentById
);

// POST /api/students - Create new student
router.post(
  "/",
  requireAuth,
  roleCheck(['admin', 'student']),
  validateRequest(studentSchemas.create),
  studentController.createStudent
);

// PATCH /api/students/:id - Update student (partial update only)
router.patch(
  "/:id",
  requireAuth,
  roleCheck(['admin', 'student']),
  validateStudentId,
  validateRequest(studentSchemas.update),
  studentController.patchStudent
);

// DELETE /api/students/:id - Delete student
router.delete(
  "/:id",
  requireAuth,
  roleCheck(['admin', 'student']),
  validateStudentId,
  studentController.deleteStudent
);

// POST /api/students/bulk-approve - Bulk approve students (admin only)
router.post(
  "/bulk-approve",
  requireAuth,
  requireAdmin,
  studentController.bulkApproveStudents
);

// ============== FILE UPLOAD ROUTES ==============

// POST /api/students/:id/cv - Upload CV
router.post(
  "/:id/cv",
  requireAuth,
  roleCheck(['admin', 'student']),
  validateStudentId,
  uploadCV,
  handleUploadError,
  studentFileController.uploadCV
);

// POST /api/students/:id/photo - Upload profile photo
router.post(
  "/:id/photo",
  requireAuth,
  roleCheck(['admin', 'student']),
  validateStudentId,
  uploadPhoto,
  handleUploadError,
  studentFileController.uploadPhoto
);

// DELETE /api/students/:id/cv - Delete CV
router.delete(
  "/:id/cv",
  requireAuth,
  roleCheck(['admin', 'student']),
  validateStudentId,
  studentFileController.deleteCV
);

// DELETE /api/students/:id/photo - Delete profile photo
router.delete(
  "/:id/photo",
  requireAuth,
  roleCheck(['admin', 'student']),
  validateStudentId,
  studentFileController.deletePhoto
);

// GET /api/students/:id/cv - Get CV info
router.get(
  "/:id/cv",
  requireAuth,
  roleCheck(['admin', 'student', 'company']),
  validateStudentId,
  studentFileController.getCV
);

// GET /api/students/:id/photo - Get photo info
router.get(
  "/:id/photo",
  requireAuth,
  roleCheck(['admin', 'student', 'company']),
  validateStudentId,
  studentFileController.getPhoto
);

module.exports = router;
