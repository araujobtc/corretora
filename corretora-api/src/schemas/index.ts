import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido')
});

// User Schemas
export const depositSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo')
});

export const withdrawSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo')
});

// Stock Schemas
export const createStockSchema = z.object({
  symbol: z.string().min(1, 'Ticker é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  currentPrice: z.number().positive('Preço de ser positivo')
});

export const updateStockPriceSchema = z.object({
  currentPrice: z.number().positive('Preço deve ser positivo')
});

// Order Schemas
export const createOrderSchema = z.object({
  stockId: z.number().positive('Ticker é obrigatório'),
  type: z.enum(['BUY', 'SELL'], { errorMap: () => ({ message: 'Tipo deve ser BUY ou SELL' }) }),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  price: z.number().positive('Preço deve ser positivo')
});

// Watchlist Schemas
export const addToWatchlistSchema = z.object({
  stockId: z.number().positive('Ticker é obrigatório')
});

// Types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
export type CreateStockInput = z.infer<typeof createStockSchema>;
export type UpdateStockPriceInput = z.infer<typeof updateStockPriceSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddToWatchlistInput = z.infer<typeof addToWatchlistSchema>;

// Reset de senha com token
export const resetPasswordWithTokenSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
});

export type ResetPasswordWithTokenInput = z.infer<typeof resetPasswordWithTokenSchema>;