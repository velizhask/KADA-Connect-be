/**
 * Authentication middleware factory.
 *
 * Usage:
 * - Require auth for a route: `router.post('/private', auth(true), handler)`
 * - Optional auth: `router.get('/maybe', auth(false), handler)` (attaches `req.user` when present)
 * - Convenience exports: `const auth = require('./middlewares/auth');` then use `auth.requireAuth` or `auth.optionalAuth`.
 *
 * The middleware expects an `Authorization` header with a Bearer token.
 * attaches `req.user` when present and calls `next()`.
 *
 * Returns 401 when authentication is required but missing/invalid, and 500 on unexpected errors.
 */

const authService = require("../services/authService");

/**
 * Create an Express middleware that validates a Bearer token.
 * @param {boolean} [required=true] - If true, requests without a valid token will be rejected with 401.
 * @returns {function} Express middleware (req, res, next)
 */
function auth(required = true) {
  return async function (req, res, next) {
    try {
      const authHeader = (req.headers.authorization || "").toString();

      // Extract token (case-insensitive 'Bearer')
      const match = authHeader.match(/^\s*Bearer\s+(.+)$/i);
      const token = match ? match[1].trim() : null;

      if (!token) {
        if (required) {
          return res.status(401).json({ error: "Authentication required" });
        }

        req.user = null;
        return next();
      }

      // Verify using authService.js
      const user = await authService.getUserFromToken(token);

      if (!user) {
        if (required)
          return res.status(401).json({ error: "Invalid or expired token" });
        req.user = null;
        return next();
      }

      req.user = user;
      return next();
    } catch (err) {
      console.error("[auth] Error verifying token:", err?.message || err);
      const msg =
        err && /invalid|expired|missing|not found/i.test(err.message || "")
          ? "Invalid or expired token"
          : "Authentication service error";

      return res
        .status(
          /invalid|expired|missing|not found/i.test(err.message || "")
            ? 401
            : 500
        )
        .json({ error: msg });
    }
  };
}

module.exports = auth;
module.exports.requireAuth = auth(true);
module.exports.optionalAuth = auth(false);
