import { Request, Response } from 'express';
import { ServicoAcao } from '../services/acaoServico.js';
import logger from '../utils/logger.js';

export const getAcoes = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = ServicoAcao.getAll(limit, offset);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao obter ações', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Erro ao obter ações'
    });
  }
};

export const getAcao = async (req: Request, res: Response): Promise<void> => {
  try {
    const stockId = parseInt(req.params.id);

    if (isNaN(stockId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const result = ServicoAcao.getById(stockId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar ação:', error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Ação não encontrada'
    });
  }
};

export const getAcaoBySimbolo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol } = req.params;

    const result = ServicoAcao.getBySymbol(symbol);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar ação por símbolo:', error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Ação não encontrada'
    });
  }
};

export const criarAcao = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = ServicoAcao.criar(req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Falha ao criar ação', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao criar ação'
    });
  }
};

export const atualizarPrecoAcao = async (req: Request, res: Response): Promise<void> => {
  try {
    const stockId = parseInt(req.params.id);

    if (isNaN(stockId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const result = ServicoAcao.updatePrice(stockId, req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao atualizar valor da ação:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Erro ao atualizar valor da ação'
    });
  }
};

export const buscarAcoes = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 1) {
      res.status(400).json({ error: 'Parâmetro de busca requerido' });
      return;
    }

    const result = ServicoAcao.buscar(query);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao pesquisar ações:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Pesquisa falhou'
    });
  }
};
