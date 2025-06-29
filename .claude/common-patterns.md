# IoT Temperature Conversion API - Common Patterns

## 開発コマンドパターン

### プロジェクト初期化

```bash
# プロジェクト作成
mkdir iot-temp-conversion-api
cd iot-temp-conversion-api

# Node.js & TypeScript環境
npm init -y
npm install fastify @fastify/cors @fastify/helmet @fastify/rate-limit
npm install -D typescript @types/node jest @types/jest ts-jest nodemon
npm install convex

# TypeScript設定
npx tsc --init
```

### 開発フロー

```bash
# 開発開始
git checkout main
git pull origin main
git checkout -b feature/temperature-conversion

# Convex開発環境
npx convex dev

# テスト実行
npm test
npm run test:watch
npm run test:coverage

# 品質チェック
npm run lint
npm run type-check

# コミット・プッシュ
git add .
git commit -m "feat: implement basic temperature conversion"
git push origin feature/temperature-conversion
```

### デプロイメント

```bash
# Convex本番デプロイ
npx convex deploy

# 環境変数設定
npx convex env set ENVIRONMENT production
npx convex env set API_VERSION v1

# デプロイ確認
curl https://your-convex-url.convex.cloud/api/health
```

## コード実装パターン

### 1. Fastify アプリケーション構造

```typescript
// src/app.ts
import Fastify from 'fastify';
import { ConvexHttpClient } from 'convex/browser';

const fastify = Fastify({
  logger: process.env.NODE_ENV !== 'test'
});

// プラグイン登録
await fastify.register(import('@fastify/cors'));
await fastify.register(import('@fastify/helmet'));
await fastify.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute'
});

// Convex クライアント初期化
const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

// ルート登録
await fastify.register(temperatureRoutes, { prefix: '/api/v1' });

export default fastify;
```

### 2. 温度変換サービス

```typescript
// src/services/temperature.service.ts
export class TemperatureService {
  // 基本変換メソッド
  static celsiusToFahrenheit(celsius: number): number {
    return (celsius * 9 / 5) + 32;
  }

  static celsiusToKelvin(celsius: number): number {
    return celsius + 273.15;
  }

  static celsiusToRankine(celsius: number): number {
    return (celsius + 273.15) * 9 / 5;
  }

  // 汎用変換メソッド
  static convert(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
    // すべてCelsius経由で変換
    const celsius = this.toCelsius(value, from);
    return this.fromCelsius(celsius, to);
  }

  // 精度制御
  static roundToPrecision(value: number, precision: number = 3): number {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  private static toCelsius(value: number, unit: TemperatureUnit): number {
    switch (unit) {
      case 'celsius': return value;
      case 'fahrenheit': return (value - 32) * 5 / 9;
      case 'kelvin': return value - 273.15;
      case 'rankine': return (value - 491.67) * 5 / 9;
      default: throw new Error(`Unsupported unit: ${unit}`);
    }
  }

  private static fromCelsius(celsius: number, unit: TemperatureUnit): number {
    switch (unit) {
      case 'celsius': return celsius;
      case 'fahrenheit': return this.celsiusToFahrenheit(celsius);
      case 'kelvin': return this.celsiusToKelvin(celsius);
      case 'rankine': return this.celsiusToRankine(celsius);
      default: throw new Error(`Unsupported unit: ${unit}`);
    }
  }
}

// 型定義
export type TemperatureUnit = 'celsius' | 'fahrenheit' | 'kelvin' | 'rankine';

export interface ConversionRequest {
  value: number;
  from: TemperatureUnit;
  to: TemperatureUnit;
}

export interface ConversionResult {
  originalValue: number;
  convertedValue: number;
  from: TemperatureUnit;
  to: TemperatureUnit;
  precision: number;
}
```

### 3. API ルート実装

