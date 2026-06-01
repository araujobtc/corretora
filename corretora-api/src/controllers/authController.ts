import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import logger from '../utils/logger.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = AuthService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Register error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Registration failed'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = AuthService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Login failed'
    });
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
    logger.error('Change password error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to change password'
    });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = AuthService.resetPassword(req.body.email);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to reset password'
    });
  }
};
