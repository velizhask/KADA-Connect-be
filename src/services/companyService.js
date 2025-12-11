const { supabase } = require('../db');
const { responseCache } = require('./responseCacheService');
const logService = require('./logService');

class CompanyService {
  async getAllCompanies(filters = {}, currentUser = null) {
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
          email_address,
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
      // Exception: Admin can see all companies (including invisible for soft delete)
      const isAdmin = currentUser && currentUser.role === 'admin';
      if (!isAdmin) {
        query = query.eq('is_visible', true);
      }

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
      const transformedData = data.map(company => this.transformCompanyDataPublic(company, currentUser?.role));

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

  async getCompanyById(id, currentUser = null) {
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
          email_address,
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
      // Exception: Admin can see invisible companies
      const isAdmin = currentUser && currentUser.role === 'admin';
      if (!data['is_visible'] && !isAdmin) {
        return null; // Hide invisible companies from non-admin users
      }

      const transformedData = this.transformCompanyDataPublic(data, currentUser?.role);

      // Cache the individual company response
      responseCache.setAPIResponse(cacheKey, { id }, transformedData);

      return transformedData;
    } catch (error) {
      console.error('[ERROR] CompanyService.getCompanyById:', error.message);
      throw error;
    }
  }

  async searchCompanies(searchTerm, filters = {}, currentUser = null) {
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
          email_address,
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
      // Exception: Admin can see invisible companies
      const isAdmin = currentUser && currentUser.role === 'admin';
      if (!isAdmin) {
        query = query.eq('is_visible', true);
      }

      const { data, error } = await query
        .order('company_name')
        .limit(50); // Limit search results

      if (error) {
        console.error('[ERROR] Failed to search companies - Supabase error:', error);
        throw new Error(`Database search failed: ${error.message}`);
      }

      const transformedResults = data.map(company => this.transformCompanyDataPublic(company, currentUser?.role));
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

      // Split industries by common delimiters and get unique values
      const allIndustries = data.map(item => {
        const industries = item['industry_sector'] || '';
        return industries.split(/[,\n|]/).map(industry => industry.trim()).filter(Boolean);
      }).flat();

      const industries = [...new Set(allIndustries)].sort();

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
          email_address,
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
          email_address,
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
      console.log('[DEBUG] === PATCH COMPANY START ===');
      console.log('[DEBUG] Company ID:', id);
      console.log('[DEBUG] Patch data:', JSON.stringify(patchData, null, 2));
      console.log('[DEBUG] Current user:', req?.user?.id);

      // Transform camelCase input to snake_case for database (partial update)
      const dbData = this.transformCompanyDataForDBPartial(patchData);

      console.log('[DEBUG] Prepared DB data:', JSON.stringify(dbData, null, 2));
      console.log('[DEBUG] Executing Supabase update...');

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
          email_address,
          is_visible,
          timestamp
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Company not found
        }
        console.error('[ERROR] Failed to patch company:', error.message);
        console.error('[ERROR] Error code:', error.code);
        console.error('[ERROR] Error details:', error);
        console.error('[ERROR] Data being sent:', JSON.stringify(dbData, null, 2));
        throw new Error(`Failed to patch company: ${error.message}`);
      }

      // VERIFICATION: Check if data was actually updated
      if (!data) {
        console.error('[ERROR] No data returned from patch operation');
        throw new Error('Failed to patch company: No data returned from database');
      }

      console.log('[DEBUG] Patch operation completed successfully');
      console.log('[DEBUG] Updated company ID:', data.id);
      console.log('[DEBUG] isVisible flag:', data.is_visible);

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

      console.log('[DEBUG] === PATCH COMPANY SUCCESS ===');
      console.log('[DEBUG] Updated company ID:', data.id);
      console.log('[DEBUG] Transformation complete');

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

  async bulkApproveCompanies(companyIds, isVisible = true, req = null) {
    try {
      console.log('[DEBUG] === BULK APPROVE COMPANIES START ===');
      console.log('[DEBUG] Company IDs:', companyIds);
      console.log('[DEBUG] isVisible:', isVisible);

      // Validate input
      if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
        throw new Error('Company IDs array is required and must not be empty');
      }

      // Validate UUID format for each ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidIds = companyIds.filter(id => !uuidRegex.test(id));
      if (invalidIds.length > 0) {
        throw new Error(`Invalid UUID format for IDs: ${invalidIds.join(', ')}`);
      }

      // Convert string boolean to actual boolean if needed
      let visibleValue = isVisible;
      if (typeof isVisible === 'string') {
        visibleValue = isVisible.toLowerCase() === 'true';
      }

      // Update all companies with the same visibility value
      const updateData = {
        'is_visible': visibleValue,
        'timestamp': new Date().toISOString()
      };

      console.log('[DEBUG] Update data:', updateData);

      // First, get count of companies that will be updated
      const { count: totalCount, error: countError } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .in('id', companyIds);

      if (countError) {
        console.error('[ERROR] Failed to count companies:', countError.message);
      }

      // Update all matching companies
      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .in('id', companyIds)
        .select('id, "company_name", is_visible');

      if (error) {
        console.error('[ERROR] Failed to bulk update companies:', error.message);
        throw new Error(`Failed to bulk update companies: ${error.message}`);
      }

      console.log('[DEBUG] Total matching companies:', totalCount);
      console.log('[DEBUG] Companies with changes:', data?.length);
      console.log('[DEBUG] Updated companies:', data);

      // Log successful bulk UPDATE operation
      if (req && data && data.length > 0) {
        await logService.logUpdate({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'company',
          resourceId: null, // Bulk operation
          oldValues: null,
          newValues: {
            operation: 'BULK_APPROVE',
            companyIds: companyIds,
            matchedCount: totalCount || 0,
            updatedCount: data?.length || 0,
            affectedCompanies: data?.map(c => ({
              id: c.id,
              companyName: c['company_name'],
              oldIsVisible: 'unknown',
              newIsVisible: c['is_visible']
            })) || []
          },
          request: req,
          routePath: req.path
        });
      }

      // Clear cache
      responseCache.clearByTable('companies');

      console.log('[DEBUG] === BULK APPROVE COMPANIES SUCCESS ===');

      return {
        success: true,
        message: `Successfully processed ${totalCount || 0} companies (${data?.length || 0} changed)`,
        matchedCount: totalCount || 0,
        updatedCount: data?.length || 0,
        companies: data?.map(company => ({
          id: company.id,
          companyName: company['company_name'],
          isVisible: company['is_visible']
        })) || []
      };
    } catch (error) {
      // Log failed operation
      if (req) {
        await logService.logError({
          userId: req.user?.id,
          userEmail: req.user?.email,
          resourceType: 'company',
          resourceId: null,
          operation: 'BULK_APPROVE',
          errorMessage: error.message,
          request: req,
          routePath: req.path,
          newValues: { companyIds, isVisible }
        });
      }

      console.error('[ERROR] CompanyService.bulkApproveCompanies:', error.message);
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
    // Handle website field - accept both variants, normalize to DB
    if (patchData.companyWebsite !== undefined) {
      dbData['company_website_link'] = patchData.companyWebsite || null;
      console.log('[DEBUG] Using companyWebsite:', patchData.companyWebsite);
    } else if (patchData.website !== undefined) {
      dbData['company_website_link'] = patchData.website || null;
      console.log('[DEBUG] Using website:', patchData.website);
    }
    // Handle logo field - accept both variants, normalize to DB
    if (patchData.companyLogo !== undefined) {
      dbData['company_logo'] = patchData.companyLogo || null;
      console.log('[DEBUG] Using companyLogo:', patchData.companyLogo);
    } else if (patchData.logo !== undefined) {
      dbData['company_logo'] = patchData.logo || null;
      console.log('[DEBUG] Using logo:', patchData.logo);
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
      // Convert string 'true'/'false' to actual boolean, otherwise use as-is
      if (typeof patchData.isVisible === 'string') {
        dbData['is_visible'] = patchData.isVisible.toLowerCase() === 'true';
      } else {
        dbData['is_visible'] = patchData.isVisible;
      }
    }

    return dbData;
  }

  /**
   * Transform company data for public API responses (excludes phone number)
   * @param {Object} company - Raw company data from database
   * @param {string} viewerRole - Role of the viewer (admin, student, company)
   * @returns {Object} Transformed company data without phone number
   */
  transformCompanyDataPublic(company, viewerRole = null) {
    const isContactInfoVisible = company['contact_info_visible'] === true;
    const isAdmin = viewerRole === 'admin';

    const response = {
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
      contactInfoVisible: isContactInfoVisible,
      completionRate: this.calculateCompletionRate(company)
    };

    // Include isVisible field for admin users
    if (isAdmin) {
      response.isVisible = company['is_visible'];
    }

    return response;
  }

  /**
   * Transform company list data for public API responses (excludes phone numbers)
   * @param {Array} companies - Array of company data from database
   * @param {string} viewerRole - Role of the viewer (admin, student, company)
   * @returns {Array} Transformed company data without phone numbers
   */
  transformCompanyListPublic(companies, viewerRole = null) {
    return companies.map(company => this.transformCompanyDataPublic(company, viewerRole));
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
      contactInfoVisible: isContactInfoVisible,
      completionRate: this.calculateCompletionRate(company)
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
   * @param {Object} company - Raw company data from database
   * @returns {number} Completion rate as percentage (0-100)
   */
  calculateCompletionRate(company) {
    const fields = [
      'company_name', 'company_summary_description', 'industry_sector',
      'company_website_link', 'company_logo', 'tech_roles_interest',
      'preferred_skillsets', 'contact_person_name', 'contact_email',
      'contact_phone_number', 'contact_info_visible', 'email_address'
    ];

    let completed = 0;
    fields.forEach(field => {
      const value = company[field];
      if (value !== null && value !== undefined && value.toString().trim() !== '') {
        completed++;
      }
    });

    return Math.round((completed / fields.length) * 100);
  }
}

module.exports = new CompanyService();