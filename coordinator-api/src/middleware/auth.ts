import { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../types/index.js';

// Development mode - accept mock auth header
const DEV_MODE = process.env.NODE_ENV !== 'production';

/**
 * Auth middleware - validates GitHub OAuth token
 * 
 * For development: accepts X-Mock-User header with format "githubId:username"
 * For production: validates Bearer token against GitHub API
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip auth for health check
  if (req.path === '/health') {
    next();
    return;
  }

  // Development mode: accept mock header
  if (DEV_MODE) {
    const mockUser = req.headers['x-mock-user'];
    if (mockUser && typeof mockUser === 'string') {
      const [githubId, username] = mockUser.split(':');
      if (githubId && username) {
        req.user = { githubId, username };
        next();
        return;
      }
    }
    
    // In dev mode without mock header, use default test user
    req.user = { githubId: 'dev-user', username: 'developer' };
    next();
    return;
  }

  // Production mode: validate Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Validate token against GitHub API
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      res.status(401).json({ error: 'Invalid GitHub token' });
      return;
    }

    const userData = await response.json() as { id: number; login: string };
    
    const user: AuthUser = {
      githubId: String(userData.id),
      username: userData.login,
    };

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication service error' });
  }
}

