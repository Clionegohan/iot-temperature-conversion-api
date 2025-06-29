import dotenv from 'dotenv';

// テスト環境用の環境変数設定（オプション、エラーは無視）
try {
  dotenv.config({ path: '.env.test', override: false });
} catch (error) {
  // .env.testファイルが存在しない場合は無視
}

// テスト用の環境変数を設定（.env.testより優先）
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // ランダムポート
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.API_KEY_SECRET = 'test-api-key-secret-for-testing-only';
process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1分
process.env.RATE_LIMIT_MAX_REQUESTS = '1000'; // テスト用に高く設定
process.env.LOG_LEVEL = 'error'; // ログレベルを制限

// コンソールログを抑制（必要に応じて）
if (process.env.SUPPRESS_LOGS === 'true') {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}

// テスト環境での警告抑制
process.env.NODE_NO_WARNINGS = '1';