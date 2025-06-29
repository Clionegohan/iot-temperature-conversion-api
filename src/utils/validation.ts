import Joi from 'joi';
import { TemperatureUnit, TemperaturePrecisionContext } from '../types/temperature';

export const temperatureValueSchema = Joi.object({
  value: Joi.number().required().custom((value, helpers) => {
    if (!isFinite(value)) {
      return helpers.error('number.finite');
    }
    return value;
  })
    .messages({
      'number.finite': 'Temperature value must be a finite number',
      'any.required': 'Temperature value is required',
    }),
  unit: Joi.string().valid(...Object.values(TemperatureUnit)).required()
    .messages({
      'any.only': 'Temperature unit must be one of: celsius, fahrenheit, kelvin',
      'any.required': 'Temperature unit is required',
    }),
  precision: Joi.string().valid(...Object.values(TemperaturePrecisionContext)).optional()
    .messages({
      'any.only': 'Precision context must be one of: consumer, industrial, medical, scientific',
    }),
});

export const conversionRequestSchema = Joi.object({
  temperature: temperatureValueSchema.required(),
  targetUnit: Joi.string().valid(...Object.values(TemperatureUnit)).required()
    .messages({
      'any.only': 'Target unit must be one of: celsius, fahrenheit, kelvin',
      'any.required': 'Target unit is required',
    }),
  precision: Joi.string().valid(...Object.values(TemperaturePrecisionContext)).optional()
    .messages({
      'any.only': 'Precision context must be one of: consumer, industrial, medical, scientific',
    }),
});

export const batchConversionRequestSchema = Joi.object({
  temperatures: Joi.array().items(temperatureValueSchema).min(1).max(1000).required()
    .messages({
      'array.min': 'At least one temperature value is required',
      'array.max': 'Maximum 1000 temperature values allowed per batch',
      'any.required': 'Temperature array is required',
    }),
  targetUnit: Joi.string().valid(...Object.values(TemperatureUnit)).required()
    .messages({
      'any.only': 'Target unit must be one of: celsius, fahrenheit, kelvin',
      'any.required': 'Target unit is required',
    }),
  precision: Joi.string().valid(...Object.values(TemperaturePrecisionContext)).optional()
    .messages({
      'any.only': 'Precision context must be one of: consumer, industrial, medical, scientific',
    }),
});

export function validateRequest<T>(schema: Joi.ObjectSchema, data: unknown): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));

    throw new ValidationError('Request validation failed', validationErrors);
  }

  return value as T;
}

export class ValidationError extends Error {
  public readonly errors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;

  constructor(message: string, errors: Array<{ field: string; message: string; value?: unknown }>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}