import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6, 'Password must be at least 6 characters')
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email')
});

// User Schemas
export const depositSchema = z.object({
  amount: z.number().positive('Amount must be positive')
});

export const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be positive')
});

// Stock Schemas
export const createStockSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  name: z.string().min(1, 'Name is required'),
  currentPrice: z.number().positive('Price must be positive')
});

export const updateStockPriceSchema = z.object({
  currentPrice: z.number().positive('Price must be positive')
});

// Order Schemas
export const createOrderSchema = z.object({
  stockId: z.number().positive('Stock ID is required'),
  type: z.enum(['BUY', 'SELL'], { errorMap: () => ({ message: 'Type must be BUY or SELL' }) }),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive')
});

// Watchlist Schemas
export const addToWatchlistSchema = z.object({
  stockId: z.number().positive('Stock ID is required')
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
