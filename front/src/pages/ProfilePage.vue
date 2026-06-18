<template>
  <div>
    <Navbar />
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Meu Perfil</h1>
      </div>

      <!-- Informações do usuário -->
      <div class="card">
        <h3 class="section-title">Informações da conta</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Nome</span>
            <span class="info-val">{{ auth.user?.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">E-mail</span>
            <span class="info-val">{{ auth.user?.email }}</span>
          </div>
        </div>
      </div>

      <!-- Alterar senha (Req #1) -->
      <div class="card" style="margin-top:1.25rem">
        <h3 class="section-title">Segurança</h3>
        <p class="section-desc">Altere sua senha de acesso ao sistema.</p>

        <div v-if="pwdMsg" :class="pwdMsg.ok ? 'success-msg' : 'error-msg'" style="margin-bottom:1rem">
          {{ pwdMsg.text }}
        </div>

        <div class="pwd-form">
          <div class="field">
            <label>Senha atual</label>
            <input class="input" type="password" v-model="currentPwd" placeholder="••••••••" />
          </div>
          <div class="field">
            <label>Nova senha</label>
            <input
              class="input"
              type="password"
              v-model="newPwd"
              placeholder="Mínimo 6 caracteres"
              @keyup.enter="submitPwd"
            />
          </div>
          <button class="btn btn-primary" :disabled="pwdLoading" @click="submitPwd">
            {{ pwdLoading ? 'Salvando…' : 'Alterar senha' }}
          </button>
        </div>
      </div>

      <!-- Logout -->
      <div class="card" style="margin-top:1.25rem">
        <h3 class="section-title">Sessão</h3>
        <p class="section-desc">Encerre sua sessão no sistema.</p>
        <button class="btn btn-danger" @click="handleLogout">Sair da conta</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/authService'

const auth = useAuthStore()
const router = useRouter()

// ── Alterar senha (Req #1) ────────────────────────────────────────────────────
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
  if (newPwd.value.length < 6) {
    pwdMsg.value = { ok: false, text: 'A nova senha deve ter no mínimo 6 caracteres.' }
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

// ── Logout ────────────────────────────────────────────────────────────────────
function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.section-title {
  font-family: var(--font-display);
  font-weight: 700;
  margin-bottom: 0.4rem;
}
.section-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
}
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.info-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.info-val {
  font-size: 0.95rem;
  color: var(--text);
}
.pwd-form {
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 0rem;
}
.success-msg {
  background: var(--gain-dim);
  border: 1px solid var(--gain);
  color: var(--gain);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.9rem;
  font-size: 0.82rem;
}
.btn-danger {
  background: var(--danger, #ef4444);
  color: #fff;
  border: none;
  padding: 0.45rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-danger:hover { opacity: 0.85; }
</style>
