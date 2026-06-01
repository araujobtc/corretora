import db from '../config/database.js';
import { DepositoInput, RetiradaInput } from '../schemas/index.js';
import logger from '../utils/logger.js';

export class UserService {
  static getMe(userId: number) {
    try {
      const user = db.prepare(`
        SELECT id, name, email, balance, created_at, updated_at
        FROM users WHERE id = ?
      `).get(userId) as any;

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: parseFloat(user.balance),
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('Get user error:', error);
      throw error;
    }
  }

  static deposit(userId: number, data: DepositoInput) {
    try {
      const transaction = db.transaction(() => {
        // Update user balance
        db.prepare(`
          UPDATE users SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(data.amount, userId);

        // Record transaction
        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, description)
          VALUES (?, ?, ?, ?)
        `).run(userId, 'DEPOSIT', data.amount, `Deposit of ${data.amount}`);
      });

      transaction();

      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
      return {
        message: 'Deposit successful',
        newBalance: parseFloat(user.balance)
      };
    } catch (error) {
      logger.error('Deposit error:', error);
      throw error;
    }
  }

  static withdraw(userId: number, data: RetiradaInput) {
    try {
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
      const currentBalance = parseFloat(user.balance);

      if (currentBalance < data.amount) {
        throw new Error('Insufficient balance');
      }

      const transaction = db.transaction(() => {
        // Update user balance
        db.prepare(`
          UPDATE users SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(data.amount, userId);

        // Record transaction
        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, description)
          VALUES (?, ?, ?, ?)
        `).run(userId, 'WITHDRAW', data.amount, `Withdrawal of ${data.amount}`);
      });

      transaction();

      const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
      return {
        message: 'Withdrawal successful',
        newBalance: parseFloat(updatedUser.balance)
      };
    } catch (error) {
      logger.error('Withdraw error:', error);
      throw error;
    }
  }

  static getTransactions(userId: number, limit: number = 50, offset: number = 0) {
    try {
      const transactions = db.prepare(`
        SELECT id, type, amount, description, created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, limit, offset) as any[];

      const countResult = db.prepare(`
        SELECT COUNT(*) as count FROM transactions WHERE user_id = ?
      `).get(userId) as any;

      return {
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount),
          description: t.description,
          createdAt: t.created_at
        })),
        total: countResult.count,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Get transactions error:', error);
      throw error;
    }
  }
}
