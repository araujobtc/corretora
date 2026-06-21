import { dbQuery, withTransaction } from '../config/database.js';
import { DepositInput, WithdrawInput } from '../schemas/index.js';
import logger from '../utils/logger.js';

export class UserService {
  static async getMe(userId: number) {
    try {
      const result = await dbQuery(`
        SELECT id, name, email, balance, clock_minute, created_at, updated_at
        FROM users WHERE id = $1
      `, [userId]);

      const user = result.rows[0];
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

  static async deposit(userId: number, data: DepositInput) {
    try {
      const novoSaldo = await withTransaction(async (client) => {
        await client.query(
          `UPDATE users SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [data.amount, userId]
        );

        const balanceResult = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
        const balanceAfter = parseFloat(balanceResult.rows[0].balance);

        await client.query(`
          INSERT INTO transactions (user_id, type, amount, description, balance_after)
          VALUES ($1, 'DEPOSIT', $2, $3, $4)
        `, [userId, data.amount, data.description ?? 'Depósito', balanceAfter]);

        return balanceAfter;
      });

      return { mensagem: 'Depósito realizado com sucesso.', novoSaldo };
    } catch (error) {
      logger.error('Erro ao realizar depósito:', error);
      throw error;
    }
  }

  static async withdraw(userId: number, data: WithdrawInput) {
    try {
      const userResult = await dbQuery('SELECT balance FROM users WHERE id = $1', [userId]);
      const saldoAtual = parseFloat(userResult.rows[0].balance);

      if (saldoAtual < data.amount) throw new Error('Saldo insuficiente para realizar esta operação.');

      const novoSaldo = await withTransaction(async (client) => {
        await client.query(
          `UPDATE users SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [data.amount, userId]
        );

        const balanceResult = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
        const balanceAfter = parseFloat(balanceResult.rows[0].balance);

        await client.query(`
          INSERT INTO transactions (user_id, type, amount, description, balance_after)
          VALUES ($1, 'WITHDRAW', $2, $3, $4)
        `, [userId, data.amount, data.description ?? 'Retirada', balanceAfter]);

        return balanceAfter;
      });

      return { mensagem: 'Retirada realizada com sucesso.', novoSaldo };
    } catch (error) {
      logger.error('Erro ao realizar retirada:', error);
      throw error;
    }
  }

  static async getTransactions(userId: number, limit: number = 50, offset: number = 0) {
    try {
      // Req #6: ordena ASC (cronológico conforme enunciado) e inclui balance_after
      const txResult = await dbQuery(`
        SELECT id, type, amount, description, balance_after, created_at
        FROM transactions
        WHERE user_id = $1
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      const countResult = await dbQuery(
        'SELECT COUNT(*) as count FROM transactions WHERE user_id = $1', [userId]
      );

      return {
        transactions: txResult.rows.map(t => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount),
          description: t.description,
          balanceAfter: t.balance_after !== null && t.balance_after !== undefined
            ? parseFloat(t.balance_after)
            : null,
          createdAt: t.created_at
        })),
        total: parseInt(countResult.rows[0].count, 10),
        limit,
        offset
      };
    } catch (error) {
      logger.error('Erro ao buscar extrato:', error);
      throw error;
    }
  }

  /** Persiste o minuto do relógio do usuário no banco (Req #2 — horário sobrevive ao logout) */
  static async updateClock(userId: number, minute: number) {
    try {
      await dbQuery(
        'UPDATE users SET clock_minute = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [minute, userId]
      );
    } catch (error) {
      logger.error('Erro ao atualizar relógio:', error);
      throw error;
    }
  }
}
