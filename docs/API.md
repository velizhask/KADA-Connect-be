# KADA Connect API Documentation

## Base Configuration

- **Base URL**: `http://localhost:3001/api`
- **Method**: REST
- **Content-Type**: `application/json`
- **Documentation Style**: Technical Reference

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "total": 0,
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalCount": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

---

# COMPANIES API

## GET /api/companies
**Description**: List all companies with filtering and pagination support.

**Parameters**:
- `page` (query, optional): Page number for pagination. Default: 1
- `limit` (query, optional): Number of items per page. Default: 20
- `industry` (query, optional): Filter by industry sector
- `techRole` (query, optional): Filter by tech role

**Return Value**: Array of company objects with pagination metadata

**Example**:
```bash
curl "http://localhost:3001/api/companies?page=1&limit=10&industry=Technology"
```

**Response**:
```json
{
  "success": true,
  "message": "Companies retrieved successfully",
  "data": [
    {
      "id": 1,
      "companyName": "Bright Innovations Ltd.",
      "companySummary": "AI ethics and digital sustainability.",
      "industry": "Artificial Intelligence",
      "website": "companywebsite.com",
      "logo": "companylogo.url",
      "techRoles": "Software Engineer, Data Scientist",
      "preferredSkillsets": "JavaScript, Python, SQL",
      "contactPerson": "John Doe",
      "contactEmail": "john.doe@example.com",
      "contactPhone": "123-456-7890",
      "contactInfoVisible": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 50
  }
}
```

---

## POST /api/companies
**Description**: Create a new company profile.

**Parameters**:
- `companyName` (body, required): Company name - max 255 characters
- `industry` (body, required): Industry sector - max 100 characters
- `website` (body, optional): Company website - valid URL format
- `techRoles` (body, optional): Tech roles needed - max 500 characters
- `preferredSkillsets` (body, optional): Preferred skills - max 500 characters
- `companySummary` (body, optional): Company description - max 1000 characters
- `emailAddress` (body, required): Contact email - valid email format
- `logoUrl` (body, optional): Company logo URL - valid URL format

**Return Value**: Created company object with ID

**Example**:
```bash
curl -X POST http://localhost:3001/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Innovation Labs",
    "industry": "Technology",
    "website": "https://innovationlabs.com",
    "techRoles": "Full Stack Developer, DevOps Engineer",
    "preferredSkillsets": "React, Node.js, AWS",
    "companySummary": "Innovative tech startup focused on AI solutions",
    "logoUrl": "logo.url",
    "emailAddress": "careers@innovationlabs.com"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Company created successfully",
  "data": {
    "id": 123,
    "companyName": "Innovation Labs",
    "industry": "Technology",
    "website": "https://innovationlabs.com",
    "techRoles": "Full Stack Developer, DevOps Engineer",
    "preferredSkillsets": "React, Node.js, AWS",
    "companySummary": "Innovative tech startup focused on AI solutions",
    "emailAddress": "careers@innovationlabs.com",
    "logoUrl": "logo.url",
    "createdAt": "2024-01-20T14:30:00.000Z",
    "updatedAt": "2024-01-20T14:30:00.000Z"
  }
}
```

---

## GET /api/companies/:id
**Description**: Get a specific company by ID.

**Parameters**:
- `id` (path, required): Company ID

**Return Value**: Company object

**Example**:
```bash
curl http://localhost:3001/api/companies/123
```

**Response**:
```json
{
  "success": true,
  "message": "Company retrieved successfully",
  "data": {
    "id": 123,
    "companyName": "Example Company",
    "companySummary": "This is a summary of the company.",
    "industry": "Technology",
    "website": "https://example.com",
    "logo": "https://example.com/logo.png",
    "techRoles": "Software Engineer, Data Scientist",
    "preferredSkillsets": "JavaScript, Python, SQL",
    "contactPerson": "John Doe",
    "contactEmail": "john.doe@example.com",
    "contactPhone": "123-456-7890",
    "contactInfoVisible": false
  }
}
```

---

## PUT /api/companies/:id
**Description**: Update a company completely (replaces all fields).

**Parameters**:
- `id` (path, required): Company ID
- `companyName` (body, required): Company name - max 255 characters
- `industry` (body, required): Industry sector - max 100 characters
- `website` (body, optional): Company website - valid URL format
- `techRoles` (body, optional): Tech roles needed - max 500 characters
- `preferredSkillsets` (body, optional): Preferred skills - max 500 characters
- `companySummary` (body, optional): Company description - max 1000 characters
- `emailAddress` (body, required): Contact email - valid email format
- `logoUrl` (body, optional): Company logo URL - valid URL format

