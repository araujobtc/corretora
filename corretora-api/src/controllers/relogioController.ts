import { Request, Response } from 'express';
import { RelogioServico } from '../services/relogioService.js';
import logger from '../utils/logger.js';

/** GET /api/relogio → estado atual do relógio + preços da watchlist via API do professor */
export const getEstado = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const result = await RelogioServico.getEstado(req.userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get estado relógio error:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao consultar API do professor' });
  }
};

/** POST /api/relogio/avancar → avança o relógio e busca preços na API do professor */
export const avancar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const minutos = parseInt(req.body.minutos);
    if (isNaN(minutos) || minutos < 1) {
      res.status(400).json({ error: '"minutos" deve ser um inteiro positivo' });
      return;
    }

    const result = await RelogioServico.avancar(req.userId, minutos);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Avancar relógio error:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao consultar API do professor' });
  }
};
