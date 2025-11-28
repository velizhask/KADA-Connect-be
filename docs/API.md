# KADA Connect API Documentation

## Table of Contents
1. [Quick Start](#quick-start)
2. [Role-Based Access Control](#role-based-access-control)
3. [Authentication](#authentication)
4. [Current User Profile](#current-user-profile)
5. [Companies API](#companies-api)
6. [Students API](#students-api)
7. [File Upload](#file-upload)
8. [Error Handling](#error-handling)
9. [Field Names Guide](#field-names-guide)

---

## Quick Start

### Base Configuration
```javascript
const API_BASE_URL = 'http://localhost:3001/api';
```

### Standard Response Format
```javascript
// Success
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}

// Error
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

### Critical Notes for Frontend
1. All endpoints require authentication (except login/register)
2. All IDs are UUID v4 format (not numbers): `550e8400-e29b-41d4-a716-446655440000`
3. Use PATCH for updates (PUT is disabled)
4. File uploads use FormData (not JSON)

---

## Role-Based Access Control

### Overview
The API implements role-based access control with three user roles: **admin**, **student**, and **company**. Access to resources varies by role and is designed to facilitate networking while protecting privacy.

### Roles and Permissions

#### **ADMIN**
**Full access to all resources**

**Companies:**
- Can view ALL companies (including invisible ones)
- Can create, update, delete any company
- Can view all company data including hidden fields

**Students:**
- Can view ALL students (including invisible ones)
- Can create, update, delete any student
- Can view all student data including hidden fields
- Can see employment status for all students

**Use Case:** Platform administrators managing the system

---

#### **STUDENT**
**Networking-focused access**

**Companies:**
- Can view ALL visible companies
- Cannot create/update/delete companies

**Students:**
- Can view ALL other students (both "Open to work" and "Employed")
- Can view only VISIBLE students (isVisible = true)
- Can search all students
- Can view own profile even if invisible
- Cannot view invisible profiles of other students

**Use Case:** Students networking with peers, viewing company opportunities

---

#### **COMPANY**
**Job-seeking focused access**

**Companies:**
- Can view and update own company profile
- Can view ALL visible companies (other companies)

**Students:**
- Can view ONLY "Open to work" students
- Cannot see "Employed" students (prevents poaching)
- Can search only "Open to work" students
- Cannot see invisible students (isVisible = false)
- Can view ALL visible companies

**Use Case:** Companies looking for job candidates


---

### Employment Status Filtering

**"Open to work" students** are visible to:
- All users (admin, student, company)

**"Employed" students** are visible to:
- Admin (full access)
- Student role (for networking)

### Visibility (isVisible) Field

The `isVisible` field implements **soft delete** functionality:

**When isVisible = true:**
- Visible to all users (according to role permissions above)

**When isVisible = false:**
- Visible only to Admin (for management)
- Visible to the resource owner (student/company viewing own profile)
- Hidden from all other users

**Default:** true (new records are visible by default)

**Use Cases:**
- Temporarily hiding a profile
- Soft delete before permanent deletion
- Hiding inactive accounts

---

## Authentication

### POST /api/auth/login
**Login with email and password**

**Request:**
```javascript
const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const data = await response.json();
// Save tokens for subsequent requests
localStorage.setItem('access_token', data.data.accessToken);
localStorage.setItem('refresh_token', data.data.refreshToken);
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "v1...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "role": "student" // or "company", "admin"
    }
  }
}
```

### POST /api/auth/register
**Register new account**

**Request:**
```javascript
const response = await fetch(`${API_BASE_URL}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'password123',
    fullName: 'John Doe',
    role: 'student' // or 'company'
  })
});
```

### POST /api/auth/logout
**Logout and invalidate session**

**Request:**
```javascript
const token = localStorage.getItem('access_token');
await fetch(`${API_BASE_URL}/auth/logout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
// Clear local storage
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
```

---

## Current User Profile

### GET /api/auth/me/profile
**Get current user's own profile**

**Request:**
```javascript
const token = localStorage.getItem('access_token');
const response = await fetch(`${API_BASE_URL}/auth/me/profile`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
```

**Response (Student):**
```javascript
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "John Doe",
    "status": "Current Trainee",
    "employmentStatus": "Open to work",
    "university": "MIT",
    "major": "Computer Science",
    "preferredIndustry": "Technology",
    "techStack": "JavaScript, React, Node.js",
    "selfIntroduction": "Passionate developer...",
    "cvUpload": null,
    "profilePhoto": null,
    "linkedin": "https://linkedin.com/in/john",
    "portfolioLink": "https://github.com/john",
    "phone": "1234567890",
    "batch": "Batch 1",
    "isVisible": true,
    "timestamp": "2025-11-26T10:00:00.000Z"
  }
}
```

**Response (Company):**
```javascript
{
  "success": true,
  "data": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "companyName": "Tech Corp",
    "companySummary": "Innovative tech company",
    "industry": "Technology",
    "website": "https://techcorp.com",
    "logo": null,
    "techRoles": "Software Engineer",
    "preferredSkillsets": "JavaScript, Python",
    "contactPerson": "Jane Smith",
    "contactEmail": "contact@techcorp.com",
    "contactPhone": "+1234567890",
    "contactInfoVisible": false,
    "isVisible": true,
    "timestamp": "2025-11-26T10:00:00.000Z"
  }
}
```

### PATCH /api/auth/me/profile
**Update current user's own profile**

**Request (Student):**
```javascript
const token = localStorage.getItem('access_token');
await fetch(`${API_BASE_URL}/auth/me/profile`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    "fullName": "John Doe Updated",
    "techStack": "JavaScript, React, Node.js, Python",
    "phone": "+1234567890"
  })
});
// Note: Only provided fields are updated (PATCH behavior)
```

**Request (Company):**
```javascript
const token = localStorage.getItem('access_token');
await fetch(`${API_BASE_URL}/auth/me/profile`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    "website": "https://updated-website.com",
    "companySummary": "Updated company description"
  })
});
```

---

## Companies API

### GET /api/companies
**List all companies with filtering**

**Query Parameters:**
```javascript
const params = new URLSearchParams({
  page: 1,
  limit: 20,
  industry: "Technology", // optional
  techRole: "Software Engineer" // optional
});
const response = await fetch(`${API_BASE_URL}/companies?${params}`);
const data = await response.json();
```

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "companyName": "Tech Corp",
      "companySummary": "Innovative tech company",
      "industry": "Technology",
      "website": "https://techcorp.com",
      "logo": "https://example.com/logo.png",
      "techRoles": "Software Engineer",
      "preferredSkillsets": "JavaScript, Python",
      "contactPerson": "Jane Smith",
      "contactEmail": "contact@techcorp.com",
      "contactPhone": "+1234567890",
      "contactInfoVisible": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalCount": 100
  }
}
```

