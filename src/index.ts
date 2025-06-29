import app from './app';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 IoT Temperature Conversion API is running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`🌡️  Convert endpoint: http://localhost:${PORT}/api/v1/temperature/convert`);
  console.log(`📊 Batch convert: http://localhost:${PORT}/api/v1/temperature/convert/batch`);
  console.log(`📖 Units info: http://localhost:${PORT}/api/v1/temperature/units`);
  console.log(`⚡ Performance targets: <1ms single, <10ms batch/1000 items`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

export default server;