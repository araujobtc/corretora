import { dbQuery, withTransaction } from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateToken } from '../middlewares/auth.js';
import { RegisterInput, LoginInput, ChangePasswordInput } from '../schemas/index.js';
import { sendPasswordResetEmail } from './emailService.js';
import logger from '../utils/logger.js';

export class AuthService {
  static async register(data: RegisterInput) {
    try {
      const existingResult = await dbQuery('SELECT id FROM users WHERE email = $1', [data.email]);
      if (existingResult.rows[0]) throw new Error('E-mail já cadastrado');

      const passwordHash = bcrypt.hashSync(data.password, 10);

      const insertResult = await dbQuery(
        `INSERT INTO users (name, email, password_hash, balance)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [data.name, data.email, passwordHash, 0]
      );

      const userId = insertResult.rows[0].id as number;

      // BUG #1 CORRIGIDO: popula watchlist com 10 ações aleatórias ao criar conta
      await AuthService.seedWatchlistForNewUser(userId);

      const token = generateToken(userId, data.email, data.name);

      return { id: userId, name: data.name, email: data.email, balance: 0, token };
    } catch (error) {
      logger.error('Register error:', error);
      throw error;
    }
  }

  /** Escolhe 10 ações aleatórias do banco e insere na watchlist do novo usuário */
  private static async seedWatchlistForNewUser(userId: number): Promise<void> {
    try {
      const stocksResult = await dbQuery(`SELECT id FROM stocks ORDER BY RANDOM() LIMIT 10`);
      const stocks = stocksResult.rows as { id: number }[];

      if (stocks.length === 0) {
        logger.warn('Nenhuma ação encontrada no banco para popular a watchlist inicial');
        return;
      }

      await withTransaction(async (client) => {
        for (const s of stocks) {
          await client.query(
            `INSERT INTO watchlist (user_id, stock_id) VALUES ($1, $2)
             ON CONFLICT (user_id, stock_id) DO NOTHING`,
            [userId, s.id]
          );
        }
      });

      logger.info(`Watchlist inicial: ${stocks.length} ações adicionadas para o usuário ${userId}`);
    } catch (error) {
      logger.error('Erro ao popular watchlist inicial:', error);
      // Não relança — cadastro deve ser bem-sucedido mesmo se a watchlist falhar
    }
  }

  static async login(data: LoginInput) {
    try {
      const result = await dbQuery(`
        SELECT id, name, email, password_hash, balance
        FROM users WHERE email = $1
      `, [data.email]);

      const user = result.rows[0];
      if (!user) throw new Error('E-mail ou senha inválidos');

      const isValid = bcrypt.compareSync(data.password, user.password_hash);
      if (!isValid) throw new Error('E-mail ou senha inválidos');

      const token = generateToken(user.id, user.email, user.name);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: parseFloat(user.balance),
        token,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  static async changePassword(userId: number, data: ChangePasswordInput) {
    try {
      const result = await dbQuery('SELECT password_hash FROM users WHERE id = $1', [userId]);
      const user = result.rows[0];
      if (!user) throw new Error('Usuário não encontrado');

      const isValid = bcrypt.compareSync(data.currentPassword, user.password_hash);
      if (!isValid) throw new Error('Senha atual incorreta');

      const newHash = bcrypt.hashSync(data.newPassword, 10);
      await dbQuery(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newHash, userId]
      );

      return { message: 'Senha alterada com sucesso' };
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  static async requestPasswordReset(email: string) {
    try {
      const result = await dbQuery('SELECT id, name FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' };
      }

      await dbQuery(
        `UPDATE password_reset_tokens SET used = 1 WHERE user_id = $1 AND used = 0`,
        [user.id]
      );

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await dbQuery(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      sendPasswordResetEmail(email, user.name, token)
        .catch(err => logger.error('Falha ao enviar e-mail de reset:', err));

      return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' };
    } catch (error) {
      logger.error('Request password reset error:', error);
      throw error;
    }
  }

  static async resetPassword(token: string, newPassword: string) {
    try {
      const result = await dbQuery(`
        SELECT id, user_id, expires_at, used
        FROM password_reset_tokens
        WHERE token = $1
      `, [token]);

      const record = result.rows[0];

      if (!record) throw new Error('Token inválido ou não encontrado');
      if (record.used) throw new Error('Este link já foi utilizado');
      if (new Date(record.expires_at) < new Date()) throw new Error('Token expirado. Solicite um novo link.');

      const newHash = bcrypt.hashSync(newPassword, 10);

      await withTransaction(async (client) => {
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newHash, record.user_id]
        );
        await client.query('UPDATE password_reset_tokens SET used = 1 WHERE id = $1', [record.id]);
      });

      return { message: 'Senha redefinida com sucesso. Faça login com sua nova senha.' };
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  }
}
