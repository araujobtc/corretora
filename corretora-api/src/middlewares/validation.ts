import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import logger from '../utils/logger.js';

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      logger.error('Validation error:', error);
      res.status(400).json({
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
