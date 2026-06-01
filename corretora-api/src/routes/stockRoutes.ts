import { Router } from 'express';
import * as stockController from '../controllers/stockController.js';
import { validateRequest } from '../middlewares/validation.js';
import { createStockSchema, updateStockPriceSchema } from '../schemas/index.js';

const router = Router();

router.get('/', stockController.getStocks);
router.get('/search', stockController.searchStocks);
router.get('/:id', stockController.getStock);
router.get('/symbol/:symbol', stockController.getStockBySymbol);
router.post('/', validateRequest(createStockSchema), stockController.createStock);
router.patch('/:id/price', validateRequest(updateStockPriceSchema), stockController.updateStockPrice);

export default router;
