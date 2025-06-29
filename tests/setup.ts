import dotenv from 'dotenv';

// テスト環境用の環境変数設定
dotenv.config({ path: '.env.test' });

// テスト用の環境変数を設定
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // ランダムポート
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.API_KEY_SECRET = 'test-api-key-secret';
process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1分
process.env.RATE_LIMIT_MAX_REQUESTS = '1000'; // テスト用に高く設定

// コンソールログを抑制（必要に応じて）
if (process.env.SUPPRESS_LOGS === 'true') {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}