**Return Value**: Updated company object

**Example**:
```bash
curl -X PUT http://localhost:3001/api/companies/123 \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Innovation Labs Updated",
    "industry": "AI & Machine Learning",
    "website": "https://innovationlabs.io",
    "techRoles": "AI Engineer, ML Researcher",
    "preferredSkillsets": "Python, TensorFlow, PyTorch",
    "companySummary": "AI-focused research and development company",
    "emailAddress": "updated@innovationlabs.com"
  }'
```

---

## PATCH /api/companies/:id
**Description**: Partially update a company (updates only specified fields).

**Parameters**:
- `id` (path, required): Company ID
- Any subset of company fields (body, optional)

**Return Value**: Updated company object

**Example**:
```bash
curl -X PATCH http://localhost:3001/api/companies/123 \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Innovation Labs Pro",
    "techRoles": "Senior AI Engineer, Lead ML Researcher"
  }'
```

---

## DELETE /api/companies/:id
**Description**: Delete a company by ID.

**Parameters**:
- `id` (path, required): Company ID

**Return Value**: Success message

**Example**:
```bash
curl -X DELETE http://localhost:3001/api/companies/123
```

**Response**:
```json
{
  "success": true,
  "message": "Company deleted successfully",
  "data": null
}
```

---

## GET /api/companies/search
**Description**: Search companies across multiple fields with advanced filtering.

**Parameters**:
- `q` (query, required): Search terms - supports multiple words
- `page` (query, optional): Page number for pagination. Default: 1
- `limit` (query, optional): Number of items per page. Default: 20
- `industry` (query, optional): Filter by industry sector
- `techRole` (query, optional): Filter by tech role

**Return Value**: Array of matching companies with relevance scoring

**Example**:
```bash
curl "http://localhost:3001/api/companies/search?q=react+node.js&industry=Technology&limit=10"
```

**Notes**: Searches across company name, description, tech roles, and preferred skills. Multiple search terms are OR'ed together.

---

## GET /api/companies/industries
**Description**: Get all unique industries from companies.

**Return Value**: Array of industry names

**Example**:
```bash
curl http://localhost:3001/api/companies/industries
```

**Response**:
```json
{
  "success": true,
  "message": "Industries retrieved successfully",
  "data": [
    "Technology",
    "Finance",
    "Healthcare",
    "E-commerce",
    "Education"
  ],
  "total": 5
}
```

---

## GET /api/companies/tech-roles
**Description**: Get all unique tech roles from companies.

**Return Value**: Array of tech role names

**Example**:
```bash
curl http://localhost:3001/api/companies/tech-roles
```

**Response**:
```json
{
  "success": true,
  "message": "Tech roles retrieved successfully",
  "data": [
    "Software Engineer",
    "Data Scientist",
    "Full Stack Developer",
    "DevOps Engineer",
    "Frontend Developer",
    "Backend Developer"
  ],
    "total": 6
}
```

---

## GET /api/companies/stats
**Description**: Get comprehensive statistics about companies.

**Return Value**: Company statistics object

**Example**:
```bash
curl http://localhost:3001/api/companies/stats
```

**Response**:
```json
{
  "success": true,
  "message": "Company statistics retrieved successfully",
  "data": {
    "totalCompanies": 2,
    "totalIndustries": 2,
    "totalTechRoles": 2,
    "topIndustries": [
      {
        "item": "E-commerce",
        "count": 1
      }
    ],
      {
        "item": "Telecommunications",
        "count": 1
      },
    "topTechRoles": [
      { "item": "Software Engineer", 
        "count": 1 },
      { "item": "Data Scientist", 
        "count": 1 }
    ],
  }
}
```

---

## POST /api/companies/validate-logo
**Description**: Validate company logo URL and accessibility.

**Parameters**:
- `logoUrl` (body, required): Logo URL to validate

**Return Value**: Validation result with file information

**Example**:
```bash
curl -X POST http://localhost:3001/api/companies/validate-logo \
  -H "Content-Type: application/json" \
  -d '{
    "logoUrl": "https://example.com/company-logo.jpg"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Logo URL validated successfully",
  "data": {
    "isValid": true,
    "isAccessible": true,
    "fileSize": 245680,
    "contentType": "image/jpeg",
    "dimensions": {
      "width": 300,
      "height": 200
    }
  }
}
```

