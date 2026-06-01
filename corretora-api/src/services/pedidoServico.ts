import db from '../config/database.js';
import { criarPedidoInput } from '../schemas/index.js';
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
        acoes: orders.map(o => ({
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

  static createOrder(userId: number, data: criarPedidoInput) {
    try {
      // Get info das ações
      const stock = db.prepare('SELECT current_price FROM stocks WHERE id = ?').get(data.stockId) as any;
      if (!stock) {
        throw new Error('Ação não encontrada');
      }

      // Get saldo
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
      const userBalance = parseFloat(user.balance);

      const total = data.quantity * data.price;

      if (data.type === 'BUY') {
        if (userBalance < total) {
          throw new Error('Saldo insuficiente para compra');
        }
      } else if (data.type === 'SELL') {
        // Verifica se o usuário tem ações suficientes para vender
        const position = db.prepare(
          'SELECT quantity FROM portfolio WHERE user_id = ? AND stock_id = ?'
        ).get(userId, data.stockId) as any;

        if (!position || position.quantity < data.quantity) {
          throw new Error('Ações insuficientes para venda');
        }
      }

      const transacao = db.transaction(() => {
        // criar pedido
        const result = db.prepare(`
          INSERT INTO orders (user_id, stock_id, type, quantity, price, total, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, data.stockId, data.type, data.quantity, data.price, total, 'EXECUTED');

        const orderId = result.lastInsertRowid as number;

        if (data.type === 'BUY') {
          // atualiza saldo do usuário
          db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?')
            .run(total, userId);

          // atualiza ou cria posição na carteira
          const posicaoExistente = db.prepare(
            'SELECT id, quantity, average_price FROM portfolio WHERE user_id = ? AND stock_id = ?'
          ).get(userId, data.stockId) as any;

          if (posicaoExistente) {
            const newQuantity = posicaoExistente.quantity + data.quantity;
            const newAveragePrice = ((posicaoExistente.quantity * parseFloat(posicaoExistente.average_price)) + (data.quantity * data.price)) / newQuantity;

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

          // Cria registro de transação
          db.prepare(`
            INSERT INTO transactions (user_id, type, amount, description)
            VALUES (?, ?, ?, ?)
          `).run(userId, 'COMPRAR', total, `Compra de ${data.quantity} ações da ação com ID ${data.stockId}`);
        } else if (data.type === 'SELL') {
          // Update user balance
          db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?')
            .run(total, userId);

          // Atualiza posição na carteira
          db.prepare(`
            UPDATE portfolio SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND stock_id = ?
          `).run(data.quantity, userId, data.stockId);

          // Cria registro de transação
          db.prepare(`
            INSERT INTO transactions (user_id, type, amount, description)
            VALUES (?, ?, ?, ?)
          `).run(userId, 'VENDA', total, `Venda de ${data.quantity} ações da ação com ID ${data.stockId}`);
        }
      });

      transacao();

      return {
        id: 1, // Would be the actual order ID from DB
        message: `${data.type} pedido criado com sucesso`,
        type: data.type,
        quantity: data.quantity,
        price: data.price,
        total
      };
    } catch (error) {
      logger.error('Erro ao criar pedido:', error);
      throw error;
    }
  }

  static getHistoricoPedido(userId: number, stockId?: number, limit: number = 50, offset: number = 0) {
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

      const acoes = db.prepare(query).all(...params) as any[];

      return acoes.map(o => ({
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
      logger.error('Erro ao obter histórico de pedidos:', error);
      throw error;
    }
  }
}
