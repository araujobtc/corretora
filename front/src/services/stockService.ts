import { api } from './api'

const PROFESSOR_BASE = 'https://raw.githubusercontent.com/marciobarros/dsw-simulador-corretora/refs/heads/main'

export const stockService = {
  all: (limit = 100) => api.get('/stocks', { params: { limit } }),
  updatePrice: (id: number, currentPrice: number) =>
    api.patch(`/stocks/${id}/price`, { currentPrice }),

  // API do professor
  fetchTickers: async (): Promise<{ ticker: string; fechamento: number }[]> => {
    const r = await fetch(`${PROFESSOR_BASE}/tickers.json`)
    const json: unknown = await r.json()
    return json as { ticker: string; fechamento: number }[]
  },
  fetchMinute: async (minute: number): Promise<{ ticker: string; preco: number }[]> => {
    const r = await fetch(`${PROFESSOR_BASE}/${minute}.json`)
    const json: unknown = await r.json()
    return json as { ticker: string; preco: number }[]
  },
}
