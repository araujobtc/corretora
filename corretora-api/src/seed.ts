import db from './config/database.js';
import logger from './utils/logger.js';

export function seedDatabase() {
  try {
    const existingStocks = db.prepare('SELECT COUNT(*) as count FROM stocks').get() as any;

    if (existingStocks.count === 0) {
      const stocks = [
        { symbol: 'PETR4', name: 'Petróleo Brasileiro S.A.', price: 27.45 },
        { symbol: 'VALE3', name: 'Vale S.A.', price: 58.50 },
        { symbol: 'BBDC4', name: 'Banco Bradesco S.A.', price: 23.80 },
        { symbol: 'ITUB4', name: 'Itaú Unibanco S.A.', price: 28.65 },
        { symbol: 'WEGE3', name: 'Weg S.A.', price: 26.40 },
        { symbol: 'JBSS3', name: 'JBS S.A.', price: 32.15 },
        { symbol: 'MGLU3', name: 'Magazine Luiza S.A.', price: 7.80 },
        { symbol: 'ABEV3', name: 'Ambev S.A.', price: 13.50 },
        { symbol: 'RENT3', name: 'Localiza Rent a Car', price: 89.90 },
        { symbol: 'B3SA3', name: 'B3 S.A.', price: 10.50 }
      ];

      const insertStmt = db.prepare(`
        INSERT INTO stocks (symbol, name, current_price)
        VALUES (?, ?, ?)
      `);

      stocks.forEach(stock => {
        insertStmt.run(stock.symbol, stock.name, stock.price);
      });

      logger.info(`✓ Seeded ${stocks.length} stocks`);
    } else {
      logger.info(`✓ Database already has stocks`);
    }
  } catch (error) {
    logger.error('Seed error:', error);
    throw error;
  }
}
