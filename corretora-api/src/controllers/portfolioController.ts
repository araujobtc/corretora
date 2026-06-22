import { Request, Response } from 'express';
import { PortfolioService } from '../services/portfolioService.js';
import logger from '../utils/logger.js';

// Rota: GET /portfolio
export const getPortfolio = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }

    const result = await PortfolioService.getPortfolio(req.userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar carteira:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Ocorreu um erro ao buscar a carteira.'
    });
  }
};

// Rota: GET /portfolio/:stockId
export const getPosition = async (req: Request, res: Response): Promise<void> => {
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

    const result = await PortfolioService.getPosition(req.userId, stockId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar posição:', error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Posição não encontrada na carteira.'
    });
  }
};
