const validateRequest = (schema) => {
  return (req, res, next) => {
    // Determine which request object to validate based on HTTP method
    let dataToValidate;

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      dataToValidate = req.body;
    } else if (req.method === 'GET' || req.method === 'DELETE') {
      dataToValidate = req.query || req.params;
    } else {
      // Fallback to checking all in order
      dataToValidate = req.body || req.query || req.params;
    }

    const { error } = schema.validate(dataToValidate);

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

  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!id || !uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'Valid company ID (UUID) is required',
      data: null
    });
  }

  next();
};

const validateStudentId = (req, res, next) => {
  const { id } = req.params;

  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!id || !uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'Valid student ID (UUID) is required',
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

const validateStudentStatus = (req, res, next) => {
  const { status } = req.params;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status parameter is required',
      data: null
    });
  }

  const validStatuses = ['Current Trainee', 'Alumni'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be "Current Trainee" or "Alumni"',
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
  validateStudentId,
  validateSearchQuery,
  validateLogoUrl,
  validateStudentStatus,
  sanitizeInput
};