**Notes**: Validates URL format, accessibility, file type (image), and size constraints.

---

# STUDENTS API

## GET /api/students
**Description**: List all students with comprehensive filtering and pagination.

**Parameters**:
- `page` (query, optional): Page number for pagination. Default: 1
- `limit` (query, optional): Number of items per page. Default: 20
- `status` (query, optional): Filter by status ("Current Trainee", "Alumni", "Dropout")
- `university` (query, optional): Filter by university
- `major` (query, optional): Filter by academic major
- `industry` (query, optional): Filter by preferred industry
- `skills` (query, optional): Filter by tech skills (comma-separated)

**Return Value**: Array of student objects with pagination

**Example**:
```bash
curl "http://localhost:3001/api/students?page=1&limit=15&status=Current+Trainee&university=MIT"
```

**Response**:
```json
{
  "success": true,
  "message": "Students retrieved successfully",
  "data": [
    {
      "id": 1,
      "fullName": "John Doe",
      "status": "Current Trainee",
      "university": "Massachusetts Institute of Technology",
      "major": "Computer Science",
      "preferredIndustry": "Technology",
      "techStack": "JavaScript, React, Node.js, Python",
      "selfIntroduction": "Passionate full-stack developer with AI/ML interests",
      "cvUpload": "https://example.com/cv.pdf",
      "profilePhoto": "https://example.com/photo.jpg",
      "linkedin": "https://linkedin.com/in/johndoe",
      "portfolioLink": "https://github.com/johndoe",
      "phone": 62895606191867,
      "timestamp": "2025-10-27T06:34:15.274+00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 15,
    "totalPages": 8,
    "totalCount": 120
  }
}
```

---

## POST /api/students
**Description**: Create a new student profile.

**Parameters**:
- `fullName` (body, required): Student full name - max 255 characters
- `status` (body, required): Student status - must be valid status
- `university` (body, required): University name - max 255 characters
- `major` (body, required): Academic major - max 255 characters
- `preferredIndustry` (body, optional): Preferred industry - max 100 characters
- `techStack` (body, optional): Technical skills - max 1000 characters
- `selfIntroduction` (body, optional): Personal introduction - max 2000 characters
- `cvUrl` (body, optional): CV URL - valid URL format
- `photoUrl` (body, optional): Photo URL - valid URL format
- `emailAddress` (body, optional): Email address - valid email format
- `linkedinUrl` (body, optional): LinkedIn URL - valid URL format
- `githubUrl` (body, optional): GitHub URL - valid URL format

**Return Value**: Created student object with ID

**Example**:
```bash
curl -X POST http://localhost:3001/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Smith",
    "status": "Current Trainee",
    "university": "Stanford University",
    "major": "Computer Science",
    "preferredIndustry": "Technology",
    "techStack": "Python, TensorFlow, React, PostgreSQL",
    "selfIntroduction": "AI/ML enthusiast with experience in building scalable web applications",
    "emailAddress": "jane.smith@stanford.edu",
    "linkedinUrl": "https://linkedin.com/in/janesmith",
    "githubUrl": "https://github.com/janesmith"
  }'
```

---

## GET /api/students/:id
**Description**: Get a specific student by ID.

**Parameters**:
- `id` (path, required): Student ID

**Return Value**: Student object

**Example**:
```bash
curl http://localhost:3001/api/students/456
```

---

## PUT /api/students/:id
**Description**: Update a student completely (replaces all fields).

**Parameters**:
- `id` (path, required): Student ID
- All student fields (body, required except optional ones)

**Return Value**: Updated student object

**Example**:
```bash
curl -X PUT http://localhost:3001/api/students/456 \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Smith Updated",
    "status": "Alumni",
    "university": "Stanford University",
    "major": "Computer Science with AI Specialization",
    "preferredIndustry": "AI & Machine Learning",
    "techStack": "Python, TensorFlow, PyTorch, MLOps",
    "selfIntroduction": "Machine Learning Engineer with 3 years of experience",
    "emailAddress": "jane.smith.alumni@gmail.com"
  }'
```

---

## PATCH /api/students/:id
**Description**: Partially update a student (updates only specified fields).

