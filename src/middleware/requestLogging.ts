import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestLogging(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  const startTime = Date.now();
  
  // リクエストIDをヘッダーに設定
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // レスポンス完了時のログ出力
  res.on('finish', () => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const logData = {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Request completed:', JSON.stringify(logData));
    
    // パフォーマンス警告
    if (duration > 1000) {
      console.warn(`Slow request detected: ${duration}ms for ${req.method} ${req.url}`);
    }
  });
  
  next();
}