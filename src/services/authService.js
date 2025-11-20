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
        throw new Error("Missing berarer token");
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
   * Sign in using Supabase Auth API using email/password
   *
   * @async
   * @author sqizzo
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} - Contains the session + user data
   * @throws {Error} If email or password is wrong
   *
   */

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[ERROR] Sign-in failed:", error?.message);
        throw new Error(error.message);
      }
      return data;
    } catch (error) {
      console.error("[ERROR] AuthService.signIn:", error?.message);
      throw error;
    }
  }

  /**
   *
   * Sign in using Supabase Auth API using email/password
   *
   * @async
   * @author sqizzo
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} role - User's role (["student"," company"])
   * @returns {Promise<Object>} - Auth response (user + session if autoLogin enabled)
   * @throws {Error} If data is incomplete.
   *
   */
  async signUp(email, password, role) {
    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
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
          data: { role },
        },
      });

      if (error) {
        console.error("[ERROR] Signup failed:", error.message);
        throw new Error(error?.message);
      }

      const response = {
        user: data.user,
        session: data.session,
        message: "Registration successfull",
      };

      return response;
    } catch (error) {
      console.error("[ERROR] AuthService.signUp:", error?.message);
      throw error;
    }
  }
}

module.exports = new AuthService();