### GET /api/companies/:id
**Get specific company (UUID required)**

**Request:**
```javascript
const companyId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // UUID, not number
const response = await fetch(`${API_BASE_URL}/companies/${companyId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
```

**Important: UUID Format Required**
```javascript
// Wrong - Will fail with 400 error
const id = 123;

// Correct - UUID v4 format
const id = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
```

### POST /api/companies
**Create new company**

**Request:**
```javascript
const token = localStorage.getItem('access_token');
await fetch(`${API_BASE_URL}/companies`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    "companyName": "New Tech Corp",
    "companySummary": "A technology company focused on innovation",
    "industry": "Technology",
    "emailAddress": "info@newtechcorp.com",
    "website": "https://newtechcorp.com",
    "techRoles": "Software Engineer, Data Scientist",
    "preferredSkillsets": "JavaScript, Python, AI"
  })
});
```

### PATCH /api/companies/:id
**Update company (partial update only)**

**Request:**
```javascript
const token = localStorage.getItem('access_token');
const companyId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
await fetch(`${API_BASE_URL}/companies/${companyId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    // Only update provided fields - other fields remain unchanged
    "website": "https://updated-site.com"
  })
});
```

**Key Point: PATCH vs PUT**
- **PATCH** (Used): Updates only specified fields, others remain unchanged
- **PUT** (Disabled): Would replace entire resource, potentially nulling other fields

### DELETE /api/companies/:id
**Delete company**

**Request:**
```javascript
const token = localStorage.getItem('access_token');
const companyId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
await fetch(`${API_BASE_URL}/companies/${companyId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### GET /api/companies/search
**Search companies**

**Request:**
```javascript
const params = new URLSearchParams({
  q: "react python developer",
  industry: "Technology",
  limit: 10
});
const response = await fetch(`${API_BASE_URL}/companies/search?${params}`);
const data = await response.json();
```

### GET /api/companies/industries
**Get list of industries**

**Request:**
```javascript
const response = await fetch(`${API_BASE_URL}/companies/industries`);
const data = await response.json();
// Returns: ["Technology", "Finance", "Healthcare", ...]
```

### GET /api/companies/tech-roles
**Get list of tech roles**

**Request:**
```javascript
const response = await fetch(`${API_BASE_URL}/companies/tech-roles`);
const data = await response.json();
// Returns: ["Software Engineer", "Data Scientist", ...]
```

---

## Students API

### GET /api/students
**List all students with filtering**

**Query Parameters:**
```javascript
const params = new URLSearchParams({
  page: 1,
  limit: 20,
  status: "Current Trainee", // or "Alumni"
  university: "MIT",
  major: "Computer Science",
  industry: "Technology",
  skills: "javascript,react" // comma-separated
});
const response = await fetch(`${API_BASE_URL}/students?${params}`);
const data = await response.json();
```

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "fullName": "John Doe",
      "status": "Current Trainee",
      "employmentStatus": "Open to work",
      "university": "MIT",
      "major": "Computer Science",
      "preferredIndustry": "Technology",
      "techStack": "JavaScript, React, Node.js",
      "selfIntroduction": "Passionate developer...",
      "cvUpload": null,
      "profilePhoto": null,
      "linkedin": "https://linkedin.com/in/john",
      "portfolioLink": "https://github.com/john",
      "batch": "Batch 1",
      "isVisible": true,
      "timestamp": "2025-11-26T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalCount": 100
  }
}
```

**Note:** Each student record includes:
- `batch`: Bootcamp batch (e.g., "Batch 1", "Batch 2", "Batch 3", or null)
- `isVisible`: Visibility status (true = visible to others, false = hidden)

### GET /api/students/:id
**Get specific student (UUID required)**

**Request:**
```javascript
const studentId = "550e8400-e29b-41d4-a716-446655440000"; // UUID
const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
```

### POST /api/students
**Create new student**

**Request:**
```javascript
const token = localStorage.getItem('access_token');
await fetch(`${API_BASE_URL}/students`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    "fullName": "Jane Smith",
    "status": "Current Trainee",
    "employmentStatus": "Open to work",
    "university": "Stanford University",
    "major": "Computer Science",
    "preferredIndustry": "Technology",
    "techStack": "Python, TensorFlow, React",
    "selfIntroduction": "AI/ML enthusiast with experience..."
  })
});
```

### PATCH /api/students/:id
**Update student (partial update only)**

**Request:**
```javascript
const token = localStorage.getItem('access_token');
const studentId = "550e8400-e29b-41d4-a716-446655440000";
await fetch(`${API_BASE_URL}/students/${studentId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    "techStack": "JavaScript, React, Node.js, Python",
    "status": "Alumni"
    // Other fields remain unchanged
  })
});
```

### DELETE /api/students/:id
**Delete student**

**Request:**
```javascript
const token = localStorage.getItem('access_token');
const studentId = "550e8400-e29b-41d4-a716-446655440000";
await fetch(`${API_BASE_URL}/students/${studentId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### GET /api/students/search
**Search students**

**Request:**
```javascript
const params = new URLSearchParams({
  q: "react node developer",
  status: "Current Trainee",
  university: "MIT",
  limit: 10
});
const response = await fetch(`${API_BASE_URL}/students/search?${params}`);
const data = await response.json();
```

### GET /api/students/status/:status
**Get students by status**

**Request:**
```javascript
const response = await fetch(`${API_BASE_URL}/students/status/Current%20Trainee`);
const data = await response.json();
```

### GET /api/students/universities
**Get unique universities**

**Request:**
```javascript
const response = await fetch(`${API_BASE_URL}/students/universities`);
const data = await response.json();
// Returns: ["MIT", "Stanford", "Harvard", ...]
```

### GET /api/students/majors
**Get unique majors**

**Request:**
```javascript
const response = await fetch(`${API_BASE_URL}/students/majors`);
const data = await response.json();
// Returns: ["Computer Science", "Electrical Engineering", ...]
```

### GET /api/students/industries
**Get unique preferred industries**

**Request:**
```javascript
const response = await fetch(`${API_BASE_URL}/students/industries`);
const data = await response.json();
// Returns: ["Technology", "Finance", "Healthcare", ...]
```

### GET /api/students/skills
**Get unique tech skills**

**Request:**
```javascript
const response = await fetch(`${API_BASE_URL}/students/skills`);
const data = await response.json();
// Returns: ["JavaScript", "Python", "React", ...]
```

---

## File Upload

### Student CV Upload

**POST /api/students/:id/cv**
```javascript
const token = localStorage.getItem('access_token');
const studentId = "550e8400-e29b-41d4-a716-446655440000";

// Create FormData
const formData = new FormData();
formData.append('cv', fileInput.files[0]); // 'cv' is the field name

await fetch(`${API_BASE_URL}/students/${studentId}/cv`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // Don't set Content-Type - browser will set it with boundary
  },
  body: formData
});
```

**Response:**
```javascript
{
  "success": true,
  "message": "CV uploaded successfully",
  "data": {
    "studentId": "550e8400-e29b-41d4-a716-446655440000",
    "cv": {
      "id": "file-uuid",
      "url": "https://storage-url.com/cvs/filename.pdf",
      "originalName": "resume.pdf",
      "size": 123456,
      "mimeType": "application/pdf",
      "uploadedAt": "2025-11-26T10:00:00.000Z"
    }
  }
}
```

### Student Profile Photo Upload

**POST /api/students/:id/photo**
```javascript
const token = localStorage.getItem('access_token');
const studentId = "550e8400-e29b-41d4-a716-446655440000";

const formData = new FormData();
formData.append('photo', fileInput.files[0]);

await fetch(`${API_BASE_URL}/students/${studentId}/photo`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### Company Logo Upload

**POST /api/companies/:id/logo**
```javascript
const token = localStorage.getItem('access_token');
const companyId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

const formData = new FormData();
formData.append('logo', fileInput.files[0]);

await fetch(`${API_BASE_URL}/companies/${companyId}/logo`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### File Deletion

**DELETE /api/students/:id/cv**
```javascript
const token = localStorage.getItem('access_token');
const studentId = "550e8400-e29b-41d4-a716-446655440000";

await fetch(`${API_BASE_URL}/students/${studentId}/cv`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**DELETE /api/students/:id/photo**
```javascript
const token = localStorage.getItem('access_token');
const studentId = "550e8400-e29b-41d4-a716-446655440000";

await fetch(`${API_BASE_URL}/students/${studentId}/photo`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**DELETE /api/companies/:id/logo**
```javascript
const token = localStorage.getItem('access_token');
const companyId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

await fetch(`${API_BASE_URL}/companies/${companyId}/logo`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### File Upload via Profile Endpoint

You can also upload files through the profile endpoint:

**POST /api/auth/me/cv** (students only)
```javascript
const token = localStorage.getItem('access_token');
const formData = new FormData();
formData.append('cv', fileInput.files[0]);

await fetch(`${API_BASE_URL}/auth/me/cv`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

**POST /api/auth/me/photo** (students only)
```javascript
const token = localStorage.getItem('access_token');
const formData = new FormData();
formData.append('photo', fileInput.files[0]);

await fetch(`${API_BASE_URL}/auth/me/photo`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

**POST /api/auth/me/logo** (companies only)
```javascript
const token = localStorage.getItem('access_token');
const formData = new FormData();
formData.append('logo', fileInput.files[0]);

await fetch(`${API_BASE_URL}/auth/me/logo`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

---

## Error Handling

### Standard Error Response
```javascript
{
  "success": false,
  "message": "Detailed error description",
  "data": null
}
```

### Common HTTP Status Codes

| Code | Meaning | Frontend Action |
|------|---------|----------------|
| 200 | Success | Continue |
| 201 | Created | Resource created |
| 400 | Bad Request | Show error to user |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Show "permission denied" |
| 404 | Not Found | Show "not found" |
| 500 | Server Error | Show "something went wrong" |

### Validation Error Example
```javascript
// When updating without required fields or wrong format
{
  "success": false,
  "message": "Validation failed",
  "error": "Website must be a valid URL"
}
```

### Authentication Error Example
```javascript
// When token is expired or invalid
{
  "success": false,
  "message": "Invalid or expired token",
  "data": null
}
```

**Frontend Action:**
```javascript
// Check for 401 and redirect to login
if (response.status === 401) {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
}
```

### UUID Validation Error
```javascript
// When sending non-UUID ID
{
  "success": false,
  "message": "Valid student ID (UUID) is required",
  "data": null
}
```

**Frontend Action:**
```javascript
// Always use UUID format for IDs
const studentId = "550e8400-e29b-41d4-a716-446655440000"; // Correct
// Not: const studentId = 123; Wrong
```

---

## Field Names Guide

### Company Fields

**Response Format (What you receive):**
```javascript
{
  "companyName": "Tech Corp",
  "companySummary": "Company description",
  "industry": "Technology",
  "website": "https://techcorp.com",
  "logo": "https://logo-url.com/logo.png",
  "techRoles": "Software Engineer",
  "preferredSkillsets": "JavaScript, Python",
  "contactPerson": "John Doe",
  "contactEmail": "john@techcorp.com",
  "contactPhone": "+1234567890",
  "contactInfoVisible": false,
  "isVisible": true
}
```

**When Sending (Accept both formats):**
```javascript
// New format (recommended)
{
  "website": "https://new-site.com",
  "contactPerson": "Jane Doe",
  "contactEmail": "jane@techcorp.com",
  "contactPhone": "+1234567890",
  "contactInfoVisible": true,
  "isVisible": false
}

// Old format (also works for backward compatibility)
{
  "companyWebsite": "https://new-site.com",
  "contactPersonName": "Jane Doe",
  "contactEmailAddress": "jane@techcorp.com",
  "contactPhoneNumber": "+1234567890",
  "visibleContactInfo": true
}
```

**Field Notes:**
- `website` or `companyWebsite`: Both accepted
- `contactPerson` or `contactPersonName`: Both accepted
- `contactEmail` or `contactEmailAddress`: Both accepted
- `contactPhone` or `contactPhoneNumber`: Both accepted
- `contactInfoVisible` or `visibleContactInfo`: Both accepted
- `isVisible`: Optional boolean for soft delete (default: true)

### Student Fields

**Response Format (What you receive):**
```javascript
{
  "fullName": "John Doe",
  "status": "Current Trainee",
  "employmentStatus": "Open to work",
  "university": "MIT",
  "major": "Computer Science",
  "preferredIndustry": "Technology",
  "techStack": "JavaScript, React",
  "selfIntroduction": "About me...",
  "cvUpload": "https://cv-url.com/cv.pdf",
  "profilePhoto": "https://photo-url.com/photo.jpg",
  "linkedin": "https://linkedin.com/in/john",
  "portfolioLink": "https://github.com/john",
  "phone": "1234567890",
  "batch": "Batch 1",
  "isVisible": true
}
```

**When Sending (Accept both formats):**
```javascript
// New format (recommended)
{
  "phone": "+1234567890",
  "batch": "Batch 2",
  "isVisible": false
}

// Old format (also works for backward compatibility)
{
  "phoneNumber": "+1234567890"
}
```

**Field Notes:**
- `batch`: Optional field for bootcamp batch (e.g., "Batch 1", "Batch 2", "Batch 3")
- `isVisible`: Optional boolean for soft delete (default: true)
- `phone` or `phoneNumber`: Both accepted for backward compatibility

---

## Frontend Integration Tips

### 1. Authentication Helper
```javascript
// api.js
const API_BASE_URL = 'http://localhost:3001/api';

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  });

  if (response.status === 401) {
    // Token expired, redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    return;
  }

  const data = await response.json();
  return data;
}

// Usage
const companies = await apiRequest('/companies');
const profile = await apiRequest('/auth/me/profile');
```

### 2. File Upload Helper
```javascript
async function uploadFile(endpoint, file, fieldName = 'file') {
  const token = localStorage.getItem('access_token');
  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` })
      // Don't set Content-Type for FormData
    },
    body: formData
  });

  return await response.json();
}

