import { Router } from 'express';
import { TemperatureController } from '../controllers/temperatureController';
import temperatureRoutes from './temperature';

const router = Router();

// ヘルスチェックエンドポイント
router.get('/health', TemperatureController.getHealthCheck);

// 温度変換API
router.use('/temperature', temperatureRoutes);

export default router;