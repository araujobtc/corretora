<template>
  <div class="clock-bar">
    <div class="clock-time">
      <span class="clock-icon">◷</span>
      <span class="clock-label">{{ clock.timeLabel }}</span>
      <span class="clock-suffix">hr</span>
    </div>
    <button class="clock-btn" :disabled="clock.advancing" @click="$emit('advance', 1)">
      <span>+1 min</span>
    </button>
    <button class="clock-btn" :disabled="clock.advancing" @click="$emit('advance', 5)">
      <span>+5 min</span>
    </button>
    <span v-if="clock.advancing" class="clock-loading">atualizando…</span>
  </div>
</template>

<script setup lang="ts">
import { useClockStore } from '@/stores/clock'
const clock = useClockStore()
defineEmits<{ (e: 'advance', mins: number): void }>()
</script>

<style scoped>
.clock-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.6rem 1.2rem;
  margin-bottom: 1.5rem;
}
.clock-time {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-right: 0.5rem;
}
.clock-icon { font-size: 1rem; color: var(--accent); }
.clock-label {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.05em;
}
.clock-suffix { font-size: 0.75rem; color: var(--text-muted); }
.clock-btn {
  background: var(--hover);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.clock-btn:hover:not(:disabled) { background: var(--accent); color: #fff; border-color: var(--accent); }
.clock-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.clock-loading {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
  margin-left: 0.25rem;
}
</style>
