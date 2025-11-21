const Joi = require("joi");

const companySchemas = {
  create: Joi.object({
    emailAddress: Joi.string().email().required().messages({
      "string.email": "Email address must be a valid email",
      "any.required": "Email address is required",
    }),
    companyName: Joi.string().min(1).max(200).required().messages({
      "string.min": "Company name cannot be empty",
      "string.max": "Company name cannot exceed 200 characters",
      "any.required": "Company name is required",
    }),
    companySummary: Joi.string().min(10).max(2000).required().messages({
      "string.min": "Company summary must be at least 10 characters",
      "string.max": "Company summary cannot exceed 2000 characters",
      "any.required": "Company summary is required",
    }),
    industry: Joi.string().min(1).max(100).required().messages({
      "string.min": "Industry cannot be empty",
      "string.max": "Industry cannot exceed 100 characters",
      "any.required": "Industry is required",
    }),
    companyWebsite: Joi.string().uri().optional().messages({
      "string.uri": "Company website must be a valid URL",
    }),
    companyLogo: Joi.string().uri().optional().messages({
      "string.uri": "Company logo must be a valid URL",
    }),
    techRoles: Joi.string().max(500).optional().messages({
      "string.max": "Tech roles cannot exceed 500 characters",
    }),
    preferredSkillsets: Joi.string().max(1000).optional().messages({
      "string.max": "Preferred skillsets cannot exceed 1000 characters",
    }),
    contactPersonName: Joi.string().min(1).max(100).optional().messages({
      "string.min": "Contact person name cannot be empty",
      "string.max": "Contact person name cannot exceed 100 characters",
    }),
    contactEmailAddress: Joi.string().email().optional().messages({
      "string.email": "Contact email address must be a valid email",
    }),
    contactPhoneNumber: Joi.string().max(20).optional().messages({
      "string.max": "Contact phone number cannot exceed 20 characters",
    }),
    visibleContactInfo: Joi.boolean().optional().default(false).messages({
      "boolean.base": "Visible contact info must be a boolean",
    }),
  }),

  update: Joi.object({
    emailAddress: Joi.string().email().optional().messages({
      "string.email": "Email address must be a valid email",
    }),
    companyName: Joi.string().min(1).max(200).optional().messages({
      "string.min": "Company name cannot be empty",
      "string.max": "Company name cannot exceed 200 characters",
    }),
    companySummary: Joi.string().min(10).max(2000).optional().messages({
      "string.min": "Company summary must be at least 10 characters",
      "string.max": "Company summary cannot exceed 2000 characters",
    }),
    industry: Joi.string().min(1).max(100).optional().messages({
      "string.min": "Industry cannot be empty",
      "string.max": "Industry cannot exceed 100 characters",
    }),
    companyWebsite: Joi.string().uri().allow(null, "").optional().messages({
      "string.uri": "Company website must be a valid URL",
    }),
    companyLogo: Joi.string().uri().allow(null, "").optional().messages({
      "string.uri": "Company logo must be a valid URL",
    }),
    techRoles: Joi.string().max(500).allow(null, "").optional().messages({
      "string.max": "Tech roles cannot exceed 500 characters",
    }),
    preferredSkillsets: Joi.string()
      .max(1000)
      .allow(null, "")
      .optional()
      .messages({
        "string.max": "Preferred skillsets cannot exceed 1000 characters",
      }),
    contactPersonName: Joi.string()
      .min(1)
      .max(100)
      .allow(null, "")
      .optional()
      .messages({
        "string.min": "Contact person name cannot be empty",
        "string.max": "Contact person name cannot exceed 100 characters",
      }),
    contactEmailAddress: Joi.string()
      .email()
      .allow(null, "")
      .optional()
      .messages({
        "string.email": "Contact email address must be a valid email",
      }),
    contactPhoneNumber: Joi.string()
      .max(20)
      .allow(null, "")
      .optional()
      .messages({
        "string.max": "Contact phone number cannot exceed 20 characters",
      }),
    visibleContactInfo: Joi.boolean().optional().messages({
      "boolean.base": "Visible contact info must be a boolean",
    }),
  })
    .min(1)
    .messages({
      "object.min": "At least one field must be provided for update",
    }),
};

