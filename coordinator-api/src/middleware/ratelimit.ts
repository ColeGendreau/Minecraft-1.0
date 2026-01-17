import rateLimit from 'express-rate-limit';
import { getRequestCountSince } from '../db/client.js';
import { Request, Response, NextFunction } from 'express';

// General API rate limiter (100 requests/minute)
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: 60,
  },
});

// World creation rate limiter (5 requests/hour per user)
export const createWorldLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user;
  
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Check how many requests this user has made in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const requestCount = getRequestCountSince(user.githubId, oneHourAgo);

  if (requestCount >= 5) {
    const retryAfter = 3600 - Math.floor((Date.now() - oneHourAgo.getTime()) / 1000);
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Maximum 5 world creation requests per hour',
      retryAfter,
    });
    return;
  }

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', '5');
  res.setHeader('X-RateLimit-Remaining', String(5 - requestCount - 1));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(oneHourAgo.getTime() / 1000) + 3600));

  next();
};

