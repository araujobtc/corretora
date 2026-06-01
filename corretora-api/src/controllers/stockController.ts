import { Request, Response } from 'express';
import { StockService } from '../services/stockService.js';
import logger from '../utils/logger.js';

export const getStocks = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = StockService.getAll(limit, offset);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar ações:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao buscar ações da API do professor' });
  }
};

export const getStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const stockId = parseInt(req.params.id);

    if (isNaN(stockId)) {
      res.status(400).json({ error: 'Ação não encontrada' });
      return;
    }

    const result = StockService.getById(stockId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao obter ação:', error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Ação não encontrada'
    });
  }
};

export const getStockBySymbol = async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol } = req.params;

    const result = StockService.getBySymbol(symbol);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao obter ação por ticker:', error);
    res.status(404).json({ error: error instanceof Error ? error.message : 'Ação não encontrada' });
  }
};

export const createStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = StockService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Erro ao criar ação:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao criar ação'
    });
  }
};

export const updateStockPrice = async (req: Request, res: Response): Promise<void> => {
  try {
    const stockId = parseInt(req.params.id);

    if (isNaN(stockId)) {
      res.status(400).json({ error: 'Ação não encontrada' });
      return;
    }

    const result = StockService.updatePrice(stockId, req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Falha ao atualizar o preço da ação:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao atualizar o preço da ação'
    });
  }
};

export const searchStocks = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 1) {
      res.status(400).json({ error: 'Paramêtro obrigatório' });
      return;
    }

    const result = StockService.search(query);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar ações:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha na busca de ações' });
  }
};