**Parameters**:
- `id` (path, required): Student ID
- Any subset of student fields (body, optional)

**Return Value**: Updated student object

**Example**:
```bash
curl -X PATCH http://localhost:3001/api/students/456 \
  -H "Content-Type: application/json" \
  -d '{
    "techStack": "Python, TensorFlow, PyTorch, MLOps, Kubernetes",
    "status": "Alumni"
  }'
```

---

## DELETE /api/students/:id
**Description**: Delete a student by ID.

**Parameters**:
- `id` (path, required): Student ID

**Return Value**: Success message

**Example**:
```bash
curl -X DELETE http://localhost:3001/api/students/456
```

---

## GET /api/students/search
**Description**: Search students across multiple fields with advanced filtering.

**Parameters**:
- `q` (query, required): Search terms - supports multiple words
- `page` (query, optional): Page number for pagination. Default: 1
- `limit` (query, optional): Number of items per page. Default: 20
- `status` (query, optional): Filter by status
- `university` (query, optional): Filter by university
- `major` (query, optional): Filter by major
- `industry` (query, optional): Filter by preferred industry
- `skills` (query, optional): Filter by tech skills

**Return Value**: Array of matching students with relevance scoring

**Example**:
```bash
curl "http://localhost:3001/api/students/search?q=machine+learning+python&university=MIT&status=Current+Trainee"
```

**Notes**: Searches across full name, university, major, preferred industry, tech stack, and self-introduction.

---

## GET /api/students/status/:status
**Description**: Get students filtered by specific status.

**Parameters**:
- `status` (path, required): Student status filter
- `page` (query, optional): Page number for pagination. Default: 1
- `limit` (query, optional): Number of items per page. Default: 20

**Return Value**: Array of students with specified status

**Example**:
```bash
curl "http://localhost:3001/api/students/status/Current%20Trainee?page=1&limit=30"
```

---

## GET /api/students/universities
**Description**: Get all unique universities from student profiles.

**Return Value**: Array of university names

**Example**:
```bash
curl http://localhost:3001/api/students/universities
```

**Response**:
```json
{
  "success": true,
  "message": "Universities retrieved successfully",
  "data": [
    "Massachusetts Institute of Technology",
    "Stanford University",
    "Harvard University",
    "University of California, Berkeley",
    "Carnegie Mellon University"
  ],
  "total": 5
}
```

---

## GET /api/students/majors
**Description**: Get all unique academic majors from student profiles.

**Return Value**: Array of major names

**Example**:
```bash
curl http://localhost:3001/api/students/majors
```

**Response**:
```json
{
  "success": true,
  "message": "Majors retrieved successfully",
  "data": [
    "Computer Science",
    "Electrical Engineering",
    "Information Systems",
    "Data Science",
    "Software Engineering"
  ],
  "total": 5
}
```

---

## GET /api/students/industries
**Description**: Get all unique preferred industries from student profiles.

**Return Value**: Array of industry names

**Example**:
```bash
curl http://localhost:3001/api/students/industries
```

---

## GET /api/students/skills
**Description**: Get all unique tech skills from student profiles.

**Return Value**: Array of tech skill names

**Example**:
```bash
curl http://localhost:3001/api/students/skills
```

**Response**:
```json
{
  "success": true,
  "message": "Tech skills retrieved successfully",
  "data": [
    "JavaScript",
    "Python",
    "React",
    "Node.js",
    "TensorFlow",
    "PostgreSQL",
    "AWS",
    "Docker"
  ],
  "total": 8
}
```

---

## GET /api/students/stats
**Description**: Get comprehensive statistics about students.

**Return Value**: Student statistics object

**Example**:
```bash
curl http://localhost:3001/api/students/stats
```

**Response**:
```json
{
  "success": true,
  "message": "Student statistics retrieved successfully",
  "data": {
    "totalStudents": 1200,
    "studentsByStatus": {
      "Current Trainee": 850,
      "Alumni": 350,
    },
    "topUniversities": [
      { "university": "Massachusetts Institute of Technology", "count": 85 },
      { "university": "Stanford University", "count": 75 },
      { "university": "University of California, Berkeley", "count": 65 }
    ],
    "topMajors": [
      { "major": "Computer Science", "count": 450 },
      { "major": "Electrical Engineering", "count": 280 },
      { "major": "Information Systems", "count": 220 }
    ],
    "topIndustries": [
      {
        "item": "Technology",
        "count": 680
      },
      {
        "item": "Finance",
        "count": 220,
      },
      {
        "item": "Healthcare",
        "count": 180
      },
      {
        "item": "E-commerce",
        "count": 120
      },
      {
        "item": "Education", 
        "count": 50
      },
    ],
    "topSkills": [
      { "item": "JavaScript",
         "count": 750 
      },
      { "item": "Python",
        "count": 680 
      },
      { "item": "React", 
        "count": 520
      }
    ]
  }
}
```