// Usage
const result = await uploadFile('/auth/me/cv', fileInput.files[0], 'cv');
```

### 3. UUID Generation (for new resources)
```javascript
// Generate UUID v4 for new resources
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// But you don't need to - API returns UUIDs in responses
```

### 4. Form Handling for PATCH
```javascript
// Collect only changed fields for PATCH request
function prepareUpdateData(formData, originalData) {
  const updates = {};

  Object.keys(formData).forEach(key => {
    if (formData[key] !== originalData[key]) {
      updates[key] = formData[key];
    }
  });

  return updates;
}

// Usage
const changes = prepareUpdateData(formData, currentProfile);
if (Object.keys(changes).length > 0) {
  await apiRequest('/auth/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(changes)
  });
}
```

### 5. Error Message Display
```javascript
function showError(error) {
  const message = typeof error === 'string'
    ? error
    : error.message || 'An error occurred';

  alert(message); // Or use your preferred UI library
}

// Usage
try {
  await updateProfile(data);
} catch (error) {
  showError(error);
}
```

---

## Quick Reference

### All Endpoints Summary

**Authentication:**
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/logout` - Logout

**Current User:**
- `GET /api/auth/me/profile` - Get profile
- `PATCH /api/auth/me/profile` - Update profile
- `POST /api/auth/me/cv` - Upload CV (students)
- `POST /api/auth/me/photo` - Upload photo (students)
- `POST /api/auth/me/logo` - Upload logo (companies)

