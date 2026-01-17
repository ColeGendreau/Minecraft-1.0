import { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../types/index.js';

// Get API key from environment
const API_KEY = process.env.API_KEY;
const DEV_MODE = process.env.NODE_ENV !== 'production';

/**
 * API Key authentication middleware
 * 
 * Security levels:
 * 1. If API_KEY is set: requires X-API-Key header OR Bearer token to match
 * 2. If API_KEY is NOT set in dev mode: allows all requests (for local testing)
 * 3. If API_KEY is NOT set in production: blocks all requests (fail secure)
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Always allow health checks (needed for Azure Container Apps probes)
  if (req.path === '/health' || req.path === '/api/health') {
    next();
    return;
  }

  // Check for API key in header
  const apiKeyHeader = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;
  
  // Extract key from either header format
  let providedKey: string | null = null;
  
  if (apiKeyHeader && typeof apiKeyHeader === 'string') {
    providedKey = apiKeyHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7);
  }

  // If API_KEY is configured, validate it
  if (API_KEY) {
    if (providedKey === API_KEY) {
      // Valid API key - set a default user
      req.user = { githubId: 'api-user', username: 'api' };
      next();
      return;
    }
    
    // Invalid or missing key
    console.warn(`[AUTH] Rejected request to ${req.path} - invalid API key`);
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid API key required. Provide via X-API-Key header.',
    });
    return;
  }

  // No API_KEY configured
  if (DEV_MODE) {
    // Development mode without API_KEY - allow all (convenient for local dev)
    console.warn('[AUTH] Running without API_KEY in dev mode - all requests allowed');
    req.user = { githubId: 'dev-user', username: 'developer' };
    next();
    return;
  }

  // Production without API_KEY - fail secure
  console.error('[AUTH] CRITICAL: No API_KEY configured in production!');
  res.status(500).json({ 
    error: 'Server configuration error',
    message: 'API authentication not configured. Contact administrator.',
  });
}

/**
 * Optional auth - doesn't block requests but sets user if authenticated
 * Useful for routes that work differently for authenticated users
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKeyHeader = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;
  
  let providedKey: string | null = null;
  
  if (apiKeyHeader && typeof apiKeyHeader === 'string') {
    providedKey = apiKeyHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7);
  }

  if (API_KEY && providedKey === API_KEY) {
    req.user = { githubId: 'api-user', username: 'api' };
  } else if (DEV_MODE) {
    req.user = { githubId: 'dev-user', username: 'developer' };
  }
  
  // Always continue - auth is optional
  next();
}
