import { z } from 'zod';

// ── Autenticação ──────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.'),
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.')
});

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'A senha atual deve ter no mínimo 6 caracteres.'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.')
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Informe um e-mail válido.')
});

export const resetPasswordWithTokenSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório.'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.'),
});

// ── Conta corrente (Req #6) ───────────────────────────────────────────────────

export const depositSchema = z.object({
  amount: z.number().positive('O valor do depósito deve ser positivo e diferente de zero.'),
  description: z.string().min(1, 'A descrição é obrigatória.').optional().default('Depósito')
});

export const withdrawSchema = z.object({
  amount: z.number().positive('O valor da retirada deve ser positivo e diferente de zero.'),
  description: z.string().min(1, 'A descrição é obrigatória.').optional().default('Retirada')
});

// ── Ações ─────────────────────────────────────────────────────────────────────

export const createStockSchema = z.object({
  symbol: z.string().min(1, 'O código da ação (ticker) é obrigatório.'),
  name: z.string().min(1, 'O nome da ação é obrigatório.'),
  currentPrice: z.number().positive('O preço deve ser positivo.')
});

export const updateStockPriceSchema = z.object({
  currentPrice: z.number().positive('O preço deve ser positivo.')
});

// ── Ordens (Req #3 e #5) — limitPrice suporta ordens condicionais ─────────────

export const createOrderSchema = z.object({
  stockId: z.number().positive('O ID da ação é obrigatório.'),
  type: z.enum(['BUY', 'SELL'], {
    errorMap: () => ({ message: 'O tipo da ordem deve ser BUY (compra) ou SELL (venda).' })
  }),
  quantity: z.number().int().positive('A quantidade informada deve ser maior que zero.'),
  price: z.number().positive('O preço deve ser positivo.'),
  limitPrice: z.number().positive('O preço limite deve ser positivo.').optional()
});

// ── Watchlist ─────────────────────────────────────────────────────────────────

export const addToWatchlistSchema = z.object({
  stockId: z.number().positive('O ID da ação é obrigatório.')
});

// ── Tipos inferidos ───────────────────────────────────────────────────────────

export type RegisterInput          = z.infer<typeof registerSchema>;
export type LoginInput             = z.infer<typeof loginSchema>;
export type ChangePasswordInput    = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput     = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordWithTokenInput = z.infer<typeof resetPasswordWithTokenSchema>;
export type DepositInput           = z.infer<typeof depositSchema>;
export type WithdrawInput          = z.infer<typeof withdrawSchema>;
export type CreateStockInput       = z.infer<typeof createStockSchema>;
export type UpdateStockPriceInput  = z.infer<typeof updateStockPriceSchema>;
export type CreateOrderInput       = z.infer<typeof createOrderSchema>;
export type AddToWatchlistInput    = z.infer<typeof addToWatchlistSchema>;
