import { Request } from 'express';

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  timestamp: string;
  traceId?: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
  user?: {
    id: string;
    email: string;
    plan: string;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}