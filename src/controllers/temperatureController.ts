import { Request, Response, NextFunction } from 'express';
import { TemperatureConversionService } from '../services/temperatureConversion';
import { 
  ConversionRequest, 
  BatchConversionRequest
} from '../types/temperature';
import { ApiResponse, HttpStatusCode } from '../types/api';
import { 
  validateRequest, 
  conversionRequestSchema, 
  batchConversionRequestSchema 
} from '../utils/validation';

export class TemperatureController {
  public static async convertTemperature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const startTime = performance.now();
      
      const validatedRequest = validateRequest<ConversionRequest>(
        conversionRequestSchema,
        req.body
      );

      const result = TemperatureConversionService.convert(validatedRequest);
      
      const endTime = performance.now();
      const processingTime = Math.round((endTime - startTime) * 1000) / 1000;

      const response: ApiResponse = {
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      };

      // パフォーマンス要件チェック（1ms以下）
      if (processingTime > 1) {
        console.warn(`Performance warning: Single conversion took ${processingTime}ms (>1ms threshold)`);
      }

      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  public static async convertTemperatureBatch(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const startTime = performance.now();
      
      const validatedRequest = validateRequest<BatchConversionRequest>(
        batchConversionRequestSchema,
        req.body
      );

      const result = TemperatureConversionService.batchConvert(validatedRequest);
      
      const endTime = performance.now();
      const processingTime = Math.round((endTime - startTime) * 1000) / 1000;

      const response: ApiResponse = {
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      };

      // パフォーマンス要件チェック（10ms以下/1000データポイント）
      const expectedMaxTime = (validatedRequest.temperatures.length / 1000) * 10;
      if (processingTime > expectedMaxTime) {
        console.warn(`Performance warning: Batch conversion took ${processingTime}ms (>${expectedMaxTime}ms threshold for ${validatedRequest.temperatures.length} items)`);
      }

      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  public static async getHealthCheck(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: 'v1',
        services: {
          temperatureConversion: 'operational',
        },
        performance: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        },
      };

      const response: ApiResponse = {
        data: healthData,
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      };

      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  public static async getSupportedUnits(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const unitsData = {
        temperatureUnits: ['celsius', 'fahrenheit', 'kelvin'],
        precisionContexts: ['consumer', 'industrial', 'medical', 'scientific'],
        conversionPairs: [
          { from: 'celsius', to: 'fahrenheit' },
          { from: 'celsius', to: 'kelvin' },
          { from: 'fahrenheit', to: 'celsius' },
          { from: 'fahrenheit', to: 'kelvin' },
          { from: 'kelvin', to: 'celsius' },
          { from: 'kelvin', to: 'fahrenheit' },
        ],
        precisionDetails: {
          consumer: { decimalPlaces: 2, description: 'Consumer applications' },
          industrial: { decimalPlaces: 4, description: 'Industrial monitoring' },
          medical: { decimalPlaces: 3, description: 'Medical devices' },
          scientific: { significantFigures: 15, description: 'Scientific research' },
        },
      };

      const response: ApiResponse = {
        data: unitsData,
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
          requestId: req.headers['x-request-id'] as string || 'unknown',
        },
      };

      res.status(HttpStatusCode.OK).json(response);
    } catch (error) {
      next(error);
    }
  }
}