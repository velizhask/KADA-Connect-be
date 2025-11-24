const { supabase } = require('../db');
const { responseCache } = require('./responseCacheService');

class StudentService {
  async getAllStudents(filters = {}) {
    try {
      // Add employment status to filters for proper cache key generation
      const cacheFilters = {
        ...filters,
        employmentStatus: 'Open to work' // Include employment status in cache key
      };

      // Check cache first for list responses
      const cacheKey = 'getAllStudents';
      const cachedResponse = responseCache.getAPIResponse(cacheKey, cacheFilters);

      if (cachedResponse) {
        return cachedResponse.data;
      }

      let query = supabase
        .from('students')
        .select(`
          id,
          full_name,
          status,
          employment_status,
          university_institution,
          program_major,
          preferred_industry,
          tech_stack_skills,
          self_introduction,
          cv_upload,
          profile_photo,
          linkedin,
          portfolio_link,
          phone_number,
          "timestamp"
        `, { count: 'exact' });

      // Apply filters
      if (filters.status) {
        query = query.ilike('status', `%${filters.status}%`);
      }

      if (filters.university) {
        query = query.ilike('university_institution', `%${filters.university}%`);
      }

      if (filters.major) {
        query = query.ilike('program_major', `%${filters.major}%`);
      }

      if (filters.industry) {
        query = query.ilike('preferred_industry', `%${filters.industry}%`);
      }

      if (filters.skills) {
        query = query.ilike('tech_stack_skills', `%${filters.skills}%`);
      }

      // Filter out employed students - only show "Open to work" students
      query = query.eq('employment_status', 'Open to work');

      // Apply pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      query = query
        .range(offset, offset + limit - 1)
        .order('full_name');

      const { data, error, count } = await query;

      if (error) {
        console.error('[ERROR] Failed to fetch students:', error.message);
        throw new Error('Failed to fetch students');
      }

      // Transform data to camelCase for API consistency
      const transformedData = data.map(student => this.transformStudentDataPublic(student));

      const response = {
        students: transformedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };

      // Cache the response
      responseCache.setAPIResponse(cacheKey, cacheFilters, response);

      return response;
    } catch (error) {
      console.error('[ERROR] StudentService.getAllStudents:', error.message);
      throw error;
    }
  }

  async getStudentById(id) {
    try {
      // Check cache first for individual student
      const cacheKey = 'getStudentById';
      const cacheParams = {
        id,
        employmentStatus: 'Open to work' // Include employment status in cache key
      };
      const cachedResponse = responseCache.getAPIResponse(cacheKey, cacheParams);

      if (cachedResponse && cachedResponse.data.user_id) {
        return cachedResponse.data;
      }

      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          "full_name",
          status,
          employment_status,
          university_institution,
          program_major,
          preferred_industry,
          tech_stack_skills,
          self_introduction,
          cv_upload,
          profile_photo,
          linkedin,
          portfolio_link,
          phone_number,
          "timestamp"
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Student not found
        }
        console.error('[ERROR] Failed to fetch student:', error.message);
        throw new Error('Failed to fetch student');
      }

      // Check if student is employed - if so, don't return their data
      if (data['employment_status'] === 'Employed') {
        return null; // Hide employed students
      }

      // For internal use (authorization checks), attach user_id to the public data
      const transformedData = this.transformStudentDataPublic(data);
      transformedData.user_id = data.user_id;

      // Cache the individual student response
      responseCache.setAPIResponse(cacheKey, cacheParams, transformedData);

