import { Router } from 'express';
import * as watchlistController from '../controllers/watchlistController.js';
import { validateRequest } from '../middlewares/validation.js';
import { authenticateToken } from '../middlewares/auth.js';
import { addToWatchlistSchema } from '../schemas/index.js';

const router = Router();

router.get('/', authenticateToken, watchlistController.getWatchlist);
router.post('/', authenticateToken, validateRequest(addToWatchlistSchema), watchlistController.addToWatchlist);
router.delete('/:stockId', authenticateToken, watchlistController.removeFromWatchlist);

export default router;
