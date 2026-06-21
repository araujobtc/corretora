import { Request, Response } from 'express';
import { OrderService } from '../services/orderService.js';
import logger from '../utils/logger.js';

// Rota: GET /orders
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await OrderService.getOrders(req.userId, limit, offset);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar ordens:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Ocorreu um erro ao buscar as ordens.'
    });
  }
};

// Rota: POST /orders
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }

    const result = await OrderService.createOrder(req.userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Erro ao criar ordem:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Ocorreu um erro ao criar a ordem.'
    });
  }
};

// Rota: GET /orders/history
export const getOrderHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }

    const stockId = req.query.stockId ? parseInt(req.query.stockId as string) : undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await OrderService.getOrderHistory(req.userId, stockId, limit, offset);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar histórico de ordens:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Ocorreu um erro ao buscar o histórico.'
    });
  }
};
