/**
 * File Upload Middleware
 * Reusable multer configuration for different file types
 * Handles CV and photo uploads with validation
 */

const multer = require('multer');

// Configure multer to use memory storage
// This allows us to process files in memory before uploading to Supabase
const memoryStorage = multer.memoryStorage();

/**
 * Create a custom upload middleware with specific configuration
 * @param {Object} options - Configuration options
 * @param {Array} options.allowedTypes - Array of allowed MIME types
 * @param {number} options.maxSize - Maximum file size in bytes
 * @param {string} options.fieldName - Form field name for the file
 * @returns {Function} - Multer middleware function
 */
const createUploadMiddleware = ({ allowedTypes, maxSize, fieldName }) => {
  return multer({
    storage: memoryStorage,
    limits: {
      fileSize: maxSize,
      files: 1 // Only allow single file
    },
    fileFilter: (req, file, cb) => {
      // Validate file type
      if (allowedTypes && allowedTypes.length > 0) {
        if (!allowedTypes.includes(file.mimetype)) {
          const error = new Error(
            `Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`
          );
          error.code = 'INVALID_FILE_TYPE';
          return cb(error, false);
        }
      }

      // Validate filename
      if (!file.originalname || file.originalname.trim() === '') {
        const error = new Error('Invalid filename');
        error.code = 'INVALID_FILENAME';
        return cb(error, false);
      }

      // Check if file is empty
      if (file.size === 0) {
        const error = new Error('File is empty');
        error.code = 'EMPTY_FILE';
        return cb(error, false);
      }

      cb(null, true);
    }
  }).single(fieldName);
};

// Pre-configured upload middlewares

// CV Upload Middleware
// Allowed types: PDF, DOC, DOCX
// Max size: 5MB
const uploadCV = createUploadMiddleware({
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  maxSize: 5 * 1024 * 1024, // 5MB
  fieldName: 'file'
});

// Photo Upload Middleware
// Allowed types: JPG, PNG, WebP
// Max size: 5MB
const uploadPhoto = createUploadMiddleware({
  allowedTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ],
  maxSize: 5 * 1024 * 1024, // 5MB
  fieldName: 'file'
});

// Logo Upload Middleware (for future company use)
// Allowed types: JPG, PNG, WebP, SVG
// Max size: 5MB
const uploadLogo = createUploadMiddleware({
  allowedTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/svg+xml'
  ],
  maxSize: 5 * 1024 * 1024, // 5MB
  fieldName: 'file'
});

// Generic file upload middleware (flexible, for future use)
const uploadGeneric = createUploadMiddleware({
  allowedTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/svg+xml'
  ],
  maxSize: 10 * 1024 * 1024, // 10MB
  fieldName: 'file'
});

/**
 * Error handling middleware for multer errors
 * Should be used after the upload middleware
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds the allowed limit'
          }
        });

      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Only one file is allowed'
          }
        });

      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNEXPECTED_FIELD',
            message: 'Unexpected file field'
          }
        });

      case 'INVALID_FILE_TYPE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: err.message
          }
        });

      case 'INVALID_FILENAME':
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILENAME',
            message: 'Invalid filename'
          }
        });

      case 'EMPTY_FILE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMPTY_FILE',
            message: 'File is empty'
          }
        });

      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: 'File upload error: ' + err.message
          }
        });
    }
  }

  // Custom errors from fileFilter
  if (err.code && ['INVALID_FILE_TYPE', 'INVALID_FILENAME', 'EMPTY_FILE'].includes(err.code)) {
    return res.status(400).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  // Pass other errors to next middleware
  next(err);
};

module.exports = {
  createUploadMiddleware,
  uploadCV,
  uploadPhoto,
  uploadLogo,
  uploadGeneric,
  handleUploadError
};
