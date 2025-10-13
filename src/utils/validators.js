const Joi = require("joi");

const signupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required(),
  contact: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  age: Joi.number().min(13).max(120).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const otpSchema = Joi.object({
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  tempToken: Joi.string().required(),
});

const postSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).max(5000).required(),
  moodTag: Joi.string()
    .valid(
      "Crying",
      "Sad",
      "Exhausted",
      "Calm",
      "Happy",
      "Chearful",
      "Energetic",
      "Confused",
      "Anxious"
    )
    .optional(),
  isAnonymous: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string().min(1).max(50)).max(10).optional(),
  visibility: Joi.string()
    .valid("public", "private", "friends")
    .default("public"),
});

const pollSchema = Joi.object({
  question: Joi.string().min(5).max(300).required(),
  options: Joi.array()
    .items(Joi.string().min(1).max(100))
    .min(2)
    .max(6)
    .required(),
  expiresAt: Joi.date().min("now").optional(),
});

const moodLogSchema = Joi.object({
  emoji: Joi.string().required(),
  scale: Joi.number().min(1).max(5).required(),
  emotions: Joi.array().items(Joi.string()).max(10).optional(),
  notes: Joi.string().max(1000).optional(),
});

const appointmentSchema = Joi.object({
  psychologistId: Joi.string().hex().length(24).required(),
  dateTime: Joi.date().min("now").required(),
  notes: Joi.string().max(500).optional(),
});

const userPanelCreateSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required(),
  contact: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  age: Joi.number().min(13).max(120).required(),
  modules: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        route: Joi.string().required(),
        permissions: Joi.object({
          read: Joi.boolean().default(true),
          write: Joi.boolean().default(false),
          delete: Joi.boolean().default(false),
        }).optional(),
      })
    )
    .min(1)
    .required(),
});

const userPanelUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .optional(),
  contact: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  age: Joi.number().min(13).max(120).optional(),
  modules: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        route: Joi.string().required(),
        permissions: Joi.object({
          read: Joi.boolean().default(true),
          write: Joi.boolean().default(false),
          delete: Joi.boolean().default(false),
        }).optional(),
      })
    )
    .min(1)
    .optional(),
  isActive: Joi.boolean().optional(),
});

const moduleUpdateSchema = Joi.object({
  modules: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        route: Joi.string().required(),
        permissions: Joi.object({
          read: Joi.boolean().default(true),
          write: Joi.boolean().default(false),
          delete: Joi.boolean().default(false),
        }).optional(),
      })
    )
    .min(1)
    .required(),
});

module.exports = {
  signupSchema,
  loginSchema,
  otpSchema,
  postSchema,
  pollSchema,
  moodLogSchema,
  appointmentSchema,
  userPanelCreateSchema,
  userPanelUpdateSchema,
  moduleUpdateSchema,
};
