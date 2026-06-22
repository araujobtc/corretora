import { dbQuery } from '../config/database.js';
import { StockService } from './stockService.js';
import logger from '../utils/logger.js';

export class WatchlistService {
  /**
   * BUG #8 CORRIGIDO: preços vêm da API do professor (via minuto atual do usuário),
   * não do campo current_price do banco (que nunca é atualizado — design intencional).
   */
  static async getWatchlist(userId: number) {
    try {
      const userResult = await dbQuery('SELECT clock_minute FROM users WHERE id = $1', [userId]);
      const minuto: number = userResult.rows[0]?.clock_minute ?? 0;

      const rowsResult = await dbQuery(`
        SELECT w.id, w.stock_id, s.symbol, s.closing_price, w.created_at
        FROM watchlist w
        JOIN stocks s ON w.stock_id = s.id
        WHERE w.user_id = $1
        ORDER BY s.symbol
      `, [userId]);

      // Busca preços atualizados da API do professor
      let precoMap: Record<string, number> = {};
      try {
        const precos = await StockService.getPricesByMinuto(minuto);
        for (const p of precos) precoMap[p.ticker] = p.preco;
      } catch (err) {
        logger.warn('Não foi possível buscar preços da API do professor:', err);
      }

      return rowsResult.rows.map(item => {
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
      logger.error('Erro ao obter lista de cotações:', error);
      throw error;
    }
  }

  static async addToWatchlist(userId: number, stockId: number) {
    try {
      const stockResult = await dbQuery('SELECT id FROM stocks WHERE id = $1', [stockId]);
      if (!stockResult.rows[0]) throw new Error('Ação não encontrada');

      const existingResult = await dbQuery(
        'SELECT id FROM watchlist WHERE user_id = $1 AND stock_id = $2',
        [userId, stockId]
      );
      if (existingResult.rows[0]) throw new Error('Ação já está na watchlist');

      const insertResult = await dbQuery(`
        INSERT INTO watchlist (user_id, stock_id) VALUES ($1, $2) RETURNING id
      `, [userId, stockId]);

      return {
        id: insertResult.rows[0].id as number,
        stockId,
        message: 'Ação adicionada à watchlist'
      };
    } catch (error) {
      logger.error('Erro ao adicionar à lista de cotações:', error);
      throw error;
    }
  }

  static async removeFromWatchlist(userId: number, stockId: number) {
    try {
      const itemResult = await dbQuery(
        'SELECT id FROM watchlist WHERE user_id = $1 AND stock_id = $2',
        [userId, stockId]
      );
      if (!itemResult.rows[0]) throw new Error('Ação não está na watchlist');

      await dbQuery('DELETE FROM watchlist WHERE user_id = $1 AND stock_id = $2', [userId, stockId]);

      return { message: 'Ação removida da watchlist' };
    } catch (error) {
      logger.error('Erro ao remover da lista de cotações:', error);
      throw error;
    }
  }

  static async isInWatchlist(userId: number, stockId: number): Promise<boolean> {
    try {
      const result = await dbQuery(
        'SELECT id FROM watchlist WHERE user_id = $1 AND stock_id = $2',
        [userId, stockId]
      );
      return !!result.rows[0];
    } catch {
      return false;
    }
  }
}
