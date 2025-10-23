const companyService = require('../services/companyService');

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

      const result = await companyService.getAllCompanies(filters);

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

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID'
        });
      }

      const company = await companyService.getCompanyById(parseInt(id));

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

      const companies = await companyService.searchCompanies(q.trim(), filters);

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

      const newCompany = await companyService.createCompany(companyData);

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

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID'
        });
      }

      const updatedCompany = await companyService.updateCompany(parseInt(id), updateData);

      if (!updatedCompany) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

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

      if (!id || isNaN(id)) {
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

      const patchedCompany = await companyService.patchCompany(parseInt(id), patchData);

      if (!patchedCompany) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

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

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID'
        });
      }

      const result = await companyService.deleteCompany(parseInt(id));

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

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
}

module.exports = new CompanyController();