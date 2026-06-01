import db from '../config/database.js';
import logger from '../utils/logger.js';

export class ListaDesejosServico {
  static getListaDesejos(userId: number) {
    try {
      const ListaDesejos = db.prepare(`
        SELECT 
          w.id,
          w.stock_id,
          s.symbol,
          s.name,
          s.current_price,
          w.created_at
        FROM watchlist w
        JOIN stocks s ON w.stock_id = s.id
        WHERE w.user_id = ?
        ORDER BY s.symbol
      `).all(userId) as any[];

      return ListaDesejos.map(item => ({
        id: item.id,
        stockId: item.stock_id,
        symbol: item.symbol,
        name: item.name,
        currentPrice: parseFloat(item.current_price),
        addedAt: item.created_at
      }));
    } catch (error) {
      logger.error('Get watchlist error:', error);
      throw error;
    }
  }

  static addListaDesejos(userId: number, stockId: number) {
    try {
      // Check if stock exists
      const stock = db.prepare('SELECT id FROM stocks WHERE id = ?').get(stockId);
      if (!stock) {
        throw new Error('Stock not found');
      }

      // verifcar se já está na watchlist
      const existing = db.prepare(
        'SELECT id FROM watchlist WHERE user_id = ? AND stock_id = ?'
      ).get(userId, stockId);

      if (existing) {
        throw new Error('Stock already in watchlist');
      }

      const result = db.prepare(`
        INSERT INTO watchlist (user_id, stock_id)
        VALUES (?, ?)
      `).run(userId, stockId);

      return {
        id: result.lastInsertRowid as number,
        stockId,
        message: 'Stock added to watchlist'
      };
    } catch (error) {
      logger.error('Add to watchlist error:', error);
      throw error;
    }
  }

  static removeDeListaDesejos(userId: number, stockId: number) {
    try {
      const ListaDesejosItem = db.prepare(
        'SELECT id FROM watchlist WHERE user_id = ? AND stock_id = ?'
      ).get(userId, stockId);

      if (!ListaDesejosItem) {
        throw new Error('Stock not in watchlist');
      }

      db.prepare('DELETE FROM watchlist WHERE user_id = ? AND stock_id = ?')
        .run(userId, stockId);

      return { message: 'Ação removida da lista de desejos' };
    } catch (error) {
      logger.error('Erro ao remover da lista de desejos:', error);
      throw error;
    }
  }

  static isInWatchlist(userId: number, stockId: number): boolean {
    try {
      const item = db.prepare(
        'SELECT id FROM watchlist WHERE user_id = ? AND stock_id = ?'
      ).get(userId, stockId);

      return !!item;
    } catch (error) {
      logger.error('Erro ao verificar se a ação está na lista de desejos:', error);
      return false;
    }
  }
}
