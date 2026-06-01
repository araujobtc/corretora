import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { validateRequest } from '../middlewares/validation.js';
import { authenticateToken } from '../middlewares/auth.js';
import { depositSchema, withdrawSchema } from '../schemas/index.js';

const router = Router();

router.get('/me', authenticateToken, userController.getMe);
router.post('/me/deposit', authenticateToken, validateRequest(depositSchema), userController.deposit);
router.post('/me/withdraw', authenticateToken, validateRequest(withdrawSchema), userController.withdraw);
router.get('/me/transactions', authenticateToken, userController.getTransactions);

export default router;
