/**
 * Centralized RBAC Configuration
 *
 * This file defines all roles and their associated permissions
 * for the KADA Connect platform.
 *
 * Permission Format:
 * {
 *   resource: 'students',      // Resource being accessed
 *   action: 'create',          // Action being performed
 *   own: true/false,          // Whether permission is limited to own resources
 *   description: '...'         // Human-readable description
 * }
 */

module.exports = {
  roles: {
    student: {
      name: 'Student',
      description: 'Student/trainee users who can view profiles and manage their own profile',
      permissions: [
        {
          resource: 'students',
          action: 'create',
          own: true,
          description: 'Create own student profile'
        },
        {
          resource: 'students',
          action: 'read',
          own: false,
          description: 'View all student profiles'
        },
        {
          resource: 'students',
          action: 'update',
          own: true,
          description: 'Update own student profile'
        },
        {
          resource: 'students',
          action: 'delete',
          own: true,
          description: 'Delete own student profile'
        },
        {
          resource: 'companies',
          action: 'read',
          own: false,
          description: 'View all company profiles'
        },
        {
          resource: 'lookup',
          action: 'read',
          own: false,
          description: 'Access reference data (universities, majors, industries, etc.)'
        }
      ]
    },

    company: {
      name: 'Company',
      description: 'Company users who can view profiles and manage their own company',
      permissions: [
        {
          resource: 'students',
          action: 'read',
          own: false,
          description: 'View all student profiles'
        },
        {
          resource: 'companies',
          action: 'create',
          own: false,
          description: 'Create company profile'
        },
        {
          resource: 'companies',
          action: 'read',
          own: false,
          description: 'View all company profiles'
        },
        {
          resource: 'companies',
          action: 'update',
          own: true,
          description: 'Update own company profile'
        },
        {
          resource: 'companies',
          action: 'delete',
          own: true,
          description: 'Delete own company profile'
        },
        {
          resource: 'lookup',
          action: 'read',
          own: false,
          description: 'Access reference data (industries, tech roles, etc.)'
        }
      ]
    },

    admin: {
      name: 'Administrator',
      description: 'System administrators with full access to all features',
      permissions: [
        {
          resource: 'students',
          action: 'create',
          own: false,
          description: 'Create student profiles'
        },
        {
          resource: 'students',
          action: 'read',
          own: false,
          description: 'View all student profiles'
        },
        {
          resource: 'students',
          action: 'update',
          own: false,
          description: 'Update any student profile'
        },
        {
          resource: 'students',
          action: 'delete',
          own: false,
          description: 'Delete any student profile'
        },
        {
          resource: 'companies',
          action: 'create',
          own: false,
          description: 'Create company profiles'
        },
        {
          resource: 'companies',
          action: 'read',
          own: false,
          description: 'View all company profiles'
        },
        {
          resource: 'companies',
          action: 'update',
          own: false,
          description: 'Update any company profile'
        },
        {
          resource: 'companies',
          action: 'delete',
          own: false,
          description: 'Delete any company profile'
        },
        {
          resource: 'lookup',
          action: 'read',
          own: false,
          description: 'Access reference data'
        },
        {
          resource: 'lookup',
          action: 'cache_clear',
          own: false,
          description: 'Clear lookup cache'
        },
        {
          resource: 'lookup',
          action: 'cache_status',
          own: false,
          description: 'Get cache status'
        },
        {
          resource: 'users',
          action: 'approve',
          own: false,
          description: 'Approve user accounts'
        },
        {
          resource: 'users',
          action: 'read',
          own: false,
          description: 'View all users'
        }
      ]
    }
  },

  resources: {
    students: {
      name: 'Student Profiles',
      description: 'Student/trainee profile data'
    },
    companies: {
      name: 'Company Profiles',
      description: 'Company profile data'
    },
    lookup: {
      name: 'Reference Data',
      description: 'Lookup/reference data (universities, industries, etc.)'
    },
    users: {
      name: 'User Management',
      description: 'User account management'
    }
  },

  actions: {
    create: 'Create new resource',
    read: 'Read/view resource',
    update: 'Update/modify resource',
    delete: 'Delete resource',
    cache_clear: 'Clear cache',
    cache_status: 'View cache status',
    approve: 'Approve user account'
  }
};

/**
 * Helper function to check if a role has a specific permission
 * @param {string} roleName - Name of the role to check
 * @param {string} resource - Resource being accessed
 * @param {string} action - Action being performed
 * @param {Object} context - Additional context (e.g., { userId, resourceUserId })
 * @returns {Object|null} Permission object if allowed, null otherwise
 */
function checkPermission(roleName, resource, action, context = {}) {
  const role = module.exports.roles[roleName];
  if (!role) {
    return null;
  }

  // Find matching permission
  const permission = role.permissions.find(
    p => p.resource === resource && p.action === action
  );

  if (!permission) {
    return null;
  }

  // Check if it's an "own" resource permission
  if (permission.own && context.userId && context.resourceUserId) {
    // If user is not the owner, deny access
    if (context.userId !== context.resourceUserId) {
      return null;
    }
  }

  return permission;
}

/**
 * Get all permissions for a specific role
 * @param {string} roleName - Name of the role
 * @returns {Array} Array of permissions
 */
function getPermissionsForRole(roleName) {
  const role = module.exports.roles[roleName];
  return role ? role.permissions : [];
}

/**
 * Get all permissions for a user (role-based)
 * @param {Object} user - User object with role property
 * @returns {Array} Array of permissions
 */
function getUserPermissions(user) {
  if (!user || !user.role) {
    return [];
  }
  return getPermissionsForRole(user.role);
}

/**
 * Check if a user has a specific permission
 * @param {Object} user - User object
 * @param {string} resource - Resource being accessed
 * @param {string} action - Action being performed
 * @param {Object} context - Additional context
 * @returns {boolean} True if user has permission
 */
function userHasPermission(user, resource, action, context = {}) {
  if (!user || !user.role) {
    return false;
  }

  const permission = checkPermission(user.role, resource, action, context);
  return permission !== null;
}

module.exports.checkPermission = checkPermission;
module.exports.getPermissionsForRole = getPermissionsForRole;
module.exports.getUserPermissions = getUserPermissions;
module.exports.userHasPermission = userHasPermission;
