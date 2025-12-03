const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/roleCheck');

// All admin routes require authentication
router.use(requireAuth);

// Get CRUD logs (admin only)
router.get('/logs', requireAdmin, adminController.getCrudLogs);

// Get logs by request ID (admin only)
router.get('/logs/request/:requestId', requireAdmin, adminController.getLogsByRequestId);

// Get log statistics (admin only)
router.get('/logs/stats', requireAdmin, adminController.getLogStats);

module.exports = router;
