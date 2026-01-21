import { Router } from 'express';

const router = Router();

/**
 * GET /health
 * Health check endpoint - no authentication required
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;


