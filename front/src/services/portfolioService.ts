import { api } from './api'

export const portfolioService = {
  get: () => api.get('/portfolio'),
}
