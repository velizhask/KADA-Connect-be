const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const authController = require("../controllers/authController");
const { sanitizeInput, validateRequest } = require("../middlewares/validation");
const { authSchemas } = require("../validators/schemas");
const { requireAuth, requireApproval } = require("../middlewares/auth");

// Rate limiter for logout endpoint - prevent abuse
const logoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 logout attempts per window per IP
  message: {
    success: false,
    message: "Too many logout attempts, please try again later",
    error: "Rate limit exceeded",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(sanitizeInput);

router.post(
  "/register",
  validateRequest(authSchemas.register),
  authController.register
);

router.post("/login", validateRequest(authSchemas.login), authController.login);

router.post("/logout", requireAuth, logoutLimiter, authController.logout);

router.get("/me", requireAuth, requireApproval, authController.getMyProfile);

module.exports = router;
