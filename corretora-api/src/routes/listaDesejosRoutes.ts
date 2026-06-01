import { Router } from 'express';
import * as listaDesejosController from '../controllers/listaDesejosController.js';
import { validarRequest } from '../middlewares/validation.js';
import { autenticarToken } from '../middlewares/auth.js';
import { addListaDesejosSchema } from '../schemas/index.js';

const router = Router();

router.get('/', autenticarToken, listaDesejosController.getListaDesejos);
router.post('/', autenticarToken, validarRequest(addListaDesejosSchema), listaDesejosController.addToListaDesejos);
router.delete('/:stockId', autenticarToken, listaDesejosController.removeDeListaDesejos);

export default router;
