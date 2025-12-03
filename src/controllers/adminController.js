const logService = require("../services/logService");

/**
 * Admin Controller
 * Handles admin-only operations including CRUD logs query
 */
class AdminController {
  /**
   * Get CRUD logs with filtering
   * Query parameters:
   * - userId: Filter by user ID
   * - operation: Filter by operation type (CREATE, UPDATE, DELETE)
   * - resourceType: Filter by resource type (student, company)
   * - resourceId: Filter by resource ID
   * - success: Filter by success status (true, false)
   * - startDate: Start date (ISO string)
   * - endDate: End date (ISO string)
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 50)
   */
  async getCrudLogs(req, res, next) {
    try {
      // Verify admin role
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }

      // Extract query parameters
      const filters = {
        userId: req.query.userId,
        operation: req.query.operation,
        resourceType: req.query.resourceType,
        resourceId: req.query.resourceId ? parseInt(req.query.resourceId) : undefined,
        success: req.query.success !== undefined ? req.query.success === 'true' : undefined,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 50
      };

      // Validate operation type
      if (filters.operation && !['CREATE', 'UPDATE', 'DELETE'].includes(filters.operation)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid operation type. Must be CREATE, UPDATE, or DELETE.'
        });
      }

      // Validate resource type
      if (filters.resourceType && !['student', 'company', 'user', 'file'].includes(filters.resourceType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid resource type. Must be student, company, user, or file.'
        });
      }

      // Query logs using logService
      const result = await logService.queryLogs(filters);

      res.status(200).json({
        success: true,
        message: 'CRUD logs retrieved successfully',
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('[ERROR] AdminController.getCrudLogs:', error.message);
      next(error);
    }
  }

  /**
   * Get logs by request ID (for correlating multiple operations)
   */
  async getLogsByRequestId(req, res, next) {
    try {
      // Verify admin role
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }

      const { requestId } = req.params;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: 'Request ID is required'
        });
      }

      const logs = await logService.getLogsByRequestId(requestId);

      res.status(200).json({
        success: true,
        message: 'Logs retrieved successfully',
        data: logs
      });
    } catch (error) {
      console.error('[ERROR] AdminController.getLogsByRequestId:', error.message);
      next(error);
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats(req, res, next) {
    try {
      // Verify admin role
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }

      // Query recent logs for statistics
      const recentLogs = await logService.queryLogs({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        limit: 1000
      });

      // Calculate statistics
      const stats = {
        total: recentLogs.data.length,
        byOperation: {
          CREATE: recentLogs.data.filter(log => log.operation === 'CREATE').length,
          UPDATE: recentLogs.data.filter(log => log.operation === 'UPDATE').length,
          DELETE: recentLogs.data.filter(log => log.operation === 'DELETE').length
        },
        byResourceType: {
          student: recentLogs.data.filter(log => log.resource_type === 'student').length,
          company: recentLogs.data.filter(log => log.resource_type === 'company').length,
          user: recentLogs.data.filter(log => log.resource_type === 'user').length,
          file: recentLogs.data.filter(log => log.resource_type === 'file').length
        },
        bySuccess: {
          success: recentLogs.data.filter(log => log.success === true).length,
          failed: recentLogs.data.filter(log => log.success === false).length
        },
        recentActivity: recentLogs.data.slice(0, 10)
      };

      res.status(200).json({
        success: true,
        message: 'Log statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('[ERROR] AdminController.getLogStats:', error.message);
      next(error);
    }
  }
}

module.exports = new AdminController();
