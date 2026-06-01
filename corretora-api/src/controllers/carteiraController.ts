import { Request, Response } from 'express';
import { CarteiraService } from '../services/carteiraService.js';
import logger from '../utils/logger.js';

export const getCarteira = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const result = CarteiraService.getCarteira(req.userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar carteira:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao buscar carteira'
    });
  }
};

export const getPosicao = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const stockId = parseInt(req.params.stockId);

    if (isNaN(stockId)) {
      res.status(400).json({ error: 'ID de ação inválido' });
      return;
    }

    const result = CarteiraService.getPosicao(req.userId, stockId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar posição:', error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Posição não encontrada'
    });
  }
};
