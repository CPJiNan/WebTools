<script lang="ts" setup>
import {useThemeStore} from '@/stores/theme'
import {computed} from 'vue'

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
    :title="title"
    class="theme-toggle"
    @click="theme.toggle"
  >
    <svg
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
  </button>
</template>

<style scoped>
.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: background-color 0.2s ease,
  color 0.2s ease;
}

.theme-toggle:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.theme-toggle__icon {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.theme-toggle:hover .theme-toggle__icon {
  transform: rotate(15deg);
}
</style>
