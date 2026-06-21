import { dbQuery, withTransaction } from '../config/database.js';
import { CreateOrderInput } from '../schemas/index.js';
import logger from '../utils/logger.js';

export class OrderService {
  static async getOrders(userId: number, limit: number = 50, offset: number = 0) {
    try {
      const ordersResult = await dbQuery(`
        SELECT 
          o.id, o.stock_id, s.symbol, s.name,
          o.type, o.quantity, o.price, o.limit_price,
          o.total, o.status, o.created_at, o.updated_at
        FROM orders o
        JOIN stocks s ON o.stock_id = s.id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      const countResult = await dbQuery(
        'SELECT COUNT(*) as count FROM orders WHERE user_id = $1', [userId]
      );

      return {
        orders: ordersResult.rows.map(o => ({
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
        total: parseInt(countResult.rows[0].count, 10),
        limit,
        offset
      };
    } catch (error) {
      logger.error('Get orders error:', error);
      throw error;
    }
  }

  static async createOrder(userId: number, data: CreateOrderInput) {
    try {
      const stockResult = await dbQuery('SELECT id, symbol, current_price FROM stocks WHERE id = $1', [data.stockId]);
      const stock = stockResult.rows[0];
      if (!stock) throw new Error('Ação não encontrada');

      const userResult = await dbQuery('SELECT balance, clock_minute FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
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
        const positionResult = await dbQuery(
          'SELECT quantity FROM portfolio WHERE user_id = $1 AND stock_id = $2',
          [userId, data.stockId]
        );
        const position = positionResult.rows[0];

        if (!isLimitOrder) {
          // Venda a mercado: precisa ter ações agora
          if (!position || position.quantity < data.quantity) {
            throw new Error('Quantidade de ações insuficiente para vender');
          }
        }
        // Ordem condicional: verifica no momento da execução
      }

      const status = isLimitOrder ? 'PENDING' : 'EXECUTED';

      const orderId = await withTransaction(async (client) => {
        // Cria a ordem
        const insertResult = await client.query(`
          INSERT INTO orders (user_id, stock_id, type, quantity, price, limit_price, total, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
        `, [
          userId, data.stockId, data.type, data.quantity,
          data.price, data.limitPrice ?? null, total, status
        ]);

        // BUG #3 CORRIGIDO: usa orderId real ao invés de hardcoded 1
        const orderId = insertResult.rows[0].id as number;

        if (status === 'EXECUTED') {
          if (data.type === 'BUY') {
            await client.query(
              'UPDATE users SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [total, userId]
            );

            const existingResult = await client.query(
              'SELECT id, quantity, average_price FROM portfolio WHERE user_id = $1 AND stock_id = $2',
              [userId, data.stockId]
            );
            const existing = existingResult.rows[0];

            if (existing) {
              const newQty = existing.quantity + data.quantity;
              const newAvg = ((existing.quantity * parseFloat(existing.average_price)) + (data.quantity * data.price)) / newQty;
              await client.query(`
                UPDATE portfolio SET quantity = $1, average_price = $2, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $3 AND stock_id = $4
              `, [newQty, newAvg, userId, data.stockId]);
            } else {
              await client.query(`
                INSERT INTO portfolio (user_id, stock_id, quantity, average_price) VALUES ($1, $2, $3, $4)
              `, [userId, data.stockId, data.quantity, data.price]);
            }

            // BUG #4 CORRIGIDO: registra balance_after e descrição em português com símbolo
            const balanceResult = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
            const balanceAfter = parseFloat(balanceResult.rows[0].balance);

            await client.query(`
              INSERT INTO transactions (user_id, type, amount, description, balance_after)
              VALUES ($1, 'BUY', $2, $3, $4)
            `, [
              userId, total,
              `[${relogioStr}] Compra de ${data.quantity} ações de ${stock.symbol} a R$ ${data.price.toFixed(2)}`,
              balanceAfter
            ]);

          } else if (data.type === 'SELL') {
            await client.query(
              'UPDATE users SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [total, userId]
            );

            await client.query(`
              UPDATE portfolio SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
              WHERE user_id = $2 AND stock_id = $3
            `, [data.quantity, userId, data.stockId]);

            // Remove posição zerada
            await client.query(`
              DELETE FROM portfolio WHERE user_id = $1 AND stock_id = $2 AND quantity <= 0
            `, [userId, data.stockId]);

            const balanceResult = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
            const balanceAfter = parseFloat(balanceResult.rows[0].balance);

            await client.query(`
              INSERT INTO transactions (user_id, type, amount, description, balance_after)
              VALUES ($1, 'SELL', $2, $3, $4)
            `, [
              userId, total,
              `[${relogioStr}] Venda de ${data.quantity} ações de ${stock.symbol} a R$ ${data.price.toFixed(2)}`,
              balanceAfter
            ]);
          }
        }

        return orderId;
      });

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

  static async getOrderHistory(userId: number, stockId?: number, limit: number = 50, offset: number = 0) {
    try {
      let sql = `
        SELECT 
          o.id, o.stock_id, s.symbol, s.name,
          o.type, o.quantity, o.price, o.limit_price,
          o.total, o.status, o.created_at, o.updated_at
        FROM orders o
        JOIN stocks s ON o.stock_id = s.id
        WHERE o.user_id = $1
      `;

      const params: any[] = [userId];

      if (stockId) {
        params.push(stockId);
        sql += ` AND o.stock_id = $${params.length}`;
      }

      params.push(limit);
      sql += ` ORDER BY o.created_at DESC LIMIT $${params.length}`;
      params.push(offset);
      sql += ` OFFSET $${params.length}`;

      const result = await dbQuery(sql, params);

      return result.rows.map(o => ({
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
