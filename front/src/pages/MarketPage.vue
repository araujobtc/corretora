<template>
  <div>
    <Navbar />
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Mercado</h1>
        <button class="btn btn-primary" @click="openAdd">+ Adicionar ação</button>
      </div>

      <ClockBar @advance="onAdvance" />

      <div class="card" style="padding:0;overflow:hidden">
        <table class="tbl">
          <thead>
            <tr>
              <th>Ticker</th>
              <th class="r">Preço</th>
              <th class="r">Variação R$</th>
              <th class="r">Variação %</th>
              <th class="r">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in watchlist"
              :key="item.stockId"
              :class="flashClass[item.symbol]"
            >
              <td><span class="ticker-sym">{{ item.symbol }}</span></td>
              <td class="r mono">R$ {{ fmt(clock.currentPrice(item.symbol)) }}</td>
              <td class="r mono" :class="varClass(clock.variation(item.symbol).nom)">
                {{ sign(clock.variation(item.symbol).nom) }}{{ fmt(Math.abs(clock.variation(item.symbol).nom)) }}
              </td>
              <td class="r mono" :class="varClass(clock.variation(item.symbol).pct)">
                {{ sign(clock.variation(item.symbol).pct) }}{{ fmtPct(Math.abs(clock.variation(item.symbol).pct)) }}%
              </td>
              <td class="r">
                <div style="display:flex;gap:0.5rem;justify-content:flex-end">
                  <button class="btn btn-gain" style="padding:0.3rem 0.75rem;font-size:0.78rem" @click="openBuy(item)">Comprar</button>
                  <button class="btn btn-ghost" style="padding:0.3rem 0.75rem;font-size:0.78rem" @click="removeItem(item)">✕</button>
                </div>
              </td>
            </tr>
            <tr v-if="watchlist.length === 0">
              <td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">
                Nenhuma ação na sua lista. Clique em "Adicionar ação".
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: adicionar ação -->
    <Modal v-if="showAdd" title="Adicionar ação" @close="showAdd=false">
      <div class="field">
        <label>Ticker disponível</label>
        <select class="input" v-model="addStockId">
          <option value="">Selecione…</option>
          <option v-for="s in availableStocks" :key="s.id" :value="s.id">
            {{ s.symbol }} — R$ {{ fmt(s.currentPrice) }}
          </option>
        </select>
      </div>
      <div v-if="addError" class="error-msg">{{ addError }}</div>
      <div style="display:flex;gap:0.75rem;margin-top:0.5rem">
        <button class="btn btn-primary" :disabled="!addStockId || addLoading" @click="confirmAdd">
          {{ addLoading ? 'Adicionando…' : 'Adicionar' }}
        </button>
        <button class="btn btn-ghost" @click="showAdd=false">Cancelar</button>
      </div>
    </Modal>

    <!-- Modal: compra (Req #3) -->
    <Modal v-if="buyItem" :title="`Comprar ${buyItem.symbol}`" @close="buyItem=null">
      <div class="buy-price-row">
        <span class="muted">Preço atual</span>
        <span class="mono big-price">R$ {{ fmt(clock.currentPrice(buyItem.symbol)) }}</span>
      </div>

      <div class="field">
        <label>Quantidade</label>
        <input class="input" type="number" min="1" v-model.number="buyQty" />
      </div>

      <div class="field">
        <label>Tipo de ordem</label>
        <div class="radio-group">
          <label class="radio-opt"><input type="radio" v-model="buyType" value="market" /> A valor de mercado</label>
          <label class="radio-opt"><input type="radio" v-model="buyType" value="limit" /> Abaixo de</label>
        </div>
      </div>

      <div class="field" v-if="buyType === 'limit'">
        <label>Preço limite (R$)</label>
        <input class="input" type="number" step="0.01" min="0.01" v-model.number="buyLimit" />
        <span class="field-hint">
          A compra será executada quando o preço atingir ou ficar abaixo de R$ {{ fmt(buyLimit) }}.
          <template v-if="clock.currentPrice(buyItem.symbol) <= buyLimit">
            <strong class="gain"> O preço atual já satisfaz a condição — será executada agora.</strong>
          </template>
        </span>
      </div>

      <div v-if="buyError" class="error-msg">{{ buyError }}</div>

      <div class="cost-preview" v-if="buyQty > 0">
        <span class="muted">Total estimado</span>
        <span class="mono">R$ {{ fmt(buyQty * (buyType === 'limit' ? Math.min(buyLimit, clock.currentPrice(buyItem.symbol)) : clock.currentPrice(buyItem.symbol))) }}</span>
      </div>

      <div style="display:flex;gap:0.75rem;margin-top:1rem">
        <button class="btn btn-gain" :disabled="buyLoading" @click="confirmBuy">
          {{ buyLoading ? 'Processando…' : 'Confirmar compra' }}
        </button>
        <button class="btn btn-ghost" @click="buyItem=null">Cancelar</button>
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
import { watchlistService } from '@/services/watchlistService'
import { orderService } from '@/services/orderService'
import { stockService } from '@/services/stockService'
import { api } from '@/services/api'

const clock = useClockStore()
const auth = useAuthStore()

interface WItem { stockId: number; symbol: string }
const watchlist = ref<WItem[]>([])
const flashClass = ref<Record<string, string>>({})

onMounted(async () => {
  await clock.init()
  const res = await watchlistService.get()
  watchlist.value = res.data.map((w: any) => ({ stockId: w.stockId, symbol: w.symbol }))

  // Novo usuário: 10 ações aleatórias (Req #2)
  if (watchlist.value.length === 0) {
    const all = (await stockService.all(200)).data.stocks
    const escolhidas = [...all].sort(() => Math.random() - 0.5).slice(0, 10)
    for (const s of escolhidas) {
      await watchlistService.add(s.id).catch(() => {})
      watchlist.value.push({ stockId: s.id, symbol: s.symbol })
    }
  }
})

// ── Avançar relógio (Req #2) ──────────────────────────────────────────────────
async function onAdvance(mins: number) {
  const prevPrecos: Record<string, number> = {}
  for (const w of watchlist.value) prevPrecos[w.symbol] = clock.currentPrice(w.symbol)

  const novos = await clock.advance(mins)

  for (const w of watchlist.value) {
    const prev = prevPrecos[w.symbol]
    const novo = novos[w.symbol]
    if (novo === undefined || novo === prev) continue
    flashClass.value[w.symbol] = novo > prev ? 'flash-gain' : 'flash-loss'
    setTimeout(() => { flashClass.value[w.symbol] = '' }, 1200)
  }
}

// ── Adicionar ação (Req #2) ───────────────────────────────────────────────────
const showAdd = ref(false)
const addStockId = ref<number | ''>('')
const addLoading = ref(false)
const addError = ref('')
const allStocks = ref<any[]>([])

const availableStocks = computed(() => {
  const ids = new Set(watchlist.value.map(w => w.stockId))
  return allStocks.value.filter(s => !ids.has(s.id))
})

async function openAdd() {
  addError.value = ''
  addStockId.value = ''
  if (allStocks.value.length === 0) {
    allStocks.value = (await stockService.all(200)).data.stocks
  }
  showAdd.value = true
}

async function confirmAdd() {
  if (!addStockId.value) return
  addLoading.value = true
  addError.value = ''
  try {
    await watchlistService.add(Number(addStockId.value))
    const s = allStocks.value.find(x => x.id === addStockId.value)!
    watchlist.value.push({ stockId: s.id, symbol: s.symbol })
    showAdd.value = false
  } catch (e: any) {
    addError.value = e.response?.data?.error ?? 'Erro ao adicionar'
  } finally {
    addLoading.value = false
  }
}

// ── Remover ação (Req #2) ─────────────────────────────────────────────────────
async function removeItem(item: WItem) {
  await watchlistService.remove(item.stockId)
  watchlist.value = watchlist.value.filter(w => w.stockId !== item.stockId)
}

// ── Compra (Req #3) ───────────────────────────────────────────────────────────
const buyItem = ref<WItem | null>(null)
const buyQty = ref(1)
const buyType = ref<'market' | 'limit'>('market')
const buyLimit = ref(0)
const buyLoading = ref(false)
const buyError = ref('')

function openBuy(item: WItem) {
  buyItem.value = item
  buyQty.value = 1
  buyType.value = 'market'
  buyLimit.value = clock.currentPrice(item.symbol)
  buyError.value = ''
}

async function confirmBuy() {
  if (!buyItem.value) return
  buyError.value = ''

  // Req #3: não aceita zero ou negativo
  if (!buyQty.value || buyQty.value <= 0) {
    buyError.value = 'Quantidade deve ser maior que zero.'
    return
  }

  const precoAtual = clock.currentPrice(buyItem.value.symbol)

  let priceToUse: number

  if (buyType.value === 'limit') {
    if (!buyLimit.value || buyLimit.value <= 0) {
      buyError.value = 'Informe um preço limite válido.'
      return
    }
    // Req #3: executa imediatamente se o preço atual já está abaixo do limite
    // A API não suporta ordens pendentes, então executamos ao preço atual
    if (precoAtual <= buyLimit.value) {
      priceToUse = precoAtual
    } else {
      buyError.value = `O preço atual (R$ ${fmt(precoAtual)}) está acima do seu limite (R$ ${fmt(buyLimit.value)}). Aguarde o relógio avançar até o preço atingir seu limite.`
      return
    }
  } else {
    priceToUse = precoAtual
  }

  buyLoading.value = true
  try {
    await orderService.create({
      stockId: buyItem.value.stockId,
      type: 'BUY',
      quantity: buyQty.value,
      price: priceToUse,
    })
    const me = await api.get('/users/me')
    auth.setBalance(me.data.balance)
    buyItem.value = null
  } catch (e: any) {
    buyError.value = e.response?.data?.error ?? 'Erro ao criar ordem'
  } finally {
    buyLoading.value = false
  }
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const sign = (v: number) => v >= 0 ? '+' : '−'
const varClass = (v: number) => v > 0 ? 'gain' : v < 0 ? 'loss' : 'muted'
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.ticker-sym { font-family: var(--font-mono); font-weight: 500; font-size: 0.9rem; color: var(--text); letter-spacing: 0.04em; }
.mono { font-family: var(--font-mono); }
.buy-price-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding: 0.75rem 1rem; background: var(--bg); border-radius: var(--radius-sm); }
.big-price { font-size: 1.1rem; font-weight: 600; color: var(--text); }
.cost-preview { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.85rem; background: var(--accent-dim); border-radius: var(--radius-sm); font-size: 0.875rem; }
.field-hint { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem; display: block; }
</style>
