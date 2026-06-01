import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middlewares/auth.js';
import { RegisterInput, LoginInput, ChangePasswordInput } from '../schemas/index.js';
import logger from '../utils/logger.js';

export class AuthService {
  static register(data: RegisterInput) {
    try {
      // Check if user already exists
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
      if (existingUser) {
        throw new Error('E-mail já cadastrado');
      }

      const passwordHash = bcrypt.hashSync(data.password, 10);

      const result = db.prepare(`
        INSERT INTO users (name, email, password_hash, balance)
        VALUES (?, ?, ?, ?)
      `).run(data.name, data.email, passwordHash, 0);

      const userId = result.lastInsertRowid as number;
      const token = generateToken(userId, data.email, data.name);

      return {
        id: userId,
        name: data.name,
        email: data.email,
        balance: 0,
        token
      };
    } catch (error) {
      logger.error('Erro ao registrar usuário:', error);
      throw error;
    }
  }

  static login(data: LoginInput) {
    try {
      const user = db.prepare(`
        SELECT id, name, email, password_hash, balance
        FROM users WHERE email = ?
      `).get(data.email) as any;

      if (!user) {
        throw new Error('Email ou senha inválidos');
      }

      const isPasswordValid = bcrypt.compareSync(data.password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Email ou senha inválidos');
      }

      const token = generateToken(user.id, user.email, user.name);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: parseFloat(user.balance),
        token
      };
    } catch (error) {
      logger.error('Erro ao fazer login:', error);
      throw error;
    }
  }

  static changePassword(userId: number, data: ChangePasswordInput) {
    try {
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const isPasswordValid = bcrypt.compareSync(data.currentPassword, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Senha incorreta');
      }

      const newPasswordHash = bcrypt.hashSync(data.newPassword, 10);

      db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newPasswordHash, userId);

      return { message: 'Senha alterada com sucesso' };
    } catch (error) {
      logger.error('Erro ao alterar senha:', error);
      throw error;
    }
  }

  static resetPassword(email: string) {
    try {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

      if (!user) {
        // Don't reveal if email exists or not for security
        return { message: 'If the email exists, a password reset link has been sent' };
      }

      // In a real application, you would generate a reset token and send it via email
      logger.info(`Pedido de alteração de senha enviado para email: ${email}`);

      return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' };
    } catch (error) {
      logger.error('Erro ao redefinir senha:', error);
      throw error;
    }
  }
}
