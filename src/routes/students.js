const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { validateRequest } = require('../middlewares/validation');
const { studentSchemas } = require('../validators/schemas');
const {
  validatePagination,
  validateStudentId,
  validateSearchQuery,
  sanitizeInput
} = require('../middlewares/validation');

// Apply sanitization middleware to all routes
router.use(sanitizeInput);

// GET /api/students - List all students with filtering and pagination
router.get('/', validatePagination, studentController.getStudents);

// GET /api/students/search - Search students
router.get('/search', validateSearchQuery, validatePagination, studentController.searchStudents);

// GET /api/students/status/:status - Get students by status
router.get('/status/:status', studentController.getStudentsByStatus);

// GET /api/students/universities - Get all universities
router.get('/universities', studentController.getUniversities);

// GET /api/students/majors - Get all majors
router.get('/majors', studentController.getMajors);

// GET /api/students/industries - Get preferred industries
router.get('/industries', studentController.getIndustries);

// GET /api/students/skills - Get tech skills
router.get('/skills', studentController.getSkills);

// GET /api/students/stats - Get student statistics
router.get('/stats', studentController.getStudentStats);

// POST /api/students/validate-cv - Validate CV upload
router.post('/validate-cv', studentController.validateCV);

// POST /api/students/validate-photo - Validate profile photo
router.post('/validate-photo', studentController.validatePhoto);

// GET /api/students/:id - Get student by ID
router.get('/:id', validateStudentId, studentController.getStudentById);

// POST /api/students - Create new student
router.post('/', validateRequest(studentSchemas.create), studentController.createStudent);

// PUT /api/students/:id - Update student (full update)
router.put('/:id', validateStudentId, validateRequest(studentSchemas.update), studentController.updateStudent);

// PATCH /api/students/:id - Update student (partial update)
router.patch('/:id', validateStudentId, validateRequest(studentSchemas.update), studentController.patchStudent);

// DELETE /api/students/:id - Delete student
router.delete('/:id', validateStudentId, studentController.deleteStudent);

module.exports = router;
