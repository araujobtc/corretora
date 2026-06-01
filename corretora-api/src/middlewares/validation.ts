import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import logger from '../utils/logger.js';

export function validarRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validado = schema.parse(req.body);
      req.body = validado;
      next();
    } catch (error) {
      logger.error('Erro de validação:', error);
      res.status(400).json({
        error: 'Validação falhou',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };
}
