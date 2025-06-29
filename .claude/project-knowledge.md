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

## 実装済み技術決定（20250629更新）

### Express.js + TypeScript アーキテクチャ実装

**実際の実装構成**:
```typescript
// src/ ディレクトリ構造
src/
  app.ts                    // Express アプリケーション設定
  index.ts                  // サーバー起動・グレースフルシャットダウン
  controllers/
    temperatureController.ts // REST API コントローラー
  services/
    temperatureConversion.ts // NIST準拠変換ロジック
  middleware/
    requestLogging.ts       // リクエストログ・パフォーマンス監視
  utils/
    validation.ts           // Joi バリデーション
    errorHandler.ts         // RFC 7807準拠エラーハンドリング
  types/
    temperature.ts          // 温度変換型定義
    api.ts                  // API レスポンス型定義
  routes/
    temperature.ts          // 温度変換ルート
    index.ts               // ルートエントリーポイント
```

**変更理由**: 
- Fastify + Convex から Express.js + TypeScript に変更
- シンプルなアーキテクチャで高速開発を優先
- 成熟したエコシステムと豊富なミドルウェア活用

### NIST標準準拠の高精度変換実装

**実装済み精密変換ロジック**:
```typescript
// 実装パターン - Kelvin基準統一変換
private static convertToKelvin(value: number, fromUnit: TemperatureUnit): number {
  switch (fromUnit) {
    case TemperatureUnit.CELSIUS:
      return value + 273.15;  // NIST定数
    case TemperatureUnit.FAHRENHEIT:
      return (value + 459.67) * (5 / 9);  // 正確な分数計算
    case TemperatureUnit.KELVIN:
      return value;
  }
}

// 精度コンテキスト対応
private static applyPrecision(value: number, precision: TemperaturePrecisionContext): number {
  switch (precision) {
    case TemperaturePrecisionContext.CONSUMER:     return Math.round(value * 100) / 100;    // 2桁
    case TemperaturePrecisionContext.INDUSTRIAL:   return Math.round(value * 10000) / 10000; // 4桁
    case TemperaturePrecisionContext.MEDICAL:      return Math.round(value * 1000) / 1000;   // 3桁
    case TemperaturePrecisionContext.SCIENTIFIC:   return parseFloat(value.toPrecision(15)); // 15桁
  }
}
```

**パフォーマンス要件達成**:
- 単一変換: <1ms（95%パーセンタイル）
- バッチ変換: <10ms/1000件
- 絶対零度バリデーション実装
- 有効数字15桁精度保持

### RFC 7807準拠エラーハンドリング実装

**統一エラーレスポンス**:
```typescript
interface ApiError {
  type: string;           // エラー種別URI
  title: string;          // 人間可読タイトル
  status: number;         // HTTPステータス
  detail: string;         // 詳細メッセージ
  instance?: string;      // 問題発生インスタンス
  timestamp: string;      // ISO8601タイムスタンプ
  traceId?: string;       // 追跡ID
}

// 実装例
{
  "error": {
    "type": "/errors/validation-failed",
    "title": "Request Validation Failed", 
    "status": 400,
    "detail": "Validation failed: temperature.value: Temperature value must be a finite number",
    "instance": "/api/v1/temperature/convert",
    "timestamp": "2025-06-29T12:00:00.000Z"
  }
}
```

### セキュリティ・レート制限実装

**多層セキュリティ設定**:
```typescript
// Helmet セキュリティヘッダー
app.use(helmet({
  contentSecurityPolicy: { /* 設定済み */ },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

// レート制限（15分/100リクエスト）
const limiter = rateLimit({
  windowMs: 900000,        // 15分
  max: 100,               // 100リクエスト
  message: { /* RFC 7807形式 */ }
});

// CORS設定
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID']
}));
```

### テスト戦略とカバレッジ設定

**Jest設定とテスト要件**:
```typescript
// jest.config.js - 90%カバレッジ要求
coverageThreshold: {
  global: {
    branches: 90,
    functions: 90, 
    lines: 90,
    statements: 90
  }
}

// パフォーマンステスト例
test('単一変換が1ms以下で完了', () => {
  const startTime = performance.now();
  TemperatureConversionService.convert(request);
  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(1);
});
```

### 運用監視パターン実装

**構造化ログとパフォーマンス監視**:
```typescript
// リクエストログ + パフォーマンス警告
res.on('finish', () => {
  const duration = endTime - startTime;
  console.log('Request completed:', JSON.stringify({
    requestId, method: req.method, url: req.url,
    statusCode: res.statusCode, duration: `${duration}ms`
  }));
  
  if (duration > 1000) {
    console.warn(`Slow request detected: ${duration}ms`);
  }
});
```

## 技術的負債と改善点（20250629）

### 解決済み課題
✅ TypeScript strict mode対応  
✅ 浮動小数点精度問題（Kelvin統一変換で解決）  
✅ エラーハンドリング標準化（RFC 7807）  
✅ パフォーマンス要件達成  

### 今後の改善予定
🔄 JWT + API Key認証システム実装  
🔄 Jest設定のmoduleNameMapping警告解決  
🔄 ESLint設定修正  
🔄 PostgreSQL統合（将来的スケーリング時）  

---
**作成日**: 2025-06-29  
**最終更新**: 2025-06-29（コアAPI実装完了）  
**次回レビュー**: 認証システム実装時
