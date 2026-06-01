import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import logger from '../utils/logger.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = AuthService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Erro de cadastro:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Falha no cadastro' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = AuthService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro de login:', error);
    res.status(401).json({ error: error instanceof Error ? error.message : 'Falha no login' });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = AuthService.changePassword(req.userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao alterar senha:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao alterar senha' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = AuthService.resetPassword(req.body.email);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao redefinir senha:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao redefinir senha' });
  }
};
