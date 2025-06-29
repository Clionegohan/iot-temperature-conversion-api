import { Router } from 'express';
import { TemperatureController } from '../controllers/temperatureController';

const router = Router();

// 温度変換エンドポイント
router.post('/convert', TemperatureController.convertTemperature);

// バッチ温度変換エンドポイント  
router.post('/convert/batch', TemperatureController.convertTemperatureBatch);

// サポートされている単位情報
router.get('/units', TemperatureController.getSupportedUnits);

export default router;