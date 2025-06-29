import { Request, Response, NextFunction } from 'express';
import { ApiError, HttpStatusCode } from '../types/api';
import { ValidationError } from './validation';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(message: string, statusCode: number = HttpStatusCode.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export function createApiError(
  type: string,
  title: string,
  status: number,
  detail: string,
  instance?: string
): ApiError {
  const apiError: ApiError = {
    type,
    title,
    status,
    detail,
    timestamp: new Date().toISOString(),
  };
  
  if (instance) {
    apiError.instance = instance;
  }
  
  return apiError;
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    return next(error);
  }

  let apiError: ApiError;

  if (error instanceof ValidationError) {
    apiError = createApiError(
      '/errors/validation-failed',
      'Request Validation Failed',
      HttpStatusCode.BAD_REQUEST,
      `Validation failed: ${error.errors.map(e => `${e.field}: ${e.message}`).join(', ')}`,
      req.url
    );
  } else if (error instanceof AppError) {
    apiError = createApiError(
      '/errors/application-error',
      error.message,
      error.statusCode,
      error.message,
      req.url
    );
  } else if (error.name === 'ConversionError') {
    apiError = createApiError(
      '/errors/conversion-failed',
      'Temperature Conversion Failed',
      HttpStatusCode.UNPROCESSABLE_ENTITY,
      error.message,
      req.url
    );
  } else {
    // 予期しないエラーはログに記録
    console.error('Unexpected error:', error);
    
    apiError = createApiError(
      '/errors/internal-server-error',
      'Internal Server Error',
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred. Please try again later.',
      req.url
    );
  }

  res.status(apiError.status).json({
    error: apiError,
    meta: {
      timestamp: apiError.timestamp,
      version: 'v1',
      requestId: req.headers['x-request-id'] as string || 'unknown',
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  const apiError = createApiError(
    '/errors/not-found',
    'Resource Not Found',
    HttpStatusCode.NOT_FOUND,
    `The requested resource '${req.url}' was not found on this server.`,
    req.url
  );

  res.status(HttpStatusCode.NOT_FOUND).json({
    error: apiError,
    meta: {
      timestamp: apiError.timestamp,
      version: 'v1',
      requestId: req.headers['x-request-id'] as string || 'unknown',
    },
  });
}