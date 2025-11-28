/**
 * Authentication middleware using Supabase Auth
 *
 * Usage:
 * - Require auth for a route: `router.post('/private', requireAuth, handler)`
 * - Optional auth: `router.get('/maybe', optionalAuth, handler)` (attaches `req.user` when present)
 *
 * The middleware expects an `Authorization` header with a Bearer token.
 * Uses Supabase's built-in JWT verification for reliability and security.
 */

const { supabase } = require("../db");

/**
 * Create an Express middleware that validates a Bearer token using Supabase Auth.
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

      // Verify token using Supabase Auth (built-in JWT verification)
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data?.user) {
        console.error("[ERROR] Supabase auth verification failed:", error);
        if (required)
          return res
            .status(401)
            .json({ success: false, message: "Invalid or expired token" });
        req.user = null;
        return next();
      }

      // Attach the authenticated user to the request
      // The user object includes id, email, and other auth metadata
      req.user = data.user;

      // Extract role from public.users table (authoritative source)
      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (!userError && userData && userData.role) {
          // Add the role from database to req.user
          req.user.role = userData.role;
        } else {
          console.warn(
            `[WARN] User ${data.user.id} not found in users table or missing role`
          );
        }
      } catch (roleError) {
        console.error(
          "[ERROR] Failed to fetch user role from database:",
          roleError
        );
        // Continue without role - endpoints will handle accordingly
      }

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
