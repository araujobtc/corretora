import { Request, Response } from 'express';
import { ServicoAuth } from '../services/authService.js';
import logger from '../utils/logger.js';

export const registrar = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = ServicoAuth.registrar(req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Erro ao registrar', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Erro ao registrar'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = ServicoAuth.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao logar', error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Erro ao logar'
    });
  }
};

export const alterarSenha = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const result = ServicoAuth.alterarSenha(req.userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao alterar senha', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Erro ao alterar senha'
    });
  }
};

export const resetarSenha = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = ServicoAuth.resetSenha(req.body.email);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao redefinir senha', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Erro ao redefinir senha'
    });
  }
};