```typescript
// src/routes/temperature.routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TemperatureService, ConversionRequest } from '../services/temperature.service';

const temperatureRoutes = async (fastify: FastifyInstance) => {
  // 単一変換エンドポイント
  fastify.post<{
    Body: ConversionRequest;
  }>('/convert/single', {
    schema: {
      body: {
        type: 'object',
        required: ['value', 'from', 'to'],
        properties: {
          value: { type: 'number' },
          from: { type: 'string', enum: ['celsius', 'fahrenheit', 'kelvin', 'rankine'] },
          to: { type: 'string', enum: ['celsius', 'fahrenheit', 'kelvin', 'rankine'] }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { value, from, to } = request.body;
      
      // バリデーション
      if (from === to) {
        return reply.code(400).send({
          success: false,
          error: { code: 'SAME_UNIT', message: 'Source and target units cannot be the same' }
        });
      }

      // 変換実行
      const convertedValue = TemperatureService.convert(value, from, to);
      const roundedValue = TemperatureService.roundToPrecision(convertedValue);

      // 使用量記録（Convex）
      await recordApiUsage(request.headers['x-api-key'] as string, 'single_conversion');

      return reply.send({
        success: true,
        data: {
          originalValue: value,
          convertedValue: roundedValue,
          from,
          to,
          precision: 3
        },
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: Date.now()
        }
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: { code: 'CONVERSION_ERROR', message: 'Internal conversion error' }
      });
    }
  });

  // バッチ変換エンドポイント
  fastify.post<{
    Body: { conversions: ConversionRequest[] };
  }>('/convert/batch', {
    schema: {
      body: {
        type: 'object',
        required: ['conversions'],
        properties: {
          conversions: {
            type: 'array',
            maxItems: 100,
            items: {
              type: 'object',
              required: ['value', 'from', 'to'],
              properties: {
                value: { type: 'number' },
                from: { type: 'string', enum: ['celsius', 'fahrenheit', 'kelvin', 'rankine'] },
                to: { type: 'string', enum: ['celsius', 'fahrenheit', 'kelvin', 'rankine'] }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { conversions } = request.body;
      
      // 並列処理で変換実行
      const results = await Promise.all(
        conversions.map(conv => {
          const convertedValue = TemperatureService.convert(conv.value, conv.from, conv.to);
          return {
            originalValue: conv.value,
            convertedValue: TemperatureService.roundToPrecision(convertedValue),
            from: conv.from,
            to: conv.to,
            precision: 3
          };
        })
      );

      // 使用量記録
      await recordApiUsage(request.headers['x-api-key'] as string, 'batch_conversion', conversions.length);

      return reply.send({
        success: true,
        data: { results },
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: Date.now(),
          totalConversions: conversions.length
        }
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: { code: 'BATCH_CONVERSION_ERROR', message: 'Batch conversion failed' }
      });
    }
  });
};

export default temperatureRoutes;
```

### 4. Convex Functions

```typescript
// convex/users.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ユーザー作成
export const createUser = mutation({
  args: {
    email: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"))
  },
  handler: async (ctx, args) => {
    const apiKey = generateApiKey();
    
    const userId = await ctx.db.insert("users", {
      email: args.email,
      apiKey,
      plan: args.plan,
      createdAt: Date.now(),
    });
    
    return { userId, apiKey };
  },
});

// API Key検証
export const validateApiKey = query({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", args.apiKey))
      .first();
    
    return user;
  },
});

function generateApiKey(): string {
  return 'tk_' + crypto.randomUUID().replace(/-/g, '');
}
```

```typescript
// convex/usage.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// API使用量記録
export const recordUsage = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
    count: v.optional(v.number()),
    responseTime: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiUsage", {
      userId: args.userId,
      endpoint: args.endpoint,
      count: args.count || 1,
      responseTime: args.responseTime || 0,
      timestamp: Date.now(),
    });
  },
});

// 使用量統計取得
export const getUsageStats = query({
  args: {
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number()
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("apiUsage")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId)
         .gte("timestamp", args.startDate)
         .lte("timestamp", args.endDate)
      )
      .collect();
    
    return {
      totalRequests: usage.length,
      totalConversions: usage.reduce((sum, u) => sum + (u.count || 1), 0),
      averageResponseTime: usage.reduce((sum, u) => sum + (u.responseTime || 0), 0) / usage.length
    };
  },
});
```

### 5. ミドルウェア実装

```typescript
// src/middleware/auth.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return reply.code(401).send({
      success: false,
      error: { code: 'MISSING_API_KEY', message: 'API key is required' }
    });
  }
  
  try {
    const user = await convex.query('users:validateApiKey', { apiKey });
    
    if (!user) {
      return reply.code(401).send({
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'Invalid API key' }
      });
    }
    
    // ユーザー情報をリクエストに添付
    (request as any).user = user;
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: { code: 'AUTH_ERROR', message: 'Authentication failed' }
    });
  }
}
```

```typescript
// src/middleware/rate-limit.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';

const RATE_LIMITS = {
  free: 100,  // 1時間あたり
  pro: 1000   // 1時間あたり
};

export async function rateLimitMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  
  if (!user) return; // 認証ミドルウェアで処理済み
  
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  // 過去1時間の使用量チェック（Convexで実装）
  const usage = await convex.query('usage:getUsageStats', {
    userId: user._id,
    startDate: oneHourAgo,
    endDate: now
  });
  
  const limit = RATE_LIMITS[user.plan];
  
  if (usage.totalRequests >= limit) {
    return reply.code(429).send({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Limit: ${limit} requests per hour`,
        retryAfter: 3600
      }
    });
  }
}
```

## テスト実装パターン

### 1. 単体テスト

```typescript
// tests/temperature.service.test.ts
import { TemperatureService } from '../src/services/temperature.service';

