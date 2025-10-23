const { supabase } = require('../db');

class StudentService {
  async getAllStudents(filters = {}) {
    try {
      let query = supabase
        .from('students')
        .select(`
          id,
          "Full Name",
          "Status",
          "University / Institution",
          "Program / Major",
          "Preferred Industry",
          "Tech Stack / Skills",
          "Short Self-Introduction",
          "CV Upload",
          "Profile Photo",
          "LinkedIn",
          "Portfolio Link",
          "Phone / WhatsApp Number",
          "Timestamp"
        `, { count: 'exact' });

      // Apply filters
      if (filters.status) {
        query = query.ilike('"Status"', `%${filters.status}%`);
      }

      if (filters.university) {
        query = query.ilike('"University / Institution"', `%${filters.university}%`);
      }

      if (filters.major) {
        query = query.ilike('"Program / Major"', `%${filters.major}%`);
      }

      if (filters.industry) {
        query = query.ilike('"Preferred Industry"', `%${filters.industry}%`);
      }

      if (filters.skills) {
        query = query.ilike('"Tech Stack / Skills"', `%${filters.skills}%`);
      }

      // Apply pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      query = query
        .range(offset, offset + limit - 1)
        .order('"Full Name"');

      const { data, error, count } = await query;

      if (error) {
        console.error('[ERROR] Failed to fetch students:', error.message);
        throw new Error('Failed to fetch students');
      }

      // Transform data to camelCase for API consistency
      const transformedData = data.map(student => this.transformStudentData(student));

      return {
        students: transformedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('[ERROR] StudentService.getAllStudents:', error.message);
      throw error;
    }
  }

  async getStudentById(id) {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          "Full Name",
          "Status",
          "University / Institution",
          "Program / Major",
          "Preferred Industry",
          "Tech Stack / Skills",
          "Short Self-Introduction",
          "CV Upload",
          "Profile Photo",
          "LinkedIn",
          "Portfolio Link",
          "Phone / WhatsApp Number",
          "Timestamp"
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

      return this.transformStudentData(data);
    } catch (error) {
      console.error('[ERROR] StudentService.getStudentById:', error.message);
      throw error;
    }
  }

