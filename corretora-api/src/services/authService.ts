import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import { gerarToken } from '../middlewares/auth.js';
import { RegistroInput, LoginInput, AlterarSenhaInput } from '../schemas/index.js';
import logger from '../utils/logger.js';

export class ServicoAuth {
  static registrar(data: RegistroInput) {
    try {
      // Verifica se user já existe
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
      if (existingUser) {
        throw new Error('Email já registrado');
      }

      const passwordHash = bcrypt.hashSync(data.password, 10);

      const result = db.prepare(`
        INSERT INTO users (name, email, password_hash, balance)
        VALUES (?, ?, ?, ?)
      `).run(data.name, data.email, passwordHash, 0);

      const userId = result.lastInsertRowid as number;
      const token = gerarToken(userId, data.email, data.name);

      return {
        id: userId,
        name: data.name,
        email: data.email,
        balance: 0,
        token
      };
    } catch (error) {
      logger.error('Erro ao registrar:', error);
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
        throw new Error('Login ou senha inválidos');
      }

      const isPasswordValid = bcrypt.compareSync(data.password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Login ou senha inválidos');
      }

      const token = gerarToken(user.id, user.email, user.name);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: parseFloat(user.balance),
        token
      };
    } catch (error) {
      logger.error('Erro ao logar:', error);
      throw error;
    }
  }

  static alterarSenha(userId: number, data: AlterarSenhaInput) {
    try {
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const isPasswordValid = bcrypt.compareSync(data.currentPassword, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Senha atual está incorreta');
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

  static resetSenha(email: string) {
    try {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

      if (!user) {
        // Don't reveal if email exists or not for security
        return { message: 'Se o email existir, um link de redefinição de senha será enviado' };
      }

      // In a real application, you would generate a reset token and send it via email
      logger.info(`Pedido de redefinição de senha para o email: ${email}`);

      return { message: 'Se o email existir, um link de redefinição de senha será enviado' };
    } catch (error) {
      logger.error('Erro ao redefinir senha:', error);
      throw error;
    }
  }
}
