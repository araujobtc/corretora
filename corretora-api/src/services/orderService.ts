import db from '../config/database.js';
import { CreateOrderInput } from '../schemas/index.js';
import logger from '../utils/logger.js';

export class OrderService {
  static getOrders(userId: number, limit: number = 50, offset: number = 0) {
    try {
      const orders = db.prepare(`
        SELECT 
          o.id, o.stock_id, s.symbol, s.name,
          o.type, o.quantity, o.price, o.limit_price,
          o.total, o.status, o.created_at, o.updated_at
        FROM orders o
        JOIN stocks s ON o.stock_id = s.id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, limit, offset) as any[];

      const countResult = db.prepare(
        'SELECT COUNT(*) as count FROM orders WHERE user_id = ?'
      ).get(userId) as any;

      return {
        orders: orders.map(o => ({
          id: o.id,
          stockId: o.stock_id,
          symbol: o.symbol,
          name: o.name,
          type: o.type,
          quantity: o.quantity,
          price: parseFloat(o.price),
          limitPrice: o.limit_price ? parseFloat(o.limit_price) : null,
          total: parseFloat(o.total),
          status: o.status,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        })),
        total: countResult.count,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Get orders error:', error);
      throw error;
    }
  }

  static createOrder(userId: number, data: CreateOrderInput) {
    try {
      const stock = db.prepare('SELECT id, symbol, current_price FROM stocks WHERE id = ?').get(data.stockId) as any;
      if (!stock) throw new Error('Ação não encontrada');

      const user = db.prepare('SELECT balance, clock_minute FROM users WHERE id = ?').get(userId) as any;
      const userBalance = parseFloat(user.balance);
      const relogioStr = OrderService.formatarHora(user.clock_minute ?? 0);

      // BUG #2 CORRIGIDO: ordens condicionais (limit_price) ficam PENDING
      const isLimitOrder = data.limitPrice !== undefined && data.limitPrice !== null;
      const total = data.quantity * data.price;

      if (data.type === 'BUY') {
        if (!isLimitOrder) {
          // Compra a mercado: executa imediatamente — verifica saldo
          if (userBalance < total) throw new Error('Saldo insuficiente para realizar a compra');
        }
        // Ordem condicional: não valida saldo agora — será validado na execução
      } else if (data.type === 'SELL') {
        const position = db.prepare(
          'SELECT quantity FROM portfolio WHERE user_id = ? AND stock_id = ?'
        ).get(userId, data.stockId) as any;

        if (!isLimitOrder) {
          // Venda a mercado: precisa ter ações agora
          if (!position || position.quantity < data.quantity) {
            throw new Error('Quantidade de ações insuficiente para vender');
          }
        }
        // Ordem condicional: verifica no momento da execução
      }

      const status = isLimitOrder ? 'PENDING' : 'EXECUTED';

      const transaction = db.transaction(() => {
        // Cria a ordem
        const result = db.prepare(`
          INSERT INTO orders (user_id, stock_id, type, quantity, price, limit_price, total, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId, data.stockId, data.type, data.quantity,
          data.price, data.limitPrice ?? null, total, status
        );

        // BUG #3 CORRIGIDO: usa orderId real ao invés de hardcoded 1
        const orderId = result.lastInsertRowid as number;

        if (status === 'EXECUTED') {
          if (data.type === 'BUY') {
            db.prepare('UPDATE users SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(total, userId);

            const existing = db.prepare(
              'SELECT id, quantity, average_price FROM portfolio WHERE user_id = ? AND stock_id = ?'
            ).get(userId, data.stockId) as any;

            if (existing) {
              const newQty = existing.quantity + data.quantity;
              const newAvg = ((existing.quantity * parseFloat(existing.average_price)) + (data.quantity * data.price)) / newQty;
              db.prepare(`
                UPDATE portfolio SET quantity = ?, average_price = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND stock_id = ?
              `).run(newQty, newAvg, userId, data.stockId);
            } else {
              db.prepare(`
                INSERT INTO portfolio (user_id, stock_id, quantity, average_price) VALUES (?, ?, ?, ?)
              `).run(userId, data.stockId, data.quantity, data.price);
            }

            // BUG #4 CORRIGIDO: registra balance_after e descrição em português com símbolo
            const balanceAfter = parseFloat((db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any).balance);
            db.prepare(`
              INSERT INTO transactions (user_id, type, amount, description, balance_after)
              VALUES (?, 'BUY', ?, ?, ?)
            `).run(
              userId, total,
              `[${relogioStr}] Compra de ${data.quantity} ações de ${stock.symbol} a R$ ${data.price.toFixed(2)}`,
              balanceAfter
            );

          } else if (data.type === 'SELL') {
            db.prepare('UPDATE users SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(total, userId);

            db.prepare(`
              UPDATE portfolio SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
              WHERE user_id = ? AND stock_id = ?
            `).run(data.quantity, userId, data.stockId);

            // Remove posição zerada
            db.prepare(`
              DELETE FROM portfolio WHERE user_id = ? AND stock_id = ? AND quantity <= 0
            `).run(userId, data.stockId);

            const balanceAfter = parseFloat((db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any).balance);
            db.prepare(`
              INSERT INTO transactions (user_id, type, amount, description, balance_after)
              VALUES (?, 'SELL', ?, ?, ?)
            `).run(
              userId, total,
              `[${relogioStr}] Venda de ${data.quantity} ações de ${stock.symbol} a R$ ${data.price.toFixed(2)}`,
              balanceAfter
            );
          }
        }

        return orderId;
      });

      const orderId = transaction();

      return {
        id: orderId,
        message: status === 'PENDING'
          ? `Ordem ${data.type === 'BUY' ? 'de compra' : 'de venda'} condicional registrada`
          : `${data.type === 'BUY' ? 'Compra' : 'Venda'} executada com sucesso`,
        type: data.type,
        status,
        quantity: data.quantity,
        price: data.price,
        limitPrice: data.limitPrice ?? null,
        total
      };
    } catch (error) {
      logger.error('Create order error:', error);
      throw error;
    }
  }

  static getOrderHistory(userId: number, stockId?: number, limit: number = 50, offset: number = 0) {
    try {
      let query = `
        SELECT 
          o.id, o.stock_id, s.symbol, s.name,
          o.type, o.quantity, o.price, o.limit_price,
          o.total, o.status, o.created_at, o.updated_at
        FROM orders o
        JOIN stocks s ON o.stock_id = s.id
        WHERE o.user_id = ?
      `;

      const params: any[] = [userId];

      if (stockId) {
        query += ' AND o.stock_id = ?';
        params.push(stockId);
      }

      query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const orders = db.prepare(query).all(...params) as any[];

      return orders.map(o => ({
        id: o.id,
        stockId: o.stock_id,
        symbol: o.symbol,
        name: o.name,
        type: o.type,
        quantity: o.quantity,
        price: parseFloat(o.price),
        limitPrice: o.limit_price ? parseFloat(o.limit_price) : null,
        total: parseFloat(o.total),
        status: o.status,
        createdAt: o.created_at,
        updatedAt: o.updated_at
      }));
    } catch (error) {
      logger.error('Get order history error:', error);
      throw error;
    }
  }

  private static formatarHora(minuto: number): string {
    const total = 14 * 60 + minuto;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
}
