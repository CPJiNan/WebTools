<script lang="ts" setup>
import {useThemeStore} from '@/stores/theme'
import {computed, Transition} from 'vue'

const theme = useThemeStore()

const iconPath = computed(() => {
  return theme.mode === 'dark'
    ? 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M6.05 6.05L4.636 4.636m12.728 0l-1.414 1.414M6.05 17.95l-1.414 1.414M16 12a4 4 0 11-8 0 4 4 0 018 0z'
    : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
})

const title = computed(() => {
  return theme.mode === 'dark' ? '切换到浅色主题' : '切换到深色主题'
})
</script>

<template>
  <button
    :aria-label="title"
    :title="title"
    class="theme-toggle"
    type="button"
    @click="theme.toggle"
  >
    <Transition mode="out-in" name="theme-icon">
      <svg
        :key="theme.mode"
        class="theme-toggle__icon"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path :d="iconPath"/>
      </svg>
    </Transition>
  </button>
</template>

<style scoped>
.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-secondary) 52%, transparent);
  border: 1px solid var(--surface-border-strong);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: background-color var(--duration-fast) var(--ease-out-soft),
  color var(--duration-fast) var(--ease-out-soft),
  border-color var(--duration-fast) var(--ease-out-soft),
  box-shadow var(--duration-fast) var(--ease-out-soft);
}

[data-theme="dark"] .theme-toggle {
  box-shadow: var(--shadow-sm), inset 0 0.5px 0 rgba(255, 255, 255, 0.05);
}

.theme-toggle:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, var(--bg-secondary));
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 28%, transparent);
  box-shadow: var(--shadow-glow);
}

.theme-toggle__icon {
  width: 18px;
  height: 18px;
  display: block;
}

.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out-soft);
}

.theme-icon-enter-from,
.theme-icon-leave-to {
  opacity: 0;
}
</style>
