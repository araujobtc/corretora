import db from '../config/database.js';
import { DepositInput, WithdrawInput } from '../schemas/index.js';
import logger from '../utils/logger.js';

export class UserService {
  static getMe(userId: number) {
    try {
      const user = db.prepare(`
        SELECT id, name, email, balance, clock_minute, created_at, updated_at
        FROM users WHERE id = ?
      `).get(userId) as any;

      if (!user) throw new Error('Usuário não encontrado.');

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: parseFloat(user.balance),
        clockMinute: user.clock_minute ?? 0,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('Erro ao buscar usuário:', error);
      throw error;
    }
  }

  static deposit(userId: number, data: DepositInput) {
    try {
      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE users SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(data.amount, userId);

        const balanceAfter = parseFloat(
          (db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any).balance
        );

        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, description, balance_after)
          VALUES (?, 'DEPOSIT', ?, ?, ?)
        `).run(userId, data.amount, data.description ?? 'Depósito', balanceAfter);

        return balanceAfter;
      });

      const novoSaldo = transaction();
      return { mensagem: 'Depósito realizado com sucesso.', novoSaldo };
    } catch (error) {
      logger.error('Erro ao realizar depósito:', error);
      throw error;
    }
  }

  static withdraw(userId: number, data: WithdrawInput) {
    try {
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
      const saldoAtual = parseFloat(user.balance);

      if (saldoAtual < data.amount) throw new Error('Saldo insuficiente para realizar esta operação.');

      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE users SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(data.amount, userId);

        const balanceAfter = parseFloat(
          (db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any).balance
        );

        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, description, balance_after)
          VALUES (?, 'WITHDRAW', ?, ?, ?)
        `).run(userId, data.amount, data.description ?? 'Retirada', balanceAfter);

        return balanceAfter;
      });

      const novoSaldo = transaction();
      return { mensagem: 'Retirada realizada com sucesso.', novoSaldo };
    } catch (error) {
      logger.error('Erro ao realizar retirada:', error);
      throw error;
    }
  }

  static getTransactions(userId: number, limit: number = 50, offset: number = 0) {
    try {
      // Req #6: ordena ASC (cronológico conforme enunciado) e inclui balance_after
      const transactions = db.prepare(`
        SELECT id, type, amount, description, balance_after, created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
      `).all(userId, limit, offset) as any[];

      const countResult = db.prepare(
        'SELECT COUNT(*) as count FROM transactions WHERE user_id = ?'
      ).get(userId) as any;

      return {
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount),
          description: t.description,
          balanceAfter: t.balance_after !== null && t.balance_after !== undefined
            ? parseFloat(t.balance_after)
            : null,
          createdAt: t.created_at
        })),
        total: countResult.count,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Erro ao buscar extrato:', error);
      throw error;
    }
  }

  /** Persiste o minuto do relógio do usuário no banco (Req #2 — horário sobrevive ao logout) */
  static updateClock(userId: number, minute: number) {
    try {
      db.prepare('UPDATE users SET clock_minute = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(minute, userId);
    } catch (error) {
      logger.error('Erro ao atualizar relógio:', error);
      throw error;
    }
  }
}
