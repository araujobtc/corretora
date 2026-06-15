import { api } from './api'

export const orderService = {
  create: (data: { stockId: number; type: 'BUY' | 'SELL'; quantity: number; price: number }) =>
    api.post('/orders', data),
  history: () => api.get('/orders/history'),
}
