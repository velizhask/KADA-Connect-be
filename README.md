# KADA Connect Backend

A Node.js/Express backend API for the KADA Connect microsite - a platform connecting KADA (Korea-ASEAN Digital Academy) trainees with participating companies for the Industry Visit event.

## Overview

KADA Connect serves as a bridge between trainees and companies, enabling:
- Companies to discover and explore trainee profiles
- Trainees to find and research participating companies
- Professional networking and hiring opportunities
- Industry insights and trends

## Features

### Companies API - Complete CRUD Operations
- Discovery: Browse companies with filtering by industry and tech roles
- Advanced Search: Search across company profiles, descriptions, and requirements
- Company Details: View detailed company information including contact details
- Industry Insights: Get statistics and trends by industry
- Tech Role Analysis: Understand what skills are in demand
- Create Companies: Add new companies to the platform
- Update Companies: Modify company information (PUT for full updates, PATCH for partial updates)
- Delete Companies: Remove companies from the platform

### Students API - Complete CRUD Operations
- Student Profiles: Browse trainee profiles with comprehensive filtering
- Academic Info: View universities, majors, and educational backgrounds
- Career Focus: Explore preferred industries and tech stacks
- Student Analytics: Statistics on skills, universities, and career trends
- Smart Search: Search students by skills, introduction, and background
- Create Students: Add new student profiles to the platform
- Update Students: Modify student information (PUT for full updates, PATCH for partial updates)
- Delete Students: Remove student profiles from the platform

### Lookup API - Reference Data
- Industries: Get comprehensive list of industries
- Tech Roles: Browse technology roles and categories
- Suggestions: Smart tech skill suggestions
- Popular Data: Most common industries, roles, and skills
- Cached Performance: Optimized lookup data with caching

### Validation & Quality - Implemented
- Input Validation: Comprehensive Joi-based validation for all operations
- Email Validation: Proper email format checking
- URL Validation: Website and profile link validation
- Data Limits: Enforced length limits for all text fields
- Business Rules: Status validation and other business constraints
- Partial Updates: PATCH operations that preserve unchanged data

### Testing & Documentation
- Comprehensive Test Suite: Complete Postman collection with 41 API endpoints
- Multi-Environment Support: Development and staging environment configurations
- Response Validation: Automated testing for all API responses
- Error Handling Testing: Comprehensive error scenario coverage

### Production Ready
- Health Monitoring: System health check endpoint
- Security: Helmet.js protection and CORS configuration
- Performance: Optimized queries and caching
- Logging: Professional logging without emojis
- Error Handling: Consistent error response format

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

#### Companies API
| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/companies` | List all companies with filtering |
| POST | `/companies` | Create new company |
| GET | `/companies/:id` | Get company by ID |
| PUT | `/companies/:id` | Update company (full - replaces all fields) |
| PATCH | `/companies/:id` | Update company (partial - updates only specified fields) |
| DELETE | `/companies/:id` | Delete company |
| GET | `/companies/search` | Search companies |
| GET | `/companies/industries` | Get all industries |
| GET | `/companies/tech-roles` | Get all tech roles |
| GET | `/companies/stats` | Get company statistics |
| POST | `/companies/validate-logo` | Validate logo URLs |

#### Students API
| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/students` | List all students with filtering |
| POST | `/students` | Create new student |
| GET | `/students/:id` | Get student by ID |
| PUT | `/students/:id` | Update student (full - replaces all fields) |
| PATCH | `/students/:id` | Update student (partial - updates only specified fields) |
| DELETE | `/students/:id` | Delete student |
| GET | `/students/search` | Search students |
| GET | `/students/status/:status` | Get students by status |
| GET | `/students/universities` | Get all universities |
| GET | `/students/majors` | Get all majors |
| GET | `/students/industries` | Get preferred industries |
| GET | `/students/skills` | Get tech skills |
| GET | `/students/stats` | Get student statistics |
| POST | `/students/validate-cv` | Validate CV URLs |
| POST | `/students/validate-photo` | Validate photo URLs |

