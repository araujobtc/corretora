import { Request, Response } from 'express';
import { OrderService } from '../services/orderService.js';
import logger from '../utils/logger.js';

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = OrderService.getOrders(req.userId, limit, offset);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to get orders'
    });
  }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = OrderService.createOrder(req.userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create order'
    });
  }
};

export const getOrderHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stockId = req.query.stockId ? parseInt(req.query.stockId as string) : undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = OrderService.getOrderHistory(req.userId, stockId, limit, offset);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get order history error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to get order history'
    });
  }
};
