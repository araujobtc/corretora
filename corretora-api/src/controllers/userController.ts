import { Request, Response } from 'express';
import { UserService } from '../services/userService.js';
import logger from '../utils/logger.js';

// Rota: GET /users/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }

    const result = UserService.getMe(req.userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar dados do usuário:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Ocorreu um erro ao buscar os dados do usuário.'
    });
  }
};

// Rota: POST /users/me/deposit
export const deposit = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }

    const result = UserService.deposit(req.userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao realizar depósito:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Ocorreu um erro ao processar o depósito.'
    });
  }
};

// Rota: POST /users/me/withdraw
export const withdraw = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }

    const result = UserService.withdraw(req.userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao realizar retirada:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Ocorreu um erro ao processar a retirada.'
    });
  }
};

// Rota: GET /users/me/transactions
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = UserService.getTransactions(req.userId, limit, offset);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao buscar extrato:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Ocorreu um erro ao buscar o extrato.'
    });
  }
};

// Rota: POST /users/me/clock  — persiste o minuto do relógio no backend
export const updateClock = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Você precisa estar autenticado para acessar este recurso.' });
      return;
    }

    const { minute } = req.body;
    if (typeof minute !== 'number' || minute < 0 || minute > 59) {
      res.status(400).json({ error: 'O campo "minute" deve ser um número entre 0 e 59.' });
      return;
    }

    UserService.updateClock(req.userId, minute);
    res.status(200).json({ sucesso: true, minute });
  } catch (error) {
    logger.error('Erro ao atualizar relógio do usuário:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Ocorreu um erro ao atualizar o relógio.'
    });
  }
};
