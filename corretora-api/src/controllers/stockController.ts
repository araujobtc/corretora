import { Request, Response } from 'express';
import { StockService } from '../services/stockService.js';
import logger from '../utils/logger.js';

export const getStocks = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await StockService.getAll(limit, offset);
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
    const result = await StockService.getBySymbol(req.params.symbol);
    res.status(200).json(result);
  } catch (error) {

    logger.error('Erro ao obter ação por ticker:', error);

    res.status(404).json({ error: error instanceof Error ? error.message : 'Ação não encontrada' });
  }
};

export const searchStocks = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 1) {
      res.status(400).json({ error: 'Query parameter "q" é obrigatório' });
      return;
    }
    const result = await StockService.search(query);
    res.status(200).json(result);
  } catch (error) {

    logger.error('Erro ao criar ação:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao criar ação'
    });
  }
};

export const getPricesByMinuto = async (req: Request, res: Response): Promise<void> => {
  try {

    const stockId = parseInt(req.params.id);

    if (isNaN(stockId)) {
      res.status(400).json({ error: 'Ação não encontrada' });
    const minuto = parseInt(req.params.minuto);
    if (isNaN(minuto) || minuto < 0 || minuto > 59) {
      res.status(400).json({ error: 'Minuto deve ser um número entre 0 e 59' });

      return;
    }
    const result = await StockService.getPricesByMinuto(minuto);
    res.status(200).json(result);
  } catch (error) {

    logger.error('Falha ao atualizar o preço da ação:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao atualizar o preço da ação'
    });

    logger.error('Erro ao obter preços por minuto:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao buscar preços' });

  }
};

export const getPriceBySymbolAndMinuto = async (req: Request, res: Response): Promise<void> => {
  try {

    const query = req.query.q as string;

    if (!query || query.length < 1) {
      res.status(400).json({ error: 'Paramêtro obrigatório' });
    const { symbol } = req.params;
    const minuto = parseInt(req.params.minuto);
    if (isNaN(minuto) || minuto < 0 || minuto > 59) {
      res.status(400).json({ error: 'Minuto deve ser um número entre 0 e 59' });

      return;
    }
    const result = await StockService.getPriceBySymbolAndMinuto(symbol, minuto);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar ações:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha na busca de ações' });

    logger.error('Get price by symbol/minuto error:', error);
    res.status(404).json({ error: error instanceof Error ? error.message : 'Preço não encontrado' });
  }
};
