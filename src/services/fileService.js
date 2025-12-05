/**
 * File Service
 * Generic file upload/delete service for Supabase Storage
 * Reusable across students, companies, and future resources
 */

const { supabase } = require('../db');

class FileService {
  /**
   * Upload a file to Supabase Storage and track metadata
   * @param {Object} file - File object from multer (buffer, originalname, mimetype, size)
   * @param {Object} options - Upload options
   * @param {string} options.bucket - Storage bucket name (e.g., 'student-cvs', 'student-photos')
   * @param {string} options.userId - User ID (from JWT)
   * @param {string} options.fileType - File type ('cv', 'photo', 'logo', 'document')
   * @param {number} options.studentId - Student ID (optional, if attaching to student)
   * @param {number} options.companyId - Company ID (optional, if attaching to company)
   * @returns {Object} - File metadata including ID, URL, and file info
   */
  async uploadFile(file, options) {
    try {
      const { bucket, userId, fileType, studentId, companyId } = options;

      // Validate required options
      if (!file || !bucket || !userId || !fileType) {
        throw new Error('Missing required options: bucket, userId, fileType');
      }

      // Validate file type in fileType enum
      const validFileTypes = ['cv', 'photo', 'logo', 'document'];
      if (!validFileTypes.includes(fileType)) {
        throw new Error(`Invalid fileType. Must be one of: ${validFileTypes.join(', ')}`);
      }

      // Generate unique filename: {userId}/{timestamp}_{originalname}
      const timestamp = Date.now();
      const sanitizedFilename = this.sanitizeFilename(file.originalname, fileType);
      const fileName = `${userId}/${timestamp}_${sanitizedFilename}`;

      // Upload file to Supabase Storage
      console.log('[' + new Date().toISOString() + '] Uploading to storage:', {
        bucket,
        fileName,
        size: file.size,
        mimetype: file.mimetype
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600', // Cache for 1 hour
          upsert: false
        });

      if (uploadError) {
        console.error('[' + new Date().toISOString() + '] File upload error:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      console.log('[' + new Date().toISOString() + '] Storage upload successful:', uploadData);

      // Generate public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Store metadata in file_metadata table
      console.log('[' + new Date().toISOString() + '] Inserting metadata:', {
        bucket,
        path: fileName,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        user_id: userId,
        student_id: studentId || null,
        company_id: companyId || null,
        file_type: fileType
      });

      let metadata;
      let metadataError;

      try {
        const result = await supabase
          .from('file_metadata')
          .insert({
            bucket,
            path: fileName,
            original_name: file.originalname,
            mime_type: file.mimetype,
            size: file.size,
            user_id: userId,
            student_id: studentId || null,
            company_id: companyId || null,
            file_type: fileType
          })
          .select()
          .single();

        metadata = result.data;
        metadataError = result.error;
      } catch (err) {
        // Catch any unexpected errors (network, etc.)
        metadataError = err;
      }

      if (metadataError) {
        console.error('[' + new Date().toISOString() + '] Metadata insert error:', metadataError);
        // If metadata insert fails, try to delete the uploaded file
        console.log('[' + new Date().toISOString() + '] Deleting file due to metadata insert failure:', fileName);
        try {
          await supabase.storage.from(bucket).remove([fileName]);
        } catch (deleteErr) {
          console.error('[' + new Date().toISOString() + '] Failed to cleanup file:', deleteErr);
        }
        throw new Error(`Failed to store file metadata: ${metadataError.message || metadataError}`);
      }

      console.log('[' + new Date().toISOString() + '] Metadata insert successful:', metadata);

      return {
        id: metadata.id,
        bucket: metadata.bucket,
        path: metadata.path,
        url: urlData.publicUrl,
        originalName: metadata.original_name,
        mimeType: metadata.mime_type,
        size: metadata.size,
        fileType: metadata.file_type,
        studentId: metadata.student_id,
        companyId: metadata.company_id,
        createdAt: metadata.created_at
      };
    } catch (error) {
      console.error('Upload file error:', error);
      throw error;
    }
  }

  /**
   * Delete a file from storage and metadata
   * @param {number} fileId - File metadata ID
   * @param {string} userId - User ID requesting deletion (for authorization)
   * @returns {Object} - Success message
   */
  async deleteFile(fileId, userId) {
    try {
      // Get file metadata
      const { data: file, error: fetchError } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fetchError) {
        throw new Error(`File not found: ${fetchError.message}`);
      }

      // Authorization: User can only delete their own files, or admin can delete any
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const isAdmin = userData?.role === 'admin';
      const isOwner = file.user_id === userId;

      if (!isOwner && !isAdmin) {
        throw new Error('Unauthorized: You can only delete your own files');
      }

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from(file.bucket)
        .remove([file.path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue with metadata deletion even if storage delete fails
      }

      // Delete metadata from database
      const { error: deleteError } = await supabase
        .from('file_metadata')
        .delete()
        .eq('id', fileId);

      if (deleteError) {
        throw new Error(`Failed to delete file metadata: ${deleteError.message}`);
      }

      return {
        success: true,
        message: 'File deleted successfully',
        fileId: fileId
      };
    } catch (error) {
      console.error('Delete file error:', error);
      throw error;
    }
  }

  /**
   * Get file metadata by ID
   * @param {number} fileId - File metadata ID
   * @param {string} userId - User ID requesting access (for authorization)
   * @returns {Object} - File metadata
   */
  async getFileMetadata(fileId, userId) {
    try {
      const { data: file, error } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error) {
        throw new Error(`File not found: ${error.message}`);
      }

      // Authorization: User can only access their own files, or admin can access any
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const isAdmin = userData?.role === 'admin';
      const isOwner = file.user_id === userId;

      if (!isOwner && !isAdmin) {
        throw new Error('Unauthorized: You can only access your own files');
      }

      return {
        id: file.id,
        bucket: file.bucket,
        path: file.path,
        originalName: file.original_name,
        mimeType: file.mime_type,
        size: file.size,
        fileType: file.file_type,
        userId: file.user_id,
        studentId: file.student_id,
        companyId: file.company_id,
        createdAt: file.created_at,
        updatedAt: file.updated_at
      };
    } catch (error) {
      console.error('Get file metadata error:', error);
      throw error;
    }
  }

  /**
   * Generate a signed URL for secure file access
   * @param {number} fileId - File metadata ID
   * @param {string} userId - User ID requesting access (for authorization)
   * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   * @returns {string} - Signed URL
   */
  async generateSignedUrl(fileId, userId, expiresIn = 3600) {
    try {
      // Get file metadata
      const file = await this.getFileMetadata(fileId, userId);

      // Generate signed URL
      const { data, error } = await supabase.storage
        .from(file.bucket)
        .createSignedUrl(file.path, expiresIn);

      if (error) {
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Generate signed URL error:', error);
      throw error;
    }
  }

  /**
   * Get all files for a specific student
   * @param {number} studentId - Student ID
   * @param {string} userId - User ID requesting access (for authorization)
   * @returns {Array} - Array of file metadata
   */
  async getStudentFiles(studentId, userId) {
    try {
      // Verify student belongs to user or user is admin
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .single();

      if (studentError) {
        throw new Error(`Student not found: ${studentError.message}`);
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const isAdmin = userData?.role === 'admin';
      const isOwner = student.id === userId;

      if (!isOwner && !isAdmin) {
        throw new Error('Unauthorized: You can only access your own student profile files');
      }

      // Get all files for this student
      const { data: files, error } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('student_id', studentId);

      if (error) {
        throw new Error(`Failed to fetch student files: ${error.message}`);
      }

      // Get public URLs for all files
      const filesWithUrls = await Promise.all(
        files.map(async (file) => {
          const { data: urlData } = supabase.storage
            .from(file.bucket)
            .getPublicUrl(file.path);

          return {
            id: file.id,
            bucket: file.bucket,
            path: file.path,
            url: urlData.publicUrl,
            originalName: file.original_name,
            mimeType: file.mime_type,
            size: file.size,
            fileType: file.file_type,
            studentId: file.student_id,
            companyId: file.company_id,
            createdAt: file.created_at
          };
        })
      );

      return filesWithUrls;
    } catch (error) {
      console.error('Get student files error:', error);
      throw error;
    }
  }

  /**
   * Get all files for a specific company
   * @param {number} companyId - Company ID
   * @param {string} userId - User ID requesting access (for authorization)
   * @returns {Array} - Array of file metadata
   */
  async getCompanyFiles(companyId, userId) {
    try {
      // Verify company belongs to user or user is admin
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .single();

      if (companyError) {
        throw new Error(`Company not found: ${companyError.message}`);
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const isAdmin = userData?.role === 'admin';
      const isOwner = company.id === userId;

      if (!isOwner && !isAdmin) {
        throw new Error('Unauthorized: You can only access your own company profile files');
      }

      // Get all files for this company
      const { data: files, error } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        throw new Error(`Failed to fetch company files: ${error.message}`);
      }

      // Get public URLs for all files
      const filesWithUrls = await Promise.all(
        files.map(async (file) => {
          const { data: urlData } = supabase.storage
            .from(file.bucket)
            .getPublicUrl(file.path);

          return {
            id: file.id,
            bucket: file.bucket,
            path: file.path,
            url: urlData.publicUrl,
            originalName: file.original_name,
            mimeType: file.mime_type,
            size: file.size,
            fileType: file.file_type,
            studentId: file.student_id,
            companyId: file.company_id,
            createdAt: file.created_at
          };
        })
      );

      return filesWithUrls;
    } catch (error) {
      console.error('Get company files error:', error);
      throw error;
    }
  }

  /**
   * Sanitize filename to remove special characters and test prefixes
   * @param {string} filename - Original filename
   * @param {string} fileType - File type (cv, photo, logo, document)
   * @returns {string} - Sanitized filename
   */
  sanitizeFilename(filename, fileType = '') {
    let name = filename;

    // Remove file extension to work with the name
    const extension = filename.split('.').pop();
    name = filename.replace(/\.[^/.]+$/, '');

    // Remove test/sample prefixes for cleaner naming
    name = name
      .replace(/^(test_|_test_|test-|sample_|_sample_|sample-)/i, '') // Remove test/sample prefixes
      .replace(/^[-_]+|[-_]+$/g, ''); // Remove leading/trailing dashes/underscores

    // Replace special characters with underscore
    name = name.replace(/[^a-zA-Z0-9]/g, '_');

    // Replace multiple underscores with single
    name = name.replace(/_{2,}/g, '_');

    // Limit length (keep some room for extension)
    name = name.substring(0, 90);

    // If name is too short or is just an extension, provide a better default based on file type
    if (name.length < 2) {
      const timestamp = Date.now();
      switch (fileType) {
        case 'cv':
          name = `cv_${timestamp}`;
          break;
        case 'photo':
          name = `profile_photo_${timestamp}`;
          break;
        case 'logo':
          name = `logo_${timestamp}`;
          break;
        default:
          name = `document_${timestamp}`;
      }
    }

    // Re-add extension
    return `${name}.${extension}`;
  }

  /**
   * Validate file type and size
   * @param {Object} file - File object from multer
   * @param {Array} allowedTypes - Array of allowed MIME types
   * @param {number} maxSize - Maximum file size in bytes
   * @returns {Object} - Validation result
   */
  validateFile(file, allowedTypes, maxSize) {
    const errors = [];

    // Check file exists
    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      errors.push(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds limit of ${maxSizeMB}MB`);
    }

    // Check file type
    if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      errors.push(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check filename
    if (!file.originalname || file.originalname.trim() === '') {
      errors.push('Invalid filename');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new FileService();
