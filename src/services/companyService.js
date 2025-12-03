const { supabase } = require('../db');
const { responseCache } = require('./responseCacheService');
const logService = require('./logService');

class CompanyService {
  async getAllCompanies(filters = {}) {
    try {
      // Check cache first for list responses
      const cacheKey = 'getAllCompanies';
      const cachedResponse = responseCache.getAPIResponse(cacheKey, filters);

      if (cachedResponse) {
        return cachedResponse.data;
      }

      let query = supabase
        .from('companies')
        .select(`
          id,
          company_name,
          company_summary_description,
          industry_sector,
          company_website_link,
          company_logo,
          tech_roles_interest,
          preferred_skillsets,
          contact_person_name,
          contact_email,
          contact_phone_number,
          contact_info_visible,
          is_visible
        `, { count: 'exact' });

      // Apply filters
      if (filters.industry) {
        query = query.ilike('industry_sector', `%${filters.industry}%`);
      }

      if (filters.techRole) {
        query = query.ilike('tech_roles_interest', `%${filters.techRole}%`);
      }

      // Filter out invisible companies - only show visible ones
      query = query.eq('is_visible', true);

      // Apply pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      query = query
        .range(offset, offset + limit - 1)
        .order('company_name');

      const { data, error, count } = await query;

      if (error) {
        console.error('[ERROR] Failed to fetch companies:', error.message);
        throw new Error('Failed to fetch companies');
      }

      // Transform data to camelCase for API consistency (excluding phone numbers for public API)
      const transformedData = data.map(company => this.transformCompanyDataPublic(company));

      const response = {
        companies: transformedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };

      // Cache the response
      responseCache.setAPIResponse(cacheKey, filters, response);

      return response;
    } catch (error) {
      console.error('[ERROR] CompanyService.getAllCompanies:', error.message);
      throw error;
    }
  }

  async getCompanyById(id) {
    try {
      // Check cache first for individual company
      const cacheKey = 'getCompanyById';
      const cachedResponse = responseCache.getAPIResponse(cacheKey, { id });

      if (cachedResponse && cachedResponse.data.id) {
        return cachedResponse.data;
      }

      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          company_name,
          company_summary_description,
          industry_sector,
          company_website_link,
          company_logo,
          tech_roles_interest,
          preferred_skillsets,
          contact_person_name,
          contact_email,
          contact_phone_number,
          contact_info_visible,
          is_visible
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Company not found
        }
        console.error('[ERROR] Failed to fetch company:', error.message);
        throw new Error('Failed to fetch company');
      }

      // Check if company is visible - return null if not visible
      if (!data['is_visible']) {
        return null; // Hide invisible companies
      }

      const transformedData = this.transformCompanyDataPublic(data);

      // Cache the individual company response
      responseCache.setAPIResponse(cacheKey, { id }, transformedData);

