import db from '../config/database.js';
import { CreateOrderInput } from '../schemas/index.js';
import logger from '../utils/logger.js';

export class OrderService {
  static getOrders(userId: number, limit: number = 50, offset: number = 0) {
    try {
      const orders = db.prepare(`
        SELECT 
          o.id,
          o.stock_id,
          s.symbol,
          s.name,
          o.type,
          o.quantity,
          o.price,
          o.total,
          o.status,
          o.created_at,
          o.updated_at
        FROM orders o
        JOIN stocks s ON o.stock_id = s.id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, limit, offset) as any[];

      const countResult = db.prepare(`
        SELECT COUNT(*) as count FROM orders WHERE user_id = ?
      `).get(userId) as any;

      return {
        orders: orders.map(o => ({
          id: o.id,
          stockId: o.stock_id,
          symbol: o.symbol,
          name: o.name,
          type: o.type,
          quantity: o.quantity,
          price: parseFloat(o.price),
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
      // Get stock info
      const stock = db.prepare('SELECT current_price FROM stocks WHERE id = ?').get(data.stockId) as any;
      if (!stock) {
        throw new Error('Stock not found');
      }

      // Get user balance
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
      const userBalance = parseFloat(user.balance);

      const total = data.quantity * data.price;

      if (data.type === 'BUY') {
        if (userBalance < total) {
          throw new Error('Insufficient balance for purchase');
        }
      } else if (data.type === 'SELL') {
        // Check if user has enough shares
        const position = db.prepare(
          'SELECT quantity FROM portfolio WHERE user_id = ? AND stock_id = ?'
        ).get(userId, data.stockId) as any;

        if (!position || position.quantity < data.quantity) {
          throw new Error('Insufficient shares to sell');
        }
      }

      const transaction = db.transaction(() => {
        // Create order
        const result = db.prepare(`
          INSERT INTO orders (user_id, stock_id, type, quantity, price, total, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, data.stockId, data.type, data.quantity, data.price, total, 'EXECUTED');

        const orderId = result.lastInsertRowid as number;

        if (data.type === 'BUY') {
          // Update user balance
          db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?')
            .run(total, userId);

          // Update or create portfolio position
          const existingPosition = db.prepare(
            'SELECT id, quantity, average_price FROM portfolio WHERE user_id = ? AND stock_id = ?'
          ).get(userId, data.stockId) as any;

          if (existingPosition) {
            const newQuantity = existingPosition.quantity + data.quantity;
            const newAveragePrice = ((existingPosition.quantity * parseFloat(existingPosition.average_price)) + (data.quantity * data.price)) / newQuantity;

            db.prepare(`
              UPDATE portfolio SET quantity = ?, average_price = ?, updated_at = CURRENT_TIMESTAMP
              WHERE user_id = ? AND stock_id = ?
            `).run(newQuantity, newAveragePrice, userId, data.stockId);
          } else {
            db.prepare(`
              INSERT INTO portfolio (user_id, stock_id, quantity, average_price)
              VALUES (?, ?, ?, ?)
            `).run(userId, data.stockId, data.quantity, data.price);
          }

          // Record transaction
          db.prepare(`
            INSERT INTO transactions (user_id, type, amount, description)
            VALUES (?, ?, ?, ?)
          `).run(userId, 'BUY', total, `Buy ${data.quantity} shares of stock ID ${data.stockId}`);
        } else if (data.type === 'SELL') {
          // Update user balance
          db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?')
            .run(total, userId);

          // Update portfolio position
          db.prepare(`
            UPDATE portfolio SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND stock_id = ?
          `).run(data.quantity, userId, data.stockId);

          // Record transaction
          db.prepare(`
            INSERT INTO transactions (user_id, type, amount, description)
            VALUES (?, ?, ?, ?)
          `).run(userId, 'SELL', total, `Sell ${data.quantity} shares of stock ID ${data.stockId}`);
        }
      });

      transaction();

      return {
        id: 1, // Would be the actual order ID from DB
        message: `${data.type} order created successfully`,
        type: data.type,
        quantity: data.quantity,
        price: data.price,
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
          o.id,
          o.stock_id,
          s.symbol,
          s.name,
          o.type,
          o.quantity,
          o.price,
          o.total,
          o.status,
          o.created_at,
          o.updated_at
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
}
