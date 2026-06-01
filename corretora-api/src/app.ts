import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import logger from './utils/logger.js';
import { initializeDatabase } from './config/database.js';
import { seedDatabase } from './seed.js';

// Routes
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import stockRoutes from './routes/acaoRoutes.js';
import portfolioRoutes from './routes/carteiraRoutes.js';
import orderRoutes from './routes/pedidoRoutes.js';
import watchlistRoutes from './routes/listaDesejosRoutes.js';

const app: Express = express();

// Initialize database
initializeDatabase();
seedDatabase();

// Middlewares
app.use(pinoHttp({
  logger,
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url?.split('?')[0],
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
}));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/watchlist', watchlistRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'API da Corretora funcionando 🚀',
  });
});

export default app;