  async searchStudents(searchTerm, filters = {}) {
    try {
      let query = supabase
        .from('students')
        .select(`
          id,
          "Full Name",
          "Status",
          "University / Institution",
          "Program / Major",
          "Preferred Industry",
          "Tech Stack / Skills",
          "Short Self-Introduction",
          "CV Upload",
          "Profile Photo",
          "LinkedIn",
          "Portfolio Link",
          "Phone / WhatsApp Number"
        `)
        .or(`"Full Name".ilike.%${searchTerm}%,"Short Self-Introduction".ilike.%${searchTerm}%,"Tech Stack / Skills".ilike.%${searchTerm}%,"University / Institution".ilike.%${searchTerm}%,"Program / Major".ilike.%${searchTerm}%,"Preferred Industry".ilike.%${searchTerm}%`);

      // Apply additional filters
      if (filters.status) {
        query = query.ilike('"Status"', `%${filters.status}%`);
      }

      if (filters.university) {
        query = query.ilike('"University / Institution"', `%${filters.university}%`);
      }

      if (filters.major) {
        query = query.ilike('"Program / Major"', `%${filters.major}%`);
      }

      if (filters.industry) {
        query = query.ilike('"Preferred Industry"', `%${filters.industry}%`);
      }

      if (filters.skills) {
        query = query.ilike('"Tech Stack / Skills"', `%${filters.skills}%`);
      }

      const { data, error } = await query
        .order('"Full Name"')
        .limit(50); // Limit search results

      if (error) {
        console.error('[ERROR] Failed to search students:', error.message);
        throw new Error('Failed to search students');
      }

      return data.map(student => this.transformStudentData(student));
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
          "Full Name",
          "Status",
          "University / Institution",
          "Program / Major",
          "Preferred Industry",
          "Tech Stack / Skills",
          "Profile Photo",
          "LinkedIn"
        `)
        .ilike('"Status"', status)
        .order('"Full Name"');

      if (error) {
        console.error('[ERROR] Failed to fetch students by status:', error.message);
        throw new Error('Failed to fetch students by status');
      }

      return data.map(student => this.transformStudentData(student));
    } catch (error) {
      console.error('[ERROR] StudentService.getStudentsByStatus:', error.message);
      throw error;
    }
  }

  async getUniqueUniversities() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('"University / Institution"')
        .not('"University / Institution"', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch universities:', error.message);
        throw new Error('Failed to fetch universities');
      }

      // Get unique universities and sort them
      const universities = [...new Set(data.map(item => item['University / Institution']))]
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
        .select('"Program / Major"')
        .not('"Program / Major"', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch majors:', error.message);
        throw new Error('Failed to fetch majors');
      }

      // Get unique majors and sort them
      const majors = [...new Set(data.map(item => item['Program / Major']))]
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
        .select('"Preferred Industry"')
        .not('"Preferred Industry"', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch industries:', error.message);
        throw new Error('Failed to fetch industries');
      }

      // Get unique industries and sort them
      const industries = [...new Set(data.map(item => item['Preferred Industry']))]
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
        .select('"Tech Stack / Skills"')
        .not('"Tech Stack / Skills"', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch skills:', error.message);
        throw new Error('Failed to fetch skills');
      }

      // Split skills by common delimiters and get unique values
      const allSkills = data.map(item => {
        const skills = item['Tech Stack / Skills'] || '';
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
        .select('Status, "University / Institution", "Program / Major", "Preferred Industry", "Tech Stack / Skills"');

      if (error) {
        console.error('[ERROR] Failed to fetch student stats:', error.message);
        throw new Error('Failed to fetch student stats');
      }

      const totalStudents = data.length;

      // Get status distribution
      const statusCounts = {};
      data.forEach(student => {
        const status = student['Status'] || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      // Get unique universities
      const universities = [...new Set(data.map(student => student['University / Institution']).filter(Boolean))];

      // Get unique majors
      const majors = [...new Set(data.map(student => student['Program / Major']).filter(Boolean))];

      // Get unique industries
      const industries = [...new Set(data.map(student => student['Preferred Industry']).filter(Boolean))];

      // Get tech skills
      const allSkills = data.map(student => {
        const skills = student['Tech Stack / Skills'] || '';
        return skills.split(/[,\/\n|]/).map(skill => skill.trim()).filter(Boolean);
      }).flat();
      const skills = [...new Set(allSkills)];

      // Get top universities and majors
      const topUniversities = this.getTopItems(data.map(student => student['University / Institution']), 5);
      const topMajors = this.getTopItems(data.map(student => student['Program / Major']), 5);
      const topIndustries = this.getTopItems(data.map(student => student['Preferred Industry']), 5);
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
          "Full Name",
          "Status",
          "University / Institution",
          "Program / Major",
          "Preferred Industry",
          "Tech Stack / Skills",
          "Short Self-Introduction",
          "CV Upload",
          "Profile Photo",
          "LinkedIn",
          "Portfolio Link",
          "Phone / WhatsApp Number",
          "Timestamp"
        `)
        .single();

      if (error) {
        console.error('[ERROR] Failed to create student:', error.message);
        throw new Error(`Failed to create student: ${error.message}`);
      }

      console.log('[SUCCESS] Student created successfully with ID:', data.id);
      return this.transformStudentData(data);
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
          "Full Name",
          "Status",
          "University / Institution",
          "Program / Major",
          "Preferred Industry",
          "Tech Stack / Skills",
          "Short Self-Introduction",
          "CV Upload",
          "Profile Photo",
          "LinkedIn",
          "Portfolio Link",
          "Phone / WhatsApp Number",
          "Timestamp"
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Student not found
        }
        console.error('[ERROR] Failed to update student:', error.message);
        throw new Error(`Failed to update student: ${error.message}`);
      }

      console.log('[SUCCESS] Student updated successfully with ID:', data.id);
      return this.transformStudentData(data);
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
          "Full Name",
          "Status",
          "University / Institution",
          "Program / Major",
          "Preferred Industry",
          "Tech Stack / Skills",
          "Short Self-Introduction",
          "CV Upload",
          "Profile Photo",
          "LinkedIn",
          "Portfolio Link",
          "Phone / WhatsApp Number",
          "Timestamp"
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Student not found
        }
        console.error('[ERROR] Failed to patch student:', error.message);
        throw new Error(`Failed to patch student: ${error.message}`);
      }

      console.log('[SUCCESS] Student patched successfully with ID:', data.id);
      return this.transformStudentData(data);
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
        .select('id, "Full Name"')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Student not found
        }
        console.error('[ERROR] Failed to delete student:', error.message);
        throw new Error(`Failed to delete student: ${error.message}`);
      }

      console.log('[SUCCESS] Student deleted successfully with ID:', data.id);
      return {
        id: data.id,
        fullName: data['Full Name'],
        message: 'Student deleted successfully'
      };
    } catch (error) {
      console.error('[ERROR] StudentService.deleteStudent:', error.message);
      throw error;
    }
  }

  transformStudentDataForDB(studentData) {
    return {
      'Full Name': studentData.fullName,
      'Status': studentData.status,
      'University / Institution': studentData.university,
      'Program / Major': studentData.major,
      'Preferred Industry': studentData.preferredIndustry,
      'Tech Stack / Skills': studentData.techStack,
      'Short Self-Introduction': studentData.selfIntroduction,
      'CV Upload': studentData.cvUpload || null,
      'Profile Photo': studentData.profilePhoto || null,
      'LinkedIn': studentData.linkedIn || null,
      'Portfolio Link': studentData.portfolioLink || null,
      'Phone / WhatsApp Number': studentData.phoneNumber ? parseInt(studentData.phoneNumber) : null
    };
  }

  transformStudentDataForDBPartial(patchData) {
    const dbData = {};

    // Only include fields that are explicitly provided (not undefined)
    if (patchData.fullName !== undefined) {
      dbData['Full Name'] = patchData.fullName;
    }
    if (patchData.status !== undefined) {
      dbData['Status'] = patchData.status;
    }
    if (patchData.university !== undefined) {
      dbData['University / Institution'] = patchData.university;
    }
    if (patchData.major !== undefined) {
      dbData['Program / Major'] = patchData.major;
    }
    if (patchData.preferredIndustry !== undefined) {
      dbData['Preferred Industry'] = patchData.preferredIndustry;
    }
    if (patchData.techStack !== undefined) {
      dbData['Tech Stack / Skills'] = patchData.techStack;
    }
    if (patchData.selfIntroduction !== undefined) {
      dbData['Short Self-Introduction'] = patchData.selfIntroduction;
    }
    if (patchData.cvUpload !== undefined) {
      dbData['CV Upload'] = patchData.cvUpload || null;
    }
    if (patchData.profilePhoto !== undefined) {
      dbData['Profile Photo'] = patchData.profilePhoto || null;
    }
    if (patchData.linkedIn !== undefined) {
      dbData['LinkedIn'] = patchData.linkedIn || null;
    }
    if (patchData.portfolioLink !== undefined) {
      dbData['Portfolio Link'] = patchData.portfolioLink || null;
    }
    if (patchData.phoneNumber !== undefined) {
      dbData['Phone / WhatsApp Number'] = patchData.phoneNumber ? parseInt(patchData.phoneNumber) : null;
    }

    return dbData;
  }

  transformStudentData(student) {
    return {
      id: student.id,
      fullName: student['Full Name'],
      status: student['Status'],
      university: student['University / Institution'],
      major: student['Program / Major'],
      preferredIndustry: student['Preferred Industry'],
      techStack: student['Tech Stack / Skills'],
      selfIntroduction: student['Short Self-Introduction'],
      cvUpload: student['CV Upload'],
      profilePhoto: student['Profile Photo'],
      linkedIn: student['LinkedIn'],
      portfolioLink: student['Portfolio Link'],
      phone: student['Phone / WhatsApp Number'],
      timestamp: student['Timestamp']
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