import { api } from './api'

export const orderService = {
  /**
   * Cria uma ordem de compra ou venda.
   * Req #3 e #5: suporta limitPrice para ordens condicionais (compra abaixo / venda acima).
   */
  create: (data: {
    stockId: number
    type: 'BUY' | 'SELL'
    quantity: number
    price: number
    limitPrice?: number
  }) => api.post('/orders', data),

  history: () => api.get('/orders/history'),
}
