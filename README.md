# KADA Connect Backend

A Node.js/Express backend API for the KADA Connect microsite - a platform connecting KADA (Korea-ASEAN Digital Academy) trainees with participating companies for the Industry Visit event.

## Overview

KADA Connect serves as a bridge between trainees and companies, enabling:
- Companies to discover and explore trainee profiles
- Trainees to find and research participating companies
- Professional networking and hiring opportunities
- Industry insights and trends

## Features

### Companies API
- **Company Discovery**: Browse companies with filtering by industry and tech roles
- **Advanced Search**: Search across company profiles, descriptions, and requirements
- **Company Details**: View detailed company information including contact details
- **Industry Insights**: Get statistics and trends by industry
- **Tech Role Analysis**: Understand what skills are in demand

### Upcoming Features
- Trainee profiles and CV management
- Admin dashboard for content management
- Real-time data synchronization
- File upload functionality

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Security**: Helmet.js
- **Development**: Nodemon
- **Environment**: dotenv

## Getting Started

### Prerequisites

- Node.js 16+ installed
- Supabase account and project set up
- Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kada-connect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash

   # Edit with your configuration
   nano .env
   ```

4. **Configure database**
   - Ensure your Supabase tables are created using the provided schema
   - Update `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`

### Environment Variables

```bash
# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## Running the Application

### Development Mode
```bash
npm run dev
```
The server will restart automatically on file changes.

### Production Mode
```bash
npm start
```

## API Documentation

### Base URL
```
http://localhost:3001/api
```

### Main Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/health` | Health check |
| GET | `/` | API overview |
| GET | `/companies` | List all companies with filtering |
| GET | `/companies/:id` | Get company by ID |
| GET | `/companies/search` | Search companies |
| GET | `/companies/industries` | Get all industries |
| GET | `/companies/tech-roles` | Get all tech roles |
| GET | `/companies/stats` | Get company statistics |
| POST | `/companies/validate-logo` | Validate logo URLs |

### Response Format

All API responses follow this format:

```json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": {}, // Response data or null for errors
  "pagination": {} // Optional for paginated endpoints
}
```

### Project Structure

```
kada-connect/
├── src/
│   ├── controllers/         # API endpoint handlers
│   ├── services/           # Business logic and data operations
│   ├── routes/             # API routing configuration
│   ├── middlewares/        # Validation, error handling, security
│   └── index.js           # Application entry point
├── uploads/               # Temporary file storage
├── docs/                 # Documentation files
├── .env                  # Environment variables
└── package.json           # Dependencies and scripts
```

## Testing

### Running Tests
```bash
npm test
```

### Manual Testing Examples

```bash
# Health check
curl http://localhost:3001/health

# Get all companies
curl http://localhost:3001/api/companies

# Filtered request
curl "http://localhost:3001/api/companies?industry=E-commerce&page=1&limit=5"

# Search companies
curl "http://localhost:3001/api/companies/search?q=Developer"

# Get industries
curl http://localhost:3001/api/companies/industries
```

---

**KADA Connect** - Bridging talent with opportunity in the ASEAN digital ecosystem.