import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeDatabase, seedMockDeployment } from './db/client.js';
import { authMiddleware } from './middleware/auth.js';
import { generalLimiter } from './middleware/ratelimit.js';
import healthRouter from './routes/health.js';
import worldsRouter from './routes/worlds.js';
import infrastructureRouter from './routes/infrastructure.js';
import workflowsRouter from './routes/workflows.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(generalLimiter);

// Health check (no auth required)
app.use('/health', healthRouter);

// API routes (auth required)
app.use('/api/worlds', authMiddleware, worldsRouter);
app.use('/api/infrastructure', authMiddleware, infrastructureRouter);
app.use('/api/workflows', authMiddleware, workflowsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize database and start server
function start() {
  try {
    console.log('Initializing database...');
    initializeDatabase();
    
    // Seed mock data for development
    if (process.env.MOCK_AI === 'true') {
      seedMockDeployment();
    }

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║          Coordinator API Server Started                ║
╠════════════════════════════════════════════════════════╣
║  Port:      ${PORT}                                       ║
║  Mode:      ${process.env.NODE_ENV || 'development'}                               ║
║  Mock AI:   ${process.env.MOCK_AI === 'true' ? 'enabled' : 'disabled'}                                  ║
║                                                        ║
║  Endpoints:                                            ║
║    GET  /health              - Health check            ║
║    GET  /api/worlds/current  - Current deployed world  ║
║    GET  /api/worlds          - List all requests       ║
║    POST /api/worlds          - Create new request      ║
║    GET  /api/worlds/:id      - Get request details     ║
║    POST /api/worlds/:id/retry - Retry failed request   ║
╚════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

