/**
 * Company File Controller
 * Handles logo file uploads for company profiles
 * Follows industry-standard RESTful patterns
 */

const fileService = require('../services/fileService');
const { supabase } = require('../db');

class CompanyFileController {
  /**
   * Upload logo for a company
   * POST /api/companies/:id/logo
   */
  async uploadLogo(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Validate company ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COMPANY_ID',
            message: 'Valid company ID is required'
          }
        });
      }

      const companyId = id;

      // Get company to verify ownership
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('user_id, company_logo')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'COMPANY_NOT_FOUND',
            message: 'Company not found'
          }
        });
      }

      // Check authorization: Company owner can upload to own profile, admin can upload to any
      const isAdmin = req.user.role === 'admin';
      const isOwner = company.user_id === userId;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only upload files to your own company profile'
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
        bucket: 'company-logos',
        userId: userId,
        fileType: 'logo',
        companyId: companyId
      });

      // If company already has a logo, delete the old one
      if (company.company_logo) {
        try {
          // Extract old file path from the current logo URL
          const oldUrl = company.company_logo;
          const oldPathMatch = oldUrl.match(/\/company-logos\/(.+)$/);

          if (oldPathMatch && oldPathMatch[1]) {
            const oldFilePath = oldPathMatch[1];

            // Find the old file in metadata
            const { data: oldFile } = await supabase
              .from('file_metadata')
              .select('id, path')
              .eq('bucket', 'company-logos')
              .eq('path', oldFilePath)
              .eq('company_id', companyId)
              .single();

            if (oldFile) {
              // Delete old file (ignore errors to not fail the upload if old file cleanup fails)
              console.log('Deleting old logo file:', oldFile.path);
              await fileService.deleteFile(oldFile.id, userId);
            }
          }
        } catch (error) {
          console.warn('Failed to delete old logo file:', error.message);
          // Continue with upload even if old file deletion fails
        }
      }

      // Update company record with new logo URL
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          company_logo: fileRecord.url,
          timestamp: new Date().toISOString()
        })
        .eq('id', companyId);

      if (updateError) {
        console.error('Failed to update company record:', updateError);
        // Don't delete the uploaded file, as it might be recoverable
        return res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'File uploaded but failed to update company record'
          }
        });
      }

      res.status(201).json({
        success: true,
        message: 'Logo uploaded successfully',
        data: {
          companyId: companyId,
          logo: {
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
      console.error('Upload logo error:', error);
      next(error);
    }
  }

  /**
   * Delete logo for a company
   * DELETE /api/companies/:id/logo
   */
  async deleteLogo(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Validate company ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COMPANY_ID',
            message: 'Valid company ID is required'
          }
        });
      }

      const companyId = id;

      // Get company to verify ownership
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('user_id, company_logo')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'COMPANY_NOT_FOUND',
            message: 'Company not found'
          }
        });
      }

      // Check authorization
      const isAdmin = req.user.role === 'admin';
      const isOwner = company.user_id === userId;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete files from your own company profile'
          }
        });
      }

      if (!company.company_logo) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_LOGO',
            message: 'No logo uploaded for this company'
          }
        });
      }

      // Find and delete the logo file from metadata
      const { data: files, error: fetchError } = await supabase
        .from('file_metadata')
        .select('id, path, bucket')
        .eq('company_id', companyId)
        .eq('file_type', 'logo');

      if (fetchError) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to fetch logo file metadata'
          }
        });
      }

      if (!files || files.length === 0) {
        // No file in metadata, but company has URL - clear it anyway
        await supabase
          .from('companies')
          .update({
            company_logo: null,
            timestamp: new Date().toISOString()
          })
          .eq('id', companyId);

        return res.status(200).json({
          success: true,
          message: 'Logo removed (was not tracked in metadata)'
        });
      }

      // Delete the file
      await fileService.deleteFile(files[0].id, userId);

      // Update company record to remove logo URL
      await supabase
        .from('companies')
        .update({
          company_logo: null,
          timestamp: new Date().toISOString()
        })
        .eq('id', companyId);

      res.status(200).json({
        success: true,
        message: 'Logo deleted successfully'
      });
    } catch (error) {
      console.error('Delete logo error:', error);
      next(error);
    }
  }

  /**
   * Get logo info for a company
   * GET /api/companies/:id/logo
   */
  async getLogo(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Validate company ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COMPANY_ID',
            message: 'Valid company ID is required'
          }
        });
      }

      const companyId = id;

      // Get company to verify ownership
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('user_id')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'COMPANY_NOT_FOUND',
            message: 'Company not found'
          }
        });
      }

      // Check authorization
      const isAdmin = req.user.role === 'admin';
      const isOwner = company.user_id === userId;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view files from your own company profile'
          }
        });
      }

      // Get logo file metadata
      const files = await fileService.getCompanyFiles(companyId, userId);
      const logoFile = files.find(f => f.fileType === 'logo');

      if (!logoFile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_LOGO',
            message: 'No logo found for this company'
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Logo retrieved successfully',
        data: {
          companyId: companyId,
          logo: logoFile
        }
      });
    } catch (error) {
      console.error('Get logo error:', error);
      next(error);
    }
  }
}

module.exports = new CompanyFileController();
