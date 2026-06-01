import { Router } from 'express';
import * as portfolioController from '../controllers/portfolioController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, portfolioController.getPortfolio);
router.get('/:stockId', authenticateToken, portfolioController.getPosition);

export default router;