---

## POST /api/students/validate-cv
**Description**: Validate student CV URL and accessibility.

**Parameters**:
- `cvUrl` (body, required): CV URL to validate

**Return Value**: Validation result with file information

**Example**:
```bash
curl -X POST http://localhost:3001/api/students/validate-cv \
  -H "Content-Type: application/json" \
  -d '{
    "cvUrl": "https://example.com/student-cv.pdf"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "CV URL validated successfully",
  "data": {
    "isValid": true,
    "isAccessible": true,
    "fileSize": 524288,
    "contentType": "application/pdf",
    "fileName": "student-cv.pdf"
  }
}
```

**Notes**: Validates URL format, accessibility, file type (PDF/DOC/DOCX), and size constraints (max 10MB).

---

## POST /api/students/validate-photo
**Description**: Validate student photo URL and accessibility.

**Parameters**:
- `photoUrl` (body, required): Photo URL to validate

**Return Value**: Validation result with file information

**Example**:
```bash
curl -X POST http://localhost:3001/api/students/validate-photo \
  -H "Content-Type: application/json" \
  -d '{
    "photoUrl": "https://example.com/student-photo.jpg"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Photo URL validated successfully",
  "data": {
    "isValid": true,
    "isAccessible": true,
    "fileSize": 156780,
    "contentType": "image/jpeg",
    "dimensions": {
      "width": 400,
      "height": 400
    }
  }
}
```

**Notes**: Validates URL format, accessibility, file type (image), and size constraints (max 5MB).

---

# LOOKUP API

## GET /api/lookup/all
**Description**: Get all lookup data in a single request (industries, universities, majors, tech roles).

**Return Value**: Combined lookup data object

**Example**:
```bash
curl http://localhost:3001/api/lookup/all
```

**Response**:
```json
{
  "success": true,
  "message": "All lookup data retrieved successfully",
  "data": {
    "industries": ["Technology", "Finance", "Healthcare"],
    "universities": ["MIT", "Stanford", "Harvard"],
    "majors": ["Computer Science", "Electrical Engineering"],
    "studentStatuses": ["Alumni", "Current Trainee"],
    "techRoles": ["Software Engineer", "Data Scientist"],
    "techRoleCategories": ["Development", "Data Science", "Design"]
  }
}
```

**Notes**: This endpoint is cached for 1 hour for optimal performance.

---

## GET /api/industries
**Description**: Get comprehensive list of industries.

**Return Value**: Array of industry objects with metadata

**Example**:
```bash
curl http://localhost:3001/api/industries
```

---

## GET /api/universities
**Description**: Get comprehensive list of universities.

**Return Value**: Array of university objects with metadata

**Example**:
```bash
curl http://localhost:3001/api/universities
```

---

## GET /api/majors
**Description**: Get comprehensive list of academic majors.

**Return Value**: Array of major objects with metadata

**Example**:
```bash
curl http://localhost:3001/api/majors
```

---

## GET /api/tech-roles
**Description**: Get comprehensive list of tech roles.

**Return Value**: Array of tech role objects with categories

**Example**:
```bash
curl http://localhost:3001/api/tech-roles
```

**Response**:
```json
{
  "success": true,
  "message": "Tech roles retrieved successfully",
  "data": [
    "AI Engineer",
    "Backend Developer",
    "Backend Development",
    "Data Science / AI",
    "Data Scientist",
    "DevOps Engineer"
  ],
  "count": 6,
  "timestamp": "2025-10-29T14:56:37.898Z"
}
```

---

## GET /api/tech-role-categories
**Description**: Get all tech role categories.

**Return Value**: Array of category names

**Example**:
```bash
curl http://localhost:3001/api/tech-role-categories
```

