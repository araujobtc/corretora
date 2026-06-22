import { api } from './api'

export const watchlistService = {
  get: () => api.get('/watchlist'),
  add: (stockId: number) => api.post('/watchlist', { stockId }),
  remove: (stockId: number) => api.delete(`/watchlist/${stockId}`),
}
