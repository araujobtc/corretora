import { Router } from 'express';
import * as carteiraController from '../controllers/carteiraController.js';
import { autenticarToken } from '../middlewares/auth.js';

const router = Router();

router.get('/', autenticarToken, carteiraController.getCarteira);
router.get('/:stockId', autenticarToken, carteiraController.getPosicao);

export default router;
