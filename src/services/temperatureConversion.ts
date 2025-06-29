import {
  TemperatureUnit,
  TemperaturePrecisionContext,
  TemperatureValue,
  ConversionRequest,
  ConversionResponse,
  BatchConversionRequest,
  BatchConversionResponse,
} from '../types/temperature';

export class TemperatureConversionService {
  private static readonly ABSOLUTE_ZERO_KELVIN = 0;
  private static readonly ABSOLUTE_ZERO_CELSIUS = -273.15;
  private static readonly ABSOLUTE_ZERO_FAHRENHEIT = -459.67;

  public static convert(request: ConversionRequest): ConversionResponse {
    this.validateTemperature(request.temperature);
    
    const convertedValue = this.performConversion(
      request.temperature.value,
      request.temperature.unit,
      request.targetUnit
    );
    
    const precision = request.precision || TemperaturePrecisionContext.SCIENTIFIC;
    const roundedValue = this.applyPrecision(convertedValue, precision);
    
    return {
      original: request.temperature,
      converted: {
        value: roundedValue,
        unit: request.targetUnit,
        precision,
      },
      precision,
      timestamp: new Date().toISOString(),
      conversionMethod: `NIST-${request.temperature.unit}-to-${request.targetUnit}`,
    };
  }

  public static batchConvert(request: BatchConversionRequest): BatchConversionResponse {
    const startTime = performance.now();
    
    const conversions = request.temperatures.map(temperature => {
      const conversionRequest: ConversionRequest = {
        temperature,
        targetUnit: request.targetUnit,
        ...(request.precision && { precision: request.precision }),
      };
      return this.convert(conversionRequest);
    });
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    return {
      conversions,
      totalCount: conversions.length,
      processingTimeMs: Math.round(processingTime * 1000) / 1000,
      timestamp: new Date().toISOString(),
    };
  }

  private static performConversion(
    value: number,
    fromUnit: TemperatureUnit,
    toUnit: TemperatureUnit
  ): number {
    if (fromUnit === toUnit) {
      return value;
    }

    const kelvinValue = this.convertToKelvin(value, fromUnit);
    return this.convertFromKelvin(kelvinValue, toUnit);
  }

  private static convertToKelvin(value: number, fromUnit: TemperatureUnit): number {
    switch (fromUnit) {
      case TemperatureUnit.KELVIN:
        return value;
      case TemperatureUnit.CELSIUS:
        return value + 273.15;
      case TemperatureUnit.FAHRENHEIT:
        return (value + 459.67) * (5 / 9);
      default:
        throw new Error(`Unsupported temperature unit: ${fromUnit}`);
    }
  }

  private static convertFromKelvin(kelvinValue: number, toUnit: TemperatureUnit): number {
    switch (toUnit) {
      case TemperatureUnit.KELVIN:
        return kelvinValue;
      case TemperatureUnit.CELSIUS:
        return kelvinValue - 273.15;
      case TemperatureUnit.FAHRENHEIT:
        return (kelvinValue * (9 / 5)) - 459.67;
      default:
        throw new Error(`Unsupported temperature unit: ${toUnit}`);
    }
  }

  private static applyPrecision(value: number, precision: TemperaturePrecisionContext): number {
    switch (precision) {
      case TemperaturePrecisionContext.CONSUMER:
        return Math.round(value * 100) / 100;
      case TemperaturePrecisionContext.MEDICAL:
        return Math.round(value * 1000) / 1000;
      case TemperaturePrecisionContext.INDUSTRIAL:
        return Math.round(value * 10000) / 10000;
      case TemperaturePrecisionContext.SCIENTIFIC:
        return parseFloat(value.toPrecision(15));
      default:
        return parseFloat(value.toPrecision(15));
    }
  }

  private static validateTemperature(temperature: TemperatureValue): void {
    if (typeof temperature.value !== 'number' || !isFinite(temperature.value)) {
      throw new ConversionError('Temperature value must be a valid finite number', {
        code: 'INVALID_TEMPERATURE_VALUE',
        field: 'temperature.value',
        value: temperature.value,
      });
    }

    if (!Object.values(TemperatureUnit).includes(temperature.unit)) {
      throw new ConversionError(`Invalid temperature unit: ${temperature.unit}`, {
        code: 'INVALID_TEMPERATURE_UNIT',
        field: 'temperature.unit',
        value: temperature.unit,
      });
    }

    this.validateAbsoluteZero(temperature.value, temperature.unit);
  }

  private static getAbsoluteZeroInfo(unit: TemperatureUnit): { value: number; name: string } | null {
    switch (unit) {
      case TemperatureUnit.KELVIN:
        return { value: this.ABSOLUTE_ZERO_KELVIN, name: 'Kelvin' };
      case TemperatureUnit.CELSIUS:
        return { value: this.ABSOLUTE_ZERO_CELSIUS, name: 'Celsius' };
      case TemperatureUnit.FAHRENHEIT:
        return { value: this.ABSOLUTE_ZERO_FAHRENHEIT, name: 'Fahrenheit' };
      default:
        return null;
    }
  }

  private static validateAbsoluteZero(value: number, unit: TemperatureUnit): void {
    const absoluteZeroInfo = this.getAbsoluteZeroInfo(unit);
    
    if (!absoluteZeroInfo) {
      return;
    }

    if (value < absoluteZeroInfo.value) {
      throw new ConversionError(
        `Temperature cannot be below absolute zero (${absoluteZeroInfo.value}°${absoluteZeroInfo.name})`,
        {
          code: 'BELOW_ABSOLUTE_ZERO',
          field: 'temperature.value',
          value: value,
        }
      );
    }
  }
}

class ConversionError extends Error {
  public readonly code: string;
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(message: string, details: { code: string; field?: string; value?: unknown }) {
    super(message);
    this.name = 'ConversionError';
    this.code = details.code;
    if (details.field !== undefined) {
      this.field = details.field;
    }
    if (details.value !== undefined) {
      this.value = details.value;
    }
  }
}