**Response**:
```json
{
  "success": true,
  "message": "Tech role categories retrieved successfully",
  "data": {
    "Backend": [
      "Backend Developer"
    ],
    "Data": [
      "Data Scientist"
    ],
    "DevOps": [
      "DevOps Engineer"
    ],
    "Frontend": [
      "Frontend Developer",
      "UI/UX Designer"
    ],
    "Full Stack": [
      "Full Stack Developer"
    ],
    "Mobile": [
      "Mobile Developer"
    ],
    "Other": [
      "AI Engineer"
    ]
  },
  "totalCategories": 7,
  "totalRoles": 8,
  "timestamp": "2025-10-29T14:57:33.242Z"
}
```

---

## GET /api/tech-roles/category/:category
**Description**: Get tech roles filtered by category.

**Parameters**:
- `category` (path, required): Category name

**Return Value**: Array of tech roles in specified category

**Example**:
```bash
curl "http://localhost:3001/api/tech-roles/category/Data"
```

**Response**:
```json
{
  "success": true,
  "message": "Tech roles for category 'Data' retrieved successfully",
  "data": [
    "Data Scientist",
    "Machine Learning Specialist"
  ],
  "category": "Data",
  "count": 2,
  "timestamp": "2025-10-29T14:59:40.454Z"
}
```

---

## GET /api/search/industries
**Description**: Search industries with fuzzy matching.

**Parameters**:
- `q` (query, required): Search query
- `limit` (query, optional): Maximum results. Default: 10

**Return Value**: Array of matching industries

**Example**:
```bash
curl "http://localhost:3001/api/search/industries?q=tech&limit=5"
```

**Response**:
```json
{
  "success": true,
  "message": "Industry search completed successfully",
  "data": [
    {
      "name": "Technology"
    },
    {
      "name": "Information Technology"
    }
  ],
  "query": "tech",
  "count": 2,
  "totalAvailable": 14,
  "timestamp": "2025-10-29T15:00:38.319Z"
}
```

---

## GET /api/search/universities
**Description**: Search universities with fuzzy matching.

**Parameters**:
- `q` (query, required): Search query
- `limit` (query, optional): Maximum results. Default: 10

**Return Value**: Array of matching universities 

**Example**:
```bash
curl "http://localhost:3001/api/search/universities?q=massachusetts&limit=5"
```

---

## GET /api/search/majors
**Description**: Search academic majors with fuzzy matching.

**Parameters**:
- `q` (query, required): Search query
- `limit` (query, optional): Maximum results. Default: 10

**Return Value**: Array of matching majors 

**Example**:
```bash
curl "http://localhost:3001/api/search/majors?q=computer&limit=5"
```

---

## GET /api/search/tech-roles
**Description**: Search tech roles with fuzzy matching.

**Parameters**:
- `q` (query, required): Search query
- `limit` (query, optional): Maximum results. Default: 10

**Return Value**: Array of matching tech roles 

**Example**:
```bash
curl "http://localhost:3001/api/search/tech-roles?q=data&limit=5"
```

**Response**:
```json
{
  "success": true,
  "message": "Tech role search completed successfully",
  "data": [
    {
      "name": "Data Science / AI"
    },
    {
      "name": "Data Scientist"
    }
  ],
  "query": "data",
  "count": 2,
  "totalAvailable": 16,
  "timestamp": "2025-10-29T15:01:58.581Z"
}
```

---

## GET /api/suggestions/tech-skills
**Description**: Get tech skill suggestions based on partial input.

**Parameters**:
- `q` (query, required): Partial skill name
- `limit` (query, optional): Maximum suggestions. Default: 8

**Return Value**: Array of skill suggestions

**Example**:
```bash
curl "http://localhost:3001/api/suggestions/tech-skills?q=java&limit=5"
```

**Response**:
```json
{
  "success": true,
  "message": "Tech skill suggestions retrieved successfully",
  "data": [
    "JavaScript",
    "Java",
    "TypeScript",
    "Java Spring Boot",
    "JavaScript React"
  ],
  "count": 5,
  "totalAvailable": 51,
  "timestamp": "2025-10-29T15:02:30.698Z"
}
```

**Notes**: Provides autocomplete suggestions for tech skills input fields.

---

## GET /api/popular/industries
**Description**: Get most popular industries ranked by usage count.

**Parameters**:
- `limit` (query, optional): Number of results. Default: 10

**Return Value**: Array of popular industries with counts

**Example**:
```bash
curl "http://localhost:3001/api/popular/industries?limit=10"
```

