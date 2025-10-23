/**
 * Lookup Service
 * Handles data extraction, caching, and processing for lookup endpoints
 */

const { supabase } = require('../db');

class LookupService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Check if cache is valid for a given key
   */
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTTL;
  }

  /**
   * Get data from cache
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached || !this.isCacheValid(key)) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  /**
   * Set data in cache
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    const keys = Array.from(this.cache.keys());
    const status = {};

    keys.forEach(key => {
      const cached = this.cache.get(key);
      const age = Date.now() - cached.timestamp;
      const isValid = age < this.cacheTTL;

      status[key] = {
        isValid,
        age: Math.floor(age / 1000), // seconds
        ttl: Math.floor((this.cacheTTL - age) / 1000) // seconds remaining
      };
    });

    return {
      totalKeys: keys.length,
      cacheSize: this.cache.size,
      ttl: this.cacheTTL / 1000, // seconds
      keys: status
    };
  }

  /**
   * Normalize text data (trim spaces, normalize case)
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Extract unique values from a column
   */
  async extractUniqueValues(table, column, limit = null) {
    const cacheKey = `${table}_${column}_unique_${limit || 'all'}`;

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let query = supabase
        .from(table)
        .select(`"${column}"`)
        .not(`"${column}"`, 'is', null)
        .not(`"${column}"`, 'eq', '');

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to extract ${column} from ${table}: ${error.message}`);
      }

      // Extract and normalize values
      const values = data
        .map(row => this.normalizeText(row[column]))
        .filter(value => value.length > 0);

      // Get unique values
      const uniqueValues = [...new Set(values)].sort();

      // Cache the result
      this.setCachedData(cacheKey, uniqueValues);

      return uniqueValues;
    } catch (error) {
      console.error(`[ERROR] extractUniqueValues: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract tech skills from students (comma-separated values)
   */
  async extractTechSkills() {
    const cacheKey = 'students_tech_skills_unique';

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .select('"Tech Stack / Skills"')
        .not('"Tech Stack / Skills"', 'is', null)
        .not('"Tech Stack / Skills"', 'eq', '');

      if (error) {
        throw new Error(`Failed to extract tech skills: ${error.message}`);
      }

      // Extract and process skills
      const allSkills = new Set();

      data.forEach(row => {
        const skills = row['Tech Stack / Skills'];
        if (skills && typeof skills === 'string') {
          // Split by comma and clean each skill
          const skillList = skills.split(',')
            .map(skill => this.normalizeText(skill))
            .filter(skill => skill.length > 0);

          skillList.forEach(skill => allSkills.add(skill));
        }
      });

      const uniqueSkills = Array.from(allSkills).sort();

      // Cache the result
      this.setCachedData(cacheKey, uniqueSkills);

      return uniqueSkills;
    } catch (error) {
      console.error(`[ERROR] extractTechSkills: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get industries with count
   */
  async getIndustriesWithCount() {
    const cacheKey = 'companies_industries_with_count';

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('"Industry / Sector"')
        .not('"Industry / Sector"', 'is', null)
        .not('"Industry / Sector"', 'eq', '');

      if (error) {
        throw new Error(`Failed to get industries with count: ${error.message}`);
      }

      // Count occurrences
      const industryCounts = {};

      data.forEach(row => {
        const industry = this.normalizeText(row['Industry / Sector']);
        if (industry) {
          industryCounts[industry] = (industryCounts[industry] || 0) + 1;
        }
      });

      // Convert to array and sort by count (descending)
      const result = Object.entries(industryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Cache the result
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`[ERROR] getIndustriesWithCount: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get tech roles with count
   */
  async getTechRolesWithCount() {
    const cacheKey = 'companies_tech_roles_with_count';

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('"Tech Roles or Fields of Interest"')
        .not('"Tech Roles or Fields of Interest"', 'is', null)
        .not('"Tech Roles or Fields of Interest"', 'eq', '');

      if (error) {
        throw new Error(`Failed to get tech roles with count: ${error.message}`);
      }

      // Count occurrences
      const roleCounts = {};

      data.forEach(row => {
        const role = this.normalizeText(row['Tech Roles or Fields of Interest']);
        if (role) {
          roleCounts[role] = (roleCounts[role] || 0) + 1;
        }
      });

      // Convert to array and sort by count (descending)
      const result = Object.entries(roleCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Cache the result
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`[ERROR] getTechRolesWithCount: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get tech skills with count
   */
  async getTechSkillsWithCount() {
    const cacheKey = 'students_tech_skills_with_count';

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .select('"Tech Stack / Skills"')
        .not('"Tech Stack / Skills"', 'is', null)
        .not('"Tech Stack / Skills"', 'eq', '');

      if (error) {
        throw new Error(`Failed to get tech skills with count: ${error.message}`);
      }

      // Count occurrences
      const skillCounts = {};

      data.forEach(row => {
        const skills = row['Tech Stack / Skills'];
        if (skills && typeof skills === 'string') {
          const skillList = skills.split(',')
            .map(skill => this.normalizeText(skill))
            .filter(skill => skill.length > 0);

          skillList.forEach(skill => {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
          });
        }
      });

      // Convert to array and sort by count (descending)
      const result = Object.entries(skillCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Cache the result
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`[ERROR] getTechSkillsWithCount: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search in a list with fuzzy matching
   */
  searchInList(list, query, limit = 10) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.length === 0) {
      return [];
    }

    // Filter and score matches
    const matches = list
      .map(item => {
        const normalizedItem = typeof item === 'string' ? item.toLowerCase() : item.name?.toLowerCase() || '';
        let score = 0;

        // Exact match gets highest score
        if (normalizedItem === normalizedQuery) {
          score = 100;
        }
        // Starts with query gets high score
        else if (normalizedItem.startsWith(normalizedQuery)) {
          score = 80;
        }
        // Contains query gets medium score
        else if (normalizedItem.includes(normalizedQuery)) {
          score = 60;
        }
        // Partial matches get lower score based on position
        else {
          const words = normalizedItem.split(' ');
          for (const word of words) {
            if (word.startsWith(normalizedQuery)) {
              score = 40;
              break;
            } else if (word.includes(normalizedQuery)) {
              score = 20;
              break;
            }
          }
        }

        return {
          item: typeof item === 'string' ? { name: item } : item,
          score
        };
      })
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(match => match.item);

    return matches;
  }

  /**
   * Get all lookup data in one call
   */
  async getAllLookupData() {
    const cacheKey = 'all_lookup_data';

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [
        industries,
        techRoles,
        techSkills,
        studentStatuses,
        popularIndustries,
        popularTechRoles,
        popularTechSkills
      ] = await Promise.all([
        this.extractUniqueValues('companies', 'Industry / Sector'),
        this.extractUniqueValues('companies', 'Tech Roles or Fields of Interest'),
        this.extractTechSkills(),
        this.extractUniqueValues('students', 'Status'),
        this.getIndustriesWithCount(),
        this.getTechRolesWithCount(),
        this.getTechSkillsWithCount()
      ]);

      const result = {
        industries,
        techRoles,
        techSkills,
        studentStatuses,
        popular: {
          industries: popularIndustries.slice(0, 10),
          techRoles: popularTechRoles.slice(0, 10),
          techSkills: popularTechSkills.slice(0, 20)
        },
        generatedAt: new Date().toISOString()
      };

      // Cache the result (with shorter TTL for comprehensive data)
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`[ERROR] getAllLookupData: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new LookupService();