import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validateRequest } from '../middlewares/validation.js';
import { authenticateToken } from '../middlewares/auth.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema
} from '../schemas/index.js';

const router = Router();

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), authController.changePassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), authController.resetPassword);

export default router;
