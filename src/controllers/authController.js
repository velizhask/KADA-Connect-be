const authService = require("../services/authService");

class AuthController {
  async register(req, res, next) {
    try {
      const { fullName, email, password, role } = req.body;

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
        role
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
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const response = await authService.signIn(email, password);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        user: response.user,
        accessToken: response.accessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required",
        });
      }

      const response = await authService.signOut(token);

      return res.json({
        success: true,
        message: response.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
