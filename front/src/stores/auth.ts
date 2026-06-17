import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/services/api'
import { authService } from '@/services/authService'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{ id: number; name: string; email: string; balance: number } | null>(null)

  async function fetchMe() {
    const res = await api.get('/users/me')
    user.value = res.data
  }

  async function login(email: string, password: string) {
    const res = await authService.login({ email, password })
    const data = res.data
    localStorage.setItem('token', data.token)
    user.value = { id: data.id, name: data.name, email: data.email, balance: data.balance }
    // Restaura o minuto do relógio do usuário logado (Req #2)
    if (data.clockMinute !== undefined) {
      localStorage.setItem('clockMinute', String(data.clockMinute))
    }
  }

  async function register(name: string, email: string, password: string) {
    const res = await authService.register({ name, email, password })
    const data = res.data
    localStorage.setItem('token', data.token)
    localStorage.setItem('clockMinute', '0')
    user.value = { id: data.id, name: data.name, email: data.email, balance: data.balance }
  }

  function logout() {
    localStorage.removeItem('token')
    // NÃO apaga clockMinute — é restaurado no próximo login pelo backend
    user.value = null
  }

  function setBalance(b: number) {
    if (user.value) user.value.balance = b
  }

  return { user, fetchMe, login, register, logout, setBalance }
})
