const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[ERROR] Supabase URL or service key is missing for logging.');
}

// Use service role key for logging operations to bypass RLS
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
const { v4: uuidv4 } = require('uuid');

/**
 * CRUD Logging Service
 * Handles audit logging for all CREATE, UPDATE, and DELETE operations
 */
class LogService {
  /**
   * Calculate the changes between old and new values
   * @param {Object} oldValues - Previous state
   * @param {Object} newValues - New state
   * @returns {Object} Object containing only changed fields
   */
  getChangedFields(oldValues, newValues) {
    if (!oldValues || !newValues) {
      return null;
    }

    const changes = {};

    // Check all keys in newValues
    Object.keys(newValues).forEach(key => {
      const oldVal = oldValues[key];
      const newVal = newValues[key];

      // Compare values (handle null/undefined)
      if (oldVal !== newVal) {
        changes[key] = {
          old: oldVal,
          new: newVal
        };
      }
    });

    // Also check for keys that exist in oldValues but not in newValues (deleted fields)
    if (oldValues && typeof oldValues === 'object') {
      Object.keys(oldValues).forEach(key => {
        if (!(key in newValues) && oldValues[key] !== null && oldValues[key] !== undefined) {
          changes[key] = {
            old: oldValues[key],
            new: null
          };
        }
      });
    }

    return changes;
  }

  /**
   * Extract key fields for deletion logging
   * @param {Object} oldValues - Deleted record data
   * @param {string} resourceType - Type of resource (student, company, etc.)
   * @returns {Object} Object with key identification fields
   */
  getDeletedFields(oldValues, resourceType) {
    if (!oldValues) {
      return null;
    }

    const deletedInfo = {};

    // Always include the ID
    if (oldValues.id) {
      deletedInfo.id = oldValues.id;
    }

    // Include resource-specific key fields
    if (resourceType === 'student') {
      if (oldValues.full_name) deletedInfo.full_name = oldValues.full_name;
      if (oldValues.email_address) deletedInfo.email_address = oldValues.email_address;
    } else if (resourceType === 'company') {
      if (oldValues.company_name) deletedInfo.company_name = oldValues.company_name;
      if (oldValues.email_address) deletedInfo.email_address = oldValues.email_address;
    }

    return deletedInfo;
  }

  /**
   * Log a CREATE operation
   * @param {Object} params - Log parameters
   * @param {string} params.userId - User ID who performed the operation
   * @param {string} params.userEmail - User email
   * @param {string} params.resourceType - Type of resource ('student', 'company', etc.)
   * @param {bigint} params.resourceId - ID of the created resource
   * @param {Object} params.newValues - The created data
   * @param {Object} params.request - Express request object (for IP, user agent, etc.)
   * @param {string} params.routePath - API route path
   * @param {string} params.operation - Operation type (CREATE, UPDATE, DELETE)
   */
  async logCreate({
    userId,
    userEmail,
    resourceType,
    resourceId,
    newValues,
    request,
    routePath,
    operation = 'CREATE'
  }) {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_email: userEmail,
        operation: operation,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: null,
        new_values: this.sanitizeData(newValues),
        ip_address: this.extractIP(request),
        request_id: request?.requestId || uuidv4(),
        success: true,
        error_message: null,
        route_path: routePath,
        user_agent: request?.headers?.['user-agent'] || null
      };

      const { error } = await supabaseClient
        .from('crud_logs')
        .insert([logData]);

