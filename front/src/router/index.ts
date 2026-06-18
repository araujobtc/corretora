import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── Autenticação (públicas) ───────────────────────────────────────────────
    { path: '/login',           name: 'login',           component: () => import('@/pages/LoginPage.vue') },
    { path: '/register',        name: 'register',        component: () => import('@/pages/RegisterPage.vue') },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('@/pages/ForgotPasswordPage.vue') },
    // Passo 2 do reset: /reset-password?token=xxx
    { path: '/reset-password',  name: 'reset-password',  component: () => import('@/pages/ResetPasswordPage.vue') },

    // ── Área autenticada ──────────────────────────────────────────────────────
    { path: '/', redirect: '/market', meta: { requiresAuth: true } },

    { path: '/market',
      name: 'market',
      component: () => import('@/pages/MarketPage.vue'),
      meta: { requiresAuth: true } },

    { path: '/portfolio',
      name: 'portfolio',
      component: () => import('@/pages/PortfolioPage.vue'),
      meta: { requiresAuth: true } },

    // Req #6 — Conta Corrente: extrato, saldo, depósito e retirada
    { path: '/conta-corrente',
      name: 'conta-corrente',
      component: () => import('@/pages/CheckingAccountPage.vue'),
      meta: { requiresAuth: true } },

    // Req #1 — Perfil: informações do usuário e alteração de senha
    { path: '/perfil',
      name: 'perfil',
      component: () => import('@/pages/ProfilePage.vue'),
      meta: { requiresAuth: true } },

    // Retrocompatibilidade: /account redireciona para /conta-corrente
    { path: '/account', redirect: '/conta-corrente' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.user) {
    const token = localStorage.getItem('token')
    if (!token) return { name: 'login' }
    try {
      await auth.fetchMe()
    } catch {
      return { name: 'login' }
    }
    if (!auth.user) return { name: 'login' }
  }
  if ((to.name === 'login' || to.name === 'register') && auth.user) {
    return { name: 'market' }
  }
})

export default router
