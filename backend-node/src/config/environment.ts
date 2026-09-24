import * as Joi from 'joi';

export const environmentSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  DB_SSL: Joi.boolean().default(false),
  DB_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(true),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('15m'),
  JWT_ISSUER: Joi.string().min(1).default('hris-api'),
  JWT_AUDIENCE: Joi.string().min(1).default('hris-web'),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
  UPLOAD_DIR: Joi.string().default('./uploads'),
  MAX_UPLOAD_BYTES: Joi.number()
    .integer()
    .min(1024)
    .max(10 * 1024 * 1024)
    .default(5 * 1024 * 1024),
  SWAGGER_ENABLED: Joi.boolean().default(false),
  BOOTSTRAP_ADMIN_EMAIL: Joi.string().email().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: Joi.string().min(12).optional(),
});
