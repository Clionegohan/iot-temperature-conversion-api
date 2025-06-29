export enum TemperatureUnit {
  CELSIUS = 'celsius',
  FAHRENHEIT = 'fahrenheit',
  KELVIN = 'kelvin',
}

export enum TemperaturePrecisionContext {
  CONSUMER = 'consumer',    // 消費者用（小数点2桁）
  INDUSTRIAL = 'industrial', // 工業用（小数点4桁）
  MEDICAL = 'medical',      // 医療用（小数点3桁）
  SCIENTIFIC = 'scientific' // 科学用（有効数字15桁）
}

export interface TemperatureValue {
  value: number;
  unit: TemperatureUnit;
  precision?: TemperaturePrecisionContext;
}

export interface ConversionRequest {
  temperature: TemperatureValue;
  targetUnit: TemperatureUnit;
  precision?: TemperaturePrecisionContext;
}

export interface ConversionResponse {
  original: TemperatureValue;
  converted: TemperatureValue;
  precision: TemperaturePrecisionContext;
  timestamp: string;
  conversionMethod: string;
}

export interface BatchConversionRequest {
  temperatures: TemperatureValue[];
  targetUnit: TemperatureUnit;
  precision?: TemperaturePrecisionContext;
}

export interface BatchConversionResponse {
  conversions: ConversionResponse[];
  totalCount: number;
  processingTimeMs: number;
  timestamp: string;
}

export interface ConversionError {
  code: string;
  message: string;
  field?: string;
  value?: unknown;
}