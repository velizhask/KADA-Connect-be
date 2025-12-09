const authService = require("../services/authService");
const studentService = require("../services/studentService");
const companyService = require("../services/companyService");

class AuthController {
  async register(req, res, next) {
    try {
      const { fullName, email, password, role } = req.body;

      // Extract context for audit logging
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.connection.remoteAddress || null;

      if (!email || !password || !fullName) {
        return res.status(400).json({
          success: false,
          message: "Email, full name, and password are required",
        });
      }

      const response = await authService.signUp(
        email,
        fullName,
        password,
        role,
        userAgent,
        ipAddress
      );

      return res.status(201).json({
        success: true,
        message: "Account has been created",
        data: {
          id: response.user.id,
          email: response.user.email,
          role: response.user.role,
          fullName: response.user.fullName,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Extract context for audit logging
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.connection.remoteAddress || null;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // Sign in user using Supabase Auth
      const response = await authService.signIn(email, password, userAgent, ipAddress);

      // Supabase Auth handles tokens automatically:
      // - access_token: 1 hour expiration
      // - refresh_token: automatic renewal
      // - session management: built-in

      // Get the user ID from the auth response
      const userId = response.user.id;

      // Fetch user's role and profile data
      const { supabase } = require('../db');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('[ERROR] Failed to fetch user data:', userError);
      }

      let profile = null;

      // Fetch profile data based on role
      if (userData?.role === 'student') {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select(`
            id,
            full_name,
            status,
            employment_status,
            university_institution,
            program_major,
            preferred_industry,
            tech_stack_skills,
            self_introduction,
            cv_upload,
            profile_photo,
            linkedin,
            portfolio_link,
            phone_number,
            email_address,
            batch,
            timestamp
          `)
          .eq('id', userId)
          .single();

        if (!studentError && studentData) {
          profile = studentService.transformStudentData(studentData);

          // Inject email from auth context if not in database (for existing students)
          if (!profile.email && response.user.email) {
            profile.email = response.user.email;
          }
        }
      } else if (userData?.role === 'company') {
        const { data: companyData, error: companyError } = await supabase
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
            timestamp
          `)
          .eq('id', userId)
          .single();

        if (!companyError && companyData) {
          profile = companyService.transformCompanyData(companyData);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token, // Supabase's built-in refresh token
          expires_in: response.session.expires_in || 3600, // 1 hour (Supabase default)
          user: response.user,
          token_type: 'bearer',
          profile: profile
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");

      // Extract additional context for audit logging
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.connection.remoteAddress || null;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Authorization token is required",
          error: "Missing token",
          data: null,
        });
      }

      const response = await authService.logOut(token, userAgent, ipAddress);

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
        data: {
          sessionId: response.sessionId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyProfile(req, res, next) {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required",
        });
      }

      const response = await authService.getUserProfile(token);

      res.status(200).json({
        success: true,
        message: "Profile fetched successfully",
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      // Extract context for audit logging
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.connection.remoteAddress || null;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const response = await authService.requestPasswordReset(
        email,
        userAgent,
        ipAddress
      );

      return res.status(200).json({
        success: true,
        message: response.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { access_token, password } = req.body;

      // Extract context for audit logging
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.connection.remoteAddress || null;

      if (!access_token || !password) {
        return res.status(400).json({
          success: false,
          message: "Access token and password are required",
        });
      }

      const response = await authService.resetPassword(
        access_token,
        password,
        userAgent,
        ipAddress
      );

      return res.status(200).json({
        success: true,
        message: response.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
