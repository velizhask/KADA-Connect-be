const express = require('express');
const router = express.Router();
const authMeController = require('../controllers/authMeController');
const { requireAuth, requireApproval, optionalApproval } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');
const { uploadCV, uploadPhoto, uploadLogo } = require('../middlewares/fileUpload');
const { validateRequest } = require('../middlewares/validation');
const { companySchemas, studentSchemas } = require('../validators/schemas');

// GET /api/auth/me/profile - Get current user's profile
router.get('/profile',
  requireAuth,
  optionalApproval,
  roleCheck(['student', 'company']),
  authMeController.getProfile
);

// PATCH /api/auth/me/profile - Update current user's profile (partial update only)
// Apply appropriate schema based on user role (detected in controller)
router.patch('/profile',
  requireAuth,
  requireApproval,
  roleCheck(['student', 'company']),
  // Dynamic validation: will check user's role and apply correct schema in middleware
  (req, res, next) => {
    // Attach the correct schema based on user role
    if (req.user.role === 'student') {
      return validateRequest(studentSchemas.update)(req, res, next);
    } else if (req.user.role === 'company') {
      return validateRequest(companySchemas.update)(req, res, next);
    }
    next();
  },
  authMeController.updateProfile
);

// POST /api/auth/me/cv - Upload CV (students only)
router.post('/cv',
  requireAuth,
  requireApproval,
  roleCheck(['student']),
  uploadCV,
  authMeController.uploadCV
);

// POST /api/auth/me/photo - Upload profile photo (students only)
router.post('/photo',
  requireAuth,
  requireApproval,
  roleCheck(['student']),
  uploadPhoto,
  authMeController.uploadPhoto
);

// POST /api/auth/me/logo - Upload company logo (companies only)
router.post('/logo',
  requireAuth,
  requireApproval,
  roleCheck(['company']),
  uploadLogo,
  authMeController.uploadLogo
);

module.exports = router;
