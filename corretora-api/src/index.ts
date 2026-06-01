import app from './app.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  logger.info(`
╔════════════════════════════════════════╗
║     Corretora API Server Running      ║
║                                        ║
║  Environment: ${NODE_ENV.padEnd(24)} ║
║  Port: ${String(PORT).padEnd(30)} ║
║  URL: http://localhost:${PORT}          ║
║                                        ║
║  📚 API Endpoints:                     ║
║  - Health Check: GET /api/health      ║
║  - Auth: POST /api/auth/register      ║
║  - Stocks: GET /api/stocks            ║
║  - Portfolio: GET /api/portfolio      ║
║  - Orders: GET /api/orders            ║
║  - Watchlist: GET /api/watchlist      ║
║                                        ║
╚════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
