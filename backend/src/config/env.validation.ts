import * as Joi from 'joi';

const baseKeys = {
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_SSL: Joi.string().valid('true', 'false').optional(),
  CORS_ORIGINS: Joi.string().optional(),
  JWT_SECRET: Joi.string().min(1).required(),
  FINNHUB_API_KEY: Joi.string().required(),
  FIREBASE_PROJECT_ID: Joi.string().optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().optional(),
};

const urlVariant = Joi.object({
  ...baseKeys,
  DATABASE_URL: Joi.string().required(),
  DATABASE_HOST: Joi.string().optional(),
  DATABASE_PORT: Joi.number().port().optional(),
  DATABASE_NAME: Joi.string().optional(),
  DATABASE_USER: Joi.string().optional(),
  DATABASE_PASSWORD: Joi.string().optional(),
}).and('FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY');

const individualVariant = Joi.object({
  ...baseKeys,
  DATABASE_URL: Joi.string().optional(),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
}).and('FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY');

export const envValidationSchema = Joi.alternatives().try(urlVariant, individualVariant);
