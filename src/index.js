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
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
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
const traineeRoutes = require('./routes/trainees');
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
      trainees: '/api/trainees',
      industries: '/api/industries',
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
      trainees: {
        'GET /trainees': 'List trainees with filtering and pagination',
        'GET /trainees/:id': 'Get trainee by ID',
        'POST /trainees': 'Create new trainee (admin only)',
        'PUT /trainees/:id': 'Update trainee (admin only)',
        'DELETE /trainees/:id': 'Delete trainee (admin only)',
        'GET /trainees/stats': 'Get trainee statistics',
        'GET /trainees/featured': 'Get featured trainees',
        'GET /trainees/status-options': 'Get trainee status options',
        'POST /trainees/search': 'Advanced trainee search',
        'POST /trainees/validate-cv': 'Validate trainee CV upload',
        'POST /trainees/validate-photo': 'Validate trainee photo upload'
      },
      lookup: {
        'GET /industries': 'Get industries list',
        'GET /tech-roles': 'Get tech roles list',
        'GET /tech-role-categories': 'Get tech role categories',
        'GET /tech-roles/category/:category': 'Get tech roles by category',
        'GET /search/industries': 'Search industries',
        'GET /search/tech-roles': 'Search tech roles',
        'GET /suggestions/tech-skills': 'Get tech skill suggestions',
        'POST /validate/tech-skills': 'Validate tech skills array',
        'GET /lookup/all': 'Get all lookup data',
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
app.use('/api/trainees', traineeRoutes);
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
    app.listen(PORT, () => {
      console.log(`[SUCCESS] KADA Connect Backend running on port ${PORT}`);
      console.log(`[INFO] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[INFO] Health check: http://localhost:${PORT}/health`);
      console.log(`[INFO] API endpoints: http://localhost:${PORT}/api`);
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