describe('TemperatureService', () => {
  describe('基本変換テスト', () => {
    test('Celsius to Fahrenheit - 水の凝固点', () => {
      expect(TemperatureService.celsiusToFahrenheit(0)).toBe(32);
    });

    test('Celsius to Fahrenheit - 水の沸点', () => {
      expect(TemperatureService.celsiusToFahrenheit(100)).toBe(212);
    });

    test('Celsius to Kelvin - 絶対零度', () => {
      expect(TemperatureService.celsiusToKelvin(-273.15)).toBe(0);
    });
  });

  describe('精度テスト', () => {
    test('精度制御 - 3桁', () => {
      const result = TemperatureService.roundToPrecision(25.6789, 3);
      expect(result).toBe(25.679);
    });

    test('精度制御 - デフォルト3桁', () => {
      const result = TemperatureService.roundToPrecision(25.6789);
      expect(result).toBe(25.679);
    });
  });

  describe('汎用変換テスト', () => {
    test('Celsius to Fahrenheit', () => {
      expect(TemperatureService.convert(25, 'celsius', 'fahrenheit')).toBe(77);
    });

    test('Fahrenheit to Celsius', () => {
      expect(TemperatureService.convert(77, 'fahrenheit', 'celsius')).toBe(25);
    });
  });

  describe('エラーハンドリング', () => {
    test('不正な単位', () => {
      expect(() => {
        TemperatureService.convert(25, 'invalid' as any, 'celsius');
      }).toThrow('Unsupported unit: invalid');
    });
  });
});
```

### 2. API統合テスト

```typescript
// tests/api.integration.test.ts
import fastify from '../src/app';

describe('Temperature Conversion API', () => {
  let app: any;

  beforeAll(async () => {
    app = fastify;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/convert/single', () => {
    test('正常な変換リクエスト', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/convert/single',
        headers: {
          'x-api-key': 'test-api-key'
        },
        payload: {
          value: 25,
          from: 'celsius',
          to: 'fahrenheit'
        }
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.convertedValue).toBe(77);
    });

    test('API Key なしエラー', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/convert/single',
        payload: {
          value: 25,
          from: 'celsius',
          to: 'fahrenheit'
        }
      });

      expect(response.statusCode).toBe(401);
      const result = response.json();
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('MISSING_API_KEY');
    });

    test('同一単位エラー', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/convert/single',
        headers: {
          'x-api-key': 'test-api-key'
        },
        payload: {
          value: 25,
          from: 'celsius',
          to: 'celsius'
        }
      });

      expect(response.statusCode).toBe(400);
      const result = response.json();
      expect(result.error.code).toBe('SAME_UNIT');
    });
  });
});
```

## 設定ファイルパターン

### 1. TypeScript設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 2. Jest設定

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 3. Package.json スクリプト

```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "type-check": "tsc --noEmit",
    "convex:dev": "npx convex dev",
    "convex:deploy": "npx convex deploy"
  }
}
```

## 定型的な実装テンプレート

### 1. 新しいエンドポイント追加

```typescript
// エンドポイント追加時のチェックリスト
// □ スキーマ定義
// □ バリデーション実装
// □ エラーハンドリング
// □ 認証・レート制限適用
// □ 使用量記録
// □ テスト作成
// □ ドキュメント更新

fastify.post('/new-endpoint', {
  schema: {
    // OpenAPI スキーマ定義
  },
  preHandler: [authMiddleware, rateLimitMiddleware]
}, async (request, reply) => {
  try {
    // 実装
    return reply.send({ success: true, data: result });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: { code: 'ERROR_CODE', message: 'Error message' }
    });
  }
});
```

### 2. 新しいConvex Function追加

```typescript
// 新しいfunction追加時のチェックリスト
// □ 引数型定義
// □ 戻り値型定義
// □ エラーハンドリング
// □ インデックス設計確認
// □ パフォーマンステスト
// □ セキュリティ確認

export const newFunction = mutation({
  args: {
    // 引数定義
  },
  handler: async (ctx, args) => {
    try {
      // 実装
      return result;
    } catch (error) {
      throw new Error('Function failed');
    }
  },
});
```

---
**作成日**: 2025-06-29  
**更新方針**: 新しいパターン発見時に追加  
**使用ガイド**: 実装時にコピー&ペーストして使用
