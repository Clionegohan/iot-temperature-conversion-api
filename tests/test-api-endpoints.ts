import request from 'supertest';
import app from '../src/app';

describe('Temperature Conversion API', () => {
  describe('GET /api/v1/health', () => {
    test('ヘルスチェックが正常に動作', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.services.temperatureConversion).toBe('operational');
      expect(response.body.meta.version).toBe('v1');
    });
  });

  describe('GET /api/v1/temperature/units', () => {
    test('サポートされている単位情報を取得', async () => {
      const response = await request(app)
        .get('/api/v1/temperature/units')
        .expect(200);

      expect(response.body.data.temperatureUnits).toContain('celsius');
      expect(response.body.data.temperatureUnits).toContain('fahrenheit');
      expect(response.body.data.temperatureUnits).toContain('kelvin');
      expect(response.body.data.precisionContexts).toContain('consumer');
      expect(response.body.data.precisionContexts).toContain('scientific');
    });
  });

  describe('POST /api/v1/temperature/convert', () => {
    test('摂氏から華氏への変換', async () => {
      const requestBody = {
        temperature: { value: 0, unit: 'celsius' },
        targetUnit: 'fahrenheit',
        precision: 'consumer',
      };

      const response = await request(app)
        .post('/api/v1/temperature/convert')
        .send(requestBody)
        .expect(200);

      expect(response.body.data.converted.value).toBe(32);
      expect(response.body.data.converted.unit).toBe('fahrenheit');
      expect(response.body.data.precision).toBe('consumer');
    });

    test('華氏から摂氏への変換', async () => {
      const requestBody = {
        temperature: { value: 212, unit: 'fahrenheit' },
        targetUnit: 'celsius',
        precision: 'consumer',
      };

      const response = await request(app)
        .post('/api/v1/temperature/convert')
        .send(requestBody)
        .expect(200);

      expect(response.body.data.converted.value).toBe(100);
      expect(response.body.data.converted.unit).toBe('celsius');
    });

    test('ケルビンから摂氏への変換', async () => {
      const requestBody = {
        temperature: { value: 273.15, unit: 'kelvin' },
        targetUnit: 'celsius',
        precision: 'scientific',
      };

      const response = await request(app)
        .post('/api/v1/temperature/convert')
        .send(requestBody)
        .expect(200);

      expect(response.body.data.converted.value).toBe(0);
      expect(response.body.data.converted.unit).toBe('celsius');
    });

    test('無効なリクエストでバリデーションエラー', async () => {
      const requestBody = {
        temperature: { value: 'invalid', unit: 'celsius' },
        targetUnit: 'fahrenheit',
      };

      const response = await request(app)
        .post('/api/v1/temperature/convert')
        .send(requestBody)
        .expect(400);

      expect(response.body.error.type).toBe('/errors/validation-failed');
      expect(response.body.error.title).toBe('Request Validation Failed');
    });

    test('無効な温度単位でバリデーションエラー', async () => {
      const requestBody = {
        temperature: { value: 25, unit: 'invalid_unit' },
        targetUnit: 'fahrenheit',
      };

      const response = await request(app)
        .post('/api/v1/temperature/convert')
        .send(requestBody)
        .expect(400);

      expect(response.body.error.type).toBe('/errors/validation-failed');
    });

    test('絶対零度以下の温度で変換エラー', async () => {
      const requestBody = {
        temperature: { value: -300, unit: 'celsius' },
        targetUnit: 'fahrenheit',
      };

      const response = await request(app)
        .post('/api/v1/temperature/convert')
        .send(requestBody)
        .expect(422);

      expect(response.body.error.type).toBe('/errors/conversion-failed');
      expect(response.body.error.detail).toContain('absolute zero');
    });

    test('リクエストIDがレスポンスヘッダーに含まれる', async () => {
      const requestBody = {
        temperature: { value: 25, unit: 'celsius' },
        targetUnit: 'fahrenheit',
      };

      const response = await request(app)
        .post('/api/v1/temperature/convert')
        .set('X-Request-ID', 'test-request-123')
        .send(requestBody)
        .expect(200);

      expect(response.headers['x-request-id']).toBe('test-request-123');
      expect(response.body.meta.requestId).toBe('test-request-123');
    });
  });

  describe('POST /api/v1/temperature/convert/batch', () => {
    test('複数温度の一括変換', async () => {
      const requestBody = {
        temperatures: [
          { value: 0, unit: 'celsius' },
          { value: 100, unit: 'celsius' },
          { value: 25, unit: 'celsius' },
        ],
        targetUnit: 'fahrenheit',
        precision: 'consumer',
      };

      const response = await request(app)
        .post('/api/v1/temperature/convert/batch')
        .send(requestBody)
        .expect(200);

      expect(response.body.data.conversions).toHaveLength(3);
      expect(response.body.data.totalCount).toBe(3);
      expect(response.body.data.conversions[0].converted.value).toBe(32);
      expect(response.body.data.conversions[1].converted.value).toBe(212);
      expect(response.body.data.conversions[2].converted.value).toBe(77);
    });

    test('空の配列でバリデーションエラー', async () => {
      const requestBody = {
        temperatures: [],
        targetUnit: 'fahrenheit',
      };

      const response = await request(app)
        .post('/api/v1/temperature/convert/batch')
        .send(requestBody)
        .expect(400);

      expect(response.body.error.type).toBe('/errors/validation-failed');
    });

    test('1000件を超える配列でバリデーションエラー', async () => {
      const temperatures = Array.from({ length: 1001 }, (_, i) => ({
        value: i,
        unit: 'celsius',
      }));

      const requestBody = {
        temperatures,
        targetUnit: 'fahrenheit',
      };

      const response = await request(app)
        .post('/api/v1/temperature/convert/batch')
        .send(requestBody)
        .expect(400);

      expect(response.body.error.type).toBe('/errors/validation-failed');
    });

    test('パフォーマンス測定（処理時間が記録される）', async () => {
      const temperatures = Array.from({ length: 100 }, (_, i) => ({
        value: i,
        unit: 'celsius',
      }));

      const requestBody = {
        temperatures,
        targetUnit: 'fahrenheit',
        precision: 'consumer',
      };

      const response = await request(app)
        .post('/api/v1/temperature/convert/batch')
        .send(requestBody)
        .expect(200);

      expect(response.body.data.processingTimeMs).toBeGreaterThan(0);
      expect(response.body.data.conversions).toHaveLength(100);
    });
  });

  describe('レート制限', () => {
    test('レート制限内では正常にリクエスト処理', async () => {
      const requestBody = {
        temperature: { value: 25, unit: 'celsius' },
        targetUnit: 'fahrenheit',
      };

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/temperature/convert')
          .send(requestBody)
          .expect(200);
      }
    });
  });

  describe('エラーハンドリング', () => {
    test('存在しないエンドポイントで404エラー', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.error.type).toBe('/errors/not-found');
      expect(response.body.error.title).toBe('Resource Not Found');
    });

    test('無効なJSONで400エラー', async () => {
      const response = await request(app)
        .post('/api/v1/temperature/convert')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });

  describe('セキュリティヘッダー', () => {
    test('セキュリティヘッダーが設定されている', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
    });
  });
});