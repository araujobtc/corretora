import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validarRequest } from '../middlewares/validation.js';
import { autenticarToken } from '../middlewares/auth.js';
import {
  registroSchema,
  loginSchema,
  alterarSenhaSchema,
  resetarSenhaSchema
} from '../schemas/index.js';

const router = Router();

router.post('/register', validarRequest(registroSchema), authController.registrar);
router.post('/login', validarRequest(loginSchema), authController.login);
router.post('/change-password', autenticarToken, validarRequest(alterarSenhaSchema), authController.alterarSenha);
router.post('/reset-password', validarRequest(resetarSenhaSchema), authController.resetarSenha);

export default router;
