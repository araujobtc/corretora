import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateToken } from '../middlewares/auth.js';
import { RegisterInput, LoginInput, ChangePasswordInput } from '../schemas/index.js';
import { sendPasswordResetEmail } from './emailService.js';
import logger from '../utils/logger.js';

export class AuthService {
  static register(data: RegisterInput) {
    try {
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
      if (existingUser) throw new Error('E-mail já cadastrado');

      const passwordHash = bcrypt.hashSync(data.password, 10);

      const result = db.prepare(`
        INSERT INTO users (name, email, password_hash, balance)
        VALUES (?, ?, ?, ?)
      `).run(data.name, data.email, passwordHash, 0);

      const userId = result.lastInsertRowid as number;

      // BUG #1 CORRIGIDO: popula watchlist com 10 ações aleatórias ao criar conta
      AuthService.seedWatchlistForNewUser(userId);

      const token = generateToken(userId, data.email, data.name);

      return { id: userId, name: data.name, email: data.email, balance: 0, token };
    } catch (error) {
      logger.error('Register error:', error);
      throw error;
    }
  }

  /** Escolhe 10 ações aleatórias do banco e insere na watchlist do novo usuário */
  private static seedWatchlistForNewUser(userId: number): void {
    try {
      const stocks = db.prepare(`
        SELECT id FROM stocks ORDER BY RANDOM() LIMIT 10
      `).all() as { id: number }[];

      if (stocks.length === 0) {
        logger.warn('Nenhuma ação encontrada no banco para popular a watchlist inicial');
        return;
      }

      const insertWatchlist = db.prepare(`
        INSERT OR IGNORE INTO watchlist (user_id, stock_id) VALUES (?, ?)
      `);

      const seedTx = db.transaction((items: { id: number }[]) => {
        for (const s of items) insertWatchlist.run(userId, s.id);
      });

      seedTx(stocks);
      logger.info(`Watchlist inicial: ${stocks.length} ações adicionadas para o usuário ${userId}`);
    } catch (error) {
      logger.error('Erro ao popular watchlist inicial:', error);
      // Não relança — cadastro deve ser bem-sucedido mesmo se a watchlist falhar
    }
  }

  static login(data: LoginInput) {
    try {
      const user = db.prepare(`
        SELECT id, name, email, password_hash, balance
        FROM users WHERE email = ?
      `).get(data.email) as any;

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

  static changePassword(userId: number, data: ChangePasswordInput) {
    try {
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
      if (!user) throw new Error('Usuário não encontrado');

      const isValid = bcrypt.compareSync(data.currentPassword, user.password_hash);
      if (!isValid) throw new Error('Senha atual incorreta');

      const newHash = bcrypt.hashSync(data.newPassword, 10);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newHash, userId);

      return { message: 'Senha alterada com sucesso' };
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  static async requestPasswordReset(email: string) {
    try {
      const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email) as any;

      if (!user) {
        return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' };
      }

      db.prepare(`
        UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0
      `).run(user.id);

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      db.prepare(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
      `).run(user.id, token, expiresAt);

      sendPasswordResetEmail(email, user.name, token)
        .catch(err => logger.error('Falha ao enviar e-mail de reset:', err));

      return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' };
    } catch (error) {
      logger.error('Request password reset error:', error);
      throw error;
    }
  }

  static resetPassword(token: string, newPassword: string) {
    try {
      const record = db.prepare(`
        SELECT prt.id, prt.user_id, prt.expires_at, prt.used
        FROM password_reset_tokens prt
        WHERE prt.token = ?
      `).get(token) as any;

      if (!record) throw new Error('Token inválido ou não encontrado');
      if (record.used) throw new Error('Este link já foi utilizado');
      if (new Date(record.expires_at) < new Date()) throw new Error('Token expirado. Solicite um novo link.');

      const newHash = bcrypt.hashSync(newPassword, 10);

      db.transaction(() => {
        db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newHash, record.user_id);
        db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?')
          .run(record.id);
      })();

      return { message: 'Senha redefinida com sucesso. Faça login com sua nova senha.' };
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  }
}
