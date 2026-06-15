<template>
  <nav class="navbar">
    <div class="navbar-inner">
      <router-link to="/market" class="brand">
        <span class="brand-icon">◈</span>
        <span class="brand-name">Corretora</span>
      </router-link>

      <div class="nav-links">
        <router-link to="/market" class="nav-link" active-class="nav-link--active">Mercado</router-link>
        <router-link to="/portfolio" class="nav-link" active-class="nav-link--active">Carteira</router-link>
        <router-link to="/account" class="nav-link" active-class="nav-link--active">Conta</router-link>
      </div>

      <div class="nav-right">
        <span class="balance">R$ {{ fmt(auth.user?.balance ?? 0) }}</span>
        <button class="btn-logout" @click="handleLogout">Sair</button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.navbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}
.navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 2rem;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--accent);
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.brand-icon { font-size: 1.3rem; }
.nav-links {
  display: flex;
  gap: 0.25rem;
  flex: 1;
}
.nav-link {
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  text-decoration: none;
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.15s;
}
.nav-link:hover { color: var(--text); background: var(--hover); }
.nav-link--active { color: var(--accent); background: var(--accent-dim); }
.nav-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: auto;
}
.balance {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  background: var(--hover);
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
}
.btn-logout {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.8rem;
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-logout:hover { border-color: var(--danger); color: var(--danger); }
</style>
