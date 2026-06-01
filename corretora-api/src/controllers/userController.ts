import { Request, Response } from 'express';
import { UserService } from '../services/userServico.js';
import logger from '../utils/logger.js';

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = UserService.getMe(req.userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to get user'
    });
  }
};

export const deposit = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = UserService.deposit(req.userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Deposit error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Deposit failed'
    });
  }
};

export const withdraw = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = UserService.withdraw(req.userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Withdraw error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Withdrawal failed'
    });
  }
};

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = UserService.getTransactions(req.userId, limit, offset);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to get transactions'
    });
  }
};