      return transformedData;
    } catch (error) {
      console.error('[ERROR] CompanyService.getCompanyById:', error.message);
      throw error;
    }
  }

  async searchCompanies(searchTerm, filters = {}) {
    try {
      // Parse multiple search terms
      const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);

      if (searchTerms.length === 0) {
        return [];
      }

      let query = supabase
        .from('companies')
        .select(`
          id,
          company_name,
          company_summary_description,
          industry_sector,
          company_website_link,
          company_logo,
          tech_roles_interest,
          preferred_skillsets,
          contact_person_name,
          contact_email,
          contact_phone_number,
          contact_info_visible,
          is_visible
        `);

      // Build dynamic OR conditions for multiple search terms
      const fields = ['company_name', 'company_summary_description', 'industry_sector', 'tech_roles_interest'];
      const orConditions = [];

      for (const term of searchTerms) {
        for (const field of fields) {
          orConditions.push(`${field}.ilike.%${term}%`);
        }
      }

      query = query.or(orConditions.join(','));

      // Apply additional filters
      if (filters.industry) {
        query = query.ilike('industry_sector', `%${filters.industry}%`);
      }

      if (filters.techRole) {
        query = query.ilike('tech_roles_interest', `%${filters.techRole}%`);
      }

      // Filter out invisible companies - only show visible ones in search
      query = query.eq('is_visible', true);

      const { data, error } = await query
        .order('company_name')
        .limit(50); // Limit search results

      if (error) {
        console.error('[ERROR] Failed to search companies - Supabase error:', error);
        throw new Error(`Database search failed: ${error.message}`);
      }

      const transformedResults = data.map(company => this.transformCompanyDataPublic(company));
      // console.log(`[DEBUG] Search for "${searchTerm}" returned ${transformedResults.length} results`);
      return transformedResults;
    } catch (error) {
      console.error('[ERROR] CompanyService.searchCompanies:', error.message);
      throw error;
    }
  }

  async getIndustries() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('industry_sector, is_visible')
        .eq('is_visible', true) // Only include visible companies
        .not('industry_sector', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch industries:', error.message);
        throw new Error('Failed to fetch industries');
      }

      // Get unique industries and sort them
      const industries = [...new Set(data.map(item => item['industry_sector']))]
        .filter(Boolean)
        .sort();

      return industries;
    } catch (error) {
      console.error('[ERROR] CompanyService.getIndustries:', error.message);
      throw error;
    }
  }

  async getTechRoles() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('tech_roles_interest, is_visible')
        .eq('is_visible', true) // Only include visible companies
        .not('tech_roles_interest', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch tech roles:', error.message);
        throw new Error('Failed to fetch tech roles');
      }

      // Split tech roles by common delimiters and get unique values
      const allRoles = data.map(item => {
        const roles = item['tech_roles_interest'] || '';
        return roles.split(/[,\n|]/).map(role => role.trim()).filter(Boolean);
      }).flat();

      const techRoles = [...new Set(allRoles)].sort();

      return techRoles;
    } catch (error) {
      console.error('[ERROR] CompanyService.getTechRoles:', error.message);
      throw error;
    }
  }

  async getCompanyStats() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('industry_sector, tech_roles_interest')
        .eq('is_visible', true); // Only include visible companies

      if (error) {
        console.error('[ERROR] Failed to fetch company stats:', error.message);
        throw new Error('Failed to fetch company stats');
      }

      const totalCompanies = data.length;
      const industries = [...new Set(data.map(item => item['industry_sector']).filter(Boolean))];

      const techRoles = data.map(item => {
        const roles = item['tech_roles_interest'] || '';
        return roles.split(/[,\/\n|]/).map(role => role.trim()).filter(Boolean);
      }).flat();

      const uniqueTechRoles = [...new Set(techRoles)];

      return {
        totalCompanies,
        totalIndustries: industries.length,
        totalTechRoles: uniqueTechRoles.length,
        topIndustries: this.getTopItems(industries, 5),
        topTechRoles: this.getTopItems(techRoles, 10)
      };
    } catch (error) {
      console.error('[ERROR] CompanyService.getCompanyStats:', error.message);
      throw error;
    }
  }

  async createCompany(companyData, req = null) {
    try {
      // Transform camelCase input to snake_case for database
      const dbData = this.transformCompanyDataForDB(companyData);

      const { data, error } = await supabase
        .from('companies')
        .insert([dbData])
        .select(`
          id,
          company_name,
          company_summary_description,
          industry_sector,
          company_website_link,
          company_logo,
          tech_roles_interest,
          preferred_skillsets,
          contact_person_name,
          contact_email,
          contact_phone_number,
          contact_info_visible,
          is_visible
        `)
        .single();

      if (error) {
        console.error('[ERROR] Failed to create company:', error.message);
        throw new Error(`Failed to create company: ${error.message}`);
      }

      // Log successful CREATE operation
      if (req) {
        await logService.logCreate({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'company',
          resourceId: data.id,
          newValues: data,
          request: req,
          routePath: req.path
        });
      }

      // console.log('[SUCCESS] Company created successfully with ID:', data.id);

      // Clear cache to ensure new company appears immediately
      responseCache.clearByTable('companies');

      const transformedData = this.transformCompanyData(data);
      return transformedData;
    } catch (error) {
      // Log failed CREATE operation
      if (req) {
        await logService.logError({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'company',
          resourceId: null,
          operation: 'CREATE',
          errorMessage: error.message,
          request: req,
          routePath: req?.path,
          newValues: companyData
        });
      }

      console.error('[ERROR] CompanyService.createCompany:', error.message);
      throw error;
    }
  }

  async updateCompany(id, updateData, req = null) {
    try {
      console.log('[DEBUG CompanyService.updateCompany] ID:', id);
      console.log('[DEBUG CompanyService.updateCompany] Update data received:', updateData);

      // Get old values for logging
      const { data: oldData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      // Transform camelCase input to snake_case for database
      const dbData = this.transformCompanyDataForDB(updateData);
      console.log('[DEBUG CompanyService.updateCompany] Transformed data for DB:', dbData);

      const { data, error } = await supabase
        .from('companies')
        .update(dbData)
        .eq('id', id)
        .select(`
          id,
          company_name,
          company_summary_description,
          industry_sector,
          company_website_link,
          company_logo,
          tech_roles_interest,
          preferred_skillsets,
          contact_person_name,
          contact_email,
          contact_phone_number,
          contact_info_visible,
          is_visible,
          timestamp
        `)
        .single();

      console.log('[DEBUG CompanyService.updateCompany] Supabase query result:');
      console.log('[DEBUG CompanyService.updateCompany] Data:', data);
      console.log('[DEBUG CompanyService.updateCompany] Error:', error);

      if (error) {
        console.log('[DEBUG CompanyService.updateCompany] Error code:', error.code);
        if (error.code === 'PGRST116') {
          console.log('[DEBUG CompanyService.updateCompany] Company not found, returning null');
          return null; // Company not found
        }
        console.error('[ERROR] Failed to update company:', error.message);
        console.error('[ERROR] Full error details:', error);
        throw new Error(`Failed to update company: ${error.message}`);
      }

      // Log successful UPDATE operation
      if (req && oldData) {
        await logService.logUpdate({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'company',
          resourceId: data.id,
          oldValues: oldData,
          newValues: data,
          request: req,
          routePath: req.path
        });
      }

      // console.log('[SUCCESS] Company updated successfully with ID:', data.id);

      // Clear cache to ensure updated company appears immediately
      responseCache.clearByTable('companies', id);

      console.log('[DEBUG CompanyService.updateCompany] About to transform data:', data);
      const transformedData = this.transformCompanyData(data);
      console.log('[DEBUG CompanyService.updateCompany] Transformed data:', transformedData);
      console.log('[DEBUG CompanyService.updateCompany] Returning transformed data');
      return transformedData;
    } catch (error) {
      // Log failed UPDATE operation
      if (req) {
        await logService.logError({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'company',
          resourceId: typeof id === 'string' && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) ? id : null,
          operation: 'UPDATE',
          errorMessage: error.message,
          request: req,
          routePath: req.path,
          newValues: updateData
        });
      }

      console.error('[ERROR] CompanyService.updateCompany:', error.message);
      throw error;
    }
  }

  async patchCompany(id, patchData, req = null) {
    try {
      // Transform camelCase input to snake_case for database (partial update)
      const dbData = this.transformCompanyDataForDBPartial(patchData);

      // Debug: Log the data being sent to Supabase
      console.log('[DEBUG] patchCompany input:', { id, patchData });
      console.log('[DEBUG] transformed dbData:', dbData);

      // Ensure we have some data to update
      if (Object.keys(dbData).length === 0) {
        throw new Error('No valid fields provided for partial update');
      }

      // Get old values for logging
      const { data: oldData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      // Try alternative approach: use individual field updates to avoid JSON conflicts
      const updatePromises = [];
      const keys = Object.keys(dbData);

      console.log('[DEBUG] About to call Supabase update with data:', dbData);
      console.log('[DEBUG] Keys to update:', keys);

      // Use the standard update method but with explicit type handling
      const { data, error } = await supabase
        .from('companies')
        .update(dbData)
        .eq('id', id)
        .select(`
          id,
          company_name,
          company_summary_description,
          industry_sector,
          company_website_link,
          company_logo,
          tech_roles_interest,
          preferred_skillsets,
          contact_person_name,
          contact_email,
          contact_phone_number,
          contact_info_visible,
          is_visible,
          timestamp
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Company not found
        }
        console.error('[ERROR] Failed to patch company:', error.message);
        console.error('[ERROR] Full error details:', error);
        console.error('[ERROR] Data being sent:', dbData);
        throw new Error(`Failed to patch company: ${error.message}`);
      }

      // Log successful UPDATE operation
      if (req && oldData) {
        await logService.logUpdate({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'company',
          resourceId: data.id,
          oldValues: oldData,
          newValues: data,
          request: req,
          routePath: req.path
        });
      }

      console.log('[SUCCESS] Company patched successfully with ID:', data.id);
      console.log('[SUCCESS] Returned data:', data);

      // Clear cache to ensure patched company appears immediately
      responseCache.clearByTable('companies', id);

      const transformedData = this.transformCompanyData(data);
      return transformedData;
    } catch (error) {
      // Log failed UPDATE operation
      if (req) {
        await logService.logError({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'company',
          resourceId: typeof id === 'string' && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) ? id : null,
          operation: 'UPDATE',
          errorMessage: error.message,
          request: req,
          routePath: req.path,
          newValues: patchData
        });
      }

      console.error('[ERROR] CompanyService.patchCompany:', error.message);
      throw error;
    }
  }

  async deleteCompany(id, req = null) {
    try {
      // Get old values for logging before deletion
      const { data: oldData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)
        .select('id, company_name')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Company not found
        }
        console.error('[ERROR] Failed to delete company:', error.message);
        throw new Error(`Failed to delete company: ${error.message}`);
      }

      // Log successful DELETE operation
      if (req && oldData) {
        await logService.logDelete({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'company',
          resourceId: oldData.id,
          oldValues: oldData,
          request: req,
          routePath: req.path
        });
      }

      // Clear cache to ensure deleted company is removed immediately
      responseCache.clearByTable('companies', id);

      return {
        id: data.id,
        companyName: data['company_name'],
        message: 'Company deleted successfully'
      };
    } catch (error) {
      // Log failed DELETE operation
      if (req) {
        await logService.logError({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'company',
          resourceId: typeof id === 'string' && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) ? id : null,
          operation: 'DELETE',
          errorMessage: error.message,
          request: req,
          routePath: req.path,
          newValues: null
        });
      }

      console.error('[ERROR] CompanyService.deleteCompany:', error.message);
      throw error;
    }
  }

  transformCompanyDataForDB(companyData) {
    const dbData = {
      'id': companyData.id,
      'company_name': companyData.companyName,
      'company_summary_description': companyData.companySummary,
      'industry_sector': companyData.industry,
      'company_website_link': companyData.companyWebsite || companyData.website || null,
      'company_logo': companyData.companyLogo || companyData.logo || null,
      'tech_roles_interest': companyData.techRoles || null,
      'preferred_skillsets': companyData.preferredSkillsets || null,
      'contact_person_name': companyData.contactPersonName || companyData.contactPerson || null,
      'contact_email': companyData.contactEmailAddress || companyData.contactEmail || null,
      'contact_phone_number': companyData.contactPhoneNumber || companyData.contactPhone || null,
      'contact_info_visible': (companyData.visibleContactInfo || companyData.contactInfoVisible) || false,
      'is_visible': companyData.isVisible !== undefined ? companyData.isVisible : false
    };

    // Only include email_address if it exists (handle potential missing field)
    if (companyData.emailAddress !== undefined) {
      dbData['email_address'] = companyData.emailAddress;
    }

    return dbData;
  }

  transformCompanyDataForDBPartial(patchData) {
    const dbData = {};

    // Update timestamp on any partial update
    dbData['timestamp'] = new Date().toISOString();

    // Only include fields that are explicitly provided (not undefined)
    if (patchData.emailAddress !== undefined) {
      dbData['email_address'] = patchData.emailAddress;
    }
    if (patchData.companyName !== undefined) {
      dbData['company_name'] = patchData.companyName;
    }
    if (patchData.companySummary !== undefined) {
      dbData['company_summary_description'] = patchData.companySummary;
    }
    if (patchData.industry !== undefined) {
      dbData['industry_sector'] = patchData.industry;
    }
    if (patchData.companyWebsite !== undefined) {
      dbData['company_website_link'] = patchData.companyWebsite || null;
    }
    // Accept simplified field name too
    if (patchData.website !== undefined) {
      dbData['company_website_link'] = patchData.website || null;
    }
    if (patchData.companyLogo !== undefined) {
      dbData['company_logo'] = patchData.companyLogo || null;
    }
    // Accept simplified field name too
    if (patchData.logo !== undefined) {
      dbData['company_logo'] = patchData.logo || null;
    }
    if (patchData.techRoles !== undefined) {
      // Ensure tech roles is always a string to avoid JSON conflicts
      dbData['tech_roles_interest'] = patchData.techRoles ? String(patchData.techRoles) : null;
    }
    if (patchData.preferredSkillsets !== undefined) {
      // Ensure skillsets is always a string to avoid JSON conflicts
      dbData['preferred_skillsets'] = patchData.preferredSkillsets ? String(patchData.preferredSkillsets) : null;
    }
    if (patchData.contactPersonName !== undefined) {
      dbData['contact_person_name'] = patchData.contactPersonName || null;
    }
    // Accept simplified field name too
    if (patchData.contactPerson !== undefined) {
      dbData['contact_person_name'] = patchData.contactPerson || null;
    }
    if (patchData.contactEmailAddress !== undefined) {
      dbData['contact_email'] = patchData.contactEmailAddress || null;
    }
    // Accept simplified field name too
    if (patchData.contactEmail !== undefined) {
      dbData['contact_email'] = patchData.contactEmail || null;
    }
    if (patchData.contactPhoneNumber !== undefined) {
      dbData['contact_phone_number'] = patchData.contactPhoneNumber || null;
    }
    // Accept simplified field name too
    if (patchData.contactPhone !== undefined) {
      dbData['contact_phone_number'] = patchData.contactPhone || null;
    }
    if (patchData.visibleContactInfo !== undefined) {
      dbData['contact_info_visible'] = patchData.visibleContactInfo || false;
    }
    // Accept simplified field name too
    if (patchData.contactInfoVisible !== undefined) {
      dbData['contact_info_visible'] = patchData.contactInfoVisible || false;
    }
    if (patchData.isVisible !== undefined) {
      dbData['is_visible'] = patchData.isVisible;
    }

    return dbData;
  }

  /**
   * Transform company data for public API responses (excludes phone number)
   * @param {Object} company - Raw company data from database
   * @returns {Object} Transformed company data without phone number
   */
  transformCompanyDataPublic(company) {
    const isContactInfoVisible = company['contact_info_visible'] === true;

    return {
      id: company.id,
      companyName: company['company_name'],
      companySummary: company['company_summary_description'],
      industry: company['industry_sector'],
      website: company['company_website_link'],
      logo: company['company_logo'],
      techRoles: company['tech_roles_interest'],
      preferredSkillsets: company['preferred_skillsets'],
      contactPerson: company['contact_person_name'],
      contactEmail: isContactInfoVisible ? company['contact_email'] : null,
      // Phone number excluded for public API privacy
      contactInfoVisible: isContactInfoVisible
    };
  }

  /**
   * Transform company list data for public API responses (excludes phone numbers)
   * @param {Array} companies - Array of company data from database
   * @returns {Array} Transformed company data without phone numbers
   */
  transformCompanyListPublic(companies) {
    return companies.map(company => this.transformCompanyDataPublic(company));
  }

  transformCompanyData(company) {
    const isContactInfoVisible = company['contact_info_visible'] === true;

    return {
      id: company.id,
      companyName: company['company_name'],
      companySummary: company['company_summary_description'],
      industry: company['industry_sector'],
      website: company['company_website_link'],
      logo: company['company_logo'],
      techRoles: company['tech_roles_interest'],
      preferredSkillsets: company['preferred_skillsets'],
      contactPerson: company['contact_person_name'],
      contactEmail: isContactInfoVisible ? company['contact_email'] : null,
      contactPhone: isContactInfoVisible ? company['contact_phone_number'] : null,
      contactInfoVisible: isContactInfoVisible
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

module.exports = new CompanyService();