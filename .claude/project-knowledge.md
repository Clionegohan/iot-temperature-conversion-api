# IoT Temperature Conversion API - Project Knowledge

## アーキテクチャ設計知見

### Fastify + Convex アーキテクチャパターン

**推奨構成**:
```typescript
// Fastify側: API Gateway & ビジネスロジック
src/
  routes/
    temperature.ts    // 変換エンドポイント
    auth.ts          // 認証エンドポイント
  services/
    converter.service.ts  // 変換ロジック
  middleware/
    auth.middleware.ts   // 認証ミドルウェア
    rate-limit.middleware.ts

// Convex側: データ永続化 & リアルタイム機能
convex/
  functions/
    users.ts         // ユーザー管理
    usage.ts         // API使用量tracking
    analytics.ts     // 使用統計
```

**理由**: 
- Fastifyで高速API処理
- Convexでデータ管理とリアルタイム監視
- 責務分離によるメンテナンス性向上

### 温度変換ロジック実装パターン

**精密変換クラス設計**:
```typescript
class TemperatureConverter {
  // 基準温度定数
  private static readonly ABSOLUTE_ZERO_C = -273.15;
  private static readonly FREEZING_POINT_F = 32;
  
  // 高精度変換メソッド
  static celsiusToFahrenheit(celsius: number): number {
    return (celsius * 9/5) + 32;
  }
  
  static celsiusToKelvin(celsius: number): number {
    return celsius - this.ABSOLUTE_ZERO_C;
  }
  
  // 精度制御
  static roundToPrecision(value: number, precision: number = 3): number {
    return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
  }
}
```

**重要な実装ポイント**:
- 全変換をCelsius基準で統一（精度誤差最小化）
- 定数値の明確な定義
- 精度制御の一元管理

### Convex データモデル設計

**ユーザー・使用量管理**:
```typescript
// convex/schema.ts
export default defineSchema({
  users: defineTable({
    email: v.string(),
    apiKey: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro")),
    createdAt: v.number(),
  }).index("by_apiKey", ["apiKey"]),
  
  apiUsage: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    timestamp: v.number(),
    responseTime: v.number(),
  }).index("by_user_date", ["userId", "timestamp"]),
});
```

**設計原則**:
- シンプルなスキーマ設計
- 効率的なインデックス設計
- 使用量分析のためのデータ構造

## API設計ベストプラクティス

### RESTful エンドポイント設計

**推奨URL構造**:
```
POST /api/v1/convert/single
POST /api/v1/convert/batch
GET  /api/v1/usage/stats
GET  /api/v1/health
```

**レスポンス形式統一**:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: number;
    processingTime: number;
  };
}
```

### エラーハンドリングパターン

**階層的エラー処理**:
```typescript
// カスタムエラークラス
class TemperatureValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'TemperatureValidationError';
  }
}

// Fastifyエラーハンドラー
fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof TemperatureValidationError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'INVALID_TEMPERATURE',
        message: error.message,
        field: error.field
      }
    });
  }
  // その他のエラー処理...
});
```

## セキュリティ実装パターン

### API Key認証システム

**安全なAPI Key管理**:
```typescript
// API Key生成
function generateApiKey(): string {
  return 'tk_' + crypto.randomBytes(32).toString('hex');
}

// レート制限ミドルウェア
async function rateLimitMiddleware(request: FastifyRequest) {
  const apiKey = request.headers['x-api-key'];
  const usage = await getUsageCount(apiKey, Date.now());
  
  if (usage > RATE_LIMITS[userPlan]) {
    throw new Error('Rate limit exceeded');
  }
}
```

**セキュリティチェックリスト**:
- [ ] API Keyのprefix付与（`tk_`）
- [ ] レート制限実装
- [ ] 入力値バリデーション
- [ ] SQLインジェクション対策（Convexで自動対応）

## テスト戦略

### 単体テスト構造

**変換ロジックテスト**:
```typescript
describe('TemperatureConverter', () => {
  describe('celsiusToFahrenheit', () => {
    test('freezing point conversion', () => {
      expect(TemperatureConverter.celsiusToFahrenheit(0)).toBe(32);
    });
    
    test('precision handling', () => {
      const result = TemperatureConverter.celsiusToFahrenheit(25.567);
      expect(result).toBeCloseTo(78.021, 3);
    });
  });
});
```

**APIエンドポイントテスト**:
```typescript
describe('POST /api/v1/convert/single', () => {
  test('valid conversion request', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/v1/convert/single',
      headers: { 'x-api-key': 'valid-key' },
      payload: { value: 25, from: 'celsius', to: 'fahrenheit' }
    });
    
    expect(response.statusCode).toBe(200);
    expect(response.json().data.result).toBe(77);
  });
});
```

### テストデータ管理

**モックデータパターン**:
```typescript
// テスト用の固定データ
export const TEST_CONVERSIONS = [
  { celsius: 0, fahrenheit: 32, kelvin: 273.15 },
  { celsius: 25, fahrenheit: 77, kelvin: 298.15 },
  { celsius: -40, fahrenheit: -40, kelvin: 233.15 }
];
```

## パフォーマンス最適化

### レスポンス時間最適化

**キャッシング戦略**:
```typescript
// メモリキャッシュ（よく使われる変換）
const conversionCache = new Map<string, number>();

function getCachedConversion(value: number, from: string, to: string): number | null {
  const key = `${value}_${from}_${to}`;
  return conversionCache.get(key) || null;
}
```

**バッチ処理最適化**:
```typescript
async function batchConvert(conversions: ConversionRequest[]): Promise<ConversionResult[]> {
  // 並列処理で複数変換を同時実行
  return Promise.all(
    conversions.map(conv => 
      TemperatureConverter.convert(conv.value, conv.from, conv.to)
    )
  );
}
```

## 避けるべきアンチパターン

### ❌ 精度計算のアンチパターン

```typescript
// 悪い例: 浮動小数点エラーの蓄積
function celsiusToFahrenheit(celsius: number): number {
  return celsius * 1.8 + 32; // 1.8は近似値、誤差蓄積
}

// 良い例: 正確な分数計算
function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9 / 5) + 32; // 正確な分数
}
```

### ❌ 過剰な抽象化

```typescript
// 悪い例: 不要な抽象レイヤー
abstract class BaseConverter {
  abstract convert(value: number): number;
}

// 良い例: シンプルな静的メソッド
class TemperatureConverter {
  static convert(value: number, from: Unit, to: Unit): number {
    // 直接実装
  }
}
```

### ❌ 同期的エラー処理

```typescript
// 悪い例: try-catchの乱用
try {
  const result = convert(value, from, to);
  return result;
} catch (e) {
  throw new Error('Conversion failed');
}

// 良い例: Result型パターン
type ConversionResult = 
  | { success: true; value: number }
  | { success: false; error: string };
```

## デプロイ・運用知見

### Convex デプロイメント

**環境設定**:
```bash
# 開発環境
npx convex dev

# 本番デプロイ
npx convex deploy
```

**環境変数管理**:
```typescript
// convex.config.ts
export default defineConfig({
  functions: "convex/",
});
```

### 監視・アラート設定

**重要メトリクス**:
- API レスポンス時間 (p95 < 10ms)
- エラー率 (< 1%)
- API使用量トレンド
- Convex function実行時間

---
**作成日**: 2025-06-29  
**最終更新**: 2025-06-29  
**次回レビュー**: 実装開始時
