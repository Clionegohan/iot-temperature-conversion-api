import { TemperatureConversionService } from '../src/services/temperatureConversion';
import {
  TemperatureUnit,
  TemperaturePrecisionContext,
  ConversionRequest,
  BatchConversionRequest,
} from '../src/types/temperature';

describe('TemperatureConversionService', () => {
  describe('単一温度変換', () => {
    test('摂氏から華氏への変換', () => {
      const request: ConversionRequest = {
        temperature: { value: 0, unit: TemperatureUnit.CELSIUS },
        targetUnit: TemperatureUnit.FAHRENHEIT,
        precision: TemperaturePrecisionContext.CONSUMER,
      };

      const result = TemperatureConversionService.convert(request);

      expect(result.converted.value).toBe(32);
      expect(result.converted.unit).toBe(TemperatureUnit.FAHRENHEIT);
      expect(result.precision).toBe(TemperaturePrecisionContext.CONSUMER);
    });

    test('華氏から摂氏への変換', () => {
      const request: ConversionRequest = {
        temperature: { value: 32, unit: TemperatureUnit.FAHRENHEIT },
        targetUnit: TemperatureUnit.CELSIUS,
        precision: TemperaturePrecisionContext.CONSUMER,
      };

      const result = TemperatureConversionService.convert(request);

      expect(result.converted.value).toBe(0);
      expect(result.converted.unit).toBe(TemperatureUnit.CELSIUS);
    });

    test('摂氏からケルビンへの変換', () => {
      const request: ConversionRequest = {
        temperature: { value: 0, unit: TemperatureUnit.CELSIUS },
        targetUnit: TemperatureUnit.KELVIN,
        precision: TemperaturePrecisionContext.SCIENTIFIC,
      };

      const result = TemperatureConversionService.convert(request);

      expect(result.converted.value).toBe(273.15);
      expect(result.converted.unit).toBe(TemperatureUnit.KELVIN);
    });

    test('ケルビンから摂氏への変換', () => {
      const request: ConversionRequest = {
        temperature: { value: 273.15, unit: TemperatureUnit.KELVIN },
        targetUnit: TemperatureUnit.CELSIUS,
        precision: TemperaturePrecisionContext.SCIENTIFIC,
      };

      const result = TemperatureConversionService.convert(request);

      expect(result.converted.value).toBe(0);
      expect(result.converted.unit).toBe(TemperatureUnit.CELSIUS);
    });

    test('同じ単位での変換（変換なし）', () => {
      const request: ConversionRequest = {
        temperature: { value: 25, unit: TemperatureUnit.CELSIUS },
        targetUnit: TemperatureUnit.CELSIUS,
        precision: TemperaturePrecisionContext.CONSUMER,
      };

      const result = TemperatureConversionService.convert(request);

      expect(result.converted.value).toBe(25);
      expect(result.converted.unit).toBe(TemperatureUnit.CELSIUS);
    });
  });

  describe('精度コンテキスト', () => {
    test('消費者用精度（小数点2桁）', () => {
      const request: ConversionRequest = {
        temperature: { value: 25.123456, unit: TemperatureUnit.CELSIUS },
        targetUnit: TemperatureUnit.FAHRENHEIT,
        precision: TemperaturePrecisionContext.CONSUMER,
      };

      const result = TemperatureConversionService.convert(request);

      expect(result.converted.value).toBe(77.22);
    });

    test('工業用精度（小数点4桁）', () => {
      const request: ConversionRequest = {
        temperature: { value: 25.123456, unit: TemperatureUnit.CELSIUS },
        targetUnit: TemperatureUnit.FAHRENHEIT,
        precision: TemperaturePrecisionContext.INDUSTRIAL,
      };

      const result = TemperatureConversionService.convert(request);

      expect(result.converted.value).toBe(77.2222);
    });

    test('医療用精度（小数点3桁）', () => {
      const request: ConversionRequest = {
        temperature: { value: 25.123456, unit: TemperatureUnit.CELSIUS },
        targetUnit: TemperatureUnit.FAHRENHEIT,
        precision: TemperaturePrecisionContext.MEDICAL,
      };

      const result = TemperatureConversionService.convert(request);

      expect(result.converted.value).toBe(77.222);
    });

    test('科学用精度（有効数字15桁）', () => {
      const request: ConversionRequest = {
        temperature: { value: 25.123456789012345, unit: TemperatureUnit.CELSIUS },
        targetUnit: TemperatureUnit.FAHRENHEIT,
        precision: TemperaturePrecisionContext.SCIENTIFIC,
      };

      const result = TemperatureConversionService.convert(request);

      expect(result.converted.value).toBeCloseTo(77.2222222202222, 10);
    });
  });

  describe('バリデーション', () => {
    test('絶対零度以下の温度（摂氏）でエラー', () => {
      const request: ConversionRequest = {
        temperature: { value: -300, unit: TemperatureUnit.CELSIUS },
        targetUnit: TemperatureUnit.FAHRENHEIT,
      };

      expect(() => {
        TemperatureConversionService.convert(request);
      }).toThrow('below absolute zero');
    });

    test('絶対零度以下の温度（ケルビン）でエラー', () => {
      const request: ConversionRequest = {
        temperature: { value: -1, unit: TemperatureUnit.KELVIN },
        targetUnit: TemperatureUnit.CELSIUS,
      };

      expect(() => {
        TemperatureConversionService.convert(request);
      }).toThrow('below absolute zero');
    });

    test('絶対零度以下の温度（華氏）でエラー', () => {
      const request: ConversionRequest = {
        temperature: { value: -500, unit: TemperatureUnit.FAHRENHEIT },
        targetUnit: TemperatureUnit.CELSIUS,
      };

      expect(() => {
        TemperatureConversionService.convert(request);
      }).toThrow('below absolute zero');
    });

    test('無効な数値でエラー', () => {
      const request: ConversionRequest = {
        temperature: { value: NaN, unit: TemperatureUnit.CELSIUS },
        targetUnit: TemperatureUnit.FAHRENHEIT,
      };

      expect(() => {
        TemperatureConversionService.convert(request);
      }).toThrow('valid finite number');
    });

    test('無限大の値でエラー', () => {
      const request: ConversionRequest = {
        temperature: { value: Infinity, unit: TemperatureUnit.CELSIUS },
        targetUnit: TemperatureUnit.FAHRENHEIT,
      };

      expect(() => {
        TemperatureConversionService.convert(request);
      }).toThrow('valid finite number');
    });
  });

  describe('バッチ変換', () => {
    test('複数温度の一括変換', () => {
      const request: BatchConversionRequest = {
        temperatures: [
          { value: 0, unit: TemperatureUnit.CELSIUS },
          { value: 100, unit: TemperatureUnit.CELSIUS },
          { value: 25, unit: TemperatureUnit.CELSIUS },
        ],
        targetUnit: TemperatureUnit.FAHRENHEIT,
        precision: TemperaturePrecisionContext.CONSUMER,
      };

      const result = TemperatureConversionService.batchConvert(request);

      expect(result.conversions).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.conversions[0].converted.value).toBe(32);
      expect(result.conversions[1].converted.value).toBe(212);
      expect(result.conversions[2].converted.value).toBe(77);
    });

    test('パフォーマンス測定', () => {
      const temperatures = Array.from({ length: 100 }, (_, i) => ({
        value: i,
        unit: TemperatureUnit.CELSIUS,
      }));

      const request: BatchConversionRequest = {
        temperatures,
        targetUnit: TemperatureUnit.FAHRENHEIT,
        precision: TemperaturePrecisionContext.CONSUMER,
      };

      const startTime = performance.now();
      const result = TemperatureConversionService.batchConvert(request);
      const endTime = performance.now();

      const processingTime = endTime - startTime;

      expect(result.conversions).toHaveLength(100);
      expect(processingTime).toBeLessThan(10); // 10ms以下
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });
  });

  describe('パフォーマンス要件', () => {
    test('単一変換が1ms以下で完了', () => {
      const request: ConversionRequest = {
        temperature: { value: 25, unit: TemperatureUnit.CELSIUS },
        targetUnit: TemperatureUnit.FAHRENHEIT,
        precision: TemperaturePrecisionContext.SCIENTIFIC,
      };

      const startTime = performance.now();
      TemperatureConversionService.convert(request);
      const endTime = performance.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1);
    });

    test('1000件のバッチ変換が10ms以下で完了', () => {
      const temperatures = Array.from({ length: 1000 }, (_, i) => ({
        value: i * 0.1,
        unit: TemperatureUnit.CELSIUS,
      }));

      const request: BatchConversionRequest = {
        temperatures,
        targetUnit: TemperatureUnit.FAHRENHEIT,
        precision: TemperaturePrecisionContext.CONSUMER,
      };

      const startTime = performance.now();
      const result = TemperatureConversionService.batchConvert(request);
      const endTime = performance.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10);
      expect(result.conversions).toHaveLength(1000);
    });
  });
});