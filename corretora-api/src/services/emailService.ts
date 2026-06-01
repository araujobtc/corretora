import { Resend } from 'resend';
import logger from '../utils/logger.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
): Promise<void> {
  try {
    const baseUrl =
      process.env.FRONTEND_URL || 'http://localhost:5173';

    const resetUrl =
      `${baseUrl}/reset-password?token=${resetToken}`;

    const response = await resend.emails.send({
      from: 'Corretora <onboarding@resend.dev>',
      to,
      subject: 'Redefinição de senha — Corretora',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Redefinição de senha</h2>

          <p>Olá, ${name}!</p>

          <p>
            Clique no link abaixo para redefinir sua senha:
          </p>

          <a href="${resetUrl}">
            Redefinir senha
          </a>

          <p>
            O link expira em 1 hora.
          </p>
        </div>
      `,
    });

    logger.info('Reset email sent', response);
  } catch (error) {
    logger.error('Resend error:', error);
    throw error;
  }
}