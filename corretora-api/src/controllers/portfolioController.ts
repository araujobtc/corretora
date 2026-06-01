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
    logger.error('Erro ao obter carteira:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao obter cateira'
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
      res.status(400).json({ error: 'Ação não encontrada' });
      return;
    }

    const result = PortfolioService.getPosition(req.userId, stockId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao obter posição da ação:', error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Posição não encontrada'
    });
  }
};
