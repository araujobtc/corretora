import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { stockService } from '@/services/stockService'
import { api } from '@/services/api'

export const useClockStore = defineStore('clock', () => {
  // Minuto atual do relógio (0–59). 0 = 14:00
  // Lido do localStorage como cache local; fonte de verdade é o backend
  const minute = ref<number>(parseInt(localStorage.getItem('clockMinute') || '0'))
  const advancing = ref(false)

  const prices = ref<Record<string, number>>({})
  const closing = ref<Record<string, number>>({})
  const stockIds = ref<Record<string, number>>({})

  const timeLabel = computed(() => {
    const total = 14 * 60 + minute.value
    const h = Math.floor(total / 60)
    const m = total % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })

  // Rótulo do horário simulado para gravar em transações (ex: "14:03")
  function clockTimeLabel(min?: number) {
    const m = min ?? minute.value
    const total = 14 * 60 + m
    const h = Math.floor(total / 60)
    const mm = total % 60
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  async function init() {
    // 1. Busca minuto salvo no backend (persistência real por usuário - Req #2)
    try {
      const meRes = await api.get('/users/me')
      // Se a API tiver clockMinute, usa ele; senão usa o localStorage
      if (meRes.data.clockMinute !== undefined) {
        minute.value = meRes.data.clockMinute
        localStorage.setItem('clockMinute', String(minute.value))
      }
    } catch {
      // fallback para localStorage
    }

    // 2. Carrega stocks do banco
    const res = await stockService.all(200)
    const stocks: any[] = res.data.stocks
    for (const s of stocks) {
      stockIds.value[s.symbol] = s.id
      prices.value[s.symbol] = s.currentPrice
      closing.value[s.symbol] = s.closingPrice ?? s.currentPrice
    }

    // 3. Busca fechamentos reais da API do professor
    try {
      const tickers = await stockService.fetchTickers()
      for (const t of tickers) {
        closing.value[t.ticker] = t.fechamento
      }
    } catch {
      // continua com fallback
    }

    // 4. Busca preços do minuto atual para garantir dados frescos
    try {
      const precos = await stockService.fetchMinute(minute.value)
      for (const p of precos) {
        prices.value[p.ticker] = p.preco
      }
    } catch {
      // continua com preços do banco
    }
  }

  async function advance(mins: number): Promise<Record<string, number>> {
    if (advancing.value) return {}
    advancing.value = true
    try {
      const novoMinuto = (minute.value + mins) % 60
      const precosProfessor = await stockService.fetchMinute(novoMinuto)

      const novoPrecos: Record<string, number> = {}
      for (const p of precosProfessor) novoPrecos[p.ticker] = p.preco

      // Atualiza banco via PATCH individual
      await Promise.allSettled(
        precosProfessor
          .filter((p) => stockIds.value[p.ticker])
          .map((p) => stockService.updatePrice(stockIds.value[p.ticker], p.preco))
      )

      // Persiste o minuto no backend (Req #2 — persistência ao sair e voltar)
      try {
        await api.post('/users/me/clock', { minute: novoMinuto })
      } catch {
        // API pode não ter esse endpoint; fallback para localStorage apenas
      }

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

  return {
    minute, advancing, timeLabel, prices, closing, stockIds,
    init, advance, currentPrice, closingPrice, variation, clockTimeLabel
  }
})
