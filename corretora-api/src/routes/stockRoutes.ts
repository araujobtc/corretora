import { Router } from 'express';
import * as stockController from '../controllers/stockController.js';

const router = Router();

// Todas as rotas de ações são pontes para a API do professor
// GET /api/stocks                         → lista todos os tickers (tickers.json)
// GET /api/stocks/search?q=PETR          → busca por símbolo
// GET /api/stocks/symbol/:symbol         → detalhe de um ticker
// GET /api/stocks/precos/:minuto         → todos os preços de um minuto (0–59)
// GET /api/stocks/precos/:minuto/:symbol → preço de um ticker em um minuto

router.get('/search', stockController.searchStocks);
router.get('/precos/:minuto/:symbol', stockController.getPriceBySymbolAndMinuto);
router.get('/precos/:minuto', stockController.getPricesByMinuto);
router.get('/symbol/:symbol', stockController.getStockBySymbol);
router.get('/', stockController.getStocks);

export default router;
