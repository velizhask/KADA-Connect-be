const { supabase } = require("../db");

class AuthService {
  constructor() {}

  /**
   *
   * Verify a JWT Bearer token and retrieve the authenticated Supabase user.
   *
   * @async
   * @author sqizzo
   * @param {string} token - The JWT access token from the authorization header.
   * @returns {Promise<Object>} - The authenticated user object from supabase
   * @throws {Error} If the token is missing, invalid, or Supabase returns an error.
   * @TODO No caching applied yet
   *
   */
  async getUserFromToken(token) {
    try {
      if (!token) {
        throw new Error("Missing bearer token");
      }

      const { data, error } = await supabase.auth.getUser(token);

      if (error) {
        console.error("[ERROR] Failed to get user:", error?.message);
        throw new Error("Invalid or expired token");
      }

      if (!data.user) {
        throw new Error("User not found for this token");
      }

      const response = data.user;

      return response;
    } catch (error) {
      console.error("[ERROR] AuthService.getUserFromToken:", error?.message);
      throw error;
    }
  }

  /**
   *
   * Get a full user profile using request token
   *
   * @async
   * @author sqizzo
   * @param {string} userId - The JWT access token from the authorization header.
   * @returns {Promise<Object>} - The user profile.
   * @throws {Error} If userId is missing, invalid, or Supabase returns an error.
   * @TODO No caching applied yet
   *
   */
  async getUserProfile(token) {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error("[ERROR] Invalid auth token:", authError?.message);
        throw new Error("Unauthorized");
      }

      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("[ERROR] Failed to get user profile:", error?.message);
        throw new Error("Failed to fetch user profile");
      }

      if (!profile) {
        console.error("[ERROR] Failed to get user profile userId:", userId);
        throw new Error("User profile not found");
      }

      return profile;
    } catch (error) {
      console.error("[ERROR] AuthService.getUserProfile:", error?.message);
      throw error;
    }
  }

  /**
   * Normalize role extraction from a Supabase user object.
   * @param {object} user
   * @returns {string|null}
   */
  async getUserRole(user) {
    try {
      if (!user) return null;

      if (typeof user === "object") {
        if (user.id) {
          try {
            const { data: profile, error } = await supabase
              .from("users")
              .select("role")
              .eq("id", user.id)
              .single();

            if (!error && profile && typeof profile.role === "string") {
              return profile.role;
            }
          } catch (err) {
            console.warn(
              "[ERROR] AuthService.getUserRole DB lookup failed:",
              err?.message || err
            );
          }
        }
      }

      return null;
    } catch (err) {
      console.error("[ERROR] AuthService.getUserRole:", err?.message || err);
      return null;
    }
  }

  /**
   * Sign in using Supabase Auth API with audit logging
   *
   * @async
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} userAgent - Optional User-Agent header for audit logging
   * @param {string} ipAddress - Optional IP address for audit logging
   * @returns {Promise<Object>} - Contains the session + user data
   * @throws {Error} If email or password is wrong
   */
  async signIn(email, password, userAgent = null, ipAddress = null) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[ERROR] Sign-in failed:", error?.message);

        // Log failed login attempt
        await this.logAuditEvent({
          action: 'login',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: error.message,
          metadata: { email }
        });

        throw new Error(error.message);
      }

      // Log successful login
      if (data?.user?.id) {
        const sessionId = data.session?.access_token?.split('.')[0] || 'unknown';

        await this.logAuditEvent({
          userId: data.user.id,
          action: 'login',
          sessionId,
          success: true,
          ipAddress,
          userAgent,
          metadata: { email }
        });
      }

      return data;
    } catch (error) {
      console.error("[ERROR] AuthService.signIn:", error?.message);
      throw error;
    }
  }

  /**
   * Sign up using Supabase Auth API with audit logging
   *
   * @async
   * @param {string} email - User's email
   * @param {string} fullName - User's full name
   * @param {string} password - User's password
   * @param {string} role - User's role ("student", "company", "admin")
   * @param {string} userAgent - Optional User-Agent header for audit logging
   * @param {string} ipAddress - Optional IP address for audit logging
   * @returns {Promise<Object>} - Auth response with user info
   * @throws {Error} If registration fails or data is incomplete
   */
  async signUp(email, fullName, password, role, userAgent = null, ipAddress = null) {
    try {
      if (!email || !password || !fullName) {
        await this.logAuditEvent({
          action: 'register',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: "Missing required fields: email, password, or fullName",
          metadata: { email, role }
        });
        throw new Error("Email, full name, and password are required");
      }

      const allowedRoles = ["student", "company", "admin"];
      if (!allowedRoles.includes(role)) {
        console.warn(`[WARN] Invalid role "${role}" — defaulting to student`);
        role = "student";
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, fullName },
        },
      });

      if (error) {
        console.error("[ERROR] Signup failed:", error.message);

        // Log failed registration attempt
        await this.logAuditEvent({
          action: 'register',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: error.message,
          metadata: { email, role, fullName }
        });

        throw new Error(error?.message);
      }

      // Log successful registration
      if (data?.user?.id) {
        await this.logAuditEvent({
          userId: data.user.id,
          action: 'register',
          success: true,
          ipAddress,
          userAgent,
          metadata: { email, role, fullName }
        });

        // EMAIL SYNC: Check if profile exists with this email and sync IDs
        try {
          if (role === 'student') {
            // Check if student profile exists with this email
            const { data: existingStudent, error: studentError } = await supabase
              .from('students')
              .select('id, email_address')
              .eq('email_address', email)
              .single();

            if (!studentError && existingStudent) {
              // Update student profile with new auth user ID
              console.log(`[INFO] Syncing student profile ${existingStudent.id} with auth user ${data.user.id}`);
              await supabase
                .from('students')
                .update({ id: data.user.id })
                .eq('email_address', email);
            }
          } else if (role === 'company') {
            // Check if company profile exists with this email
            const { data: existingCompany, error: companyError } = await supabase
              .from('companies')
              .select('id, email_address')
              .eq('email_address', email)
              .single();

            if (!companyError && existingCompany) {
              // Update company profile with new auth user ID
              console.log(`[INFO] Syncing company profile ${existingCompany.id} with auth user ${data.user.id}`);
              await supabase
                .from('companies')
                .update({ id: data.user.id })
                .eq('email_address', email);
            }
          }
        } catch (syncError) {
          console.error('[ERROR] Email sync failed:', syncError.message);
          // Continue with registration even if sync fails
        }
      }

      const response = {
        user: {
          email,
          fullName,
          role,
        },
        message: "Registration successfull",
      };

      return response;
    } catch (error) {
      // Log error if not already logged
      if (!error.message?.includes("required")) {
        await this.logAuditEvent({
          action: 'register',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: error.message,
          metadata: { email, role, fullName }
        });
      }

      console.error("[ERROR] AuthService.signUp:", error?.message);
      throw error;
    }
  }

  /**
   * Secure logout with proper session invalidation and audit trail
   * Uses Supabase Auth to validate token and invalidate session
   *
   * @async
   * @param {string} token - The JWT access token from the authorization header
   * @param {string} userAgent - Optional User-Agent header for audit logging
   * @param {string} ipAddress - Optional IP address for audit logging
   * @returns {Promise<Object>} - Contains success status, session ID, and timestamp
   * @throws {Error} If token is missing, invalid, or logout fails
   */
  async logOut(token, userAgent = null, ipAddress = null) {
    const transaction = {
      user: null,
      sessionId: null,
      auditLogId: null
    };

    try {
      if (!token) {
        throw new Error("Missing bearer token");
      }

      // Step 1: Verify token and extract user context
      const { data: authData, error: authError } = await supabase.auth.getUser(token);

      if (authError || !authData?.user) {
        // Log failed logout attempt
        await this.logAuditEvent({
          action: 'logout',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: authError?.message || 'Invalid token'
        });
        throw new Error("Invalid or expired token");
      }

      const user = authData.user;
      const sessionId = authData.session?.access_token?.split('.')[0] || 'unknown';

      transaction.user = user;
      transaction.sessionId = sessionId;

      // Step 2: Log logout attempt (before actual logout)
      const auditLogId = await this.logAuditEvent({
        userId: user.id,
        action: 'logout',
        sessionId,
        success: true,
        ipAddress,
        userAgent,
        metadata: { logoutInitiated: true }
      });

      transaction.auditLogId = auditLogId;

      // Step 3: Sign out using the session's refresh token
      // This properly invalidates the session and all associated tokens
      if (authData.session?.refresh_token) {
        const { error: signOutError } = await supabase.auth.signOut(
          authData.session.refresh_token
        );

        if (signOutError) {
          console.warn("[WARN] Session sign-out warning:", signOutError.message);
        } else {
          console.log(`[AUTH] Successfully signed out session for user ${user.id}`);
        }
      } else {
        // Fallback: Use admin signOut for all sessions
        console.log(`[AUTH] No refresh token found, using admin signOut for user ${user.id}`);
        const { error: adminSignOutError } = await supabase.auth.admin.signOut(user.id);

        if (adminSignOutError) {
          console.warn("[WARN] Admin sign-out warning:", adminSignOutError.message);
        }
      }

      // Step 4: Update audit log with success
      if (auditLogId) {
        await this.updateAuditLog(auditLogId, {
          success: true,
          metadata: {
            logoutCompleted: true,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Step 5: Clear any cached user data
      await this.clearUserCache(user.id);

      return {
        success: true,
        message: "Logged out successfully",
        sessionId,
        userId: user.id
      };

    } catch (error) {
      // Log failed logout
      if (transaction.user?.id) {
        await this.logAuditEvent({
          userId: transaction.user.id,
          action: 'logout',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: error.message,
          metadata: { errorStack: error.stack }
        });
      }

      console.error("[ERROR] AuthService.logOut:", error?.message);
      throw error;
    }
  }

  /**
   * Log authentication events to audit trail
   *
   * @async
   * @param {Object} params - Audit event parameters
   * @param {string} params.userId - User ID (optional for failed logouts)
   * @param {string} params.action - Action type: 'login', 'logout', 'token_refresh'
   * @param {string} params.sessionId - Session identifier
   * @param {boolean} params.success - Whether action succeeded
   * @param {string} params.ipAddress - Client IP address
   * @param {string} params.userAgent - Client User-Agent
   * @param {Object} params.metadata - Additional metadata
   * @param {string} params.error - Error message if failed
   * @returns {Promise<string|null>} - Audit log ID or null if failed
   */
  async logAuditEvent({
    userId = null,
    action,
    sessionId = null,
    success = true,
    ipAddress = null,
    userAgent = null,
    metadata = {},
    errorMessage = null
  }) {
    try {
      const { data, error: dbError } = await supabase
        .from('auth_audit_logs')
        .insert({
          user_id: userId,
          action,
          session_id: sessionId,
          success,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: {
            ...metadata,
            ...(errorMessage && { error: errorMessage })
          }
        })
        .select('id')
        .single();

      if (dbError) {
        console.error("[ERROR] Failed to log audit event:", dbError);
        return null;
      }

      return data.id;
    } catch (err) {
      console.error("[ERROR] logAuditEvent:", err?.message);
      return null;
    }
  }

  /**
   * Update existing audit log entry
   *
   * @async
   * @param {string} auditLogId - Audit log ID to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<boolean>} - Success status
   */
  async updateAuditLog(auditLogId, updates) {
    try {
      const { error } = await supabase
        .from('auth_audit_logs')
        .update(updates)
        .eq('id', auditLogId);

      if (error) {
        console.error("[ERROR] Failed to update audit log:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("[ERROR] updateAuditLog:", err?.message);
      return false;
    }
  }

  /**
   * Clear all user-related cache entries
   *
   * @async
   * @param {string} userId - User ID to clear cache for
   * @returns {Promise<void>}
   */
  async clearUserCache(userId) {
    try {
      // Clear lookup service cache
      const lookupService = require('./lookupService');
      if (lookupService.clearCache) {
        lookupService.clearCache();
      }

      // Clear response cache
      const { responseCache } = require('./responseCacheService');
      if (responseCache.clearAll) {
        await responseCache.clearAll();
      }

      console.log(`[CACHE] Cleared cache for user ${userId}`);
    } catch (error) {
      console.error(`[ERROR] Failed to clear cache for user ${userId}:`, error.message);
    }
  }

  /**
   * Request password reset email
   *
   * @async
   * @param {string} email - User's email
   * @param {string} userAgent - Optional User-Agent header for audit logging
   * @param {string} ipAddress - Optional IP address for audit logging
   * @returns {Promise<Object>} - Success status
   * @throws {Error} If email is invalid or request fails
   */
  async requestPasswordReset(email, userAgent = null, ipAddress = null) {
    try {
      if (!email) {
        await this.logAuditEvent({
          action: 'password_reset_request',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: "Email is required",
          metadata: { email }
        });
        throw new Error("Email is required");
      }

      // Get the frontend URL from environment
      const frontendUrl = process.env.ALLOWED_ORIGINS?.split(',')[1]?.trim() || 'http://localhost:5173';
      const redirectTo = `${frontendUrl}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });

      if (error) {
        console.error("[ERROR] Password reset request failed:", error.message);

        await this.logAuditEvent({
          action: 'password_reset_request',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: error.message,
          metadata: { email }
        });

        throw new Error(error.message);
      }

      // Log successful password reset request
      await this.logAuditEvent({
        action: 'password_reset_request',
        success: true,
        ipAddress,
        userAgent,
        metadata: { email }
      });

      return {
        success: true,
        message: "Password reset email sent successfully"
      };
    } catch (error) {
      console.error("[ERROR] AuthService.requestPasswordReset:", error?.message);
      throw error;
    }
  }

  /**
   * Reset password using access token from email link
   *
   * @async
   * @param {string} accessToken - Access token from email link
   * @param {string} newPassword - New password
   * @param {string} userAgent - Optional User-Agent header for audit logging
   * @param {string} ipAddress - Optional IP address for audit logging
   * @returns {Promise<Object>} - Success status
   * @throws {Error} If token is invalid or password update fails
   */
  async resetPassword(accessToken, newPassword, userAgent = null, ipAddress = null) {
    try {
      if (!accessToken || !newPassword) {
        throw new Error("Access token and new password are required");
      }

      if (newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      // Decode JWT to extract user ID
      let userId;
      try {
        const base64Url = accessToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        userId = payload.sub;
      } catch (decodeError) {
        console.error("[ERROR] Failed to decode access token:", decodeError.message);

        await this.logAuditEvent({
          action: 'password_reset',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: "Invalid access token format"
        });

        throw new Error("Invalid access token format");
      }

      if (!userId) {
        throw new Error("Invalid token: user ID not found");
      }

      // Update the user's password using admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error("[ERROR] Password update failed:", updateError.message);

        await this.logAuditEvent({
          userId: userId,
          action: 'password_reset',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: updateError.message
        });

        throw new Error(updateError.message);
      }

      // Log successful password reset
      await this.logAuditEvent({
        userId: userId,
        action: 'password_reset',
        success: true,
        ipAddress,
        userAgent
      });

      // Clear user cache
      await this.clearUserCache(userId);

      return {
        success: true,
        message: "Password reset successfully"
      };
    } catch (error) {
      console.error("[ERROR] AuthService.resetPassword:", error?.message);
      throw error;
    }
  }
}

module.exports = new AuthService();
