<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import Sidebar from './Sidebar.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import Toast from '@/components/ui/Toast.vue'
import {useSearch} from '@/stores/search'

const router = useRouter()
const route = useRoute()
const {searchKeyword} = useSearch()
const sidebarOpen = ref(false)
const localSearch = ref('')

const isHome = computed(() => route.name === 'home')

watch(localSearch, (value) => {
  searchKeyword.value = value
})

function handleSearch() {
  if (localSearch.value.trim()) {
    router.push('/')
  }
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="app-layout">
    <header class="app-layout__mobile-header glass-elevated">
      <button
        aria-label="打开菜单"
        class="app-layout__menu-btn pressable"
        type="button"
        @click="toggleSidebar"
      >
        <svg
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <div class="app-layout__mobile-logo">
        <img alt="WebTools" class="app-layout__mobile-logo-icon" src="/favicon.png"/>
        <span>WebTools</span>
      </div>
      <ThemeToggle/>
    </header>

    <Transition name="overlay">
      <div
        v-if="sidebarOpen"
        class="app-layout__overlay"
        @click="closeSidebar"
      />
    </Transition>

    <Sidebar :open="sidebarOpen" @close="closeSidebar"/>

    <div class="app-layout__main">
      <header class="app-layout__header glass-elevated">
        <div class="app-layout__header-inner">
          <div class="app-layout__search">
            <svg
              class="app-layout__search-icon"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              v-model="localSearch"
              class="app-layout__search-input"
              enterkeyhint="search"
              placeholder="搜索工具..."
              type="search"
              @keyup.enter="handleSearch"
            />
            <button
              v-if="localSearch"
              aria-label="清除搜索"
              class="app-layout__search-clear pressable"
              type="button"
              @click="localSearch = ''"
            >
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <ThemeToggle class="app-layout__theme-toggle"/>
      </header>

      <div v-if="isHome" class="app-layout__mobile-search">
        <svg
          class="app-layout__search-icon"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          v-model="localSearch"
          class="app-layout__mobile-search-input"
          enterkeyhint="search"
          placeholder="搜索工具..."
          type="search"
          @keyup.enter="handleSearch"
        />
        <button
          v-if="localSearch"
          aria-label="清除搜索"
          class="app-layout__search-clear pressable"
          type="button"
          @click="localSearch = ''"
        >
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <main class="app-layout__content">
        <div class="app-layout__content-inner">
          <RouterView/>
        </div>
      </main>
    </div>

    <Toast/>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: transparent;
}

.app-layout__mobile-header {
  display: none;
  position: fixed;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 100;
  padding: 10px 14px;
  align-items: center;
  justify-content: space-between;
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

[data-theme="dark"] .app-layout__mobile-header {
  box-shadow: var(--shadow-lg), inset 0 0.5px 0 rgba(255, 255, 255, 0.08);
}

.app-layout__menu-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  transition: background-color var(--duration-fast) var(--ease-out-soft),
  border-color var(--duration-fast) var(--ease-out-soft),
  box-shadow var(--duration-fast) var(--ease-out-soft);
}

.app-layout__menu-btn:hover {
  background: color-mix(in srgb, var(--bg-tertiary) 80%, transparent);
  border-color: var(--surface-border-strong);
}

.app-layout__menu-btn svg {
  width: 20px;
  height: 20px;
  color: var(--text-primary);
}

.app-layout__mobile-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.app-layout__mobile-logo-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
}

.app-layout__overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
  z-index: 150;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity var(--duration-sheet) var(--ease-out-soft);
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.overlay-enter-to,
.overlay-leave-from {
  opacity: 1;
}

.app-layout__main {
  margin-left: calc(var(--sidebar-width) + var(--layout-inset) * 2);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: var(--layout-inset);
  gap: var(--layout-inset);
}

.app-layout__header {
  position: sticky;
  top: var(--layout-inset);
  z-index: 50;
  margin: 0;
  padding: 12px 24px;
  border-radius: var(--radius-2xl);
  flex-shrink: 0;
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

[data-theme="dark"] .app-layout__header {
  box-shadow: var(--shadow-md), inset 0 0.5px 0 rgba(255, 255, 255, 0.08);
}

.app-layout__header-inner {
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding-right: 52px;
}

.app-layout__theme-toggle {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
}

.app-layout__search {
  flex: 1;
  max-width: 480px;
  position: relative;
}

.app-layout__mobile-search {
  display: none;
  position: relative;
  flex: 0 0 44px;
  height: 44px;
  margin: 0 16px;
  align-items: center;
  box-sizing: border-box;
}

.app-layout__search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 17px;
  height: 17px;
  color: var(--text-secondary);
  pointer-events: none;
  transition: color var(--duration-fast) var(--ease-out-soft);
  z-index: 1;
}

.app-layout__mobile-search .app-layout__search-icon {
  left: 14px;
  color: var(--text-secondary);
}

.app-layout__search-input {
  width: 100%;
  height: 42px;
  padding: 0 40px 0 44px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--bg-secondary) 48%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text-primary);
  font-size: 15px;
  letter-spacing: -0.01em;
  outline: none;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color var(--duration-fast) var(--ease-out-soft),
  box-shadow var(--duration-fast) var(--ease-out-soft),
  background-color var(--duration-fast) var(--ease-out-soft);
  -webkit-appearance: none;
  appearance: none;
}

.app-layout__mobile-search-input {
  width: 100%;
  height: 44px;
  margin: 0;
  padding: 0 40px 0 40px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: var(--surface-elevated);
  backdrop-filter: blur(var(--blur)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur)) saturate(180%);
  color: var(--text-primary);
  font-size: 14px;
  letter-spacing: -0.01em;
  outline: none;
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color var(--duration-fast) var(--ease-out-soft),
  box-shadow var(--duration-fast) var(--ease-out-soft);
}

.app-layout__mobile-search-input::-webkit-search-decoration,
.app-layout__mobile-search-input::-webkit-search-cancel-button,
.app-layout__search-input::-webkit-search-decoration,
.app-layout__search-input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}

.app-layout__search-input::placeholder,
.app-layout__mobile-search-input::placeholder {
  color: var(--text-muted);
}

.app-layout__search-input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
  box-shadow: var(--ring), inset 0 1px 2px rgba(15, 23, 42, 0.04);
  background: color-mix(in srgb, var(--bg-secondary) 82%, transparent);
}

.app-layout__mobile-search-input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
  box-shadow: var(--ring), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.app-layout__search:focus-within .app-layout__search-icon,
.app-layout__mobile-search:focus-within .app-layout__search-icon {
  color: var(--color-primary);
}

.app-layout__search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  background: transparent;
  z-index: 1;
}

.app-layout__search-clear svg {
  width: 12px;
  height: 12px;
}

.app-layout__search-clear:hover {
  color: var(--text-primary);
}

.app-layout__content {
  flex: 1;
  padding: 8px 4px 24px 0;
}

.app-layout__content-inner {
  max-width: var(--content-max-width);
  margin: 0 auto;
}

@media (max-width: 768px) {
  .app-layout__mobile-header {
    display: flex;
  }

  .app-layout__overlay {
    display: block;
  }

  .app-layout__main {
    margin-left: 0;
    padding: 0;
    padding-top: 96px;
    gap: 12px;
  }

  .app-layout__header {
    display: none;
  }

  .app-layout__mobile-search {
    display: flex;
  }

  .app-layout__content {
    padding: 4px 16px 32px;
  }
}
</style>