      return transformedData;
    } catch (error) {
      console.error('[ERROR] StudentService.getStudentById:', error.message);
      throw error;
    }
  }

  async searchStudents(searchTerm, filters = {}) {
    try {
      // Parse multiple search terms
      const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);

      if (searchTerms.length === 0) {
        return [];
      }

      let query = supabase
        .from('students')
        .select(`
          id,
          full_name,
          status,
          employment_status,
          university_institution,
          program_major,
          preferred_industry,
          tech_stack_skills,
          self_introduction,
          cv_upload,
          profile_photo,
          linkedin,
          portfolio_link,
          phone_number
        `);

      // Build dynamic OR conditions for multiple search terms
      if (searchTerms.length === 1) {
        // Single term search (using unquoted field names like working company service)
        const singleTermQuery = `full_name.ilike.%${searchTerms[0]}%,self_introduction.ilike.%${searchTerms[0]}%,tech_stack_skills.ilike.%${searchTerms[0]}%,university_institution.ilike.%${searchTerms[0]}%,program_major.ilike.%${searchTerms[0]}%,preferred_industry.ilike.%${searchTerms[0]}%`;
          query = query.or(singleTermQuery);
      } else {
        // Multiple terms search - each term must match at least one field (Supabase handles parentheses automatically)
        const orConditions = searchTerms.map(term =>
          `full_name.ilike.%${term}%,self_introduction.ilike.%${term}%,tech_stack_skills.ilike.%${term}%,university_institution.ilike.%${term}%,program_major.ilike.%${term}%,preferred_industry.ilike.%${term}%`
        );
        query = query.or(orConditions.join(','));
      }

      // Apply additional filters
      if (filters.status) {
        query = query.ilike('status', `%${filters.status}%`);
      }

      if (filters.university) {
        query = query.ilike('university_institution', `%${filters.university}%`);
      }

      if (filters.major) {
        query = query.ilike('program_major', `%${filters.major}%`);
      }

      if (filters.industry) {
        query = query.ilike('preferred_industry', `%${filters.industry}%`);
      }

      if (filters.skills) {
        query = query.ilike('tech_stack_skills', `%${filters.skills}%`);
      }

      // Filter out employed students - only show "Open to work" students
      query = query.eq('employment_status', 'Open to work');

      const { data, error } = await query
        .order('full_name')
        .limit(50); // Limit search results

      
      if (error) {
        console.error('[ERROR] Failed to search students:', error.message);
        console.error('[ERROR] Query details:', { searchTerm, searchTerms, filters });
        throw new Error('Failed to search students');
      }

      const results = data.map(student => this.transformStudentDataPublic(student));
      return results;
    } catch (error) {
      console.error('[ERROR] StudentService.searchStudents:', error.message);
      throw error;
    }
  }

  async getStudentsByStatus(status) {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          "full_name",
          status,
          employment_status,
          university_institution,
          program_major,
          preferred_industry,
          tech_stack_skills,
          profile_photo,
          linkedin
        `)
        .ilike('status', status)
        .eq('employment_status', 'Open to work') // Only show "Open to work" students
        .order('full_name');

      if (error) {
        console.error('[ERROR] Failed to fetch students by status:', error.message);
        throw new Error('Failed to fetch students by status');
      }

      const transformedResults = data.map(student => this.transformStudentDataPublic(student));
      return transformedResults;
    } catch (error) {
      console.error('[ERROR] StudentService.getStudentsByStatus:', error.message);
      throw error;
    }
  }

  async getUniqueUniversities() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('university_institution')
        .eq('employment_status', 'Open to work') // Only include "Open to work" students
        .not('university_institution', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch universities:', error.message);
        throw new Error('Failed to fetch universities');
      }

      // Get unique universities and sort them
      const universities = [...new Set(data.map(item => item['university_institution']))]
        .filter(Boolean)
        .sort();

      return universities;
    } catch (error) {
      console.error('[ERROR] StudentService.getUniqueUniversities:', error.message);
      throw error;
    }
  }

  async getUniqueMajors() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('program_major')
        .eq('employment_status', 'Open to work') // Only include "Open to work" students
        .not('program_major', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch majors:', error.message);
        throw new Error('Failed to fetch majors');
      }

      // Get unique majors and sort them
      const majors = [...new Set(data.map(item => item['program_major']))]
        .filter(Boolean)
        .sort();

      return majors;
    } catch (error) {
      console.error('[ERROR] StudentService.getUniqueMajors:', error.message);
      throw error;
    }
  }

  async getUniqueIndustries() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('preferred_industry')
        .eq('employment_status', 'Open to work') // Only include "Open to work" students
        .not('preferred_industry', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch industries:', error.message);
        throw new Error('Failed to fetch industries');
      }

      // Get unique industries and sort them
      const industries = [...new Set(data.map(item => item['preferred_industry']))]
        .filter(Boolean)
        .sort();

      return industries;
    } catch (error) {
      console.error('[ERROR] StudentService.getUniqueIndustries:', error.message);
      throw error;
    }
  }

  async getUniqueSkills() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('tech_stack_skills')
        .eq('employment_status', 'Open to work') // Only include "Open to work" students
        .not('tech_stack_skills', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch skills:', error.message);
        throw new Error('Failed to fetch skills');
      }

      // Split skills by common delimiters and get unique values
      const allSkills = data.map(item => {
        const skills = item['tech_stack_skills'] || '';
        return skills.split(/[,\/\n|]/).map(skill => skill.trim()).filter(Boolean);
      }).flat();

      const skills = [...new Set(allSkills)].sort();

      // Get skill counts
      const skillCounts = {};
      allSkills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });

      return skills;
    } catch (error) {
      console.error('[ERROR] StudentService.getUniqueSkills:', error.message);
      throw error;
    }
  }

  async getStudentStats() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('status, employment_status, university_institution, program_major, preferred_industry, tech_stack_skills')
        .eq('employment_status', 'Open to work'); // Only include "Open to work" students in stats

      if (error) {
        console.error('[ERROR] Failed to fetch student stats:', error.message);
        throw new Error('Failed to fetch student stats');
      }

      const totalStudents = data.length;

      // Get status distribution
      const statusCounts = {};
      data.forEach(student => {
        const status = student['status'] || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      // Get unique universities
      const universities = [...new Set(data.map(student => student['university_institution']).filter(Boolean))];

      // Get unique majors
      const majors = [...new Set(data.map(student => student['program_major']).filter(Boolean))];

      // Get unique industries
      const industries = [...new Set(data.map(student => student['preferred_industry']).filter(Boolean))];

      // Get tech skills
      const allSkills = data.map(student => {
        const skills = student['tech_stack_skills'] || '';
        return skills.split(/[,\/\n|]/).map(skill => skill.trim()).filter(Boolean);
      }).flat();
      const skills = [...new Set(allSkills)];

      // Get top universities and majors
      const topUniversities = this.getTopItems(data.map(student => student['university_institution']), 5);
      const topMajors = this.getTopItems(data.map(student => student['program_major']), 5);
      const topIndustries = this.getTopItems(data.map(student => student['preferred_industry']), 5);
      const topSkills = this.getTopItems(allSkills, 10);

      return {
        totalStudents,
        statusCounts,
        totalUniversities: universities.length,
        totalMajors: majors.length,
        totalIndustries: industries.length,
        totalSkills: skills.length,
        topUniversities,
        topMajors,
        topIndustries,
        topSkills
      };
    } catch (error) {
      console.error('[ERROR] StudentService.getStudentStats:', error.message);
      throw error;
    }
  }

  async createStudent(studentData) {
    try {
      // Transform camelCase input to snake_case for database
      const dbData = this.transformStudentDataForDB(studentData);

      const { data, error } = await supabase
        .from('students')
        .insert([dbData])
        .select(`
          id,
          user_id,
          "full_name",
          status,
          employment_status,
          university_institution,
          program_major,
          preferred_industry,
          tech_stack_skills,
          self_introduction,
          cv_upload,
          profile_photo,
          linkedin,
          portfolio_link,
          phone_number,
          "timestamp"
        `)
        .single();

      if (error) {
        console.error('[ERROR] Failed to create student:', error.message);
        throw new Error(`Failed to create student: ${error.message}`);
      }

      // console.log('[SUCCESS] Student created successfully with ID:', data.id);

      // Clear cache for new student (especially if employment status affects visibility)
      responseCache.clearEmploymentStatusCache('New student creation');

      const transformedData = this.transformStudentData(data);
      return transformedData;
    } catch (error) {
      console.error('[ERROR] StudentService.createStudent:', error.message);
      throw error;
    }
  }

  async updateStudent(id, updateData) {
    try {
      // Transform camelCase input to snake_case for database
      const dbData = this.transformStudentDataForDB(updateData);

      const { data, error } = await supabase
        .from('students')
        .update(dbData)
        .eq('id', id)
        .select(`
          id,
          "full_name",
          status,
          employment_status,
          university_institution,
          program_major,
          preferred_industry,
          tech_stack_skills,
          self_introduction,
          cv_upload,
          profile_photo,
          linkedin,
          portfolio_link,
          phone_number,
          "timestamp"
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Student not found
        }
        console.error('[ERROR] Failed to update student:', error.message);
        throw new Error(`Failed to update student: ${error.message}`);
      }

      // console.log('[SUCCESS] Student updated successfully with ID:', data.id);

      // Clear cache if employment status was updated
      if (updateData.employmentStatus || dbData['employment_status']) {
        responseCache.clearEmploymentStatusCache('Student employment status update');
      } else {
        // For non-employment status updates, clear only student cache
        responseCache.clearByTable('students', id);
      }

      const transformedData = this.transformStudentData(data);
      return transformedData;
    } catch (error) {
      console.error('[ERROR] StudentService.updateStudent:', error.message);
      throw error;
    }
  }

  async patchStudent(id, patchData) {
    try {
      // Transform camelCase input to snake_case for database (partial update)
      const dbData = this.transformStudentDataForDBPartial(patchData);

      // Ensure we have some data to update
      if (Object.keys(dbData).length === 0) {
        throw new Error('No valid fields provided for partial update');
      }

      const { data, error } = await supabase
        .from('students')
        .update(dbData)
        .eq('id', id)
        .select(`
          id,
          "full_name",
          status,
          employment_status,
          university_institution,
          program_major,
          preferred_industry,
          tech_stack_skills,
          self_introduction,
          cv_upload,
          profile_photo,
          linkedin,
          portfolio_link,
          phone_number,
          "timestamp"
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Student not found
        }
        console.error('[ERROR] Failed to patch student:', error.message);
        throw new Error(`Failed to patch student: ${error.message}`);
      }

      // console.log('[SUCCESS] Student patched successfully with ID:', data.id);

      // Clear cache if employment status was updated
      if (patchData.employmentStatus || dbData['employment_status']) {
        responseCache.clearEmploymentStatusCache('Student employment status patch');
      } else {
        // For non-employment status patches, clear only student cache
        responseCache.clearByTable('students', id);
      }

      const transformedData = this.transformStudentData(data);
      return transformedData;
    } catch (error) {
      console.error('[ERROR] StudentService.patchStudent:', error.message);
      throw error;
    }
  }

  async deleteStudent(id) {
    try {
      const { data, error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .select('id, "full_name"')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Student not found
        }
        console.error('[ERROR] Failed to delete student:', error.message);
        throw new Error(`Failed to delete student: ${error.message}`);
      }

      // console.log('[SUCCESS] Student deleted successfully with ID:', data.id);

      // Clear cache for deleted student
      responseCache.clearEmploymentStatusCache('Student deletion');

      return {
        id: data.id,
        fullName: data['full_name'],
        message: 'Student deleted successfully'
      };
    } catch (error) {
      console.error('[ERROR] StudentService.deleteStudent:', error.message);
      throw error;
    }
  }

  transformStudentDataForDB(studentData) {
    const dbData = {
      'full_name': studentData.fullName,
      'status': studentData.status,
      'employment_status': studentData.employmentStatus,
      'university_institution': studentData.university,
      'program_major': studentData.major,
      'preferred_industry': studentData.preferredIndustry,
      'tech_stack_skills': studentData.techStack,
      'self_introduction': studentData.selfIntroduction,
      'cv_upload': studentData.cvUpload || null,
      'profile_photo': studentData.profilePhoto || null,
      'linkedin': studentData.linkedin || null,
      'portfolio_link': studentData.portfolioLink || null,
      'phone_number': studentData.phoneNumber ? parseInt(studentData.phoneNumber) : null
    };

    // Include user_id if provided (for ownership tracking)
    if (studentData.user_id) {
      dbData['user_id'] = studentData.user_id;
    }

    return dbData;
  }

  transformStudentDataForDBPartial(patchData) {
    const dbData = {};

    // Only include fields that are explicitly provided (not undefined)
    if (patchData.fullName !== undefined) {
      dbData['full_name'] = patchData.fullName;
    }
    if (patchData.status !== undefined) {
      dbData['status'] = patchData.status;
    }
    if (patchData.employmentStatus !== undefined) {
      dbData['employment_status'] = patchData.employmentStatus;
    }
    if (patchData.university !== undefined) {
      dbData['university_institution'] = patchData.university;
    }
    if (patchData.major !== undefined) {
      dbData['program_major'] = patchData.major;
    }
    if (patchData.preferredIndustry !== undefined) {
      dbData['preferred_industry'] = patchData.preferredIndustry;
    }
    if (patchData.techStack !== undefined) {
      // Ensure tech stack is always a string to avoid JSON conflicts
      dbData['tech_stack_skills'] = patchData.techStack ? String(patchData.techStack) : null;
    }
    if (patchData.selfIntroduction !== undefined) {
      dbData['self_introduction'] = patchData.selfIntroduction;
    }
    if (patchData.cvUpload !== undefined) {
      dbData['cv_upload'] = patchData.cvUpload || null;
    }
    if (patchData.profilePhoto !== undefined) {
      dbData['profile_photo'] = patchData.profilePhoto || null;
    }
    if (patchData.linkedin !== undefined) {
      dbData['linkedin'] = patchData.linkedin || null;
    }
    if (patchData.portfolioLink !== undefined) {
      dbData['portfolio_link'] = patchData.portfolioLink || null;
    }
    if (patchData.phoneNumber !== undefined) {
      dbData['phone_number'] = patchData.phoneNumber ? parseInt(patchData.phoneNumber) : null;
    }

    return dbData;
  }

  /**
   * Transform student data for public API responses (excludes phone number)
   * @param {Object} student - Raw student data from database
   * @returns {Object} Transformed student data without phone number
   */
  transformStudentDataPublic(student) {
    return {
      id: student.id,
      fullName: student['full_name'],
      status: student['status'],
      employmentStatus: student['employment_status'],
      university: student['university_institution'],
      major: student['program_major'],
      preferredIndustry: student['preferred_industry'],
      techStack: student['tech_stack_skills'],
      selfIntroduction: student['self_introduction'],
      cvUpload: student['cv_upload'],
      profilePhoto: student['profile_photo'],
      linkedin: student['linkedin'],
      portfolioLink: student['portfolio_link'],
      timestamp: student['timestamp']
    };
  }

  /**
   * Transform student list data for public API responses (excludes phone numbers)
   * @param {Array} students - Array of student data from database
   * @returns {Array} Transformed student data without phone numbers
   */
  transformStudentListPublic(students) {
    return students.map(student => this.transformStudentDataPublic(student));
  }

  /**
   * Transform student data for API responses (includes phone number - for internal use)
   * @param {Object} student - Raw student data from database
   * @returns {Object} Transformed student data with phone number
   */
  transformStudentData(student) {
    return {
      id: student.id,
      fullName: student['full_name'],
      status: student['status'],
      employmentStatus: student['employment_status'],
      university: student['university_institution'],
      major: student['program_major'],
      preferredIndustry: student['preferred_industry'],
      techStack: student['tech_stack_skills'],
      selfIntroduction: student['self_introduction'],
      cvUpload: student['cv_upload'],
      profilePhoto: student['profile_photo'],
      linkedin: student['linkedin'],
      portfolioLink: student['portfolio_link'],
      phone: student['phone_number'],
      timestamp: student['timestamp']
    };
  }

  getTopItems(items, limit = 5) {
    const counts = {};
    items.forEach(item => {
      if (item) {
        counts[item] = (counts[item] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([item, count]) => ({ item, count }));
  }
}

module.exports = new StudentService();