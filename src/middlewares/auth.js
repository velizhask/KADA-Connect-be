/**
 * Authentication middleware factory.
 *
 * Usage:
 * - Require auth for a route: `router.post('/private', auth(true), handler)`
 * - Optional auth: `router.get('/maybe', auth(false), handler)` (attaches `req.user` when present)
 * - Convenience exports: `const auth = require('./middlewares/verifyJWT');` then use `auth.requireAuth` or `auth.optionalAuth`.
 *
 * The middleware expects an `Authorization` header with a Bearer token.
 * attaches `req.user` when present and calls `next()`.
 *
 * Returns 401 when authentication is required but missing/invalid, and 500 on unexpected errors.
 */

const { supabase } = require("../db");
const authService = require("../services/authService");

/**
 * Create an Express middleware that validates a Bearer token.
 * @param {boolean} [required=true] - If true, requests without a valid token will be rejected with 401.
 * @returns {function} Express middleware (req, res, next)
 */
function JWTAuth(required = true) {
  return async function (req, res, next) {
    try {
      const authHeader = (req.headers.authorization || "").toString();

      // Extract token (case-insensitive 'Bearer')
      const match = authHeader.match(/^\s*Bearer\s+(.+)$/i);
      const token = match ? match[1].trim() : null;

      if (!token) {
        if (required) {
          return res.status(401).json({
            success: false,
            message: "Authentication required",
          });
        }

        req.user = null;
        return next();
      }

      // Verify using authService.js
      const user = await authService.getUserFromToken(token);

      if (!user) {
        if (required)
          return res
            .status(401)
            .json({ success: false, message: "Invalid or expired token" });
        req.user = null;
        return next();
      }

      req.user = user;
      return next();
    } catch (err) {
      console.error("[ERROR] verifyJWT Middleware:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
}

/**
 * Middleware to check if the user is approved by an admin (using userId).
 * @param {boolean} [required=true] - If true, the route can only be accessed when you already have been approved by admin
 * @returns {function} Express middleware (req, res, next)
 */
function checkApprovalStatus(required = true) {
  return async function (req, res, next) {
    try {
      if (required) {
        const userId = req.user?.id;

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: "User id is required",
          });
        }

        const { data, error } = await supabase
          .from("users")
          .select("approved")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("[ERROR] DB error checking approval:", error);
          return res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }

        if (!data || data.approved === false) {
          return res.status(403).json({
            success: false,
            message: "Your account is pending admin approval",
          });
        }
      }
      next();
    } catch (err) {
      console.error("[ERROR] verifyApproval Middleware:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
}

module.exports = {
  requireAuth: JWTAuth(true),
  optionalAuth: JWTAuth(false),
  requireApproval: checkApprovalStatus(true),
  optionalApproval: checkApprovalStatus(false),
};
