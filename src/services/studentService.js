const { supabase } = require('../db');
const { responseCache } = require('./responseCacheService');
const logService = require('./logService');

class StudentService {
  async getAllStudents(filters = {}, currentUser = null) {
    try {
      // Add employment status to filters for proper cache key generation
      // Admin and Student users can see all students, others only "Open to work"
      const isAdmin = currentUser && currentUser.role === 'admin';
      const isStudent = currentUser && currentUser.role === 'student';

      const cacheFilters = {
        ...filters,
        employmentStatus: 'all', // We now filter at application level
        currentUserId: currentUser?.id || 'anonymous'
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
          email_address,
          is_visible,
          batch,
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


      // Filter results consistently
      // Admin can see all students (including invisible for soft delete)
      // Students can see all students (including employed for networking) but only visible ones

      const filteredData = data.filter(student => {
        const isEmployed = student['employment_status'] === 'Employed';
        const isVisible = student['is_visible'] === true;
        const isOwnData = currentUser && student.id === currentUser.id;

        // Check employment status
        if (isEmployed && !isOwnData && !isAdmin && !isStudent) {
          return false; 
        }

        // Check visibility
        if (!isVisible && !isOwnData && !isAdmin) {
          return false; // Hide invisible students from others
        }

        return true;
      });

      // Transform data to camelCase for API consistency
      const transformedData = filteredData.map(student =>
        this.transformStudentDataPublic(student, currentUser?.role, currentUser?.id)
      );

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

  async getStudentById(id, currentUser = null) {
    try {
      // Check cache first for individual student
      // Cache key should include current user info to handle different access levels
      const cacheKey = 'getStudentById';
      const cacheParams = {
        id,
        currentUserId: currentUser?.id || 'anonymous',
        employmentStatus: 'Open to work' // Include employment status in cache key
      };
      const cachedResponse = responseCache.getAPIResponse(cacheKey, cacheParams);

      if (cachedResponse && cachedResponse.data.id) {
        return cachedResponse.data;
      }

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
          self_introduction,
          cv_upload,
          profile_photo,
          linkedin,
          portfolio_link,
          phone_number,
          email_address,
          is_visible,
          batch,
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

      // Check if student is employed
      // Allow access if:
      // 1. Current user is the student themselves
      // 2. Current user is an admin
      // 3. Current user is a student (for networking)
      const isEmployed = data['employment_status'] === 'Employed';
      const isOwnData = currentUser && data.id === currentUser.id;
      const isAdmin = currentUser && currentUser.role === 'admin';
      const isStudent = currentUser && currentUser.role === 'student';

      if (isEmployed && !isOwnData && !isAdmin && !isStudent) {
        return null; 
      }

      // Check if student is visible - only admin can see invisible records (for soft delete)
      if (!data['is_visible'] && !isOwnData && !isAdmin) {
        return null; // Hide invisible students from others
      }

      // Transform data for public API
      const transformedData = this.transformStudentDataPublic(data, currentUser?.role, currentUser?.id);

      // Cache the individual student response
      responseCache.setAPIResponse(cacheKey, cacheParams, transformedData);

      return transformedData;
    } catch (error) {
      console.error('[ERROR] StudentService.getStudentById:', error.message);
      throw error;
    }
  }

  async searchStudents(searchTerm, filters = {}, currentUser = null) {
    try {
      // Parse multiple search terms
      const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);

      if (searchTerms.length === 0) {
        return [];
      }

      // Determine if current user is a student
      const isStudent = currentUser && currentUser.role === 'student';
      const isAdmin = currentUser && currentUser.role === 'admin';

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
          email_address,
          batch
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
      // Students and admins can search all students
      if (!isStudent && !isAdmin) {
        query = query.eq('employment_status', 'Open to work');
      }

      // Filter out invisible students - only show visible ones in search
      // Only admin can see invisible records
      if (!isAdmin) {
        query = query.eq('is_visible', true);
      }

      const { data, error } = await query
        .order('full_name')
        .limit(50); // Limit search results

      
      if (error) {
        console.error('[ERROR] Failed to search students:', error.message);
        console.error('[ERROR] Query details:', { searchTerm, searchTerms, filters });
        throw new Error('Failed to search students');
      }

      const results = data.map(student =>
        this.transformStudentDataPublic(student, currentUser?.role, currentUser?.id)
      );
      return results;
    } catch (error) {
      console.error('[ERROR] StudentService.searchStudents:', error.message);
      throw error;
    }
  }

  async getStudentsByStatus(status, currentUser = null) {
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
          linkedin,
          email_address,
          batch,
          is_visible
        `)
        .ilike('status', status)
        .eq('employment_status', 'Open to work') // Only show "Open to work" students
        .order('full_name');

      if (error) {
        console.error('[ERROR] Failed to fetch students by status:', error.message);
        throw new Error('Failed to fetch students by status');
      }

      // Filter out invisible students
      const visibleData = data.filter(student => student['is_visible'] === true);

      const transformedResults = visibleData.map(student =>
        this.transformStudentDataPublic(student, currentUser?.role, currentUser?.id)
      );
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
        .select('university_institution, is_visible')
        .eq('employment_status', 'Open to work') // Only include "Open to work" students
        .eq('is_visible', true) // Only include visible students
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
        .select('program_major, is_visible')
        .eq('employment_status', 'Open to work') // Only include "Open to work" students
        .eq('is_visible', true) // Only include visible students
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
        .select('preferred_industry, is_visible')
        .eq('employment_status', 'Open to work') // Only include "Open to work" students
        .eq('is_visible', true) // Only include visible students
        .not('preferred_industry', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch industries:', error.message);
        throw new Error('Failed to fetch industries');
      }

      // Split industries by common delimiters and get unique values
      const allIndustries = data.map(item => {
        const industries = item['preferred_industry'] || '';
        return industries.split(/[,\/\n|]/).map(industry => industry.trim()).filter(Boolean);
      }).flat();

      const industries = [...new Set(allIndustries)].sort();

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
        .select('tech_stack_skills, is_visible')
        .eq('employment_status', 'Open to work') // Only include "Open to work" students
        .eq('is_visible', true) // Only include visible students
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
        .eq('employment_status', 'Open to work') // Only include "Open to work" students in stats
        .eq('is_visible', true); // Only include visible students in stats

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

  async createStudent(studentData, req = null) {
    try {
      // Transform camelCase input to snake_case for database
      const dbData = this.transformStudentDataForDB(studentData);

      const { data, error } = await supabase
        .from('students')
        .insert([dbData])
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
          email_address,
          is_visible,
          batch,
          "timestamp"
        `)
        .single();

      if (error) {
        console.error('[ERROR] Failed to create student:', error.message);
        throw new Error(`Failed to create student: ${error.message}`);
      }

      // Log successful CREATE operation
      if (req) {
        await logService.logCreate({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'student',
          resourceId: data.id,
          newValues: data,
          request: req,
          routePath: req.path
        });
      }

      // console.log('[SUCCESS] Student created successfully with ID:', data.id);

      // Clear cache for new student (especially if employment status affects visibility)
      responseCache.clearEmploymentStatusCache('New student creation');

      const transformedData = this.transformStudentData(data);
      return transformedData;
    } catch (error) {
      // Log failed CREATE operation
      if (req) {
        await logService.logError({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'student',
          resourceId: null,
          operation: 'CREATE',
          errorMessage: error.message,
          request: req,
          routePath: req?.path,
          newValues: studentData
        });
      }

      console.error('[ERROR] StudentService.createStudent:', error.message);
      throw error;
    }
  }

