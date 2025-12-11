const companyService = require('../services/companyService');
const authService = require('../services/authService');
const { supabase } = require('../db');

class CompanyController {
  async getCompanies(req, res, next) {
    try {
      const filters = {
        industry: req.query.industry,
        techRole: req.query.techRole,
        page: req.query.page,
        limit: req.query.limit
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const currentUser = req.user;
      const result = await companyService.getAllCompanies(filters, currentUser);

      res.status(200).json({
        success: true,
        message: 'Companies retrieved successfully',
        data: result.companies,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getCompanyById(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID'
        });
      }

      const currentUser = req.user;
      const company = await companyService.getCompanyById(id, currentUser);

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Company retrieved successfully',
        data: company
      });
    } catch (error) {
      next(error);
    }
  }

  async searchCompanies(req, res, next) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const filters = {
        industry: req.query.industry,
        techRole: req.query.techRole
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const currentUser = req.user;
      const companies = await companyService.searchCompanies(q.trim(), filters, currentUser);

      res.status(200).json({
        success: true,
        message: 'Companies found',
        data: companies,
        total: companies.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getIndustries(req, res, next) {
    try {
      const industries = await companyService.getIndustries();

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

  async getTechRoles(req, res, next) {
    try {
      const techRoles = await companyService.getTechRoles();

      res.status(200).json({
        success: true,
        message: 'Tech roles retrieved successfully',
        data: techRoles,
        total: techRoles.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getCompanyStats(req, res, next) {
    try {
      const stats = await companyService.getCompanyStats();

      res.status(200).json({
        success: true,
        message: 'Company statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async createCompany(req, res, next) {
    try {
      const companyData = req.body;
      const currentUser = req.user;

      // Explicitly set the ID to match the authenticated user's UUID
      // This is needed because the backend uses service role key
      companyData.id = currentUser.id;

      const newCompany = await companyService.createCompany(companyData, req);

      res.status(201).json({
        success: true,
        message: 'Company created successfully',
        data: newCompany
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCompany(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID'
        });
      }

      // Authorization check: user must be admin or own the resource
      const currentUser = req.user;

      // Check if user is admin or owns this company
      const company = await companyService.getCompanyById(id, currentUser);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Allow if admin or if user owns this company
      const isOwner = company.id === currentUser.id;

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
            message: 'You can only update your own company profile',
            data: null
          });
        }
      }

      const updatedCompany = await companyService.updateCompany(id, updateData, req);

      res.status(200).json({
        success: true,
        message: 'Company updated successfully',
        data: updatedCompany
      });
    } catch (error) {
      next(error);
    }
  }

  async patchCompany(req, res, next) {
    try {
      const { id } = req.params;
      const patchData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID'
        });
      }

      // Validate that patch data is not empty
      if (!patchData || Object.keys(patchData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields provided for partial update'
        });
      }

      // Authorization check: user must be admin or own the resource
      const currentUser = req.user;

      // Check if user is admin or owns this company
      const company = await companyService.getCompanyById(id, currentUser);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Allow if admin or if user owns this company
      const isOwner = company.id === currentUser.id;

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
            message: 'You can only update your own company profile',
            data: null
          });
        }
      }

      const patchedCompany = await companyService.patchCompany(id, patchData, req);

      res.status(200).json({
        success: true,
        message: 'Company patched successfully',
        data: patchedCompany
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCompany(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID'
        });
      }

      // Authorization check: user must be admin or own the resource
      const currentUser = req.user;
      const userRole = await authService.getUserRole(currentUser);

      // Check if user is admin or owns this company
      const company = await companyService.getCompanyById(id, currentUser);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Allow if admin or if user owns this company
      const isOwner = company.id === currentUser.id;
      const isAdmin = userRole === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own company profile',
          data: null
        });
      }

      const result = await companyService.deleteCompany(id, req);

      res.status(200).json({
        success: true,
        message: 'Company deleted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async validateLogo(req, res, next) {
    try {
      // Basic validation for company logo URLs or uploads
      const { logoUrl } = req.body;

      if (!logoUrl) {
        return res.status(400).json({
          success: false,
          message: 'Logo URL is required'
        });
      }

      // Basic URL validation
      const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
      const isValidUrl = urlPattern.test(logoUrl);

      // Check file size estimation (basic validation)
      const isLocalFile = logoUrl.startsWith('/') || logoUrl.startsWith('data:');

      res.status(200).json({
        success: true,
        message: 'Logo validation completed',
        data: {
          isValid: isValidUrl || isLocalFile,
          recommendations: {
            maxWidth: 400,
            maxHeight: 400,
            maxSize: '5MB',
            formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkApproveCompanies(req, res, next) {
    try {
      const { companyIds, isVisible = true } = req.body;

      if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'companyIds array is required and must not be empty',
          data: null
        });
      }

      // Authorization check: only admin can bulk approve
      const currentUser = req.user;
      const userRole = await authService.getUserRole(currentUser);

      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admin users can bulk approve companies',
          data: null
        });
      }

      const result = await companyService.bulkApproveCompanies(companyIds, isVisible, req);

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

module.exports = new CompanyController();