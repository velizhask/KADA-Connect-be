const studentService = require('../services/studentService');

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

      const result = await studentService.getAllStudents(filters);

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

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Valid student ID is required',
          data: null
        });
      }

      const student = await studentService.getStudentById(parseInt(id));

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

      const students = await studentService.searchStudents(q.trim(), filters);

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

      const students = await studentService.getStudentsByStatus(status);

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

      const newStudent = await studentService.createStudent(studentData);

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

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Valid student ID is required',
          data: null
        });
      }

      const updatedStudent = await studentService.updateStudent(parseInt(id), updateData);

      if (!updatedStudent) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
          data: null
        });
      }

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

      if (!id || isNaN(id)) {
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

      const patchedStudent = await studentService.patchStudent(parseInt(id), patchData);

      if (!patchedStudent) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
          data: null
        });
      }

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

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Valid student ID is required',
          data: null
        });
      }

      const result = await studentService.deleteStudent(parseInt(id));

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
          data: null
        });
      }

      res.status(200).json({
        success: true,
        message: 'Student deleted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async validateCV(req, res, next) {
    try {
      const { cvUrl } = req.body;

      if (!cvUrl) {
        return res.status(400).json({
          success: false,
          message: 'CV URL is required',
          data: null
        });
      }

      // Basic URL validation for common file types
      const urlPattern = /^https?:\/\/.+\.(pdf|doc|docx)(\?.*)?$/i;
      const isValidUrl = urlPattern.test(cvUrl.trim());

      // Check for common patterns
      const isGoogleDriveUrl = cvUrl.includes('drive.google.com') || cvUrl.includes('docs.google.com');
      const isDropboxUrl = cvUrl.includes('dropbox.com');
      const isOneDriveUrl = cvUrl.includes('1drv.ms');

      res.status(200).json({
        success: true,
        message: 'CV validation completed',
        data: {
          isValid: isValidUrl || isGoogleDriveUrl || isDropboxUrl || isOneDriveUrl,
          recommendations: {
            maxSize: '10MB',
            formats: ['pdf', 'doc', 'docx'],
            allowedHosts: [
              'Google Drive',
              'Dropbox',
              'OneDrive',
              'Direct URL'
            ]
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async validatePhoto(req, res, next) {
    try {
      const { photoUrl } = req.body;

      if (!photoUrl) {
        return res.status(400).json({
          success: false,
          message: 'Photo URL is required',
          data: null
        });
      }

      // Basic URL validation for images
      const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
      const isValidUrl = urlPattern.test(photoUrl.trim());

      // Check for common patterns
      const isGoogleDriveUrl = photoUrl.includes('drive.google.com');
      const isDropboxUrl = photoUrl.includes('dropbox.com');
      const isOneDriveUrl = photoUrl.includes('1drv.ms');

      res.status(200).json({
        success: true,
        message: 'Photo validation completed',
        data: {
          isValid: isValidUrl || isGoogleDriveUrl || isDropboxUrl || isOneDriveUrl,
          recommendations: {
            maxSize: '5MB',
            formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            allowedHosts: [
              'Google Drive',
              'Dropbox',
              'OneDrive',
              'Direct URL'
            ]
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StudentController();