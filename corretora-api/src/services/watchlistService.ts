import db from '../config/database.js';
import { StockService } from './stockService.js';
import logger from '../utils/logger.js';

export class WatchlistService {
  /**
   * BUG #8 CORRIGIDO: preços vêm da API do professor (via minuto atual do usuário),
   * não do campo current_price do banco (que nunca é atualizado — design intencional).
   */
  static async getWatchlist(userId: number) {
    try {
      const user = db.prepare('SELECT clock_minute FROM users WHERE id = ?').get(userId) as any;
      const minuto: number = user?.clock_minute ?? 0;

      const rows = db.prepare(`
        SELECT w.id, w.stock_id, s.symbol, s.closing_price, w.created_at
        FROM watchlist w
        JOIN stocks s ON w.stock_id = s.id
        WHERE w.user_id = ?
        ORDER BY s.symbol
      `).all(userId) as any[];

      // Busca preços atualizados da API do professor
      let precoMap: Record<string, number> = {};
      try {
        const precos = await StockService.getPricesByMinuto(minuto);
        for (const p of precos) precoMap[p.ticker] = p.preco;
      } catch (err) {
        logger.warn('Não foi possível buscar preços da API do professor:', err);
      }

      return rows.map(item => {
        const fechamento = parseFloat(item.closing_price);
        const preco = precoMap[item.symbol] ?? fechamento;
        const variacaoNominal = parseFloat((preco - fechamento).toFixed(2));
        const variacaoPercent = fechamento > 0
          ? parseFloat(((variacaoNominal / fechamento) * 100).toFixed(2))
          : 0;

        return {
          id: item.id,
          stockId: item.stock_id,
          symbol: item.symbol,
          name: item.symbol,
          currentPrice: preco,
          closingPrice: fechamento,
          variacaoNominal,
          variacaoPercent,
          addedAt: item.created_at
        };
      });
    } catch (error) {
      logger.error('Get watchlist error:', error);
      throw error;
    }
  }

  static addToWatchlist(userId: number, stockId: number) {
    try {
      const stock = db.prepare('SELECT id FROM stocks WHERE id = ?').get(stockId);
      if (!stock) throw new Error('Ação não encontrada');

      const existing = db.prepare(
        'SELECT id FROM watchlist WHERE user_id = ? AND stock_id = ?'
      ).get(userId, stockId);

      if (existing) throw new Error('Ação já está na watchlist');

      const result = db.prepare(`
        INSERT INTO watchlist (user_id, stock_id) VALUES (?, ?)
      `).run(userId, stockId);

      return {
        id: result.lastInsertRowid as number,
        stockId,
        message: 'Ação adicionada à watchlist'
      };
    } catch (error) {
      logger.error('Add to watchlist error:', error);
      throw error;
    }
  }

  static removeFromWatchlist(userId: number, stockId: number) {
    try {
      const item = db.prepare(
        'SELECT id FROM watchlist WHERE user_id = ? AND stock_id = ?'
      ).get(userId, stockId);

      if (!item) throw new Error('Ação não está na watchlist');

      db.prepare('DELETE FROM watchlist WHERE user_id = ? AND stock_id = ?')
        .run(userId, stockId);

      return { message: 'Ação removida da watchlist' };
    } catch (error) {
      logger.error('Remove from watchlist error:', error);
      throw error;
    }
  }

  static isInWatchlist(userId: number, stockId: number): boolean {
    try {
      return !!db.prepare(
        'SELECT id FROM watchlist WHERE user_id = ? AND stock_id = ?'
      ).get(userId, stockId);
    } catch { return false; }
  }
}
