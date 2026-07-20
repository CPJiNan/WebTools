import {defineStore} from 'pinia'
import {ref, watch} from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'webtools-theme'

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined')
    return
  document.documentElement.setAttribute('data-theme', theme)
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('light')

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    if (saved && ['light', 'dark'].includes(saved)) mode.value = saved
    applyTheme(mode.value)
  }

  watch(
    mode,
    (newMode) => {
      localStorage.setItem(STORAGE_KEY, newMode)
      applyTheme(newMode)
    },
    {immediate: false},
  )

  function toggle() {
    mode.value = mode.value === 'light' ? 'dark' : 'light'
  }

  return {
    mode,
    init,
    toggle,
  }
})