  async updateStudent(id, updateData, req = null) {
    try {
      console.log('[DEBUG StudentService.updateStudent] ID:', id);
      console.log('[DEBUG StudentService.updateStudent] Update data received:', updateData);

      // Get old values for logging
      const { data: oldData } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

      // Transform camelCase input to snake_case for database
      const dbData = this.transformStudentDataForDB(updateData);
      console.log('[DEBUG StudentService.updateStudent] Transformed data for DB:', dbData);

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
          email_address,
          is_visible,
          batch,
          "timestamp"
        `)
        .single();

      console.log('[DEBUG StudentService.updateStudent] Supabase query result:');
      console.log('[DEBUG StudentService.updateStudent] Data:', data);
      console.log('[DEBUG StudentService.updateStudent] Error:', error);

      if (error) {
        console.log('[DEBUG StudentService.updateStudent] Error code:', error.code);
        if (error.code === 'PGRST116') {
          console.log('[DEBUG StudentService.updateStudent] Student not found, returning null');
          return null; // Student not found
        }
        console.error('[ERROR] Failed to update student:', error.message);
        throw new Error(`Failed to update student: ${error.message}`);
      }

      // Log successful UPDATE operation
      if (req && oldData) {
        await logService.logUpdate({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'student',
          resourceId: data.id,
          oldValues: oldData,
          newValues: data,
          request: req,
          routePath: req.path
        });
      }

      // console.log('[SUCCESS] Student updated successfully with ID:', data.id);

      // Clear cache if employment status was updated
      if (updateData.employmentStatus || dbData['employment_status']) {
        responseCache.clearEmploymentStatusCache('Student employment status update');
      } else {
        // For non-employment status updates, clear only student cache
        responseCache.clearByTable('students', id);
      }

      console.log('[DEBUG StudentService.updateStudent] About to transform data:', data);
      const transformedData = this.transformStudentData(data);
      console.log('[DEBUG StudentService.updateStudent] Transformed data:', transformedData);
      console.log('[DEBUG StudentService.updateStudent] Returning transformed data');
      return transformedData;
    } catch (error) {
      // Log failed UPDATE operation
      if (req) {
        await logService.logError({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'student',
          resourceId: typeof id === 'string' && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) ? id : null,
          operation: 'UPDATE',
          errorMessage: error.message,
          request: req,
          routePath: req.path,
          newValues: updateData
        });
      }

      console.error('[ERROR] StudentService.updateStudent:', error.message);
      throw error;
    }
  }

  async patchStudent(id, patchData, req = null) {
    try {
      console.log('[DEBUG] === PATCH STUDENT START ===');
      console.log('[DEBUG] Student ID:', id);
      console.log('[DEBUG] Patch data:', JSON.stringify(patchData, null, 2));
      console.log('[DEBUG] Current user:', req?.user?.id);

      // Transform camelCase input to snake_case for database (partial update)
      const dbData = this.transformStudentDataForDBPartial(patchData);

      console.log('[DEBUG] Prepared DB data:', JSON.stringify(dbData, null, 2));
      console.log('[DEBUG] Executing Supabase update...');

      // Ensure we have some data to update
      if (Object.keys(dbData).length === 0) {
        throw new Error('No valid fields provided for partial update');
      }

      // Get old values for logging
      const { data: oldData } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

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
          email_address,
          is_visible,
          batch,
          "timestamp"
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Student not found
        }
        console.error('[ERROR] Failed to patch student:', error.message);
        console.error('[ERROR] Error code:', error.code);
        console.error('[ERROR] Error details:', error);
        throw new Error(`Failed to patch student: ${error.message}`);
      }

      // VERIFICATION: Check if data was actually updated
      if (!data) {
        console.error('[ERROR] No data returned from patch operation');
        throw new Error('Failed to patch student: No data returned from database');
      }

      console.log('[DEBUG] Patch operation completed successfully');
      console.log('[DEBUG] Updated student ID:', data.id);

      // Log successful UPDATE operation
      if (req && oldData) {
        await logService.logUpdate({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'student',
          resourceId: data.id,
          oldValues: oldData,
          newValues: data,
          request: req,
          routePath: req.path
        });
      }

      // console.log('[SUCCESS] Student patched successfully with ID:', data.id);

      // Clear cache if employment status was updated
      if (patchData.employmentStatus || dbData['employment_status']) {
        responseCache.clearEmploymentStatusCache('Student employment status patch');
      } else {
        // For non-employment status patches, clear only student cache
        responseCache.clearByTable('students', data.id);
      }

      const transformedData = this.transformStudentData(data);

      console.log('[DEBUG] === PATCH STUDENT SUCCESS ===');
      console.log('[DEBUG] Updated student ID:', data.id);
      console.log('[DEBUG] Transformation complete');

      return transformedData;
    } catch (error) {
      // Log failed UPDATE operation
      if (req) {
        await logService.logError({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'student',
          resourceId: typeof id === 'string' && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) ? id : null,
          operation: 'UPDATE',
          errorMessage: error.message,
          request: req,
          routePath: req.path,
          newValues: patchData
        });
      }

      console.error('[ERROR] StudentService.patchStudent:', error.message);
      throw error;
    }
  }

  async deleteStudent(id, req = null) {
    try {
      // Get old values for logging before deletion
      const { data: oldData } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

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

      // Log successful DELETE operation
      if (req && oldData) {
        await logService.logDelete({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'student',
          resourceId: oldData.id,
          oldValues: oldData,
          request: req,
          routePath: req.path
        });
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
      // Log failed DELETE operation
      if (req) {
        await logService.logError({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'student',
          resourceId: typeof id === 'string' && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) ? id : null,
          operation: 'DELETE',
          errorMessage: error.message,
          request: req,
          routePath: req.path,
          newValues: null
        });
      }

      console.error('[ERROR] StudentService.deleteStudent:', error.message);
      throw error;
    }
  }

  async bulkApproveStudents(studentIds, isVisible = true, req = null) {
    try {
      console.log('[DEBUG] === BULK APPROVE STUDENTS START ===');
      console.log('[DEBUG] Student IDs:', studentIds);
      console.log('[DEBUG] isVisible:', isVisible);

      // Validate input
      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error('Student IDs array is required and must not be empty');
      }

      // Validate UUID format for each ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidIds = studentIds.filter(id => !uuidRegex.test(id));
      if (invalidIds.length > 0) {
        throw new Error(`Invalid UUID format for IDs: ${invalidIds.join(', ')}`);
      }

      // Convert string boolean to actual boolean if needed
      let visibleValue = isVisible;
      if (typeof isVisible === 'string') {
        visibleValue = isVisible.toLowerCase() === 'true';
      }

      // Update all students with the same visibility value
      const updateData = {
        'is_visible': visibleValue,
        'timestamp': new Date().toISOString()
      };

      console.log('[DEBUG] Update data:', updateData);

      // First, get count of students that will be updated
      const { count: totalCount, error: countError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .in('id', studentIds);

      if (countError) {
        console.error('[ERROR] Failed to count students:', countError.message);
      }

      // Update all matching students
      const { data, error } = await supabase
        .from('students')
        .update(updateData)
        .in('id', studentIds)
        .select('id, "full_name", is_visible');

      if (error) {
        console.error('[ERROR] Failed to bulk update students:', error.message);
        throw new Error(`Failed to bulk update students: ${error.message}`);
      }

      console.log('[DEBUG] Total matching students:', totalCount);
      console.log('[DEBUG] Students with changes:', data?.length);
      console.log('[DEBUG] Updated students:', data);

      // Log successful bulk UPDATE operation
      if (req) {
        await logService.logUpdate({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'student',
          resourceId: null, // Bulk operation - multiple resources
          oldValues: null,
          newValues: {
            operation: 'BULK_APPROVE',
            studentIds: studentIds,
            matchedCount: totalCount || 0,
            updatedCount: data?.length || 0,
            affectedStudents: data?.map(s => ({
              id: s.id,
              fullName: s['full_name'],
              oldIsVisible: 'unknown',
              newIsVisible: s['is_visible']
            })) || []
          },
          request: req,
          routePath: req.path
        });
      }

      // Clear cache
      responseCache.clearEmploymentStatusCache('Student bulk approve');

      console.log('[DEBUG] === BULK APPROVE STUDENTS SUCCESS ===');

      return {
        success: true,
        message: `Successfully processed ${totalCount || 0} students (${data?.length || 0} changed)`,
        matchedCount: totalCount || 0,
        updatedCount: data?.length || 0,
        students: data?.map(student => ({
          id: student.id,
          fullName: student['full_name'],
          isVisible: student['is_visible']
        })) || []
      };
    } catch (error) {
      // Log failed operation
      if (req) {
        await logService.logError({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'student',
          resourceId: null,
          operation: 'BULK_APPROVE',
          errorMessage: error.message,
          request: req,
          routePath: req.path,
          newValues: { studentIds, isVisible }
        });
      }

      console.error('[ERROR] StudentService.bulkApproveStudents:', error.message);
      throw error;
    }
  }

  /**
   * Deduplicates comma-separated values while preserving order
   * Example: "Java, Javascript, Java" => "Java, Javascript"
   * @param {string} value - Comma-separated string
   * @returns {string|null} - Deduplicated comma-separated string or null
   */
  deduplicateCommaSeparated(value) {
    if (!value || typeof value !== 'string') {
      return value || null;
    }

    // Split by comma, trim each value, remove duplicates while preserving order
    const uniqueValues = [];
    const seen = new Set();

    value.split(',').map(item => item.trim()).filter(Boolean).forEach(item => {
      const lowerCaseItem = item.toLowerCase();
      if (!seen.has(lowerCaseItem)) {
        seen.add(lowerCaseItem);
        uniqueValues.push(item);
      }
    });

    return uniqueValues.length > 0 ? uniqueValues.join(', ') : null;
  }

  transformStudentDataForDB(studentData) {
    const dbData = {
      'id': studentData.id,
      'full_name': studentData.fullName,
      'status': studentData.status,
      'employment_status': studentData.employmentStatus,
      'university_institution': studentData.university,
      'program_major': studentData.major,
      'preferred_industry': this.deduplicateCommaSeparated(studentData.preferredIndustry),
      'tech_stack_skills': this.deduplicateCommaSeparated(studentData.techStack),
      'self_introduction': studentData.selfIntroduction,
      'cv_upload': studentData.cvUpload || null,
      'profile_photo': studentData.profilePhoto || null,
      'linkedin': studentData.linkedin || null,
      'portfolio_link': studentData.portfolioLink || null,
      'phone_number': (() => {
        const phoneValue = studentData.phoneNumber || studentData.phone;
        if (!phoneValue) return null;

        // Validate phone number format - supports both international and Indonesian formats
        // International: +[country code][number] (e.g., +62812345678, +821234567, +651234567)
        // Indonesian local: 0[number] (e.g., 08123456789, 085155311616)
        // Accepts: +7-15 digits OR 0 followed by 9-14 digits
        const phoneRegex = /^(\+[0-9]{7,15}|0[0-9]{9,14})$/;
        const phoneString = String(phoneValue).trim();

        if (phoneRegex.test(phoneString)) {
          return phoneString;  // Store as text, preserving format
        } else {
          console.warn('[WARN] Invalid phone number format:', phoneValue);
          return null;
        }
      })(),
      'email_address': studentData.email || null,
      'is_visible': studentData.isVisible !== undefined ? studentData.isVisible : false,
      'batch': studentData.batch || null
    };

    return dbData;
  }

  transformStudentDataForDBPartial(patchData) {
    const dbData = {};

    // Update timestamp on any partial update
    dbData['timestamp'] = new Date().toISOString();

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
      dbData['preferred_industry'] = this.deduplicateCommaSeparated(patchData.preferredIndustry);
    }
    if (patchData.techStack !== undefined) {
      // Ensure tech stack is always a string to avoid JSON conflicts
      // Also deduplicate values to prevent duplicates like "Java, Javascript, Java"
      dbData['tech_stack_skills'] = patchData.techStack ? this.deduplicateCommaSeparated(String(patchData.techStack)) : null;
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
    if (patchData.phoneNumber !== undefined || patchData.phone !== undefined) {
      const phoneValue = patchData.phoneNumber || patchData.phone;
      if (phoneValue !== undefined) {
        if (phoneValue === null || phoneValue === '') {
          dbData['phone_number'] = null;
        } else {
          // Validate phone number format - supports both international and Indonesian formats
          // International: +[country code][number] (e.g., +62812345678, +821234567, +651234567)
          // Indonesian local: 0[number] (e.g., 08123456789, 085155311616)
          const phoneRegex = /^(\+[0-9]{7,15}|0[0-9]{9,14})$/;
          const phoneString = String(phoneValue).trim();

          if (phoneRegex.test(phoneString)) {
            dbData['phone_number'] = phoneString;  // Store as text, preserving format
          } else {
            console.warn('[WARN] Invalid phone number format:', phoneValue);
            // Skip updating phone number if invalid
          }
        }
      }
    }
    if (patchData.email !== undefined) {
      dbData['email_address'] = patchData.email || null;
    }
    if (patchData.isVisible !== undefined) {
      // Convert string 'true'/'false' to actual boolean, otherwise use as-is
      if (typeof patchData.isVisible === 'string') {
        dbData['is_visible'] = patchData.isVisible.toLowerCase() === 'true';
      } else {
        dbData['is_visible'] = patchData.isVisible;
      }
    }
    if (patchData.batch !== undefined) {
      dbData['batch'] = patchData.batch;
    }

    return dbData;
  }

  /**
   * Transform student data for public API responses (excludes phone number)
   * @param {Object} student - Raw student data from database
   * @param {string} viewerRole - Role of the viewer (admin, student, company)
   * @param {string} viewerId - ID of the viewer
   * @returns {Object} Transformed student data without phone number
   */
  transformStudentDataPublic(student, viewerRole = null, viewerId = null) {
    const isOwnData = viewerId && student.id === viewerId;
    const isStudentViewingOtherStudent = viewerRole === 'student' && !isOwnData;
    const isAdmin = viewerRole === 'admin';

    // Base fields that everyone can see
    const baseData = {
      id: student.id,
      fullName: student['full_name'],
      employmentStatus: student['employment_status'],
      status: student['status'],
      batch: student['batch'],
      profilePhoto: student['profile_photo'],
      linkedin: student['linkedin'],
      portfolioLink: student['portfolio_link'],
      email: student['email_address'],
      techStack: student['tech_stack_skills']
    };

    // If viewer is a student looking at another student, only show base data
    if (isStudentViewingOtherStudent) {
      return baseData;
    }

    // For all other cases (admin, company, or viewing own data), show all fields
    const response = {
      ...baseData,
      university: student['university_institution'],
      major: student['program_major'],
      preferredIndustry: student['preferred_industry'],
      techStack: student['tech_stack_skills'],
      selfIntroduction: student['self_introduction'],
      cvUpload: student['cv_upload'],
      status: student['status'],
      timestamp: student['timestamp'],
      completionRate: this.calculateCompletionRate(student)
    };

    // Include isVisible field for admin users
    if (isAdmin) {
      response.isVisible = student['is_visible'];
    }

    return response;
  }

  /**
   * Transform student list data for public API responses (excludes phone numbers)
   * @param {Array} students - Array of student data from database
   * @param {string} viewerRole - Role of the viewer (admin, student, company)
   * @param {string} viewerId - ID of the viewer
   * @returns {Array} Transformed student data without phone numbers
   */
  transformStudentListPublic(students, viewerRole = null, viewerId = null) {
    return students.map(student => this.transformStudentDataPublic(student, viewerRole, viewerId));
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
      email: student['email_address'],
      batch: student['batch'],
      timestamp: student['timestamp'],
      completionRate: this.calculateCompletionRate(student)
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

  /**
   * Calculate profile completion rate based on filled fields
   * @param {Object} student - Raw student data from database
   * @returns {number} Completion rate as percentage (0-100)
   */
  calculateCompletionRate(student) {
    const fields = [
      'full_name', 'status', 'employment_status',
      'university_institution', 'program_major',
      'preferred_industry', 'tech_stack_skills', 'self_introduction',
      'batch', 'cv_upload', 'profile_photo',
      'linkedin', 'portfolio_link', 'phone_number', 'email_address'
    ];

    let completed = 0;
    fields.forEach(field => {
      const value = student[field];
      if (value !== null && value !== undefined && value.toString().trim() !== '') {
        completed++;
      }
    });

    return Math.round((completed / fields.length) * 100);
  }
}

module.exports = new StudentService();