const studentSchemas = {
  create: Joi.object({
    fullName: Joi.string().min(1).max(100).required().messages({
      "string.min": "Full name cannot be empty",
      "string.max": "Full name cannot exceed 100 characters",
      "any.required": "Full name is required",
    }),
    status: Joi.string()
      .valid("Current Trainee", "Alumni")
      .required()
      .messages({
        "any.only": 'Status must be either "Current Trainee" or "Alumni"',
        "any.required": "Status is required",
      }),
    employmentStatus: Joi.string()
      .valid("Employed", "Open to work")
      .required()
      .messages({
        "any.only":
          'Employment status must be either "Employed" or "Open to work"',
        "any.required": "Employment status is required",
      }),
    university: Joi.string().min(1).max(100).required().messages({
      "string.min": "University cannot be empty",
      "string.max": "University cannot exceed 100 characters",
      "any.required": "University is required",
    }),
    major: Joi.string().min(1).max(100).required().messages({
      "string.min": "Major cannot be empty",
      "string.max": "Major cannot exceed 100 characters",
      "any.required": "Major is required",
    }),
    preferredIndustry: Joi.string().min(1).max(100).required().messages({
      "string.min": "Preferred industry cannot be empty",
      "string.max": "Preferred industry cannot exceed 100 characters",
      "any.required": "Preferred industry is required",
    }),
    techStack: Joi.string().min(1).max(1000).required().messages({
      "string.min": "Tech stack cannot be empty",
      "string.max": "Tech stack cannot exceed 1000 characters",
      "any.required": "Tech stack is required",
    }),
    selfIntroduction: Joi.string().min(10).max(1000).required().messages({
      "string.min": "Self introduction must be at least 10 characters",
      "string.max": "Self introduction cannot exceed 1000 characters",
      "any.required": "Self introduction is required",
    }),
    cvUpload: Joi.string().uri().optional().messages({
      "string.uri": "CV upload must be a valid URL",
    }),
    profilePhoto: Joi.string().uri().optional().messages({
      "string.uri": "Profile photo must be a valid URL",
    }),
    linkedin: Joi.string().uri().optional().messages({
      "string.uri": "LinkedIn must be a valid URL",
    }),
    portfolioLink: Joi.string().uri().optional().messages({
      "string.uri": "Portfolio link must be a valid URL",
    }),
    phoneNumber: Joi.string().max(20).optional().messages({
      "string.max": "Phone number cannot exceed 20 characters",
    }),
  }),

  update: Joi.object({
    fullName: Joi.string().min(1).max(100).optional().messages({
      "string.min": "Full name cannot be empty",
      "string.max": "Full name cannot exceed 100 characters",
    }),
    status: Joi.string()
      .valid("Current Trainee", "Alumni")
      .optional()
      .messages({
        "any.only": 'Status must be either "Current Trainee" or "Alumni"',
      }),
    employmentStatus: Joi.string()
      .valid("Employed", "Open to work")
      .optional()
      .messages({
        "any.only":
          'Employment status must be either "Employed" or "Open to work"',
      }),
    university: Joi.string().min(1).max(100).optional().messages({
      "string.min": "University cannot be empty",
      "string.max": "University cannot exceed 100 characters",
    }),
    major: Joi.string().min(1).max(100).optional().messages({
      "string.min": "Major cannot be empty",
      "string.max": "Major cannot exceed 100 characters",
    }),
    preferredIndustry: Joi.string().min(1).max(100).optional().messages({
      "string.min": "Preferred industry cannot be empty",
      "string.max": "Preferred industry cannot exceed 100 characters",
    }),
    techStack: Joi.string().min(1).max(1000).optional().messages({
      "string.min": "Tech stack cannot be empty",
      "string.max": "Tech stack cannot exceed 1000 characters",
    }),
    selfIntroduction: Joi.string().min(10).max(1000).optional().messages({
      "string.min": "Self introduction must be at least 10 characters",
      "string.max": "Self introduction cannot exceed 1000 characters",
    }),
    cvUpload: Joi.string().uri().allow(null, "").optional().messages({
      "string.uri": "CV upload must be a valid URL",
    }),
    profilePhoto: Joi.string().uri().allow(null, "").optional().messages({
      "string.uri": "Profile photo must be a valid URL",
    }),
    linkedin: Joi.string().uri().allow(null, "").optional().messages({
      "string.uri": "LinkedIn must be a valid URL",
    }),
    portfolioLink: Joi.string().uri().allow(null, "").optional().messages({
      "string.uri": "Portfolio link must be a valid URL",
    }),
    phoneNumber: Joi.string().max(20).allow(null, "").optional().messages({
      "string.max": "Phone number cannot exceed 20 characters",
    }),
  })
    .min(1)
    .messages({
      "object.min": "At least one field must be provided for update",
    }),
};

const lookupSchemas = {
  createIndustry: Joi.object({
    industry: Joi.string().min(1).max(100).required().messages({
      "string.min": "Industry cannot be empty",
      "string.max": "Industry cannot exceed 100 characters",
      "any.required": "Industry is required",
    }),
  }),

  createTechRole: Joi.object({
    techRole: Joi.string().min(1).max(100).required().messages({
      "string.min": "Tech role cannot be empty",
      "string.max": "Tech role cannot exceed 100 characters",
      "any.required": "Tech role is required",
    }),
    category: Joi.string().min(1).max(50).optional().messages({
      "string.min": "Category cannot be empty",
      "string.max": "Category cannot exceed 50 characters",
    }),
  }),

  updateIndustry: Joi.object({
    industry: Joi.string().min(1).max(100).required().messages({
      "string.min": "Industry cannot be empty",
      "string.max": "Industry cannot exceed 100 characters",
      "any.required": "Industry is required",
    }),
  }),

  updateTechRole: Joi.object({
    techRole: Joi.string().min(1).max(100).required().messages({
      "string.min": "Tech role cannot be empty",
      "string.max": "Tech role cannot exceed 100 characters",
      "any.required": "Tech role is required",
    }),
    category: Joi.string().min(1).max(50).optional().messages({
      "string.min": "Category cannot be empty",
      "string.max": "Category cannot exceed 50 characters",
    }),
  }),
};

const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email must be valid",
      "any.required": "Email is required",
    }),
    fullName: Joi.string().required().messages({
      "any.required": "Full name is required",
    }),
    password: Joi.string().min(8).required().messages({
      "string.min": "Password must be at least 8 characters",
      "any.required": "Password is required",
    }),
    role: Joi.string().valid("student", "company", "admin").messages({
      "any.only": "Role must be student, company or admin",
    }),
  }),
  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email must be valid",
      "any.required": "Email is required",
    }),

    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  }),
};

module.exports = {
  companySchemas,
  studentSchemas,
  lookupSchemas,
  authSchemas,
};
