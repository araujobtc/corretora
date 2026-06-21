import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import logger from '../utils/logger.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Register error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Falha no cadastro' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await AuthService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({ error: error instanceof Error ? error.message : 'Falha no login' });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'Não autorizado' }); return; }
    const result = await AuthService.changePassword(req.userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao alterar senha' });
  }
};

// Passo 1: usuário informa o e-mail → recebe link no e-mail
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await AuthService.requestPasswordReset(req.body.email);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Request password reset error:', error);
    res.status(500).json({ error: 'Falha ao processar solicitação. Tente novamente.' });
  }
};

// Passo 2: usuário informa o token (do link) + nova senha
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    const result = await AuthService.resetPassword(token, newPassword);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao redefinir senha' });
  }
};