const { supabase } = require("../db");

/**
 * Role-based access middleware using Supabase Auth
 *
 * Usage:
 *  const roleCheck = require('./middlewares/roleCheck');
 *  // allow only admins
 *  router.post('/admin-only', requireAuth, roleCheck(['admin']), handler);
 *
 *  // allow multiple roles
 *  router.post('/company-or-admin', requireAuth, roleCheck(['company','admin']), handler);
 *
 */

/**
 * Factory to create role-checking middleware.
 * Uses Supabase database to fetch user role.
 *
 * @param {string|string[]} allowedRoles - role or array of roles allowed (case-insensitive)
 * @param {{ message?: string }} [options]
 * @returns {(req,res,next)=>void}
 */
function roleCheck(allowedRoles, options = {}) {
  const roles = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => String(r).toLowerCase())
    : [String(allowedRoles).toLowerCase()];
  const message = options.message || "Forbidden: insufficient role";

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          error: "Authentication required",
          data: null,
        });
      }

      // Fetch user role from Supabase users table
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", req.user.id)
        .single();

      if (error || !data) {
        console.error("[ERROR] Error fetching user role:", error);
        return res.status(403).json({
          success: false,
          message: "Unable to verify user role",
          error: "Unable to verify user role",
          data: null,
        });
      }

      if (!data.role) {
        return res.status(403).json({
          success: false,
          message,
          error: message,
          data: null,
        });
      }

      if (roles.includes(data.role.toLowerCase())) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message,
        error: message,
        data: null,
      });
    } catch (err) {
      console.error("[ERROR] Error during role check:", err?.message || err);
      return res.status(500).json({
        success: false,
        message: "Authorization error",
        error: err?.message || "Authorization error",
        data: null,
      });
    }
  };
}

/**
 * Permission-based access middleware
 * Uses the centralized roles configuration
 *
 * Usage:
 *  const { checkPermission } = require('./middlewares/roleCheck');
 *  router.post('/resource', requireAuth, checkPermission('resource', 'create'), handler);
 *
 * @param {string} resource - Resource being accessed
 * @param {string} action - Action being performed
 * @param {{ message?: string }} [options]
 * @returns {(req,res,next)=>void}
 */
function checkPermission(resource, action, options = {}) {
  const message = options.message || `Forbidden: insufficient permissions for ${action} on ${resource}`;

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          error: "Authentication required",
          data: null,
        });
      }

      // Fetch user role from Supabase
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", req.user.id)
        .single();

      if (error || !data) {
        console.error("[ERROR] Error fetching user role:", error);
        return res.status(403).json({
          success: false,
          message: "Unable to verify permissions",
          error: "Unable to verify permissions",
          data: null,
        });
      }

      // Use the centralized roles configuration
      const { userHasPermission } = require("../config/roles");

      const hasPermission = userHasPermission(
        { role: data.role },
        resource,
        action,
        { userId: req.user.id }
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message,
          error: message,
          data: null,
        });
      }

      return next();
    } catch (err) {
      console.error("[ERROR] Error during permission check:", err?.message || err);
      return res.status(500).json({
        success: false,
        message: "Authorization error",
        error: err?.message || "Authorization error",
        data: null,
      });
    }
  };
}

// Convenience middlewares
module.exports = roleCheck;
module.exports.requireRole = (r, opts) => roleCheck(r, opts);
module.exports.requireAdmin = roleCheck(["admin"]);
module.exports.requireCompany = roleCheck(["company"]);
module.exports.requireStudent = roleCheck(["student"]);
module.exports.checkPermission = checkPermission;