      if (error) {
        console.error('[ERROR] LogService.logCreate: Failed to insert log:', error.message);
      }
    } catch (error) {
      console.error('[ERROR] LogService.logCreate: Exception:', error.message);
    }
  }

  /**
   * Log an UPDATE operation
   * @param {Object} params - Log parameters
   * @param {string} params.userId - User ID who performed the operation
   * @param {string} params.userEmail - User email
   * @param {string} params.resourceType - Type of resource
   * @param {bigint} params.resourceId - ID of the updated resource
   * @param {Object} params.oldValues - Previous state of the resource
   * @param {Object} params.newValues - Updated data
   * @param {Object} params.request - Express request object
   * @param {string} params.routePath - API route path
   */
  async logUpdate({
    userId,
    userEmail,
    resourceType,
    resourceId,
    oldValues,
    newValues,
    request,
    routePath
  }) {
    try {
      let logData;

      // For bulk operations (resourceId is null) or when oldValues is null,
      // save the full newValues instead of calculating changed fields
      if (!resourceId || !oldValues) {
        logData = {
          timestamp: new Date().toISOString(),
          user_id: userId,
          user_email: userEmail,
          operation: 'UPDATE',
          resource_type: resourceType,
          resource_id: resourceId,
          old_values: oldValues ? this.sanitizeData(oldValues) : null,
          new_values: newValues ? this.sanitizeData(newValues) : null,
          ip_address: this.extractIP(request),
          request_id: request?.requestId || uuidv4(),
          success: true,
          error_message: null,
          route_path: routePath,
          user_agent: request?.headers?.['user-agent'] || null
        };
      } else {
        // Calculate only the changed fields (delta) for regular single-record updates
        const changedFields = this.getChangedFields(oldValues, newValues);

        logData = {
          timestamp: new Date().toISOString(),
          user_id: userId,
          user_email: userEmail,
          operation: 'UPDATE',
          resource_type: resourceType,
          resource_id: resourceId,
          old_values: changedFields ? this.sanitizeData(changedFields) : null,
          new_values: changedFields ? this.sanitizeData(changedFields) : null,
          ip_address: this.extractIP(request),
          request_id: request?.requestId || uuidv4(),
          success: true,
          error_message: null,
          route_path: routePath,
          user_agent: request?.headers?.['user-agent'] || null
        };
      }

      const { error } = await supabaseClient
        .from('crud_logs')
        .insert([logData]);

      if (error) {
        console.error('[ERROR] LogService.logUpdate: Failed to insert log:', error.message);
      }
    } catch (error) {
      console.error('[ERROR] LogService.logUpdate: Exception:', error.message);
    }
  }

  /**
   * Log a DELETE operation
   * @param {Object} params - Log parameters
   * @param {string} params.userId - User ID who performed the operation
   * @param {string} params.userEmail - User email
   * @param {string} params.resourceType - Type of resource
   * @param {bigint} params.resourceId - ID of the deleted resource
   * @param {Object} params.oldValues - Data that was deleted
   * @param {Object} params.request - Express request object
   * @param {string} params.routePath - API route path
   */
  async logDelete({
    userId,
    userEmail,
    resourceType,
    resourceId,
    oldValues,
    request,
    routePath
  }) {
    try {
      // Extract only key fields for deletion
      const deletedInfo = this.getDeletedFields(oldValues, resourceType);

      const logData = {
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_email: userEmail,
        operation: 'DELETE',
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: deletedInfo ? this.sanitizeData(deletedInfo) : null,
        new_values: null,
        ip_address: this.extractIP(request),
        request_id: request?.requestId || uuidv4(),
        success: true,
        error_message: null,
        route_path: routePath,
        user_agent: request?.headers?.['user-agent'] || null
      };

      const { error } = await supabaseClient
        .from('crud_logs')
        .insert([logData]);

      if (error) {
        console.error('[ERROR] LogService.logDelete: Failed to insert log:', error.message);
      }
    } catch (error) {
      console.error('[ERROR] LogService.logDelete: Exception:', error.message);
    }
  }

  /**
   * Log a failed operation
   * @param {Object} params - Log parameters
   * @param {string} params.userId - User ID
   * @param {string} params.userEmail - User email
   * @param {string} params.resourceType - Type of resource
   * @param {bigint} params.resourceId - ID of the resource
   * @param {string} params.operation - Operation type
   * @param {string} params.errorMessage - Error message
   * @param {Object} params.request - Express request object
   * @param {string} params.routePath - API route path
   * @param {Object} params.newValues - Data being operated on (optional)
   */
  async logError({
    userId,
    userEmail,
    resourceType,
    resourceId,
    operation,
    errorMessage,
    request,
    routePath,
    newValues
  }) {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_email: userEmail,
        operation: operation,
        resource_type: resourceType,
        resource_id: resourceId || null,
        old_values: null,
        new_values: newValues ? this.sanitizeData(newValues) : null,
        ip_address: this.extractIP(request),
        request_id: request?.requestId || uuidv4(),
        success: false,
        error_message: errorMessage,
        route_path: routePath,
        user_agent: request?.headers?.['user-agent'] || null
      };

      const { error } = await supabaseClient
        .from('crud_logs')
        .insert([logData]);

      if (error) {
        console.error('[ERROR] LogService.logError: Failed to insert error log:', error.message);
      }
    } catch (error) {
      console.error('[ERROR] LogService.logError: Exception:', error.message);
    }
  }

  /**
   * Query logs with filters (admin only)
   * @param {Object} filters - Query filters
   * @param {string} filters.userId - Filter by user ID
   * @param {string} filters.operation - Filter by operation type
   * @param {string} filters.resourceType - Filter by resource type
   * @param {bigint} filters.resourceId - Filter by resource ID
   * @param {string} filters.startDate - Start date (ISO string)
   * @param {string} filters.endDate - End date (ISO string)
   * @param {boolean} filters.success - Filter by success status
   * @param {number} filters.page - Page number (default: 1)
   * @param {number} filters.limit - Items per page (default: 50)
   */
  async queryLogs(filters = {}) {
    try {
      let query = supabaseClient
        .from('crud_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.operation) {
        query = query.eq('operation', filters.operation);
      }

      if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      if (filters.resourceId) {
        query = query.eq('resource_id', filters.resourceId);
      }

      if (filters.success !== undefined && filters.success !== null) {
        query = query.eq('success', filters.success);
      }

      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }

      // Apply pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 50;
      const offset = (page - 1) * limit;

      query = query
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('[ERROR] LogService.queryLogs: Failed to query logs:', error.message);
        throw new Error('Failed to query logs');
      }

      return {
        data,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('[ERROR] LogService.queryLogs: Exception:', error.message);
      throw error;
    }
  }

  /**
   * Get logs by request ID (for correlating multiple operations)
   * @param {string} requestId - Request ID to search for
   */
  async getLogsByRequestId(requestId) {
    try {
      const { data, error } = await supabaseClient
        .from('crud_logs')
        .select('*')
        .eq('request_id', requestId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('[ERROR] LogService.getLogsByRequestId: Failed to query logs:', error.message);
        throw new Error('Failed to query logs by request ID');
      }

      return data;
    } catch (error) {
      console.error('[ERROR] LogService.getLogsByRequestId: Exception:', error.message);
      throw error;
    }
  }

  /**
   * Sanitize sensitive data before logging
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    // Fields to exclude from logs (sensitive information)
    const sensitiveFields = [
      'password',
      'password_hash',
      'access_token',
      'refresh_token',
      'token',
      'secret',
      'cv_file_path',
      'profile_photo_path',
      'company_logo_path'
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Extract IP address from request
   * @param {Object} request - Express request object
   * @returns {string} IP address
   */
  extractIP(request) {
    if (!request) {
      return null;
    }

    // Check for X-Forwarded-For header (when behind proxy/load balancer)
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }

    // Fallback to connection.remoteAddress
    return request.ip || request.connection?.remoteAddress || null;
  }
}

module.exports = new LogService();
