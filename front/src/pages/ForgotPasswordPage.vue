<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <h1 class="auth-title">Recuperar senha</h1>
      <p class="auth-sub">Informe seu e-mail e enviaremos instruções.</p>

      <div v-if="success" class="success-msg">{{ success }}</div>
      <div v-if="error" class="error-msg">{{ error }}</div>

      <div class="field">
        <label>E-mail</label>
        <input class="input" type="email" v-model="email" placeholder="voce@email.com" @keyup.enter="submit" />
      </div>

      <button class="btn btn-primary" style="width:100%;margin-top:0.5rem" :disabled="loading" @click="submit">
        {{ loading ? 'Enviando…' : 'Enviar instruções' }}
      </button>

      <div class="auth-footer">
        <router-link to="/login">← Voltar ao login</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { authService } from '@/services/authService'

const email = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function submit() {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    await authService.resetPassword({ email: email.value })
    success.value = 'Se o e-mail existir, as instruções foram enviadas.'
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Erro ao enviar'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.success-msg {
  background: var(--gain-dim);
  border: 1px solid var(--gain);
  color: var(--gain);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.9rem;
  font-size: 0.82rem;
  margin-bottom: 1rem;
}
</style>
