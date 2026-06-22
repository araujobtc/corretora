<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <h1 class="auth-title">Redefinir senha</h1>

      <!-- Token ausente ou inválido na URL -->
      <div v-if="!token" class="error-msg">
        Link inválido ou expirado. Solicite um novo link de recuperação.
        <div style="margin-top:1rem">
          <router-link to="/forgot-password" class="btn btn-primary" style="display:inline-block">
            Solicitar novo link
          </router-link>
        </div>
      </div>

      <!-- Formulário de nova senha -->
      <template v-else>
        <p class="auth-sub">Escolha uma nova senha para sua conta.</p>

        <div v-if="success" class="success-msg">
          {{ success }}
          <div style="margin-top:1rem">
            <router-link to="/login" class="btn btn-primary" style="display:inline-block">
              Ir para o login
            </router-link>
          </div>
        </div>

        <template v-if="!success">
          <div v-if="error" class="error-msg">{{ error }}</div>

          <div class="field">
            <label>Nova senha</label>
            <input
              class="input"
              type="password"
              v-model="newPassword"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div class="field">
            <label>Confirmar nova senha</label>
            <input
              class="input"
              type="password"
              v-model="confirmPassword"
              placeholder="Repita a nova senha"
              @keyup.enter="submit"
            />
          </div>

          <button
            class="btn btn-primary"
            style="width:100%;margin-top:0.5rem"
            :disabled="loading"
            @click="submit"
          >
            {{ loading ? 'Salvando…' : 'Redefinir senha' }}
          </button>
        </template>
      </template>

      <div class="auth-footer">
        <router-link to="/login">← Voltar ao login</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { authService } from '@/services/authService'

const route = useRoute()

// Token vem da query string: /reset-password?token=abc123
const token = ref((route.query.token as string) || '')

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function submit() {
  error.value = ''
  if (!newPassword.value || newPassword.value.length < 6) {
    error.value = 'A senha deve ter no mínimo 6 caracteres.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'As senhas não conferem.'
    return
  }
  loading.value = true
  try {
    await authService.confirmResetPassword({ token: token.value, newPassword: newPassword.value })
    success.value = 'Senha redefinida com sucesso! Faça login com sua nova senha.'
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Erro ao redefinir senha. O link pode ter expirado.'
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
