const { supabase } = require('../db');

class CompanyService {
  async getAllCompanies(filters = {}) {
    try {
      let query = supabase
        .from('companies')
        .select(`
          id,
          "Company Name",
          "Company Summary / Description",
          "Industry / Sector",
          "Company Website / Link",
          "Company Logo",
          "Tech Roles or Fields of Interest",
          "Preferred Skillsets in Candidates",
          "Contact Person Name",
          "Email Address (Contact)",
          "Phone / WhatsApp Number",
          "Would you like this contact information to be visible on the mi"
        `, { count: 'exact' });

      // Apply filters
      if (filters.industry) {
        query = query.ilike('"Industry / Sector"', `%${filters.industry}%`);
      }

      if (filters.techRole) {
        query = query.ilike('"Tech Roles or Fields of Interest"', `%${filters.techRole}%`);
      }

      // Apply pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      query = query
        .range(offset, offset + limit - 1)
        .order('"Company Name"');

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
          "Company Name",
          "Company Summary / Description",
          "Industry / Sector",
          "Company Website / Link",
          "Company Logo",
          "Tech Roles or Fields of Interest",
          "Preferred Skillsets in Candidates",
          "Contact Person Name",
          "Email Address (Contact)",
          "Phone / WhatsApp Number",
          "Would you like this contact information to be visible on the mi"
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

      return this.transformCompanyData(data);
    } catch (error) {
      console.error('[ERROR] CompanyService.getCompanyById:', error.message);
      throw error;
    }
  }

  async searchCompanies(searchTerm, filters = {}) {
    try {
      let query = supabase
        .from('companies')
        .select(`
          id,
          "Company Name",
          "Company Summary / Description",
          "Industry / Sector",
          "Company Website / Link",
          "Company Logo",
          "Tech Roles or Fields of Interest",
          "Preferred Skillsets in Candidates"
        `)
        .or(`"Company Name".ilike.%${searchTerm}%,"Company Summary / Description".ilike.%${searchTerm}%,"Industry / Sector".ilike.%${searchTerm}%,"Tech Roles or Fields of Interest".ilike.%${searchTerm}%`);

      // Apply additional filters
      if (filters.industry) {
        query = query.ilike('"Industry / Sector"', `%${filters.industry}%`);
      }

      if (filters.techRole) {
        query = query.ilike('"Tech Roles or Fields of Interest"', `%${filters.techRole}%`);
      }

      const { data, error } = await query
        .order('"Company Name"')
        .limit(50); // Limit search results

      if (error) {
        console.error('[ERROR] Failed to search companies:', error.message);
        throw new Error('Failed to search companies');
      }

      return data.map(company => this.transformCompanyData(company));
    } catch (error) {
      console.error('[ERROR] CompanyService.searchCompanies:', error.message);
      throw error;
    }
  }

  async getIndustries() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('"Industry / Sector"')
        .not('"Industry / Sector"', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch industries:', error.message);
        throw new Error('Failed to fetch industries');
      }

      // Get unique industries and sort them
      const industries = [...new Set(data.map(item => item['Industry / Sector']))]
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
        .select('"Tech Roles or Fields of Interest"')
        .not('"Tech Roles or Fields of Interest"', 'is', null);

      if (error) {
        console.error('[ERROR] Failed to fetch tech roles:', error.message);
        throw new Error('Failed to fetch tech roles');
      }

      // Split tech roles by common delimiters and get unique values
      const allRoles = data.map(item => {
        const roles = item['Tech Roles or Fields of Interest'] || '';
        return roles.split(/[,\/\n|]/).map(role => role.trim()).filter(Boolean);
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
        .select('"Industry / Sector", "Tech Roles or Fields of Interest"');

      if (error) {
        console.error('[ERROR] Failed to fetch company stats:', error.message);
        throw new Error('Failed to fetch company stats');
      }

      const totalCompanies = data.length;
      const industries = [...new Set(data.map(item => item['Industry / Sector']).filter(Boolean))];

      const techRoles = data.map(item => {
        const roles = item['Tech Roles or Fields of Interest'] || '';
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

  transformCompanyData(company) {
    return {
      id: company.id,
      companyName: company['Company Name'],
      companySummary: company['Company Summary / Description'],
      industry: company['Industry / Sector'],
      website: company['Company Website / Link'],
      logo: company['Company Logo'],
      techRoles: company['Tech Roles or Fields of Interest'],
      preferredSkillsets: company['Preferred Skillsets in Candidates'],
      contactPerson: company['Contact Person Name'],
      contactEmail: company['Email Address (Contact)'],
      contactPhone: company['Phone / WhatsApp Number'],
      contactInfoVisible: company['Would you like this contact information to be visible on the mi'] === 'Yes'
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