**Response**:
```json
{
  "success": true,
  "message": "Popular industries retrieved successfully",
  "data": [
    {
      "name": "Technology",
      "count": 125
    },
    {
      "name": "Finance",
      "count": 100
    },
    {
      "name": "Healthcare",
      "count": 150
    }
  ],
  "count": 3,
  "totalAvailable": 375,
  "timestamp": "2025-10-29T15:03:20.749Z"
}
```

---

## GET /api/popular/tech-roles
**Description**: Get most popular tech roles ranked by usage count.

**Parameters**:
- `limit` (query, optional): Number of results. Default: 10

**Return Value**: Array of popular tech roles with counts

**Example**:
```bash
curl "http://localhost:3001/api/popular/tech-roles?limit=10"
```

**Response**:
```json
{
  "success": true,
  "message": "Popular tech roles retrieved successfully",
  "data": [
    {
      "name": "Software Engineer",
      "count": 890
    },
    {
      "name": "Full Stack Developer",
      "count": 650
    },
    {
      "name": "Data Scientist",
      "count": 420
    }
  ],
  "count": 3,
  "totalAvailable": 1.960,
  "timestamp": "2025-10-29T15:04:47.916Z"
}
```

---

## GET /api/popular/tech-skills
**Description**: Get most popular tech skills ranked by usage count.

**Parameters**:
- `limit` (query, optional): Number of results. Default: 15

**Return Value**: Array of popular tech skills with counts

**Example**:
```bash
curl "http://localhost:3001/api/popular/tech-skills?limit=15"
```

**Response**:
```json
{
  "success": true,
  "message": "Popular tech skills retrieved successfully",
  "data": [
    {
      "name": "JavaScript",
      "count": 100
    },
    {
      "name": "Python",
      "count": 100
    },
    {
      "name": "React",
      "count": 100
    },
    {
      "name": "Node.js",
      "count": 100
    }
  ],
  "count": 4,
  "totalAvailable": 400,
  "timestamp": "2025-10-29T15:06:53.735Z"
}
```

---

## GET /api/cache/status
**Description**: Get current cache status and performance metrics.

**Return Value**: Cache status object with performance metrics

**Example**:
```bash
curl http://localhost:3001/api/cache/status
```

**Response**:
```json
{
  "success": true,
  "message": "Cache status retrieved successfully",
  "data": {
    "cacheEnabled": true,
    "cacheHits": 1250,
    "cacheMisses": 180,
    "cacheHitRate": 0.874,
    "totalRequests": 1430,
    "averageResponseTime": 45.2,
    "cacheSize": "2.3MB",
    "lastCacheUpdate": "2024-01-20T14:30:00.000Z",
    "cacheVersion": "1.2",
    "ttl": 3600,
    "timeUntilExpiry": 2850
  }
}
```

**Notes**: Provides detailed cache performance metrics for monitoring and optimization.

---

## POST /api/cache/clear
**Description**: Clear lookup cache (admin operation).

**Parameters**:
- `adminKey` (body, optional): Admin authentication key (if configured)

**Return Value**: Cache clear confirmation

**Example**:
```bash
curl -X POST http://localhost:3001/api/cache/clear \
  -H "Content-Type: application/json" \
  -d '{
    "adminKey": "your-admin-key"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "data": {
    "cacheClearedAt": "2024-01-20T15:45:00.000Z",
    "entriesCleared": 45,
    "memoryFreed": "2.3MB"
  }
}
```

**Notes**: Requires admin privileges. Forces cache refresh on next request.

---

## POST /api/validate/tech-skills
**Description**: Validate array of tech skills against known skills database.

**Parameters**:
- `skills` (body, required): Array of skill names to validate

**Return Value**: Validation result with skill analysis

**Example**:
```bash
curl -X POST http://localhost:3001/api/validate/tech-skills \
  -H "Content-Type: application/json" \
  -d '{
    "skills": ["JavaScript", "React", "Python", "UnknownSkill", "Java"]
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Tech skills validation completed",
  "data": {
    "validSkills": ["JavaScript", "React", "Python", "Java"],
    "invalidSkills": ["UnknownSkill"],
    "suggestions": {
      "UnknownSkill": ["Unknown Skill", "Unrecognized Skill"]
    },
    "statistics": {
      "totalSkills": 5,
      "validCount": 4,
      "invalidCount": 1,
      "validityRate": 0.8
    }
  }
}
```

