const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query || req.body || req.params);

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errorMessage,
        data: null
      });
    }

    next();
  };
};

const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      message: 'Page must be a positive integer',
      data: null
    });
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be a positive integer between 1 and 100',
      data: null
    });
  }

  next();
};

const validateCompanyId = (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id) < 1) {
    return res.status(400).json({
      success: false,
      message: 'Valid company ID is required',
      data: null
    });
  }

  next();
};

const validateSearchQuery = (req, res, next) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required and must be a non-empty string',
      data: null
    });
  }

  if (q.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be 100 characters or less',
      data: null
    });
  }

  next();
};

const validateLogoUrl = (req, res, next) => {
  const { logoUrl } = req.body;

  if (!logoUrl || typeof logoUrl !== 'string' || logoUrl.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Logo URL is required',
      data: null
    });
  }

  // Basic URL validation
  const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
  const isValidUrl = urlPattern.test(logoUrl.trim());

  // Also check for local file paths or data URLs
  const isLocalFile = logoUrl.startsWith('/') || logoUrl.startsWith('data:');

  if (!isValidUrl && !isLocalFile) {
    return res.status(400).json({
      success: false,
      message: 'Logo URL must be a valid URL (jpg, jpeg, png, gif, or webp)',
      data: null
    });
  }

  next();
};

const sanitizeInput = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  next();
};

module.exports = {
  validateRequest,
  validatePagination,
  validateCompanyId,
  validateSearchQuery,
  validateLogoUrl,
  sanitizeInput
};