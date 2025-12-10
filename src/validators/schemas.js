const Joi = require("joi");

const companySchemas = {
  create: Joi.object({
    emailAddress: Joi.string()
      .email()
      .disallow(
        "gmail.com",
        "yahoo.com",
        "hotmail.com",
        "outlook.com",
        "aol.com",
        "icloud.com",
        "protonmail.com",
        "yandex.com",
        "mail.com",
        "live.com",
        "msn.com",
        "me.com"
      )
      .required()
      .messages({
        "string.email": "Email address must be a valid email",
        "any.required": "Email address is required",
        "any.disallow": "Please use your organization/business email address, not personal email domains like Gmail, Yahoo, etc.",
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
    website: Joi.string().uri().optional().messages({
      "string.uri": "Website must be a valid URL",
    }),
    companyWebsite: Joi.string().uri().optional().messages({
      "string.uri": "Website must be a valid URL",
    }),
    logo: Joi.string().uri().optional().messages({
      "string.uri": "Logo must be a valid URL",
    }),
    companyLogo: Joi.string().uri().optional().messages({
      "string.uri": "Logo must be a valid URL",
    }),
    techRoles: Joi.string().max(500).optional().messages({
      "string.max": "Tech roles cannot exceed 500 characters",
    }),
    preferredSkillsets: Joi.string().max(1000).optional().messages({
      "string.max": "Preferred skillsets cannot exceed 1000 characters",
    }),
    contactPerson: Joi.string().min(1).max(100).optional().messages({
      "string.min": "Contact person name cannot be empty",
      "string.max": "Contact person name cannot exceed 100 characters",
    }),
    contactPersonName: Joi.string().min(1).max(100).optional().messages({
      "string.min": "Contact person name cannot be empty",
      "string.max": "Contact person name cannot exceed 100 characters",
    }),
    contactEmail: Joi.string().email().optional().messages({
      "string.email": "Contact email must be a valid email",
    }),
    contactEmailAddress: Joi.string().email().optional().messages({
      "string.email": "Contact email must be a valid email",
    }),
    contactPhone: Joi.string().max(20).optional().messages({
      "string.max": "Contact phone number cannot exceed 20 characters",
    }),
    contactPhoneNumber: Joi.string().max(20).optional().messages({
      "string.max": "Contact phone number cannot exceed 20 characters",
    }),
    contactInfoVisible: Joi.boolean().optional().default(false).messages({
      "boolean.base": "Contact info visible must be a boolean",
    }),
    visibleContactInfo: Joi.boolean().optional().default(false).messages({
      "boolean.base": "Contact info visible must be a boolean",
    }),
    isVisible: Joi.boolean().optional().default(false).messages({
      "boolean.base": "isVisible must be a boolean",
    }),
  }),

  update: Joi.object({
    emailAddress: Joi.string()
      .email()
      .disallow(
        "gmail.com",
        "yahoo.com",
        "hotmail.com",
        "outlook.com",
        "aol.com",
        "icloud.com",
        "protonmail.com",
        "yandex.com",
        "mail.com",
        "live.com",
        "msn.com",
        "me.com"
      )
      .optional()
      .messages({
        "string.email": "Email address must be a valid email",
        "any.disallow": "Please use your organization/business email address, not personal email domains like Gmail, Yahoo, etc.",
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
    website: Joi.string().uri().allow(null, "").optional().messages({
      "string.uri": "Website must be a valid URL",
    }),
    logo: Joi.string().uri().allow(null, "").optional().messages({
      "string.uri": "Logo must be a valid URL",
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
    contactPerson: Joi.string()
      .min(1)
      .max(100)
      .allow(null, "")
      .optional()
      .messages({
        "string.min": "Contact person name cannot be empty",
        "string.max": "Contact person name cannot exceed 100 characters",
      }),
    contactEmail: Joi.string()
      .email()
      .allow(null, "")
      .optional()
      .messages({
        "string.email": "Contact email must be a valid email",
      }),
    contactPhoneNumber: Joi.string()
      .max(20)
      .allow(null, "")
      .optional()
      .messages({
        "string.max": "Contact phone number cannot exceed 20 characters",
      }),
    contactPhone: Joi.string()
      .max(20)
      .allow(null, "")
      .optional()
      .messages({
        "string.max": "Contact phone number cannot exceed 20 characters",
      }),
    contactInfoVisible: Joi.boolean().optional().messages({
      "boolean.base": "Contact info visible must be a boolean",
    }),
    visibleContactInfo: Joi.boolean().optional().messages({
      "boolean.base": "Contact info visible must be a boolean",
    }),
    isVisible: Joi.boolean().optional().messages({
      "boolean.base": "isVisible must be a boolean",
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
    batch: Joi.string().max(50).optional().messages({
      "string.max": "Batch cannot exceed 50 characters",
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
    phone: Joi.string().max(20).optional().messages({
      "string.max": "Phone number cannot exceed 20 characters",
    }),
    isVisible: Joi.boolean().optional().default(false).messages({
      "boolean.base": "isVisible must be a boolean",
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
    batch: Joi.string().max(50).optional().messages({
      "string.max": "Batch cannot exceed 50 characters",
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
    phone: Joi.string().max(20).allow(null, "").optional().messages({
      "string.max": "Phone number cannot exceed 20 characters",
    }),
    isVisible: Joi.boolean().optional().messages({
      "boolean.base": "isVisible must be a boolean",
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
      'string.email': 'Email must be valid',
      'any.required': 'Email is required',
    }),
    fullName: Joi.string().required().messages({
      'any.required': 'Full name is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    role: Joi.string().valid('student', 'company', 'admin').messages({
      'any.only': 'Role must be student, company or admin',
    }),
  })
  .custom((value, helpers) => {
    if (value.role === 'company') {
      const personalDomains = [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'outlook.com',
        'aol.com',
        'icloud.com',
        'protonmail.com',
        'yandex.com',
        'mail.com',
        'live.com',
        'msn.com',
        'me.com'
      ];

      const domain = value.email.split('@')[1];
      if (personalDomains.includes(domain.toLowerCase())) {
        return helpers.error('auth.email.personal', { domain });
      }
    }
    return value;
  }, 'organization email validation')
  .messages({
    'auth.email.personal': 'Please use your organization/business email address, not personal email domains like Gmail, Yahoo, etc.',
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
  forgotPassword: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email must be valid",
      "any.required": "Email is required",
    }),
  }),
  resetPassword: Joi.object({
    access_token: Joi.string().required().messages({
      "any.required": "Access token is required",
    }),
    password: Joi.string().min(8).required().messages({
      "string.min": "Password must be at least 8 characters",
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
