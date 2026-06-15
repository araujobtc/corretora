import { api } from './api'

export const userService = {
  me: () => api.get('/users/me'),
  deposit: (amount: number, description: string) =>
    api.post('/users/me/deposit', { amount, description }),
  withdraw: (amount: number, description: string) =>
    api.post('/users/me/withdraw', { amount, description }),
  transactions: (limit = 100, offset = 0) =>
    api.get('/users/me/transactions', { params: { limit, offset } }),
}
