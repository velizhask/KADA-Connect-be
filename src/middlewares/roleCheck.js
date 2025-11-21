const authService = require("../services/authService");

/**
 * Role-based access middleware
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

      const role = await authService.getUserRole(req.user);

      if (!role) {
        return res.status(403).json({
          success: false,
          message,
          error: message,
          data: null,
        });
      }

      if (roles.includes(role.toLowerCase())) {
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

// Convenience middlewares
module.exports = roleCheck;
module.exports.requireRole = (r, opts) => roleCheck(r, opts);
module.exports.requireAdmin = roleCheck(["admin"]);
module.exports.requireCompany = roleCheck(["company"]);
module.exports.requireStudent = roleCheck(["student"]);
