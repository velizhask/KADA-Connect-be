/**
 * Lookup Service
 * Handles data extraction, caching, and processing for lookup endpoints
 */

const { supabase } = require('../db');

class LookupService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 60 * 60 * 1000; // 1 hour for static lookup data
    this.cacheVersion = '1.0'; // For cache invalidation
    this.cacheWarmed = false;
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
    const versionedKey = this.getVersionedCacheKey(key);
    const cached = this.cache.get(versionedKey);
    if (!cached || !this.isCacheValid(versionedKey)) {
      this.cache.delete(versionedKey);
      return null;
    }
    return cached.data;
  }

  /**
   * Set data in cache
   */
  setCachedData(key, data) {
    const versionedKey = this.getVersionedCacheKey(key);
    this.cache.set(versionedKey, {
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
   * Generate versioned cache key
   */
  getVersionedCacheKey(baseKey) {
    return `${this.cacheVersion}_${baseKey}`;
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache() {
    if (this.cacheWarmed) {
      return;
    }

    console.log('[INFO] Warming lookup service cache...');
    const startTime = Date.now();

    try {
      // Pre-populate cache with most common data
      await Promise.all([
        this.extractUniqueValues('companies', 'industry_sector'),
        this.extractUniqueValues('companies', 'tech_roles_interest'),
        this.extractTechSkills(),
        this.extractUniqueValues('students', 'status'),
        this.getUniversities(),
        this.getMajors(),
        this.getIndustriesWithCount(),
        this.getTechRolesWithCount(),
        this.getTechSkillsWithCount(),
        this.getUniversitiesWithCount(),
        this.getMajorsWithCount()
      ]);

      this.cacheWarmed = true;
      const duration = Date.now() - startTime;
      console.log(`[SUCCESS] Cache warmed in ${duration}ms`);
    } catch (error) {
      console.error('[ERROR] Failed to warm cache:', error.message);
    }
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
      version: this.cacheVersion,
      warmed: this.cacheWarmed,
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
      // Optimized query with better performance
      let query = supabase
        .from(table)
        .select(`"${column}"`)
        .not(`"${column}"`, 'is', null)
        .not(`"${column}"`, 'eq', '');

      // Add employment status filtering for students table to hide employed students
      if (table === 'students') {
        query = query.eq('employment_status', 'Open to work');
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to extract ${column} from ${table}: ${error.message}`);
      }

      // Optimized single-pass processing with early filtering
      const uniqueValues = new Set();

      // Special handling for comma-separated values (more efficient)
      if (column === 'tech_roles_interest' || column === 'industry_sector') {
        for (const row of data) {
          const value = row[column];
          if (value && typeof value === 'string') {
            const normalizedValue = this.normalizeText(value);
            if (normalizedValue.length > 0) {
              // Split by comma and process each value in single pass
              const values = normalizedValue.split(',');
              for (const val of values) {
                const normalizedVal = this.normalizeText(val);
                if (normalizedVal.length > 0) {
                  uniqueValues.add(normalizedVal);
                }
              }
            }
          }
        }
      } else {
        // Normal processing with single pass
        for (const row of data) {
          const value = row[column];
          if (value) {
            const normalizedValue = this.normalizeText(value);
            if (normalizedValue.length > 0) {
              uniqueValues.add(normalizedValue);
            }
          }
        }
      }

      // Convert to sorted array (more efficient than spread + sort)
      const sortedValues = Array.from(uniqueValues).sort();

      // Cache the result
      this.setCachedData(cacheKey, sortedValues);

      return sortedValues;
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
      // Optimized query with better performance
      const { data, error } = await supabase
        .from('students')
        .select('tech_stack_skills')
        .not('tech_stack_skills', 'is', null)
        .not('tech_stack_skills', 'eq', '')
        .eq('employment_status', 'Open to work'); // Only include "Open to work" students

      if (error) {
        throw new Error(`Failed to extract tech skills: ${error.message}`);
      }

      // Optimized single-pass processing
      const allSkills = new Set();

      for (const row of data) {
        const skills = row['tech_stack_skills'];
        if (skills && typeof skills === 'string') {
          // Split and process skills in single pass
          const normalizedSkills = skills.split(',');
          for (const skill of normalizedSkills) {
            const normalizedSkill = this.normalizeText(skill);
            if (normalizedSkill.length > 0) {
              allSkills.add(normalizedSkill);
            }
          }
        }
      }

      // Convert to sorted array (more efficient)
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
        .select('industry_sector')
        .not('industry_sector', 'is', null)
        .not('industry_sector', 'eq', '');

      if (error) {
        throw new Error(`Failed to get industries with count: ${error.message}`);
      }

      // Optimized counting with single-pass processing
      const industryCounts = {};

      for (const row of data) {
        const industryValue = row['industry_sector'];
        if (industryValue && typeof industryValue === 'string') {
          const normalizedValue = this.normalizeText(industryValue);
          if (normalizedValue.length > 0) {
            // Split by comma and process each industry
            const industries = normalizedValue.split(',');
            for (const industry of industries) {
              const normalizedIndustry = this.normalizeText(industry);
              if (normalizedIndustry.length > 0) {
                industryCounts[normalizedIndustry] = (industryCounts[normalizedIndustry] || 0) + 1;
              }
            }
          }
        }
      }

      // Convert to array and sort by count (descending) with tie-breaker
      const result = Object.entries(industryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count; // Primary sort by count descending
          }
          return a.name.localeCompare(b.name); // Secondary sort alphabetically
        });

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
        .select('tech_roles_interest')
        .not('tech_roles_interest', 'is', null)
        .not('tech_roles_interest', 'eq', '');

      if (error) {
        throw new Error(`Failed to get tech roles with count: ${error.message}`);
      }

      // Optimized counting with single-pass processing
      const roleCounts = {};

      for (const row of data) {
        const roles = row['tech_roles_interest'];
        if (roles && typeof roles === 'string') {
          // Split and process roles in single pass
          const normalizedRoles = roles.split(',');
          for (const role of normalizedRoles) {
            const normalizedRole = this.normalizeText(role);
            if (normalizedRole.length > 0 && role !== '/' && role !== '\\' && !role.match(/^[/\\]+$/)) {
              roleCounts[normalizedRole] = (roleCounts[normalizedRole] || 0) + 1;
            }
          }
        }
      }

      // Convert to array and sort by count (descending) with tie-breaker
      const result = Object.entries(roleCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count; // Primary sort by count descending
          }
          return a.name.localeCompare(b.name); // Secondary sort alphabetically
        });
        

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
      // Optimized query with better performance
      const { data, error } = await supabase
        .from('students')
        .select('tech_stack_skills')
        .not('tech_stack_skills', 'is', null)
        .not('tech_stack_skills', 'eq', '')
        .eq('employment_status', 'Open to work'); // Only include "Open to work" students

      if (error) {
        throw new Error(`Failed to get tech skills with count: ${error.message}`);
      }

      // Optimized counting with single-pass processing
      const skillCounts = {};

      for (const row of data) {
        const skills = row['tech_stack_skills'];
        if (skills && typeof skills === 'string') {
          // Split and process skills in single pass
          const normalizedSkills = skills.split(',');
          for (const skill of normalizedSkills) {
            const normalizedSkill = this.normalizeText(skill);
            if (normalizedSkill.length > 0) {
              skillCounts[normalizedSkill] = (skillCounts[normalizedSkill] || 0) + 1;
            }
          }
        }
      }

      // Convert to array and sort by count (descending) with tie-breaker
      const result = Object.entries(skillCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count; // Primary sort by count descending
          }
          return a.name.localeCompare(b.name); // Secondary sort alphabetically
        });

      // Cache the result
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`[ERROR] getTechSkillsWithCount: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search in a list with fuzzy matching (optimized)
   */
  searchInList(list, query, limit = 10) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.length === 0) {
      return [];
    }

    // Optimized search with early filtering and scoring
    const matches = [];
    const queryLength = normalizedQuery.length;

    for (const item of list) {
      const normalizedItem = typeof item === 'string' ? item.toLowerCase() : item.name?.toLowerCase() || '';

      if (normalizedItem.length === 0) continue;

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

      // Only add items with positive scores
      if (score > 0) {
        matches.push({
          item: typeof item === 'string' ? { name: item } : item,
          score
        });
      }
    }

    // Sort by score and limit results (more efficient)
    matches.sort((a, b) => b.score - a.score);

    return matches
      .slice(0, limit)
      .map(match => match.item);
  }

  /**
   * Get all lookup data in one call (optimized)
   */
  async getAllLookupData() {
    const cacheKey = 'all_lookup_data';

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Ensure cache is warmed for optimal performance
      await this.warmCache();

      // Since cache is now warmed, most data should be available from cache
      // This reduces database load significantly
      const [
        industries,
        techRoles,
        techSkills,
        studentStatuses,
        universities,
        majors,
        popularIndustries,
        popularTechRoles,
        popularTechSkills,
        popularUniversities,
        popularMajors
      ] = await Promise.all([
        this.extractUniqueValues('companies', 'industry_sector'),
        this.extractUniqueValues('companies', 'tech_roles_interest'),
        this.extractTechSkills(),
        this.extractUniqueValues('students', 'status'),
        this.getUniversities(),
        this.getMajors(),
        this.getIndustriesWithCount(),
        this.getTechRolesWithCount(),
        this.getTechSkillsWithCount(),
        this.getUniversitiesWithCount(),
        this.getMajorsWithCount()
      ]);

      const result = {
        industries,
        techRoles,
        techSkills,
        studentStatuses,
        universities,
        majors,
        popular: {
          industries: popularIndustries.slice(0, 10),
          techRoles: popularTechRoles.slice(0, 10),
          techSkills: popularTechSkills.slice(0, 20),
          universities: popularUniversities.slice(0, 10),
          majors: popularMajors.slice(0, 10)
        },
        generatedAt: new Date().toISOString(),
        cacheStatus: {
          warmed: this.cacheWarmed,
          totalCached: this.cache.size
        }
      };

      // Cache the result with standard TTL
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`[ERROR] getAllLookupData: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get universities
   */
  async getUniversities() {
    return this.extractUniqueValues('students', 'university_institution');
  }

  /**
   * Get majors
   */
  async getMajors() {
    return this.extractUniqueValues('students', 'program_major');
  }

  /**
   * Get universities with count
   */
  async getUniversitiesWithCount() {
    const cacheKey = 'students_universities_with_count';

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .select('university_institution')
        .not('university_institution', 'is', null)
        .not('university_institution', 'eq', '')
        .eq('employment_status', 'Open to work'); // Only include "Open to work" students

      if (error) {
        throw new Error(`Failed to get universities with count: ${error.message}`);
      }

      // Optimized counting with single-pass processing
      const universityCounts = {};

      for (const row of data) {
        const university = this.normalizeText(row['university_institution']);
        if (university) {
          universityCounts[university] = (universityCounts[university] || 0) + 1;
        }
      }

      // Convert to array and sort by count (descending) with tie-breaker
      const result = Object.entries(universityCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count; // Primary sort by count descending
          }
          return a.name.localeCompare(b.name); // Secondary sort alphabetically
        });

      // Cache the result
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`[ERROR] getUniversitiesWithCount: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get majors with count
   */
  async getMajorsWithCount() {
    const cacheKey = 'students_majors_with_count';

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .select('program_major')
        .not('program_major', 'is', null)
        .not('program_major', 'eq', '')
        .eq('employment_status', 'Open to work'); // Only include "Open to work" students

      if (error) {
        throw new Error(`Failed to get majors with count: ${error.message}`);
      }

      // Optimized counting with single-pass processing
      const majorCounts = {};

      for (const row of data) {
        const major = this.normalizeText(row['program_major']);
        if (major) {
          majorCounts[major] = (majorCounts[major] || 0) + 1;
        }
      }

      // Convert to array and sort by count (descending) with tie-breaker
      const result = Object.entries(majorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count; // Primary sort by count descending
          }
          return a.name.localeCompare(b.name); // Secondary sort alphabetically
        });

      // Cache the result
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`[ERROR] getMajorsWithCount: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new LookupService();