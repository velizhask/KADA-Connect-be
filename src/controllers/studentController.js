const studentService = require('../services/studentService');
const authService = require('../services/authService');
const { supabase } = require('../db');

class StudentController {
  async getStudents(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        university: req.query.university,
        major: req.query.major,
        industry: req.query.industry,
        skills: req.query.skills,
        page: req.query.page,
        limit: req.query.limit
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      // Pass current user context for proper access control
      const result = await studentService.getAllStudents(filters, req.user);

      res.status(200).json({
        success: true,
        message: 'Students retrieved successfully',
        data: result.students,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getStudentById(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Valid student ID is required',
          data: null
        });
      }

      // Pass current user context so the service can determine access rights
      const student = await studentService.getStudentById(id, req.user);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
          data: null
        });
      }

      res.status(200).json({
        success: true,
        message: 'Student retrieved successfully',
        data: student
      });
    } catch (error) {
      next(error);
    }
  }

  async searchStudents(req, res, next) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
          data: null
        });
      }

      if (q.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be 100 characters or less',
          data: null
        });
      }

      const filters = {
        status: req.query.status,
        university: req.query.university,
        major: req.query.major,
        industry: req.query.industry,
        skills: req.query.skills
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const students = await studentService.searchStudents(q.trim(), filters, req.user);

      res.status(200).json({
        success: true,
        message: 'Students found',
        data: students,
        total: students.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getStudentsByStatus(req, res, next) {
    try {
      const { status } = req.params;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status parameter is required',
          data: null
        });
      }

      const validStatuses = ['Current Trainee', 'Alumni'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be "Current Trainee" or "Alumni"',
          data: null
        });
      }

      const students = await studentService.getStudentsByStatus(status, req.user);

      res.status(200).json({
        success: true,
        message: `Students with status "${status}" retrieved successfully`,
        data: students,
        total: students.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getUniversities(req, res, next) {
    try {
      const universities = await studentService.getUniqueUniversities();

      res.status(200).json({
        success: true,
        message: 'Universities retrieved successfully',
        data: universities,
        total: universities.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getMajors(req, res, next) {
    try {
      const majors = await studentService.getUniqueMajors();

      res.status(200).json({
        success: true,
        message: 'Majors retrieved successfully',
        data: majors,
        total: majors.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getIndustries(req, res, next) {
    try {
      const industries = await studentService.getUniqueIndustries();

      res.status(200).json({
        success: true,
        message: 'Industries retrieved successfully',
        data: industries,
        total: industries.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getSkills(req, res, next) {
    try {
      const skills = await studentService.getUniqueSkills();

      res.status(200).json({
        success: true,
        message: 'Skills retrieved successfully',
        data: skills,
        total: skills.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getStudentStats(req, res, next) {
    try {
      const stats = await studentService.getStudentStats();

      res.status(200).json({
        success: true,
        message: 'Student statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async createStudent(req, res, next) {
    try {
      const studentData = req.body;
      const currentUser = req.user;

      // Explicitly set the ID to match the authenticated user's UUID
      // This is needed because the backend uses service role key
      studentData.id = currentUser.id;

      // Automatically populate email from authenticated user
      studentData.email = currentUser.email;

      const newStudent = await studentService.createStudent(studentData, req);

      res.status(201).json({
        success: true,
        message: 'Student created successfully',
        data: newStudent
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStudent(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Valid student ID is required',
          data: null
        });
      }

      // Authorization check: user must be admin or own the resource
      const currentUser = req.user;

      // Check if user is admin or owns this student profile
      const student = await studentService.getStudentById(id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
          data: null
        });
      }

      // Allow if admin or if user owns this student profile
      const isOwner = student.id === currentUser.id;

      // If not owner, check if user is admin
      if (!isOwner) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', currentUser.id)
          .single();

        if (!userData || userData.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'You can only update your own student profile',
            data: null
          });
        }
      }

      const updatedStudent = await studentService.updateStudent(id, updateData, req);

      res.status(200).json({
        success: true,
        message: 'Student updated successfully',
        data: updatedStudent
      });
    } catch (error) {
      next(error);
    }
  }

  async patchStudent(req, res, next) {
    try {
      const { id } = req.params;
      const patchData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Valid student ID is required',
          data: null
        });
      }

      // Validate that patch data is not empty
      if (!patchData || Object.keys(patchData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields provided for partial update',
          data: null
        });
      }

      // Authorization check: user must be admin or own the resource
      const currentUser = req.user;

      // Check if user is admin or owns this student profile
      const student = await studentService.getStudentById(id, currentUser);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
          data: null
        });
      }

      // Allow if admin or if user owns this student profile
      const isOwner = student.id === currentUser.id;

      // If not owner, check if user is admin
      if (!isOwner) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', currentUser.id)
          .single();

        if (!userData || userData.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'You can only update your own student profile',
            data: null
          });
        }
      }

      const patchedStudent = await studentService.patchStudent(id, patchData, req);

      res.status(200).json({
        success: true,
        message: 'Student patched successfully',
        data: patchedStudent
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteStudent(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Valid student ID is required',
          data: null
        });
      }

      // Authorization check: user must be admin or own the resource
      const currentUser = req.user;
      const userRole = await authService.getUserRole(currentUser);

      // Check if user is admin or owns this student profile
      const student = await studentService.getStudentById(id, currentUser);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
          data: null
        });
      }

      // Allow if admin or if user owns this student profile
      const isOwner = student.id === currentUser.id;
      const isAdmin = userRole === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own student profile',
          data: null
        });
      }

      const result = await studentService.deleteStudent(id, req);

      res.status(200).json({
        success: true,
        message: 'Student deleted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkApproveStudents(req, res, next) {
    try {
      const { studentIds, isVisible = true } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'studentIds array is required and must not be empty',
          data: null
        });
      }

      // Authorization check: only admin can bulk approve
      const currentUser = req.user;
      const userRole = await authService.getUserRole(currentUser);

      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admin users can bulk approve students',
          data: null
        });
      }

      const result = await studentService.bulkApproveStudents(studentIds, isVisible, req);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new StudentController();