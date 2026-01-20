import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeDatabase, seedMockDeployment } from './db/client.js';
import { authMiddleware } from './middleware/auth.js';
import { generalLimiter } from './middleware/ratelimit.js';
import healthRouter from './routes/health.js';
import worldsRouter from './routes/worlds.js';
import assetsRouter from './routes/assets.js';
import infrastructureRouter from './routes/infrastructure.js';
import workflowsRouter from './routes/workflows.js';
import minecraftRouter from './routes/minecraft.js';

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
app.use('/api/assets', authMiddleware, assetsRouter);
app.use('/api/infrastructure', authMiddleware, infrastructureRouter);
app.use('/api/workflows', authMiddleware, workflowsRouter);
app.use('/api/minecraft', authMiddleware, minecraftRouter);

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
╔═══════════════════════════════════════════════════════════════╗
║           World Forge Coordinator API Started                 ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:      ${PORT}                                              ║
║  Mode:      ${(process.env.NODE_ENV || 'development').padEnd(12)}                              ║
║  Mock AI:   ${(process.env.MOCK_AI === 'true' ? 'enabled' : 'disabled').padEnd(12)}                              ║
║                                                               ║
║  Asset Endpoints (NEW!):                                      ║
║    GET  /api/assets             - List all assets             ║
║    POST /api/assets             - Create asset from image/AI  ║
║    DELETE /api/assets/:id       - Delete asset from world     ║
║    POST /api/assets/:id/duplicate - Duplicate at new pos      ║
║    POST /api/assets/nuke        - Remove all assets           ║
║                                                               ║
║  World Endpoints:                                             ║
║    GET  /api/worlds/current     - Current deployed world      ║
║    GET  /api/worlds             - List all requests           ║
║    POST /api/worlds             - Create new request          ║
║                                                               ║
║  Infrastructure Endpoints:                                    ║
║    GET  /api/infrastructure/status - Current infra state      ║
║    POST /api/infrastructure/toggle - Deploy/Destroy infra     ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

