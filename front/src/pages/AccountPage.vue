<template>
  <div>
    <Navbar />
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Conta Corrente</h1>
        <router-link to="/portfolio" class="btn btn-ghost">← Carteira</router-link>
      </div>

      <!-- Saldo + botões (Req #6) -->
      <div class="balance-card">
        <div>
          <p class="bal-label">Saldo disponível</p>
          <p class="bal-val">R$ {{ fmt(auth.user?.balance ?? 0) }}</p>
        </div>
        <div style="display:flex;gap:0.75rem">
          <button class="btn btn-gain" @click="openModal('DEPOSIT')">+ Depósito</button>
          <button class="btn btn-loss" @click="openModal('WITHDRAW')">− Retirada</button>
        </div>
      </div>

      <!-- Extrato (Req #6) — ordem cronológica com saldo após cada lançamento -->
      <div class="card" style="padding:0;overflow:hidden;margin-top:1.5rem">
        <div class="extrato-header">Extrato</div>
        <table class="tbl">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Descrição</th>
              <th class="r">Tipo</th>
              <th class="r">Valor</th>
              <th class="r">Saldo após</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in transacoesExibidas" :key="t.id">
              <td class="mono muted" style="font-size:0.78rem;white-space:nowrap">{{ fmtDate(t.createdAt) }}</td>
              <td style="font-size:0.85rem">{{ t.description }}</td>
              <td class="r">
                <span class="badge" :class="badgeClass(t.type)">{{ labelType(t.type) }}</span>
              </td>
              <td class="r mono" :class="isCredito(t.type) ? 'gain' : 'loss'">
                {{ isCredito(t.type) ? '+' : '−' }} R$ {{ fmt(t.amount) }}
              </td>
              <!--
                Req #6: saldo após cada lançamento.
                Prioriza o valor retornado pela API (balanceAfter já calculado no backend).
                Se não vier da API (registros antigos sem a coluna), usa cálculo local como fallback.
              -->
              <td class="r mono" style="font-size:0.85rem">
                R$ {{ fmt(t.balanceAfter ?? t.balanceCalculado) }}
              </td>
            </tr>
            <tr v-if="transactions.length === 0">
              <td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">
                Nenhum lançamento ainda.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Alterar senha (Req #1) -->
      <div class="card" style="margin-top:1.5rem">
        <h3 class="section-title">Segurança</h3>
        <button class="btn btn-ghost" @click="showPwd = !showPwd">
          {{ showPwd ? 'Fechar' : 'Alterar senha' }}
        </button>
        <div v-if="showPwd" class="pwd-form">
          <div v-if="pwdMsg" :class="pwdMsg.ok ? 'success-msg' : 'error-msg'">{{ pwdMsg.text }}</div>
          <div class="field" style="margin-top:1rem">
            <label>Senha atual</label>
            <input class="input" type="password" v-model="currentPwd" />
          </div>
          <div class="field">
            <label>Nova senha</label>
            <input class="input" type="password" v-model="newPwd" @keyup.enter="submitPwd" />
          </div>
          <button class="btn btn-primary" :disabled="pwdLoading" @click="submitPwd">
            {{ pwdLoading ? 'Salvando…' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal depósito / retirada (Req #6) -->
    <Modal v-if="modalType" :title="modalType === 'DEPOSIT' ? 'Novo depósito' : 'Nova retirada'" @close="modalType=null">
      <div class="field">
        <label>Descrição</label>
        <input class="input" type="text" v-model="modalDesc" placeholder="Ex: Aporte inicial" />
      </div>
      <div class="field">
        <label>Valor (R$)</label>
        <input class="input" type="number" step="0.01" min="0.01" v-model.number="modalAmt" />
      </div>
      <div v-if="modalError" class="error-msg">{{ modalError }}</div>
      <div style="display:flex;gap:0.75rem;margin-top:0.5rem">
        <button
          class="btn"
          :class="modalType === 'DEPOSIT' ? 'btn-gain' : 'btn-loss'"
          :disabled="modalLoading"
          @click="confirmModal"
        >
          {{ modalLoading ? 'Processando…' : 'Confirmar' }}
        </button>
        <button class="btn btn-ghost" @click="modalType=null">Cancelar</button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Modal from '@/components/Modal.vue'
import { useAuthStore } from '@/stores/auth'
import { userService } from '@/services/userService'
import { authService } from '@/services/authService'
import { api } from '@/services/api'

const auth = useAuthStore()

interface Tx {
  id: number
  type: string
  amount: number
  description: string
  createdAt: string
  balanceAfter: number | null
}

const transactions = ref<Tx[]>([])

/**
 * Req #6: Exibe saldo após cada lançamento.
 * Usa `balanceAfter` vindo da API (calculado no backend e gravado no banco).
 * Para registros antigos que não possuem o campo, aplica cálculo acumulado como fallback.
 */
const transacoesExibidas = computed(() => {
  let saldoAcumulado = 0
  return transactions.value.map(t => {
    if (isCredito(t.type)) {
      saldoAcumulado += t.amount
    } else {
      saldoAcumulado -= t.amount
    }
    return {
      ...t,
      // balanceAfter: vem da API (backend calcula e persiste no banco)
      // balanceCalculado: fallback acumulado caso o campo não exista
      balanceCalculado: saldoAcumulado
    }
  })
})

onMounted(loadAll)

async function loadAll() {
  const [txRes, meRes] = await Promise.all([
    userService.transactions(500),
    api.get('/users/me')
  ])
  // API já retorna em ordem cronológica crescente (ORDER BY created_at ASC)
  transactions.value = txRes.data.transactions
  auth.setBalance(meRes.data.balance)
}

// ── Modal depósito / retirada (Req #6) ────────────────────────────────────────
const modalType = ref<'DEPOSIT' | 'WITHDRAW' | null>(null)
const modalDesc = ref('')
const modalAmt = ref<number>(0)
const modalLoading = ref(false)
const modalError = ref('')

function openModal(t: 'DEPOSIT' | 'WITHDRAW') {
  modalType.value = t
  modalDesc.value = ''
  modalAmt.value = 0
  modalError.value = ''
}

async function confirmModal() {
  // Req #6: rejeita valor zero ou negativo
  if (!modalDesc.value.trim()) { modalError.value = 'Informe uma descrição.'; return }
  if (!modalAmt.value || modalAmt.value <= 0) {
    modalError.value = 'O valor deve ser positivo e diferente de zero.'
    return
  }
  modalLoading.value = true
  modalError.value = ''
  try {
    if (modalType.value === 'DEPOSIT') {
      await userService.deposit(modalAmt.value, modalDesc.value)
    } else {
      await userService.withdraw(modalAmt.value, modalDesc.value)
    }
    modalType.value = null
    await loadAll()
  } catch (e: any) {
    modalError.value = e.response?.data?.error ?? 'Erro ao processar operação.'
  } finally {
    modalLoading.value = false
  }
}

// ── Alterar senha (Req #1) ────────────────────────────────────────────────────
const showPwd = ref(false)
const currentPwd = ref('')
const newPwd = ref('')
const pwdLoading = ref(false)
const pwdMsg = ref<{ ok: boolean; text: string } | null>(null)

async function submitPwd() {
  pwdMsg.value = null
  if (!currentPwd.value || !newPwd.value) {
    pwdMsg.value = { ok: false, text: 'Preencha os dois campos de senha.' }
    return
  }
  pwdLoading.value = true
  try {
    await authService.changePassword({ currentPassword: currentPwd.value, newPassword: newPwd.value })
    pwdMsg.value = { ok: true, text: 'Senha alterada com sucesso!' }
    currentPwd.value = ''
    newPwd.value = ''
  } catch (e: any) {
    pwdMsg.value = { ok: false, text: e.response?.data?.error ?? 'Erro ao alterar senha.' }
  } finally {
    pwdLoading.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function fmtDate(dt: string) {
  return new Date(dt).toLocaleString('pt-BR')
}

const isCredito = (t: string) => t === 'DEPOSIT' || t === 'SELL'
const labelType = (t: string) =>
  ({ DEPOSIT: 'Depósito', WITHDRAW: 'Retirada', BUY: 'Compra', SELL: 'Venda' }[t] ?? t)
const badgeClass = (t: string) => isCredito(t) ? 'badge-gain' : 'badge-loss'
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.balance-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem 2rem; display: flex; align-items: center; justify-content: space-between; }
.bal-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.3rem; }
.bal-val { font-family: var(--font-mono); font-size: 1.8rem; font-weight: 700; color: var(--accent); }
.extrato-header { padding: 1rem 1.25rem 0.75rem; font-family: var(--font-display); font-weight: 700; font-size: 0.95rem; border-bottom: 1px solid var(--border); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.section-title { font-family: var(--font-display); font-weight: 700; margin-bottom: 1rem; }
.pwd-form { margin-top: 1rem; max-width: 380px; }
.mono { font-family: var(--font-mono); }
.success-msg { background: var(--gain-dim); border: 1px solid var(--gain); color: var(--gain); border-radius: var(--radius-sm); padding: 0.6rem 0.9rem; font-size: 0.82rem; margin-bottom: 1rem; }
</style>
