import { Request, Response } from 'express';
import { WatchlistService } from '../services/watchlistService.js';
import logger from '../utils/logger.js';

export const getWatchlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    // BUG #8 CORRIGIDO: getWatchlist agora é async (busca preços da API do professor)
    const result = await WatchlistService.getWatchlist(req.userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get watchlist error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get watchlist' });
  }
};

export const addToWatchlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const stockId = req.body.stockId;
    if (!stockId) { res.status(400).json({ error: 'stockId é obrigatório' }); return; }

    const result = WatchlistService.addToWatchlist(req.userId, stockId);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Add to watchlist error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to add to watchlist' });
  }
};

export const removeFromWatchlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const stockId = parseInt(req.params.stockId);
    if (isNaN(stockId)) { res.status(400).json({ error: 'stockId inválido' }); return; }

    const result = WatchlistService.removeFromWatchlist(req.userId, stockId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Remove from watchlist error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to remove from watchlist' });
  }
};
