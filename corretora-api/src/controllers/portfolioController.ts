import { Request, Response } from 'express';
import { PortfolioService } from '../services/portfolioService.js';
import logger from '../utils/logger.js';

export const getPortfolio = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = PortfolioService.getPortfolio(req.userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get portfolio error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to get portfolio'
    });
  }
};

export const getPosition = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stockId = parseInt(req.params.stockId);

    if (isNaN(stockId)) {
      res.status(400).json({ error: 'Invalid stock ID' });
      return;
    }

    const result = PortfolioService.getPosition(req.userId, stockId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get position error:', error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Position not found'
    });
  }
};
