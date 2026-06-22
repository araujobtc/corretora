import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { stockService } from '@/services/stockService'
import { api } from '@/services/api'

export const useClockStore = defineStore('clock', () => {
  // Minuto atual do relógio (0–59). 0 = 14:00.
  // Fonte de verdade: backend (campo clock_minute na tabela users).
  // localStorage é usado como cache local para leitura imediata.
  const minute = ref<number>(parseInt(localStorage.getItem('clockMinute') || '0'))
  const advancing = ref(false)

  const prices  = ref<Record<string, number>>({})
  const closing = ref<Record<string, number>>({})
  const stockIds = ref<Record<string, number>>({})

  // Req #2: relógio começa às 14:00 (minuto 0)
  const timeLabel = computed(() => {
    const total = 14 * 60 + minute.value
    const h = Math.floor(total / 60)
    const m = total % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })

  async function init() {
    // 1. Busca o minuto salvo no backend (persistência real por usuário - Req #2)
    try {
      const meRes = await api.get('/users/me')
      if (typeof meRes.data.clockMinute === 'number') {
        minute.value = meRes.data.clockMinute
        localStorage.setItem('clockMinute', String(minute.value))
      }
    } catch {
      // fallback para localStorage se a API estiver indisponível
    }

    // 2. Carrega ações do banco (IDs e símbolos)
    const res = await stockService.all(200)
    const stocks: any[] = res.data.stocks
    for (const s of stocks) {
      stockIds.value[s.symbol] = s.id
      // Usa closingPrice como fallback de preço até o primeiro avanço
      prices.value[s.symbol]  = s.currentPrice ?? s.closingPrice ?? 0
      closing.value[s.symbol] = s.closingPrice ?? s.currentPrice ?? 0
    }

    // 3. Busca fechamentos reais da API do professor (mais precisos que o banco)
    try {
      const tickers = await stockService.fetchTickers()
      for (const t of tickers) {
        closing.value[t.ticker] = t.fechamento
        // Se ainda não há preço atual, usa o fechamento como valor inicial
        if (!prices.value[t.ticker]) prices.value[t.ticker] = t.fechamento
      }
    } catch {
      // continua com os fechamentos do banco
    }

    // 4. Busca preços do minuto atual para dados frescos
    try {
      const precos = await stockService.fetchMinute(minute.value)
      for (const p of precos) {
        prices.value[p.ticker] = p.preco
      }
    } catch {
      // continua com os preços já carregados
    }
  }

  /**
   * Avança o relógio em N minutos, consulta a API do professor e processa
   * ordens pendentes no backend.
   * Req #2: horário persistido no banco — sobrevive ao logout/login.
   */
  async function advance(mins: number): Promise<Record<string, number>> {
    if (advancing.value) return {}
    advancing.value = true
    try {
      const novoMinuto = (minute.value + mins) % 60

      // Busca preços do próximo minuto diretamente na API do professor
      const precosProfessor = await stockService.fetchMinute(novoMinuto)
      const novosPrecos: Record<string, number> = {}
      for (const p of precosProfessor) novosPrecos[p.ticker] = p.preco

      // Persiste o minuto no backend:
      // - a API /relogio/avancar já processa ordens pendentes e persiste o minuto
      // - fallback: POST /users/me/clock persiste apenas o minuto
      try {
        await api.post('/relogio/avancar', { minutos: mins })
      } catch {
        // fallback: persiste só o minuto caso /relogio/avancar falhe
        try {
          await api.post('/users/me/clock', { minute: novoMinuto })
        } catch {
          // último fallback: apenas localStorage
        }
      }

      // Atualiza o estado local com os novos preços
      for (const [sym, preco] of Object.entries(novosPrecos)) {
        prices.value[sym] = preco
      }
      minute.value = novoMinuto
      localStorage.setItem('clockMinute', String(novoMinuto))

      return novosPrecos
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
    init, advance, currentPrice, closingPrice, variation
  }
})
