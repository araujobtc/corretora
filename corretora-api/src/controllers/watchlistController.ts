import { Request, Response } from 'express';
import { WatchlistService } from '../services/watchlistService.js';
import logger from '../utils/logger.js';

export const getWatchlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = WatchlistService.getWatchlist(req.userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao obter lista de cotações :', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao obter lista de cotações'
    });
  }
};

export const addToWatchlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stockId = req.body.stockId;

    if (!stockId) {
      res.status(400).json({ error: 'Ação não encontrada' });
      return;
    }

    const result = WatchlistService.addToWatchlist(req.userId, stockId);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Erro ao adicionar à lista de cotações:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao adicionar à lista de cotações'
    });
  }
};

export const removeFromWatchlist = async (req: Request, res: Response): Promise<void> => {
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

    const result = WatchlistService.removeFromWatchlist(req.userId, stockId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao remover da lista de cotações:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao remover da lista de cotações'
    });
  }
};
