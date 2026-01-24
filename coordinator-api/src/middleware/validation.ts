import { Request, Response, NextFunction } from 'express';
import type { CreateWorldRequest, Difficulty, GameMode, WorldSize } from '../types/index.js';

const VALID_DIFFICULTIES: Difficulty[] = ['peaceful', 'easy', 'normal', 'hard'];
const VALID_GAME_MODES: GameMode[] = ['survival', 'creative', 'adventure', 'spectator'];
const VALID_SIZES: WorldSize[] = ['small', 'medium', 'large'];

interface ValidationError {
  field: string;
  message: string;
}

export function validateCreateWorldRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body = req.body as Partial<CreateWorldRequest>;
  const errors: ValidationError[] = [];

  // Description is required
  if (!body.description) {
    errors.push({ field: 'description', message: 'Description is required' });
  } else if (typeof body.description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  } else if (body.description.length < 10) {
    errors.push({ field: 'description', message: 'Description must be at least 10 characters' });
  } else if (body.description.length > 2000) {
    errors.push({ field: 'description', message: 'Description must be at most 2000 characters' });
  }

  // Difficulty is optional but must be valid if provided
  if (body.difficulty !== undefined) {
    if (!VALID_DIFFICULTIES.includes(body.difficulty)) {
      errors.push({
        field: 'difficulty',
        message: `Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
      });
    }
  }

  // GameMode is optional but must be valid if provided
  if (body.gameMode !== undefined) {
    if (!VALID_GAME_MODES.includes(body.gameMode)) {
      errors.push({
        field: 'gameMode',
        message: `Game mode must be one of: ${VALID_GAME_MODES.join(', ')}`,
      });
    }
  }

  // Size is optional but must be valid if provided
  if (body.size !== undefined) {
    if (!VALID_SIZES.includes(body.size)) {
      errors.push({
        field: 'size',
        message: `Size must be one of: ${VALID_SIZES.join(', ')}`,
      });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'Invalid request',
      details: errors.reduce((acc, err) => {
        acc[err.field] = err.message;
        return acc;
      }, {} as Record<string, string>),
    });
    return;
  }

  next();
}

export function validateRequestId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { id } = req.params;
  
  if (!id || !id.startsWith('req_')) {
    res.status(400).json({
      error: 'Invalid request ID',
      details: 'Request ID must be in format: req_xxxxxxxx',
    });
    return;
  }

  next();
}




