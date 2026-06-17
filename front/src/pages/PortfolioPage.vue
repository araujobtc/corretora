<template>
  <div>
    <Navbar />
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Carteira</h1>
        <router-link to="/account" class="btn btn-ghost">Conta corrente →</router-link>
      </div>

      <ClockBar @advance="onAdvance" />

      <!-- Resumo ganhos/perdas (Req #4) -->
      <div class="summary-row">
        <div class="sum-card">
          <span class="sum-label">Investido</span>
          <span class="sum-val">R$ {{ fmt(summary.totalInvested) }}</span>
        </div>
        <div class="sum-card">
          <span class="sum-label">Valor atual</span>
          <span class="sum-val">R$ {{ fmt(summary.totalCurrent) }}</span>
        </div>
        <div class="sum-card" :class="summary.totalGainLoss >= 0 ? 'sum-gain' : 'sum-loss'">
          <span class="sum-label">Ganho / Perda</span>
          <span class="sum-val">
            {{ summary.totalGainLoss >= 0 ? '+' : '−' }}R$ {{ fmt(Math.abs(summary.totalGainLoss)) }}
            <small>({{ summary.totalGainLoss >= 0 ? '+' : '−' }}{{ fmtPct(Math.abs(summary.totalGainLossPercent)) }}%)</small>
          </span>
        </div>
      </div>

      <!-- Tabela de posições (Req #4 e #5) -->
      <div class="card" style="padding:0;overflow:hidden;margin-top:1.5rem">
        <table class="tbl">
          <thead>
            <tr>
              <th>Ticker</th>
              <th class="r">Qtd</th>
              <th class="r">Preço médio</th>
              <th class="r">Preço atual</th>
              <th class="r">Var. R$</th>
              <th class="r">Var. %</th>
              <th class="r">Ganho/Perda</th>
              <th class="r">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pos in positions"
              :key="pos.stockId"
              :class="flashClass[pos.symbol]"
            >
              <td><span class="ticker-sym">{{ pos.symbol }}</span></td>
              <td class="r mono">{{ pos.quantity }}</td>
              <td class="r mono">R$ {{ fmt(pos.averagePrice) }}</td>
              <td class="r mono">R$ {{ fmt(livePrice(pos)) }}</td>
              <td class="r mono" :class="varClass(liveVar(pos).nom)">
                {{ sign(liveVar(pos).nom) }}{{ fmt(Math.abs(liveVar(pos).nom)) }}
              </td>
              <td class="r mono" :class="varClass(liveVar(pos).pct)">
                {{ sign(liveVar(pos).pct) }}{{ fmtPct(Math.abs(liveVar(pos).pct)) }}%
              </td>
              <td class="r mono" :class="varClass(liveGain(pos))">
                {{ sign(liveGain(pos)) }}R$ {{ fmt(Math.abs(liveGain(pos))) }}
              </td>
              <td class="r">
                <button class="btn btn-loss" style="padding:0.3rem 0.75rem;font-size:0.78rem" @click="openSell(pos)">
                  Vender
                </button>
              </td>
            </tr>
            <tr v-if="positions.length === 0">
              <td colspan="8" style="text-align:center;color:var(--text-muted);padding:2rem">
                Carteira vazia. Compre ações no Mercado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: venda (Req #5) -->
    <Modal v-if="sellPos" :title="`Vender ${sellPos.symbol}`" @close="sellPos=null">
      <div class="buy-price-row">
        <span class="muted">Preço atual</span>
        <span class="mono big-price">R$ {{ fmt(livePrice(sellPos)) }}</span>
        <span class="muted">Em carteira: {{ sellPos.quantity }}</span>
      </div>

      <div class="field">
        <label>Quantidade</label>
        <input class="input" type="number" min="1" :max="sellPos.quantity" v-model.number="sellQty" />
      </div>

      <div class="field">
        <label>Tipo de ordem</label>
        <div class="radio-group">
          <label class="radio-opt"><input type="radio" v-model="sellType" value="market" /> A valor de mercado</label>
          <label class="radio-opt"><input type="radio" v-model="sellType" value="limit" /> A partir de</label>
        </div>
      </div>

      <div class="field" v-if="sellType === 'limit'">
        <label>Preço mínimo (R$)</label>
        <input class="input" type="number" step="0.01" min="0.01" v-model.number="sellLimit" />
        <span class="field-hint">
          A venda será executada quando o preço atingir ou ultrapassar R$ {{ fmt(sellLimit) }}.
          <template v-if="livePrice(sellPos) >= sellLimit">
            <strong class="gain"> O preço atual já satisfaz a condição — será executada agora.</strong>
          </template>
        </span>
      </div>

      <div v-if="sellError" class="error-msg">{{ sellError }}</div>

      <div class="cost-preview" v-if="sellQty > 0">
        <span class="muted">Total estimado</span>
        <span class="mono">R$ {{ fmt(sellQty * livePrice(sellPos)) }}</span>
      </div>

      <div style="display:flex;gap:0.75rem;margin-top:1rem">
        <button class="btn btn-loss" :disabled="sellLoading" @click="confirmSell">
          {{ sellLoading ? 'Processando…' : 'Confirmar venda' }}
        </button>
        <button class="btn btn-ghost" @click="sellPos=null">Cancelar</button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import ClockBar from '@/components/ClockBar.vue'
import Modal from '@/components/Modal.vue'
import { useClockStore } from '@/stores/clock'
import { useAuthStore } from '@/stores/auth'
import { portfolioService } from '@/services/portfolioService'
import { orderService } from '@/services/orderService'
import { api } from '@/services/api'

const clock = useClockStore()
const auth = useAuthStore()

interface Pos {
  stockId: number; symbol: string; quantity: number
  averagePrice: number; currentPrice: number
  gainLoss: number; gainLossPercent: number
  totalInvested: number; totalCurrent: number
}

const positions = ref<Pos[]>([])
const flashClass = ref<Record<string, string>>({})

const summary = computed(() => {
  const invested = positions.value.reduce((s, p) => s + p.averagePrice * p.quantity, 0)
  const current = positions.value.reduce((s, p) => s + livePrice(p) * p.quantity, 0)
  const gain = current - invested
  const pct = invested > 0 ? (gain / invested) * 100 : 0
  return { totalInvested: invested, totalCurrent: current, totalGainLoss: gain, totalGainLossPercent: pct }
})

onMounted(async () => {
  await clock.init()
  await loadPortfolio()
})

async function loadPortfolio() {
  const res = await portfolioService.get()
  positions.value = res.data.positions
}

function livePrice(pos: Pos) {
  return clock.prices[pos.symbol] ?? pos.currentPrice
}
function liveVar(pos: Pos) {
  const p = livePrice(pos)
  const c = clock.closingPrice(pos.symbol)
  const nom = p - c
  const pct = c > 0 ? (nom / c) * 100 : 0
  return { nom, pct }
}
function liveGain(pos: Pos) {
  return (livePrice(pos) - pos.averagePrice) * pos.quantity
}

async function onAdvance(mins: number) {
  const prev: Record<string, number> = {}
  for (const p of positions.value) prev[p.symbol] = livePrice(p)

  const novos = await clock.advance(mins)

  for (const p of positions.value) {
    const pv = prev[p.symbol]
    const nv = novos[p.symbol]
    if (nv === undefined || nv === pv) continue
    flashClass.value[p.symbol] = nv > pv ? 'flash-gain' : 'flash-loss'
    setTimeout(() => { flashClass.value[p.symbol] = '' }, 1200)
  }
}

// ── Venda (Req #5) ────────────────────────────────────────────────────────────
const sellPos = ref<Pos | null>(null)
const sellQty = ref(1)
const sellType = ref<'market' | 'limit'>('market')
const sellLimit = ref(0)
const sellLoading = ref(false)
const sellError = ref('')

function openSell(pos: Pos) {
  sellPos.value = pos
  sellQty.value = 1
  sellType.value = 'market'
  sellLimit.value = livePrice(pos)
  sellError.value = ''
}

async function confirmSell() {
  if (!sellPos.value) return
  sellError.value = ''

  // Req #5: não aceita zero ou negativo
  if (!sellQty.value || sellQty.value <= 0) {
    sellError.value = 'Quantidade deve ser maior que zero.'
    return
  }
  if (sellQty.value > sellPos.value.quantity) {
    sellError.value = 'Quantidade maior que o disponível em carteira.'
    return
  }

  const precoAtual = livePrice(sellPos.value)
  let priceToUse: number

  if (sellType.value === 'limit') {
    if (!sellLimit.value || sellLimit.value <= 0) {
      sellError.value = 'Informe um preço mínimo válido.'
      return
    }
    // Req #5: executa imediatamente se o preço atual já está acima do limite
    if (precoAtual >= sellLimit.value) {
      priceToUse = precoAtual
    } else {
      sellError.value = `O preço atual (R$ ${fmt(precoAtual)}) está abaixo do seu mínimo (R$ ${fmt(sellLimit.value)}). Aguarde o relógio avançar até o preço atingir seu mínimo.`
      return
    }
  } else {
    priceToUse = precoAtual
  }

  sellLoading.value = true
  try {
    await orderService.create({
      stockId: sellPos.value.stockId,
      type: 'SELL',
      quantity: sellQty.value,
      price: priceToUse,
    })
    const me = await api.get('/users/me')
    auth.setBalance(me.data.balance)
    sellPos.value = null
    await loadPortfolio()
  } catch (e: any) {
    sellError.value = e.response?.data?.error ?? 'Erro ao criar ordem'
  } finally {
    sellLoading.value = false
  }
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const sign = (v: number) => v >= 0 ? '+' : '−'
const varClass = (v: number) => v > 0 ? 'gain' : v < 0 ? 'loss' : 'muted'
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.summary-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; }
.sum-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.35rem; }
.sum-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.sum-val { font-family: var(--font-mono); font-size: 1.1rem; font-weight: 600; color: var(--text); }
.sum-val small { font-size: 0.8rem; opacity: 0.75; margin-left: 0.35rem; }
.sum-gain { border-color: var(--gain); background: var(--gain-dim); }
.sum-gain .sum-val { color: var(--gain); }
.sum-loss { border-color: var(--loss); background: var(--loss-dim); }
.sum-loss .sum-val { color: var(--loss); }
.ticker-sym { font-family: var(--font-mono); font-weight: 500; letter-spacing: 0.04em; }
.mono { font-family: var(--font-mono); }
.buy-price-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding: 0.75rem 1rem; background: var(--bg); border-radius: var(--radius-sm); flex-wrap: wrap; gap: 0.5rem; }
.big-price { font-size: 1.1rem; font-weight: 600; color: var(--text); }
.cost-preview { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.85rem; background: var(--accent-dim); border-radius: var(--radius-sm); font-size: 0.875rem; }
.field-hint { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem; display: block; }
</style>
