import db from './config/database.js';
import logger from './utils/logger.js';

const TICKERS_URL = 'https://raw.githubusercontent.com/marciobarros/dsw-simulador-corretora/refs/heads/main/tickers.json';

export async function seedDatabase() {
  try {
    const existingStocks = db.prepare('SELECT COUNT(*) as count FROM stocks').get() as any;

    if (existingStocks.count === 0) {
      logger.info('Buscando tickers da API do professor...');

      const response = await fetch(TICKERS_URL);
      if (!response.ok) {
        throw new Error(`Falha ao buscar tickers: ${response.status}`);
      }

      const json: unknown = await response.json();
      const tickers = json as { ticker: string; fechamento: number }[];

      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO stocks (symbol, name, current_price, closing_price)
        VALUES (?, ?, ?, ?)
      `);

      const insertMany = db.transaction((items: { ticker: string; fechamento: number }[]) => {
        for (const t of items) {
          insertStmt.run(t.ticker, t.ticker, t.fechamento, t.fechamento);
        }
      });

      insertMany(tickers);
      logger.info(`✓ ${tickers.length} ações carregadas da API do professor`);
    } else {
      logger.info(`✓ Banco já possui ${existingStocks.count} ações`);
    }
  } catch (error) {
    logger.error('Erro no seed:', error);
  }
}