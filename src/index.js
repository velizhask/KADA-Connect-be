/**
 * KADA Connect Backend Server
 * Main application entry point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'KADA Connect Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Import routes
const companyRoutes = require('./routes/companies');
const studentRoutes = require('./routes/students');
const lookupRoutes = require('./routes/lookup');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middlewares/error-handler');

// API routes (will be added later)
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'KADA Connect API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      companies: '/api/companies',
      students: '/api/students',
      industries: '/api/industries',
      universities: '/api/universities',
      majors: '/api/majors',
      techRoles: '/api/tech-roles',
      docs: '/api/docs'
    }
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    message: 'KADA Connect API Documentation',
    version: '1.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      companies: {
        'GET /companies': 'List companies with filtering and pagination',
        'GET /companies/:id': 'Get company by ID',
        'POST /companies': 'Create new company (admin only)',
        'PUT /companies/:id': 'Update company (admin only)',
        'DELETE /companies/:id': 'Delete company (admin only)',
        'GET /companies/stats': 'Get company statistics',
        'POST /companies/search': 'Advanced company search',
        'POST /companies/validate-logo': 'Validate company logo upload'
      },
      students: {
        'GET /students': 'List students with filtering and pagination',
        'GET /students/:id': 'Get student by ID',
        'POST /students': 'Create new student (admin only)',
        'PUT /students/:id': 'Update student (admin only)',
        'DELETE /students/:id': 'Delete student (admin only)',
        'GET /students/stats': 'Get student statistics',
        'GET /students/featured': 'Get featured students',
        'GET /students/status-options': 'Get student status options',
        'POST /students/search': 'Advanced student search',
        'POST /students/validate-cv': 'Validate student CV upload',
        'POST /students/validate-photo': 'Validate student photo upload'
      },
      lookup: {
        'GET /lookup/all': 'Get all lookup data',
        'GET /industries': 'Get industries list',
        'GET /tech-roles': 'Get tech roles list',
        'GET /tech-role-categories': 'Get tech role categories',
        'GET /tech-roles/category/:category': 'Get tech roles by category',
        'GET /search/industries': 'Search industries',
        'GET /search/tech-roles': 'Search tech roles',
        'GET /suggestions/tech-skills': 'Get tech skill suggestions',
        'GET /universities': 'Returns array of unique universities',
        'GET /search/universities?q=query': 'Search universities with fuzzy matching',
        'GET /popular/universities': 'Universities sorted by student count',
        'GET /majors:': 'Returns array of unique academic majors',
        'GET /search/majors?q=query': 'Search majors with fuzzy matching',
        'GET /popular/majors': 'Majors sorted by student count',
        'POST /validate/tech-skills': 'Validate tech skills array',
        'GET /popular/industries': 'Get popular industries',
        'GET /popular/tech-roles': 'Get popular tech roles',
        'GET /popular/tech-skills': 'Get popular tech skills',
        'POST /cache/clear': 'Clear lookup cache (admin only)',
        'GET /cache/status': 'Get cache status'
      }
    },
    admin: {
      note: 'Admin operations require X-Admin-Key header with valid API key'
    }
  });
});

// Mount API routes
app.use('/api/companies', companyRoutes);
app.use('/api/students', studentRoutes);
app.use('/api', lookupRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.log('[WARNING] Starting server without database connection');
    }

    // Start Express server
    await new Promise((resolve, reject) => {
      const server = app.listen(PORT, () => {
        console.log(`[SUCCESS] KADA Connect Backend running on port ${PORT}`);
        console.log(`[INFO] Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`[INFO] Health check: http://localhost:${PORT}/health`);
        console.log(`[INFO] API endpoints: http://localhost:${PORT}/api`);
        resolve();
      });

      server.on('error', (error) => {
        console.error('[ERROR] Server failed to start:', error.message);
        reject(error);
      });
    });
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[INFO] SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;