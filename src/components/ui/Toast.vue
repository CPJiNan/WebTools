<script lang="ts" setup>
import {useToast} from '@/stores/toast'
import {TransitionGroup} from 'vue'

const toast = useToast()
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="item in toast.toasts"
        :key="item.id"
        :class="['toast', `toast--${item.type}`]"
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
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  animation: toast-enter 0.3s ease;
}

.toast--success {
  background: #10b981;
  color: #fff;
}

.toast--error {
  background: #ef4444;
  color: #fff;
}

.toast--info {
  background: #3b82f6;
  color: #fff;
}

.toast__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.toast__message {
  line-height: 1.4;
}

.toast-enter-active {
  animation: toast-enter 0.3s ease;
}

.toast-leave-active {
  animation: toast-leave 0.3s ease;
}

@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toast-leave {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>