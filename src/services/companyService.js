const { supabase } = require('../db');

class CompanyService {
  async getAllCompanies(filters = {}) {
    try {
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
          contact_info_visible
        `, { count: 'exact' });

      // Apply filters
      if (filters.industry) {
        query = query.ilike('industry_sector', `%${filters.industry}%`);
      }

      if (filters.techRole) {
        query = query.ilike('tech_roles_interest', `%${filters.techRole}%`);
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

      // Transform data to camelCase for API consistency
      const transformedData = data.map(company => this.transformCompanyData(company));

      return {
        companies: transformedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('[ERROR] CompanyService.getAllCompanies:', error.message);
      throw error;
    }
  }

  async getCompanyById(id) {
    try {
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
          contact_info_visible
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

      const transformedData = this.transformCompanyData(data);
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
          preferred_skillsets
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

      const { data, error } = await query
        .order('company_name')
        .limit(50); // Limit search results

      if (error) {
        console.error('[ERROR] Failed to search companies - Supabase error:', error);
        throw new Error(`Database search failed: ${error.message}`);
      }

      const transformedResults = data.map(company => this.transformCompanyData(company));
      console.log(`[DEBUG] Search for "${searchTerm}" returned ${transformedResults.length} results`);
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
        .select('industry_sector')
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
        .select('tech_roles_interest')
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
        .select('industry_sector, tech_roles_interest');

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

  async createCompany(companyData) {
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
          contact_info_visible
        `)
        .single();

      if (error) {
        console.error('[ERROR] Failed to create company:', error.message);
        throw new Error(`Failed to create company: ${error.message}`);
      }

      console.log('[SUCCESS] Company created successfully with ID:', data.id);
      const transformedData = this.transformCompanyData(data);
      return transformedData;
    } catch (error) {
      console.error('[ERROR] CompanyService.createCompany:', error.message);
      throw error;
    }
  }

  async updateCompany(id, updateData) {
    try {
      // Transform camelCase input to snake_case for database
      const dbData = this.transformCompanyDataForDB(updateData);

      // Debug: Log the data being sent to Supabase
      console.log('[DEBUG] updateCompany data:', { id, dbData });

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
          contact_info_visible
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Company not found
        }
        console.error('[ERROR] Failed to update company:', error.message);
        console.error('[ERROR] Full error details:', error);
        throw new Error(`Failed to update company: ${error.message}`);
      }

      console.log('[SUCCESS] Company updated successfully with ID:', data.id);
      const transformedData = this.transformCompanyData(data);
      return transformedData;
    } catch (error) {
      console.error('[ERROR] CompanyService.updateCompany:', error.message);
      throw error;
    }
  }

  async patchCompany(id, patchData) {
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
          contact_info_visible
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

      console.log('[SUCCESS] Company patched successfully with ID:', data.id);
      const transformedData = this.transformCompanyData(data);
      return transformedData;
    } catch (error) {
      console.error('[ERROR] CompanyService.patchCompany:', error.message);
      throw error;
    }
  }

  async deleteCompany(id) {
    try {
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

      console.log('[SUCCESS] Company deleted successfully with ID:', data.id);
      return {
        id: data.id,
        companyName: data['company_name'],
        message: 'Company deleted successfully'
      };
    } catch (error) {
      console.error('[ERROR] CompanyService.deleteCompany:', error.message);
      throw error;
    }
  }

  transformCompanyDataForDB(companyData) {
    const dbData = {
      'company_name': companyData.companyName,
      'company_summary_description': companyData.companySummary,
      'industry_sector': companyData.industry,
      'company_website_link': companyData.companyWebsite || null,
      'company_logo': companyData.companyLogo || null,
      'tech_roles_interest': companyData.techRoles || null,
      'preferred_skillsets': companyData.preferredSkillsets || null,
      'contact_person_name': companyData.contactPersonName || null,
      'contact_email': companyData.contactEmailAddress || null,
      'contact_phone_number': companyData.contactPhoneNumber || null,
      'contact_info_visible': companyData.visibleContactInfo ? 'Yes' : 'No'
    };

    // Only include email_address if it exists (handle potential missing field)
    if (companyData.emailAddress !== undefined) {
      dbData['email_address'] = companyData.emailAddress;
    }

    return dbData;
  }

  transformCompanyDataForDBPartial(patchData) {
    const dbData = {};

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
    if (patchData.companyLogo !== undefined) {
      dbData['company_logo'] = patchData.companyLogo || null;
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
    if (patchData.contactEmailAddress !== undefined) {
      dbData['contact_email'] = patchData.contactEmailAddress || null;
    }
    if (patchData.contactPhoneNumber !== undefined) {
      dbData['contact_phone_number'] = patchData.contactPhoneNumber || null;
    }
    if (patchData.visibleContactInfo !== undefined) {
      dbData['contact_info_visible'] = patchData.visibleContactInfo ? 'Yes' : 'No';
    }

    return dbData;
  }

  transformCompanyData(company) {
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
      contactEmail: company['contact_email'],
      contactPhone: company['contact_phone_number'],
      contactInfoVisible: company['contact_info_visible'] === 'Yes'
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