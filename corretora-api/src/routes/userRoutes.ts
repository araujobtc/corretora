import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { validarRequest } from '../middlewares/validation.js';
import { autenticarToken } from '../middlewares/auth.js';
import { depositoSchema, retiradaSchema } from '../schemas/index.js';

const router = Router();

router.get('/me', autenticarToken, userController.getMe);
router.post('/me/deposit', autenticarToken, validarRequest(depositoSchema), userController.deposit);
router.post('/me/withdraw', autenticarToken, validarRequest(retiradaSchema), userController.withdraw);
router.get('/me/transactions', autenticarToken, userController.getTransactions);

export default router;
