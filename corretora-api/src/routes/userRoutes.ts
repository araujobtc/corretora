import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { validateRequest } from '../middlewares/validation.js';
import { authenticateToken } from '../middlewares/auth.js';
import { depositSchema, withdrawSchema } from '../schemas/index.js';

const router = Router();

// Dados do usuário autenticado
router.get('/me', authenticateToken, userController.getMe);

// Depósito e retirada manual (Req #6)
router.post('/me/deposit',  authenticateToken, validateRequest(depositSchema),  userController.deposit);
router.post('/me/withdraw', authenticateToken, validateRequest(withdrawSchema), userController.withdraw);

// Extrato (Req #6)
router.get('/me/transactions', authenticateToken, userController.getTransactions);

// Persistência do relógio (Req #2 — horário salvo ao sair e retornar)
router.post('/me/clock', authenticateToken, userController.updateClock);

export default router;
