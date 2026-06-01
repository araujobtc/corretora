import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { getEstado, avancar } from '../controllers/relogioController.js';

const router = Router();

router.use(authenticateToken);

// GET  /api/relogio          → estado atual (minuto + preços watchlist via API do professor)
// POST /api/relogio/avancar  → avança N minutos e busca preços na API do professor
router.get('/', getEstado);
router.post('/avancar', avancar);

export default router;