#### Lookup API
| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/` | Get all lookup data |
| GET | `/industries` | Get all industries |
| GET | `/tech-roles` | Get all tech roles |
| GET | `/tech-role-categories` | Get tech role categories |
| GET | `/tech-roles/category/:category` | Get tech roles by category |
| GET | `/search/industries` | Search industries |
| GET | `/search/tech-roles` | Search tech roles |
| GET | `/suggestions/tech-skills` | Get tech skill suggestions |
| GET | `/lookup/all` | Get all lookup data |
| GET | `/popular/industries` | Get popular industries |
| GET | `/popular/tech-roles` | Get popular tech roles |
| GET | `/popular/tech-skills` | Get popular tech skills |
| GET | `/cache/status` | Get cache status |
| POST | `/cache/clear` | Clear lookup cache (admin) |
| POST | `/validate/tech-skills` | Validate tech skills array |

#### System
| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/health` | Health check |
| GET | `/` | API overview |

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
kada-connect-be/
├── src/
│   ├── controllers/                                  # API endpoint handlers
│   │   ├── companyController.js
│   │   ├── studentController.js
│   │   └── lookupController.js
│   ├── services/                                     # Business logic and data operations
│   │   ├── companyService.js
│   │   ├── studentService.js
│   │   └── lookupService.js
│   ├── routes/                                       # API routing configuration
│   │   ├── companies.js
│   │   ├── students.js
│   │   └── lookup.js
│   ├── middlewares/                                  # Validation, error handling, security
│   │   └── validation.js
│   ├── validators/                                   # Input validation schemas
│   │   └── schemas.js
│   ├── db/                                           # Database connection
│   │   └── index.js
│   └── index.js                                      # Application entry point
├── collection                                        # Postman collection
|   ├── KADA-Connect-be.postman_collection.json
|   └── KADA-Connect-Env.postman_environment.json
├── .env.example                                      # Environment variables template
├── .env                                              # Environment variables (git-ignored)
├── .gitignore                                        # Git ignore file
├── package.json                                      # Dependencies and scripts
└── README.md                                          # Project documentation
```

## Testing

### Automated Testing (Recommended)
A comprehensive Postman collection with 41 API endpoints is available:
- **Complete Test Suite**: All endpoints with validation and error testing
- **Multi-Environment**: Development and staging configurations
- **Usage Guide**: See `docs/Postman-Collection-Usage-Guide.md`
- **Collection Files**:
  - `KADA-Connect-be-Complete.postman_collection.json`
  - `KADA-Connect-Environment.postman_environment.json`
  - `KADA-Connect-Staging-Environment.postman_environment.json`

### Manual Testing Examples

```bash
# Health check
curl http://localhost:3001/health

# Get all companies
curl http://localhost:3001/api/companies

# Create new company
curl -X POST http://localhost:3001/api/companies \
  -H "Content-Type: application/json" \
  -d '{"emailAddress":"test@company.com","companyName":"Test Company","companySummary":"Test description","industry":"Technology"}'

# Update company (partial - only updates specified fields)
curl -X PATCH http://localhost:3001/api/companies/1 \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Updated Company"}'

# Delete company
curl -X DELETE http://localhost:3001/api/companies/1

# Get all students
curl http://localhost:3001/api/students

# Create new student
curl -X POST http://localhost:3001/api/students \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Student","status":"Current Trainee","university":"Test University","major":"Computer Science","preferredIndustry":"Technology","techStack":"JavaScript, Python","selfIntroduction":"Passionate student"}'

# Update student
curl -X PATCH http://localhost:3001/api/students/1 \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Updated Student"}'

# Delete student
curl -X DELETE http://localhost:3001/api/students/1

# Search companies
curl "http://localhost:3001/api/companies/search?q=Developer"

# Get industries
curl http://localhost:3001/api/companies/industries

# Get student stats
curl http://localhost:3001/api/students/stats

# Get all industries
curl http://localhost:3001/api/

# Search tech roles
curl "http://localhost:3001/api/search/tech-roles?q=Developer"

# Get popular industries
curl http://localhost:3001/api/popular/industries

# Get tech skill suggestions
curl "http://localhost:3001/api/suggestions/tech-skills?q=Java"

# Clear cache (admin)
curl -X POST http://localhost:3001/api/cache/clear
```

---

**KADA Connect** - Bridging talent with opportunity in the ASEAN digital ecosystem.