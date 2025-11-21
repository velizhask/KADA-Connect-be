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
   * Sign up using Supabase Auth API
   *
   * @async
   * @author sqizzo
   * @param {string} email - User's email
   * @param {string} fullName- User's full name
   * @param {string} password - User's password
   * @param {string} role - User's role (["student"," company"])
   * @returns {Promise<Object>} - Auth response (user + session if autoLogin enabled)
   * @throws {Error} If data is incomplete.
   *
   */
  async signUp(email, fullName, password, role) {
    try {
      if (!email || !password || !fullName) {
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
        throw new Error(error?.message);
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
      console.error("[ERROR] AuthService.signUp:", error?.message);
      throw error;
    }
  }

  /**
   *
   * Invalidate all access token from supabase
   * Note:
   * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to auth.api.signOut(JWT: string). There is no way to revoke a user's access token jwt until it expires. It is recommended to set a shorter expiry on the jwt for this reason. (Supabase docs)
   *
   * @async
   * @author sqizzo
   * @param {string} token - The JWT access token from the authorization header.
   * @returns {Promise<Object>} - The authenticated user object from supabase
   * @throws {Error} If the token is missing, invalid, or Supabase returns an error.
   *
   */
  async logOut(token) {
    try {
      if (!token) {
        throw new Error("Missing berarer token");
      }
      const { error } = await supabase.auth.signOut({
        scope: "global",
      });

      if (error) {
        console.error("[ERROR] Sign-out failed:", error?.message);
        throw new Error(error?.message);
      }
    } catch (error) {
      console.error("[ERROR] AuthService.logOut:", error?.message);
      throw error;
    }
  }
}

module.exports = new AuthService();
