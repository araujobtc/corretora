import { dbQuery } from './config/database.js';
import logger from './utils/logger.js';

const TICKERS_URL = 'https://raw.githubusercontent.com/marciobarros/dsw-simulador-corretora/refs/heads/main/tickers.json';

export async function seedDatabase() {
  try {
    const existingResult = await dbQuery('SELECT COUNT(*) as count FROM stocks');
    const count = parseInt(existingResult.rows[0].count, 10);

    if (count === 0) {
      logger.info('Buscando tickers da API do professor...');

      const response = await fetch(TICKERS_URL);
      if (!response.ok) {
        throw new Error(`Falha ao buscar tickers: ${response.status}`);
      }

      const json: unknown = await response.json();
      const tickers = json as { ticker: string; fechamento: number }[];

      for (const t of tickers) {
        await dbQuery(`
          INSERT INTO stocks (symbol, name, current_price, closing_price)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (symbol) DO NOTHING
        `, [t.ticker, t.ticker, t.fechamento, t.fechamento]);
      }

      logger.info(`✓ ${tickers.length} ações carregadas da API do professor`);
    } else {
      logger.info(`✓ Banco já possui ${count} ações`);
    }
  } catch (error) {
    logger.error('Erro no seed:', error);
  }
}
