<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="brand-header">
        <span class="brand-sym">◈</span>
        <span class="brand-txt">Corretora</span>
      </div>
      <h1 class="auth-title">Entrar</h1>
      <p class="auth-sub">Acesse sua conta para negociar.</p>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <div class="field">
        <label>E-mail</label>
        <input class="input" type="email" v-model="email" placeholder="voce@email.com" @keyup.enter="submit" />
      </div>
      <div class="field">
        <label>Senha</label>
        <input class="input" type="password" v-model="password" placeholder="••••••" @keyup.enter="submit" />
      </div>

      <button class="btn btn-primary" style="width:100%;margin-top:0.5rem" :disabled="loading" @click="submit">
        {{ loading ? 'Entrando…' : 'Entrar' }}
      </button>

      <div class="auth-footer">
        <router-link to="/forgot-password">Esqueci minha senha</router-link>
        &nbsp;·&nbsp;
        <router-link to="/register">Criar conta</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/market')
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Erro ao entrar'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.brand-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.brand-sym { font-size: 1.4rem; color: var(--accent); }
.brand-txt { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; color: var(--accent); }
</style>