**Notes**: Validates skills against known database and provides suggestions for invalid skills.


# SYSTEM APIS

## GET /health
**Description**: Basic health check endpoint for monitoring systems.

**Return Value**: Health status object

**Example**:
```bash
curl http://localhost:3001/health
```

**Response**:
```json
{
  "status": "OK",
  "message": "KADA Connect Backend is running",
  "timestamp": "2025-10-29T15:09:12.852Z",
  "version": "1.0.0"
}
```

**Notes**: Designed for load balancers and monitoring systems. Returns HTTP 200 for healthy status.

---

## GET /api/docs
**Description**: Redirect or return API documentation.

**Return Value**: Documentation information

**Example**:
```bash
curl http://localhost:3001/api/docs
```

**Response**:
```json
{
  "message": "KADA Connect API Documentation",
  "version": "1.0.0",
  "baseUrl": "http://localhost:3001/api",
  "endpoints": {
    "companies": {
      "GET /companies": "List companies with filtering and pagination",
      "GET /companies/:id": "Get company by ID",
      "GET /companies/stats": "Get company statistics",
      "POST /companies/search": "Advanced company search",
      "POST /companies/validate-logo": "Validate company logo upload"
    },
    "students": {
      "GET /students": "List students with filtering and pagination",
      "GET /students/:id": "Get student by ID",
      "GET /students/stats": "Get student statistics",
      "GET /students/featured": "Get featured students",
      "GET /students/status-options": "Get student status options",
    },
    "lookup": {
      "GET /lookup/all": "Get all lookup data",
      "GET /industries": "Get industries list",
      "GET /tech-roles": "Get tech roles list",
      "GET /tech-role-categories": "Get tech role categories"
    }
  }
}
```

**Notes**: Provides navigation to comprehensive API documentation and supporting resources.

---

# ERROR HANDLING

## Standard Error Response Format

All API errors follow this consistent format:

```json
{
  "success": false,
  "message": "Detailed error description",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "field": "emailAddress",
    "details": "Invalid email format"
  }
}
```

## Common HTTP Status Codes

| Status Code | Meaning | When Used |
|-------------|---------|-----------|
| 200 | OK | Successful request |
| 201 | Created | Resource successfully created |
| 400 | Bad Request | Invalid request format or validation errors |
| 401 | Unauthorized | Authentication required or invalid credentials |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

## Validation Error Examples

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "field": "emailAddress",
    "details": "Invalid email format"
  }
}
```

## Rate Limiting Error

```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "data": null,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "limit": 50,
    "window": 900000,
    "retryAfter": 300
  }
}
```

---

# PAGINATION

List endpoints support consistent pagination:

## Query Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

## Response Format
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalCount": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

# RATE LIMITING

## Rate Limit Configuration

- **Standard endpoints**: 1000 requests per hour per IP
- **Proxy endpoints**: 50 requests per 15 minutes per IP
- **Search endpoints**: 200 requests per minute per IP
- **Admin endpoints**: 100 requests per hour per admin key

## Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1642694400
```

## Rate Limit Error Response

```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "data": null,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 3600
  }
}
```

---

# SECURITY CONSIDERATIONS

## CORS Configuration

The API implements CORS with configurable allowed origins.

## Input Validation

- All inputs are validated using Joi schemas
- SQL injection protection through parameterized queries
- XSS protection with input sanitization
- File upload restrictions for security

## Proxy API Security

- Domain allowlist for URL proxying
- File type and size restrictions
- Rate limiting to prevent abuse
- Access logging and monitoring

## Data Protection

- Environment variables for sensitive configuration
- No sensitive data in API responses
- Secure headers implementation with Helmet.js
- Regular security updates and monitoring

---

## API Versioning

Current version: **v1.2.0**

Version history and changelog available in `docs/CHANGELOG.md`.

## Support

For API support and questions:
- **Documentation**: [docs/API.md](docs/API.md)
- **Email**: contactrasya@gmail.com
- **Postman Collection**: `/collection/` directory

## Quick Testing Examples

```bash
# Health check
curl http://localhost:3001/health

# Get companies with pagination
curl "http://localhost:3001/api/companies?page=1&limit=10"

# Search students
curl "http://localhost:3001/api/students/search?q=python+react"


# Get cache status
curl http://localhost:3001/api/cache/status
```

---

*Last updated: October 29, 2025*
*API Version: 1.0.0*