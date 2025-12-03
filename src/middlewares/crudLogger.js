const { v4: uuidv4 } = require('uuid');

/**
 * CRUD Logger Middleware
 *
 * Attaches a unique request ID to each request and extracts
 * relevant context for audit logging.
 *
 * Usage:
 * app.use(crudLogger);
 */

function crudLogger(req, res, next) {
  // Generate unique request ID for correlating logs
  req.requestId = uuidv4();

  // Extract and store IP address
  req.clientIP = extractClientIP(req);

  // Log request start (for debugging)
  console.log(`[LOG REQUEST ${req.requestId}] ${req.method} ${req.path} - IP: ${req.clientIP} - User: ${req.user?.id || 'anonymous'}`);

  // Store start time for performance monitoring
  req.startTime = Date.now();

  // Override res.end to log response after sending
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - req.startTime;
    const statusCode = res.statusCode;

    // Log response
    const logLevel = statusCode >= 400 ? '[LOG ERROR' : '[LOG RESPONSE';
    console.log(`${logLevel} ${req.requestId}] ${req.method} ${req.path} - Status: ${statusCode} - Duration: ${duration}ms`);

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
}

/**
 * Extract client IP address from request
 * Handles proxies and load balancers
 */
function extractClientIP(req) {
  // Check for X-Forwarded-For header (when behind proxy/load balancer)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // Check for X-Real-IP header (Nginx proxy)
  const xRealIP = req.headers['x-real-ip'];
  if (xRealIP) {
    return xRealIP;
  }

  // Fallback to connection.remoteAddress
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
}

module.exports = crudLogger;
