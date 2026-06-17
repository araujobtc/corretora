import { Request, Response } from 'express';
import { WatchlistService } from '../services/watchlistService.js';
import logger from '../utils/logger.js';

// Rota: GET /watchlist
export const getWatchlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }
    const result = await WatchlistService.getWatchlist(req.userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar watchlist:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Ocorreu um erro ao buscar a lista de ações.' });
  }
};

// Rota: POST /watchlist
export const addToWatchlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }

    const stockId = req.body.stockId;
    if (!stockId) {
      res.status(400).json({ error: 'O campo "stockId" é obrigatório.' });
      return;
    }

    const result = WatchlistService.addToWatchlist(req.userId, stockId);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Erro ao adicionar à watchlist:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Ocorreu um erro ao adicionar a ação à lista.' });
  }
};

// Rota: DELETE /watchlist/:stockId
export const removeFromWatchlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }

    const stockId = parseInt(req.params.stockId);
    if (isNaN(stockId)) {
      res.status(400).json({ error: 'ID da ação inválido.' });
      return;
    }

    const result = WatchlistService.removeFromWatchlist(req.userId, stockId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao remover da watchlist:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Ocorreu um erro ao remover a ação da lista.' });
  }
};
