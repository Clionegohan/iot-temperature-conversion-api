import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import routes from './routes';
import { requestLogging } from './middleware/requestLogging';
import { errorHandler, notFoundHandler } from './utils/errorHandler';

// 環境変数を読み込み
dotenv.config();

const app = express();

// セキュリティ設定
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS設定
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  credentials: true,
}));

// レート制限
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15分
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100リクエスト/15分
  message: {
    error: {
      type: '/errors/rate-limit-exceeded',
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: 'Too many requests from this IP. Please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// ロギング
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
app.use(requestLogging);

// JSONパーサー（10MB制限）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ルーティング
const apiPrefix = process.env.API_PREFIX || '/api';
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`${apiPrefix}/${apiVersion}`, routes);

// ルートエンドポイント
app.get('/', (_req, res) => {
  res.json({
    name: 'IoT Temperature Conversion API',
    version: '1.0.0',
    description: 'High-precision temperature conversion API for IoT applications',
    endpoints: {
      health: `${apiPrefix}/${apiVersion}/health`,
      convert: `${apiPrefix}/${apiVersion}/temperature/convert`,
      batchConvert: `${apiPrefix}/${apiVersion}/temperature/convert/batch`,
      units: `${apiPrefix}/${apiVersion}/temperature/units`,
    },
    documentation: '/docs',
    timestamp: new Date().toISOString(),
  });
});

// 404ハンドラー
app.use(notFoundHandler);

// エラーハンドラー
app.use(errorHandler);

export default app;