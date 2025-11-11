/**
 * Realtime Service
 * Handles real-time database change detection using Supabase Realtime subscriptions
 * Ensures cache consistency when data is modified directly in the database
 */

const { supabase } = require('../db');
const { responseCache } = require('./responseCacheService');

class RealtimeService {
  constructor() {
    this.subscriptions = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  /**
   * Initialize realtime subscriptions for database change monitoring
   */
  async initialize() {
    try {
      console.log('[REALTIME] Initializing realtime subscriptions...');
      console.log('[REALTIME] Tables to monitor: students, companies');

      // Subscribe to student table changes
      console.log('[REALTIME] Setting up students table subscription...');
      await this.subscribeToStudents();

      // Subscribe to company table changes
      console.log('[REALTIME] Setting up companies table subscription...');
      await this.subscribeToCompanies();

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[REALTIME] All subscriptions initialized successfully');
      console.log('[REALTIME] Ready to detect database changes in real-time');

    } catch (error) {
      console.error('[REALTIME] Failed to initialize subscriptions:', error.message);
      console.error('[REALTIME] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 200)
      });
      this.handleConnectionError(error);
    }
  }

  /**
   * Subscribe to student table changes
   */
  async subscribeToStudents() {
    const subscription = supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'students'
        },
        (payload) => this.handleStudentChange(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[REALTIME] Subscribed to students table changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[REALTIME] Failed to subscribe to students table');
        }
      });

    this.subscriptions.set('students', subscription);
  }

  /**
   * Subscribe to company table changes
   */
  async subscribeToCompanies() {
    const subscription = supabase
      .channel('companies-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'companies'
        },
        (payload) => this.handleCompanyChange(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[REALTIME] Subscribed to companies table changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[REALTIME] Failed to subscribe to companies table');
        }
      });

    this.subscriptions.set('companies', subscription);
  }

  /**
   * Handle student table changes with intelligent cache invalidation
   * @param {Object} payload - Supabase change payload
   */
  async handleStudentChange(payload) {
    const { eventType, new: newRecord, old: oldRecord, errors } = payload;

    if (errors) {
      console.error('[REALTIME] Student change error:', errors);
      return;
    }

    // Handle DELETE operations explicitly
    if (eventType === 'DELETE') {
      await this.handleStudentDelete(oldRecord);
      return;
    }

    // Critical columns that affect lookup endpoints
    const criticalColumns = [
      // Primary search and filtering columns
      'full_name',                    
      'status',                       
      'employment_status',            // Affects visibility

      // Academic and career filtering
      'university_institution',       
      'program_major',               
      'preferred_industry',          

      // Technical skills
      'tech_stack_skills',           

      // Search-related content
      'self_introduction',           

      // Profile information
      'profile_photo',               
      'linkedin',                    
      'portfolio_link',              
      'cv_upload',                   
      'email_address',               

      // Metadata
      'timestamp'                    
    ];

    // Detect what changed (only for INSERT/UPDATE operations)
    const hasStatusChange = newRecord?.employment_status !== oldRecord?.employment_status;
    const changedColumns = criticalColumns.filter(col =>
      newRecord?.[col] !== oldRecord?.[col]
    );

    console.log(`[REALTIME] Student ${eventType.toUpperCase()}:`, {
      id: newRecord?.id || oldRecord?.id,
      hasStatusChange: hasStatusChange,
      changedColumns: changedColumns
    });

    try {
      if (hasStatusChange) {
        // Employment status changes affect all student-related endpoints
        await this.clearAllCacheWithReason('Student employment status change');
      } else if (changedColumns.length > 0) {
        // Targeted cache invalidation based on changed columns
        await this.invalidateTargetedCache('students', changedColumns);
      }

      // Always invalidate lookup service cache for any relevant changes
      if (hasStatusChange || changedColumns.length > 0) {
        await this.invalidateLookupServiceCache();
      }

    } catch (error) {
      console.error('[REALTIME] Error handling student change:', {
        error: error.message,
        studentId: newRecord?.id || oldRecord?.id,
        eventType: eventType
      });
    }
  }

  /**
   * Handle company table changes with intelligent cache invalidation
   * @param {Object} payload - Supabase change payload
   */
  async handleCompanyChange(payload) {
    const { eventType, new: newRecord, old: oldRecord, errors } = payload;

    if (errors) {
      console.error('[REALTIME] Company change error:', errors);
      return;
    }

    // Handle DELETE operations explicitly
    if (eventType === 'DELETE') {
      await this.handleCompanyDelete(oldRecord);
      return;
    }

    // Critical columns that affect lookup endpoints
    const criticalColumns = [
      'company_name',                
      'company_summary_description', 
      'industry_sector',             
      'tech_roles_interest',         
      'preferred_skillsets',         
      'contact_info_visible'         // Privacy affects all endpoints
    ];

    // Detect what changed (only for INSERT/UPDATE operations)
    const hasVisibilityChange = newRecord?.contact_info_visible !== oldRecord?.contact_info_visible;
    const changedColumns = criticalColumns.filter(col =>
      newRecord?.[col] !== oldRecord?.[col]
    );

    console.log(`[REALTIME] Company ${eventType.toUpperCase()}:`, {
      id: newRecord?.id || oldRecord?.id,
      hasVisibilityChange: hasVisibilityChange,
      changedColumns: changedColumns
    });

    try {
      if (hasVisibilityChange) {
        // Visibility changes affect privacy - clear all cache
        await this.clearAllCacheWithReason('Company visibility change');
      } else if (changedColumns.length > 0) {
        // Targeted cache invalidation based on changed columns
        await this.invalidateTargetedCache('companies', changedColumns);
      }

      // Always invalidate lookup service cache for any relevant changes
      if (hasVisibilityChange || changedColumns.length > 0) {
        await this.invalidateLookupServiceCache();
      }

    } catch (error) {
      console.error('[REALTIME] Error handling company change:', {
        error: error.message,
        companyId: newRecord?.id || oldRecord?.id,
        eventType: eventType
      });
    }
  }

  /**
   * Invalidate student-related cache entries
   * @param {string} studentId - Optional specific student ID
   */
  async invalidateStudentCache(studentId = null) {
    try {
      // Clear student-related cache entries
      await responseCache.clearAll();

      console.log(`[REALTIME] Student cache invalidated${studentId ? ` for student ${studentId}` : ''}`);
    } catch (error) {
      console.error('[REALTIME] Error invalidating student cache:', error.message);
    }
  }

  /**
   * Invalidate company-related cache entries
   * @param {string} companyId - Optional specific company ID
   */
  async invalidateCompanyCache(companyId = null) {
    try {
      // Clear company-related cache entries
      await responseCache.clearAll();

      console.log(`[REALTIME] Company cache invalidated${companyId ? ` for company ${companyId}` : ''}`);
    } catch (error) {
      console.error('[REALTIME] Error invalidating company cache:', error.message);
    }
  }

  /**
   * Invalidate lookup cache entries
   */
  async invalidateLookupCache() {
    try {
      // Clear lookup cache since it depends on student/company data
      await responseCache.clearAll();
    } catch (error) {
      console.error('[REALTIME] Error invalidating lookup cache:', error.message);
    }
  }

  /**
   * Invalidate lookup service cache (the in-memory cache layer)
   */
  async invalidateLookupServiceCache() {
    try {
      const lookupService = require('./lookupService');
      lookupService.clearCache();
    } catch (error) {
      console.error('[REALTIME] Error invalidating lookup service cache:', error.message);
    }
  }

  /**
   * Handle student DELETE operations with comprehensive cache clearing
   * @param {Object} deletedRecord - The deleted student record
   */
  async handleStudentDelete(deletedRecord) {
    if (!deletedRecord) {
      console.log('[REALTIME] Student DELETE event with no record data');
      return;
    }

    console.log('[REALTIME] Student DELETE detected:', {
      id: deletedRecord.id,
      name: deletedRecord.full_name
    });

    try {
      // Clear all student-related caches for DELETE operations
      await responseCache.clearByTable('students');
      await responseCache.clearByTable('lookup');

      // Also clear lookup service cache since it depends on student data
      await this.invalidateLookupServiceCache();

      console.log('[REALTIME] Student DELETE cache invalidation completed for ID:', deletedRecord.id);
    } catch (error) {
      console.error('[REALTIME] Error handling student delete:', {
        error: error.message,
        studentId: deletedRecord.id
      });
    }
  }

  /**
   * Handle company DELETE operations with comprehensive cache clearing
   * @param {Object} deletedRecord - The deleted company record
   */
  async handleCompanyDelete(deletedRecord) {
    if (!deletedRecord) {
      console.log('[REALTIME] Company DELETE event with no record data');
      return;
    }

    console.log('[REALTIME] Company DELETE detected:', {
      id: deletedRecord.id,
      name: deletedRecord.company_name
    });

    try {
      // Clear all company-related caches for DELETE operations
      await responseCache.clearByTable('companies');
      await responseCache.clearByTable('lookup');

      // Also clear lookup service cache since it depends on company data
      await this.invalidateLookupServiceCache();

      console.log('[REALTIME] Company DELETE cache invalidation completed for ID:', deletedRecord.id);
    } catch (error) {
      console.error('[REALTIME] Error handling company delete:', {
        error: error.message,
        companyId: deletedRecord.id
      });
    }
  }

  /**
   * Targeted cache invalidation based on changed columns
   * @param {string} tableType - 'students' or 'companies'
   * @param {Array} changedColumns - Array of changed column names
   */
  async invalidateTargetedCache(tableType, changedColumns) {
    try {
      // Mapping of columns to affected endpoints and query patterns
      const columnEndpointMapping = {
        students: {
          // Primary search and filtering columns
          'full_name': ['searchStudents:*', 'students:*', 'lookup:*'],     
          'status': ['students:*', 'lookup:*'],                            
          'employment_status': ['students:*', 'lookup:*'],                // Employment affects visibility

          // Academic and career filtering
          'university_institution': ['universities', 'students:*university=*', 'students:*', 'searchStudents:*', 'lookup:*'],
          'program_major': ['majors', 'students:*major=*', 'students:*', 'searchStudents:*', 'lookup:*'],
          'preferred_industry': ['preferred-industries', 'students:*industry=*', 'students:*', 'searchStudents:*', 'lookup:*'],

          // Technical skills
          'tech_stack_skills': ['popular/tech-skills', 'students:*skills=*', 'students:*', 'searchStudents:*', 'lookup:*'],

          // Search-related content
          'self_introduction': ['searchStudents:*', 'students:*'],         

          // Profile information
          'profile_photo': ['students:*', 'students/:id'],               
          'linkedin': ['students:*', 'students/:id'],                     
          'portfolio_link': ['students:*', 'students/:id'],               
          'cv_upload': ['students:*', 'students/:id'],                    
          'email_address': ['students:*', 'students/:id'],                

          // Metadata
          'timestamp': ['students:*']                                     
        },
        companies: {
          // Primary identifiers and content
          'company_name': ['searchCompanies:*', 'companies:*'],           
          'company_summary_description': ['searchCompanies:*', 'companies:*'], 

          // Business categories
          'industry_sector': ['industries', 'companies:*industry=*', 'companies:*', 'searchCompanies:*', 'lookup:*'],
          'tech_roles_interest': ['tech-roles', 'companies:*techRole=*', 'companies:*', 'searchCompanies:*', 'lookup:*'],
          'preferred_skillsets': ['companies:*', 'searchCompanies:*'],      

          // Privacy and visibility
          'contact_info_visible': ['companies:*']                         // Visibility affects all company queries
        }
      };

      const affectedPatterns = changedColumns
        .map(col => columnEndpointMapping[tableType]?.[col] || [])
        .flat();

      if (affectedPatterns.length > 0) {
        console.log(`[REALTIME] Targeted cache invalidation for ${tableType}: ${affectedPatterns.length} patterns`);

        // Clear lookup endpoints
        const lookupPatterns = affectedPatterns.filter(p => !p.includes('students:*') && !p.includes('companies:*'));
        if (lookupPatterns.length > 0) {
          await responseCache.clearByTable('lookup');
        }

        // Clear student query caches
        const studentPatterns = affectedPatterns.filter(p => p.includes('students:*'));
        if (studentPatterns.length > 0) {
          await responseCache.clearByTable('students');
        }

        // Clear company query caches
        const companyPatterns = affectedPatterns.filter(p => p.includes('companies:*'));
        if (companyPatterns.length > 0) {
          await responseCache.clearByTable('companies');
        }
      }
    } catch (error) {
      console.error('[REALTIME] Error in targeted cache invalidation:', error.message);
    }
  }

  /**
   * Clear all cache with logging
   * @param {string} reason - Reason for cache clear
   */
  async clearAllCacheWithReason(reason) {
    try {
      const statsBefore = responseCache.getStats();
      await responseCache.clearAll();
      const statsAfter = responseCache.getStats();

      console.log(`[REALTIME] All cache cleared - Reason: ${reason}`, {
        entriesCleared: statsBefore.totalCached,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[REALTIME] Error clearing all cache:', error.message);
    }
  }

  /**
   * Handle connection errors with reconnection logic
   * @param {Error} error - Connection error
   */
  handleConnectionError(error) {
    console.error('[REALTIME] Connection error:', error.message);
    this.isConnected = false;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

      console.log(`[REALTIME] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

      setTimeout(() => {
        this.reconnect();
      }, delay);
    } else {
      console.error('[REALTIME] Max reconnection attempts reached. Manual restart required.');
    }
  }

  /**
   * Attempt to reconnect to realtime subscriptions
   */
  async reconnect() {
    try {
      console.log('[REALTIME] Reconnecting...');

      // Clean up existing subscriptions
      await this.cleanup();

      // Reinitialize subscriptions
      await this.initialize();

    } catch (error) {
      console.error('[REALTIME] Reconnection failed:', error.message);
      this.handleConnectionError(error);
    }
  }

  /**
   * Get connection status and statistics
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      subscriptionsCount: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscriptions.keys())
    };
  }

  /**
   * Cleanup subscriptions and resources
   */
  async cleanup() {
    console.log('[REALTIME] Cleaning up subscriptions...');

    try {
      // Unsubscribe from all channels
      for (const [name, subscription] of this.subscriptions) {
        await supabase.removeChannel(subscription);
        console.log(`[REALTIME] Unsubscribed from ${name}`);
      }

      this.subscriptions.clear();
      this.isConnected = false;

      console.log('[REALTIME] Cleanup completed');
    } catch (error) {
      console.error('[REALTIME] Error during cleanup:', error.message);
    }
  }
}

// Create singleton instance
const realtimeService = new RealtimeService();

module.exports = {
  RealtimeService,
  realtimeService
};