const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { sanitizeInput, validateRequest } = require("../middlewares/validation");
const { authSchemas } = require("../validators/schemas");
const { requireAuth } = require("../middlewares/auth");

router.use(sanitizeInput);

router.post(
  "/register",
  validateRequest(authSchemas.register),
  authController.register
);

router.post("/login", validateRequest(authSchemas.login), authController.login);
router.post("/logout", requireAuth, authController.logout);

module.exports = router;
