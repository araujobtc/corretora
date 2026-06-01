import db from '../config/database.js';
import logger from '../utils/logger.js';

export class WatchlistService {
  static getWatchlist(userId: number) {
    try {
      const watchlist = db.prepare(`
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

      return watchlist.map(item => ({
        id: item.id,
        stockId: item.stock_id,
        symbol: item.symbol,
        name: item.name,
        currentPrice: parseFloat(item.current_price),
        addedAt: item.created_at
      }));
    } catch (error) {
      logger.error('Erro ao obter lista de cotações:', error);
      throw error;
    }
  }

  static addToWatchlist(userId: number, stockId: number) {
    try {
      // Check if stock exists
      const stock = db.prepare('SELECT id FROM stocks WHERE id = ?').get(stockId);
      if (!stock) {
        throw new Error('Ação não encontrada');
      }

      // Check if already in watchlist
      const existing = db.prepare(
        'SELECT id FROM watchlist WHERE user_id = ? AND stock_id = ?'
      ).get(userId, stockId);

      if (existing) {
        throw new Error('Ação já está na lista de cotações');
      }

      const result = db.prepare(`
        INSERT INTO watchlist (user_id, stock_id)
        VALUES (?, ?)
      `).run(userId, stockId);

      return {
        id: result.lastInsertRowid as number,
        stockId,
        message: 'Ação adicionada à lista de cotações'
      };
    } catch (error) {
      logger.error('Erro ao adicionar à lista de cotações:', error);
      throw error;
    }
  }

  static removeFromWatchlist(userId: number, stockId: number) {
    try {
      const watchlistItem = db.prepare(
        'SELECT id FROM watchlist WHERE user_id = ? AND stock_id = ?'
      ).get(userId, stockId);

      if (!watchlistItem) {
        throw new Error('Ação na está na lista de cotações');
      }

      db.prepare('DELETE FROM watchlist WHERE user_id = ? AND stock_id = ?')
        .run(userId, stockId);

      return { message: 'Ação removida da lista de cotações' };
    } catch (error) {
      logger.error('Erro ao remover da lista de cotações:', error);
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
      logger.error('Erro ao verificar se a lista de cotações possui uma ação:', error);
      return false;
    }
  }
}
