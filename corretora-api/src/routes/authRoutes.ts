import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validateRequest } from '../middlewares/validation.js';
import { authenticateToken } from '../middlewares/auth.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
  resetPasswordWithTokenSchema,
} from '../schemas/index.js';

const router = Router();

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), authController.changePassword);

// Passo 1: solicita reset (envia e-mail)
router.post('/forgot-password', validateRequest(resetPasswordSchema), authController.requestPasswordReset);

// Passo 2: confirma reset com token + nova senha
router.post('/reset-password', validateRequest(resetPasswordWithTokenSchema), authController.resetPassword);

export default router;