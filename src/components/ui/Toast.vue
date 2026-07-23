<script lang="ts" setup>
import {useToast} from '@/stores/toast'
import {TransitionGroup} from 'vue'

const toast = useToast()
</script>

<template>
  <div aria-live="polite" aria-relevant="additions" class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="item in toast.toasts"
        :key="item.id"
        :class="['toast', `toast--${item.type}`]"
        role="status"
      >
        <svg
          v-if="item.type === 'success'"
          class="toast__icon"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <path d="M22 4L12 14.01l-3-3"/>
        </svg>
        <svg
          v-else-if="item.type === 'error'"
          class="toast__icon"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10"/>
          <path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        <svg
          v-else
          class="toast__icon"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        <span class="toast__message">{{ item.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  pointer-events: none;
  max-width: min(360px, calc(100vw - 32px));
}

.toast {
  display: flex;
  align-items: center;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 10px;
  padding: 12px 18px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 550;
  letter-spacing: -0.01em;
  pointer-events: auto;
  backdrop-filter: blur(var(--blur)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur)) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.28);
  white-space: nowrap;
  width: max-content;
  max-width: 100%;
  box-sizing: border-box;
}

.toast--success {
  background: color-mix(in srgb, #10b981 82%, transparent);
  color: #fff;
}

.toast--error {
  background: color-mix(in srgb, #ef4444 82%, transparent);
  color: #fff;
}

.toast--info {
  background: color-mix(in srgb, var(--color-primary) 82%, transparent);
  color: #fff;
}

.toast__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.toast__message {
  line-height: 1.4;
  white-space: nowrap;
}

.toast-enter-active {
  transition: transform var(--duration-toast) var(--ease-out),
  opacity var(--duration-toast) var(--ease-out);
}

.toast-leave-active {
  transition: transform 160ms var(--ease-out),
  opacity 160ms var(--ease-out);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(12px) scale(0.96);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(8px) scale(0.98);
}

.toast-enter-to,
.toast-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
}

.toast-move {
  transition: transform var(--duration-toast) var(--ease-in-out);
}

@media (max-width: 768px) {
  .toast-container {
    top: auto;
    bottom: max(20px, env(safe-area-inset-bottom));
    right: 16px;
    left: 16px;
    align-items: center;
  }

  .toast {
    width: auto;
    max-width: 100%;
  }

  .toast-enter-from {
    transform: translateY(12px) scale(0.96);
  }

  .toast-leave-to {
    transform: translateY(8px) scale(0.98);
  }
}
</style>
