import { z } from 'zod';

// Auth Schemas
export const registroSchema = z.object({
  name: z.string().min(3, 'Nome precisa ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha precisa ter pelo menos 6 caracteres')
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha precisa ter pelo menos 6 caracteres')
});

export const alterarSenhaSchema = z.object({
  currentPassword: z.string().min(6, 'Senha atual precisa ter pelo menos 6 caracteres'),
  newPassword: z.string().min(6, 'Nova senha precisa ter pelo menos 6 caracteres')
});

export const resetarSenhaSchema = z.object({
  email: z.string().email('Email inválido')
});

// User Schemas
export const depositoSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo')
});

export const retiradaSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo')
});

// Stock Schemas
export const criarAcaoSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  name: z.string().min(1, 'Nome é obrigatório'),
  currentPrice: z.number().positive('Preço atual deve ser positivo')
});

export const atualizarPrecoAcaoSchema = z.object({
  currentPrice: z.number().positive('Preço atual deve ser positivo')
});

// Order Schemas
export const criarPedidoSchema = z.object({
  stockId: z.number().positive('Id da ação é obrigatório'),
  type: z.enum(['COMPRA', 'VENDA'], { errorMap: () => ({ message: 'Deve ser COMPRA ou VENDA' }) }),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  price: z.number().positive('Preço deve ser positivo')
});

// Watchlist Schemas
export const addListaDesejosSchema = z.object({
  stockId: z.number().positive('Id da ação é obrigatório')
});

// Types
export type RegistroInput = z.infer<typeof registroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AlterarSenhaInput = z.infer<typeof alterarSenhaSchema>;
export type ResetarSenhaInput = z.infer<typeof resetarSenhaSchema>;
export type DepositoInput = z.infer<typeof depositoSchema>;
export type RetiradaInput = z.infer<typeof retiradaSchema>;
export type CreateStockInput = z.infer<typeof criarAcaoSchema>;
export type AtualizarPrecoAcaoInput = z.infer<typeof atualizarPrecoAcaoSchema>;
export type CriarPedidoInput = z.infer<typeof criarPedidoSchema>;
export type AddListaDesejosInput = z.infer<typeof addListaDesejosSchema>;
