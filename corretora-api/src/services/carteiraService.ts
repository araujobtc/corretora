import db from '../config/database.js';
import logger from '../utils/logger.js';

export class CarteiraService {
  static getCarteira(userId: number) {
    try {
      const carteira = db.prepare(`
        SELECT 
          p.id,
          p.stock_id,
          s.symbol,
          s.name,
          p.quantity,
          p.average_price,
          s.current_price,
          (p.quantity * s.current_price) as current_value,
          (p.quantity * p.average_price) as invested_value,
          ((p.quantity * s.current_price) - (p.quantity * p.average_price)) as gain_loss,
          (((p.quantity * s.current_price) - (p.quantity * p.average_price)) / (p.quantity * p.average_price) * 100) as gain_loss_percent,
          p.created_at,
          p.updated_at
        FROM portfolio p
        JOIN stocks s ON p.stock_id = s.id
        WHERE p.user_id = ? AND p.quantity > 0
        ORDER BY s.symbol
      `).all(userId) as any[];

      const totalInvested = carteira.reduce((sum, item) => sum + parseFloat(item.invested_value || 0), 0);
      const totalCurrent = carteira.reduce((sum, item) => sum + parseFloat(item.current_value || 0), 0);
      const totalGainLoss = totalCurrent - totalInvested;
      const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

      return {
        positions: carteira.map(item => ({
          id: item.id,
          stockId: item.stock_id,
          symbol: item.symbol,
          name: item.name,
          quantity: item.quantity,
          averagePrice: parseFloat(item.average_price),
          currentPrice: parseFloat(item.current_price),
          currentValue: parseFloat(item.current_value),
          investedValue: parseFloat(item.invested_value),
          gainLoss: parseFloat(item.gain_loss),
          gainLossPercent: parseFloat(item.gain_loss_percent),
          createdAt: item.created_at,
          updatedAt: item.updated_at
        })),
        summary: {
          totalInvested: parseFloat(totalInvested.toFixed(2)),
          totalCurrent: parseFloat(totalCurrent.toFixed(2)),
          totalGainLoss: parseFloat(totalGainLoss.toFixed(2)),
          totalGainLossPercent: parseFloat(totalGainLossPercent.toFixed(2))
        }
      };
    } catch (error) {
      logger.error('Erro ao obter carteira:', error);
      throw error;
    }
  }

  static getPosicao(userId: number, stockId: number) {
    try {
      const position = db.prepare(`
        SELECT 
          p.id,
          p.stock_id,
          s.symbol,
          s.name,
          p.quantity,
          p.average_price,
          s.current_price,
          p.created_at,
          p.updated_at
        FROM portfolio p
        JOIN stocks s ON p.stock_id = s.id
        WHERE p.user_id = ? AND p.stock_id = ?
      `).get(userId, stockId) as any;

      if (!position || position.quantity === 0) {
        throw new Error('Posição não encontrada');
      }

      return {
        id: position.id,
        stockId: position.stock_id,
        symbol: position.symbol,
        name: position.name,
        quantity: position.quantity,
        averagePrice: parseFloat(position.average_price),
        currentPrice: parseFloat(position.current_price),
        currentValue: position.quantity * parseFloat(position.current_price),
        investedValue: position.quantity * parseFloat(position.average_price),
        gainLoss: (position.quantity * parseFloat(position.current_price)) - (position.quantity * parseFloat(position.average_price)),
        createdAt: position.created_at,
        updatedAt: position.updated_at
      };
    } catch (error) {
      logger.error('Erro ao obter posição:', error);
      throw error;
    }
  }
}
