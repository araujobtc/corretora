import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login',           name: 'login',           component: () => import('@/pages/LoginPage.vue') },
    { path: '/register',        name: 'register',        component: () => import('@/pages/RegisterPage.vue') },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('@/pages/ForgotPasswordPage.vue') },
    { path: '/',       redirect: '/market', meta: { requiresAuth: true } },
    { path: '/market',    name: 'market',    component: () => import('@/pages/MarketPage.vue'),    meta: { requiresAuth: true } },
    { path: '/portfolio', name: 'portfolio', component: () => import('@/pages/PortfolioPage.vue'), meta: { requiresAuth: true } },
    { path: '/account',   name: 'account',   component: () => import('@/pages/AccountPage.vue'),   meta: { requiresAuth: true } },
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
