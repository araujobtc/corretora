import { Router } from 'express';
import * as acaoController from '../controllers/acaoController.js';
import { validarRequest } from '../middlewares/validation.js';
import { criarAcaoSchema, atualizarPrecoAcaoSchema } from '../schemas/index.js';

const router = Router();

router.get('/', acaoController.getAcoes);
router.get('/search', acaoController.buscarAcoes);
router.get('/:id', acaoController.getAcao);
router.get('/symbol/:symbol', acaoController.getAcaoBySimbolo);
router.post('/', validarRequest(criarAcaoSchema), acaoController.criarAcao);
router.patch('/:id/price', validarRequest(atualizarPrecoAcaoSchema), acaoController.atualizarPrecoAcao);

export default router;
