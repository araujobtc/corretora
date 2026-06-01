import { Request, Response } from 'express';
import { ListaDesejosServico } from '../services/listaDesejosService.js';
import logger from '../utils/logger.js';

export const getListaDesejos = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = ListaDesejosServico.getListaDesejos(req.userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get watchlist error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to get watchlist'
    });
  }
};

export const addToListaDesejos = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stockId = req.body.stockId;

    if (!stockId) {
      res.status(400).json({ error: 'Stock ID is required' });
      return;
    }

    const result = ListaDesejosServico.addListaDesejos(req.userId, stockId);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Add to watchlist error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to add to watchlist'
    });
  }
};

export const removeDeListaDesejos = async (req: Request, res: Response): Promise<void> => {
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

    const result = ListaDesejosServico.removeFromWatchlist(req.userId, stockId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Remove from watchlist error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to remove from watchlist'
    });
  }
};
