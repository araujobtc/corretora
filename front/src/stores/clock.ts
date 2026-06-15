import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { stockService } from '@/services/stockService'

export const useClockStore = defineStore('clock', () => {
  // Minuto atual do relógio (0–59). 0 = 14:00
  const minute = ref<number>(parseInt(localStorage.getItem('clockMinute') || '0'))
  const advancing = ref(false)

  // Mapa símbolo → preço atual (atualizado a cada tick)
  const prices = ref<Record<string, number>>({})
  // Mapa símbolo → fechamento (carregado uma vez no boot)
  const closing = ref<Record<string, number>>({})
  // Mapa símbolo → stockId (para criar ordens)
  const stockIds = ref<Record<string, number>>({})

  const timeLabel = computed(() => {
    const total = 14 * 60 + minute.value
    const h = Math.floor(total / 60)
    const m = total % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })

  // Carrega tickers + fechamentos + preços atuais da API própria no boot
  async function init() {
    const res = await stockService.all(200)
    const stocks: any[] = res.data.stocks
    for (const s of stocks) {
      stockIds.value[s.symbol] = s.id
      prices.value[s.symbol] = s.currentPrice
      // closing_price pode não existir na API original; fallback = currentPrice
      closing.value[s.symbol] = s.closingPrice ?? s.currentPrice
    }

    // Busca fechamentos reais da API do professor (fonte de verdade)
    try {
      const tickers = await stockService.fetchTickers()
      for (const t of tickers) {
        closing.value[t.ticker] = t.fechamento
      }
    } catch {
      // continua com o fallback
    }
  }

  // Avança o relógio N minutos, busca preços e atualiza o banco
  async function advance(mins: number): Promise<Record<string, number>> {
    if (advancing.value) return {}
    advancing.value = true
    try {
      const novoMinuto = (minute.value + mins) % 60
      const precosProfessor = await stockService.fetchMinute(novoMinuto)

      // Mapa símbolo → novo preço
      const novoPrecos: Record<string, number> = {}
      for (const p of precosProfessor) novoPrecos[p.ticker] = p.preco

      // Atualiza o banco via PATCH individual (API disponível: PATCH /stocks/:id/price)
      await Promise.allSettled(
        precosProfessor
          .filter((p) => stockIds.value[p.ticker])
          .map((p) => stockService.updatePrice(stockIds.value[p.ticker], p.preco))
      )

      // Atualiza estado local
      for (const [sym, preco] of Object.entries(novoPrecos)) {
        prices.value[sym] = preco
      }
      minute.value = novoMinuto
      localStorage.setItem('clockMinute', String(novoMinuto))

      return novoPrecos
    } finally {
      advancing.value = false
    }
  }

  function currentPrice(symbol: string) {
    return prices.value[symbol] ?? 0
  }

  function closingPrice(symbol: string) {
    return closing.value[symbol] ?? prices.value[symbol] ?? 0
  }

  function variation(symbol: string) {
    const p = currentPrice(symbol)
    const c = closingPrice(symbol)
    const nom = p - c
    const pct = c > 0 ? (nom / c) * 100 : 0
    return { nom, pct }
  }

  return { minute, advancing, timeLabel, prices, closing, stockIds, init, advance, currentPrice, closingPrice, variation }
})