**Companies:**
- `GET /api/companies` - List companies
- `GET /api/companies/:id` - Get company (UUID)
- `POST /api/companies` - Create company
- `PATCH /api/companies/:id` - Update company (UUID)
- `DELETE /api/companies/:id` - Delete company (UUID)
- `GET /api/companies/search` - Search
- `GET /api/companies/industries` - Get industries
- `GET /api/companies/tech-roles` - Get tech roles
- `POST /api/companies/:id/logo` - Upload logo
- `GET /api/companies/:id/logo` - Get logo
- `DELETE /api/companies/:id/logo` - Delete logo

**Students:**
- `GET /api/students` - List students
- `GET /api/students/:id` - Get student (UUID)
- `POST /api/students` - Create student
- `PATCH /api/students/:id` - Update student (UUID)
- `DELETE /api/students/:id` - Delete student (UUID)
- `GET /api/students/search` - Search
- `GET /api/students/status/:status` - Get by status
- `GET /api/students/universities` - Get universities
- `GET /api/students/majors` - Get majors
- `GET /api/students/industries` - Get industries
- `GET /api/students/skills` - Get skills
- `POST /api/students/:id/cv` - Upload CV
- `GET /api/students/:id/cv` - Get CV
- `DELETE /api/students/:id/cv` - Delete CV
- `POST /api/students/:id/photo` - Upload photo
- `GET /api/students/:id/photo` - Get photo
- `DELETE /api/students/:id/photo` - Delete photo

---

## UUID Format

All IDs in the API use **UUID v4** format:

```javascript
// Examples of valid UUIDs:
"550e8400-e29b-41d4-a716-446655440000"
"6ba7b810-9dad-11d1-80b4-00c04fd430c8"
"f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Format breakdown:**
- 8-4-4-4-12 hexadecimal characters
- Hyphens separate the groups
- Version 4 (indicated by the 4 in position 14)
- Variant 10b (indicated by the 8, 9, a, or b in position 19)

**Validation in JavaScript:**
```javascript
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

isValidUUID("550e8400-e29b-41d4-a716-446655440000"); // true
isValidUUID("123"); // false
```

---

*Last Updated: 2025-11-26*
*API Version: 2.0.0*

