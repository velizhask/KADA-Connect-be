const authService = require("../services/authService");

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

      const response = await authService.signIn(email, password, userAgent, ipAddress);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        accessToken: response.session.access_token,
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
}

module.exports = new AuthController();
