/**
 * Student File Controller
 * Handles CV and photo file uploads for student profiles
 * Follows the same patterns as studentController
 */

const fileService = require('../services/fileService');
const { supabase } = require('../db');

class StudentFileController {
  /**
   * Upload CV for a student
   * POST /api/students/:id/cv
   */
  async uploadCV(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Validate student ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STUDENT_ID',
            message: 'Valid student ID is required'
          }
        });
      }

      const studentId = id;

      // Get student to verify ownership
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, cv_upload')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found'
          }
        });
      }

      // Check authorization: Student can only upload to own profile, admin can upload to any
      const isAdmin = req.user.role === 'admin';
      const isOwner = student.id === userId;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only upload files to your own student profile'
          }
        });
      }

      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        });
      }

      // Upload file using FileService
      const fileRecord = await fileService.uploadFile(file, {
        bucket: 'student-cvs',
        userId: userId,
        fileType: 'cv',
        studentId: studentId
      });

      // If student already has a CV, extract the file ID from old URL and delete it
      if (student.cv_upload) {
        try {
          // Extract old file path from the current CV URL
          const oldUrl = student.cv_upload;
          const oldPathMatch = oldUrl.match(/\/student-cvs\/(.+)$/);

          if (oldPathMatch && oldPathMatch[1]) {
            const oldFilePath = oldPathMatch[1];

            // Find the old file in metadata
            const { data: oldFile } = await supabase
              .from('file_metadata')
              .select('id, path')
              .eq('bucket', 'student-cvs')
              .eq('path', oldFilePath)
              .eq('student_id', studentId)
              .single();

            if (oldFile) {
              // Delete old file (ignore errors to not fail the upload if old file cleanup fails)
              console.log('Deleting old CV file:', oldFile.path);
              await fileService.deleteFile(oldFile.id, userId);
            }
          }
        } catch (error) {
          console.warn('Failed to delete old CV file:', error.message);
          // Continue with upload even if old file deletion fails
        }
      }

      // Update student record with new CV URL
      const { error: updateError } = await supabase
        .from('students')
        .update({
          cv_upload: fileRecord.url,
          timestamp: new Date().toISOString()
        })
        .eq('id', studentId);

      if (updateError) {
        console.error('Failed to update student record:', updateError);
        // Don't delete the uploaded file, as it might be recoverable
        return res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'File uploaded but failed to update student record'
          }
        });
      }

      res.status(201).json({
        success: true,
        message: 'CV uploaded successfully',
        data: {
          studentId: studentId,
          cv: {
            id: fileRecord.id,
            url: fileRecord.url,
            originalName: fileRecord.originalName,
            size: fileRecord.size,
            mimeType: fileRecord.mimeType,
            uploadedAt: fileRecord.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Upload CV error:', error);
      next(error);
    }
  }

  /**
   * Upload profile photo for a student
   * POST /api/students/:id/photo
   */
  async uploadPhoto(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Validate student ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STUDENT_ID',
            message: 'Valid student ID is required'
          }
        });
      }

      const studentId = id;

      // Get student to verify ownership
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, profile_photo')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found'
          }
        });
      }

      // Check authorization
      const isAdmin = req.user.role === 'admin';
      const isOwner = student.id === userId;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only upload files to your own student profile'
          }
        });
      }

      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        });
      }

      // Upload file using FileService
      const fileRecord = await fileService.uploadFile(file, {
        bucket: 'student-photos',
        userId: userId,
        fileType: 'photo',
        studentId: studentId
      });

      // Delete old photo if exists
      if (student.profile_photo) {
        try {
          // Extract old file path from the current photo URL
          const oldUrl = student.profile_photo;
          const oldPathMatch = oldUrl.match(/\/student-photos\/(.+)$/);

          if (oldPathMatch && oldPathMatch[1]) {
            const oldFilePath = oldPathMatch[1];

            // Find the old file in metadata
            const { data: oldFile } = await supabase
              .from('file_metadata')
              .select('id, path')
              .eq('bucket', 'student-photos')
              .eq('path', oldFilePath)
              .eq('student_id', studentId)
              .single();

            if (oldFile) {
              // Delete old file (ignore errors to not fail the upload if old file cleanup fails)
              console.log('Deleting old photo file:', oldFile.path);
              await fileService.deleteFile(oldFile.id, userId);
            }
          }
        } catch (error) {
          console.warn('Failed to delete old photo file:', error.message);
          // Continue with upload even if old file deletion fails
        }
      }

      // Update student record with new photo URL
      const { error: updateError } = await supabase
        .from('students')
        .update({
          profile_photo: fileRecord.url,
          timestamp: new Date().toISOString()
        })
        .eq('id', studentId);

      if (updateError) {
        console.error('Failed to update student record:', updateError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'File uploaded but failed to update student record'
          }
        });
      }

      res.status(201).json({
        success: true,
        message: 'Profile photo uploaded successfully',
        data: {
          studentId: studentId,
          photo: {
            id: fileRecord.id,
            url: fileRecord.url,
            originalName: fileRecord.originalName,
            size: fileRecord.size,
            mimeType: fileRecord.mimeType,
            uploadedAt: fileRecord.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Upload photo error:', error);
      next(error);
    }
  }

  /**
   * Delete CV for a student
   * DELETE /api/students/:id/cv
   */
  async deleteCV(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Validate student ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STUDENT_ID',
            message: 'Valid student ID is required'
          }
        });
      }

      const studentId = id;

      // Get student to verify ownership
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, cv_upload')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found'
          }
        });
      }

      // Check authorization
      const isAdmin = req.user.role === 'admin';
      const isOwner = student.id === userId;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete files from your own student profile'
          }
        });
      }

      if (!student.cv_upload) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_CV',
            message: 'No CV uploaded for this student'
          }
        });
      }

      // Find and delete the CV file from metadata
      const { data: files, error: fetchError } = await supabase
        .from('file_metadata')
        .select('id, path, bucket')
        .eq('student_id', studentId)
        .eq('file_type', 'cv');

      if (fetchError) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to fetch CV file metadata'
          }
        });
      }

      if (!files || files.length === 0) {
        // No file in metadata, but student has URL - clear it anyway
        await supabase
          .from('students')
          .update({
            cv_upload: null,
            timestamp: new Date().toISOString()
          })
          .eq('id', studentId);

        return res.status(200).json({
          success: true,
          message: 'CV removed (was not tracked in metadata)'
        });
      }

      // Delete the file
      await fileService.deleteFile(files[0].id, userId);

      // Update student record to remove CV URL
      await supabase
        .from('students')
        .update({
          cv_upload: null,
          timestamp: new Date().toISOString()
        })
        .eq('id', studentId);

      res.status(200).json({
        success: true,
        message: 'CV deleted successfully'
      });
    } catch (error) {
      console.error('Delete CV error:', error);
      next(error);
    }
  }

  /**
   * Delete profile photo for a student
   * DELETE /api/students/:id/photo
   */
  async deletePhoto(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Validate student ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STUDENT_ID',
            message: 'Valid student ID is required'
          }
        });
      }

      const studentId = id;

      // Get student to verify ownership
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, profile_photo')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found'
          }
        });
      }

      // Check authorization
      const isAdmin = req.user.role === 'admin';
      const isOwner = student.id === userId;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete files from your own student profile'
          }
        });
      }

      if (!student.profile_photo) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_PHOTO',
            message: 'No profile photo uploaded for this student'
          }
        });
      }

      // Find and delete the photo file from metadata
      const { data: files, error: fetchError } = await supabase
        .from('file_metadata')
        .select('id, path, bucket')
        .eq('student_id', studentId)
        .eq('file_type', 'photo');

      if (fetchError) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to fetch photo file metadata'
          }
        });
      }

      if (!files || files.length === 0) {
        // No file in metadata, but student has URL - clear it anyway
        await supabase
          .from('students')
          .update({
            profile_photo: null,
            timestamp: new Date().toISOString()
          })
          .eq('id', studentId);

        return res.status(200).json({
          success: true,
          message: 'Profile photo removed (was not tracked in metadata)'
        });
      }

      // Delete the file
      await fileService.deleteFile(files[0].id, userId);

      // Update student record to remove photo URL
      await supabase
        .from('students')
        .update({
          profile_photo: null,
          timestamp: new Date().toISOString()
        })
        .eq('id', studentId);

      res.status(200).json({
        success: true,
        message: 'Profile photo deleted successfully'
      });
    } catch (error) {
      console.error('Delete photo error:', error);
      next(error);
    }
  }

  /**
   * Get CV info for a student
   * GET /api/students/:id/cv
   */
  async getCV(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Validate student ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STUDENT_ID',
            message: 'Valid student ID is required'
          }
        });
      }

      const studentId = id;

      // Get student to verify ownership
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found'
          }
        });
      }

      // Check authorization
      const isAdmin = req.user.role === 'admin';
      const isOwner = student.id === userId;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view files from your own student profile'
          }
        });
      }

      // Get CV file metadata
      const files = await fileService.getStudentFiles(studentId, userId);
      const cvFile = files.find(f => f.fileType === 'cv');

      if (!cvFile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_CV',
            message: 'No CV found for this student'
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'CV retrieved successfully',
        data: {
          studentId: studentId,
          cv: cvFile
        }
      });
    } catch (error) {
      console.error('Get CV error:', error);
      next(error);
    }
  }

  /**
   * Get photo info for a student
   * GET /api/students/:id/photo
   */
  async getPhoto(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Validate student ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STUDENT_ID',
            message: 'Valid student ID is required'
          }
        });
      }

      const studentId = id;

      // Get student to verify ownership
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found'
          }
        });
      }

      // Check authorization
      const isAdmin = req.user.role === 'admin';
      const isOwner = student.id === userId;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view files from your own student profile'
          }
        });
      }

      // Get photo file metadata
      const files = await fileService.getStudentFiles(studentId, userId);
      const photoFile = files.find(f => f.fileType === 'photo');

      if (!photoFile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_PHOTO',
            message: 'No photo found for this student'
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Photo retrieved successfully',
        data: {
          studentId: studentId,
          photo: photoFile
        }
      });
    } catch (error) {
      console.error('Get photo error:', error);
      next(error);
    }
  }
}

module.exports = new StudentFileController();
