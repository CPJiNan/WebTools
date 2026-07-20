<script lang="ts" setup>
import {ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import Sidebar from './Sidebar.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import {useSearch} from '@/stores/search'

const router = useRouter()
const {searchKeyword} = useSearch()
const sidebarOpen = ref(false)
const localSearch = ref('')

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
    <header class="app-layout__mobile-header glass">
      <button class="app-layout__menu-btn" @click="toggleSidebar">
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

    <div
      v-if="sidebarOpen"
      class="app-layout__overlay"
      @click="closeSidebar"
    />

    <Sidebar :open="sidebarOpen" @close="closeSidebar"/>

    <div class="app-layout__main">
      <header class="app-layout__header glass">
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
              placeholder="搜索工具..."
              type="text"
              @keyup.enter="handleSearch"
            />
          </div>
        </div>

        <ThemeToggle class="app-layout__theme-toggle"/>
      </header>

      <main class="app-layout__content">
        <div class="app-layout__content-inner">
          <RouterView/>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--bg);
}

.app-layout__mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 12px 16px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--surface-border);
}

.app-layout__menu-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: background-color 0.2s ease;
}

.app-layout__menu-btn:hover {
  background: var(--bg-tertiary);
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
  color: var(--text-primary);
}

.app-layout__mobile-logo-icon {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
}

.app-layout__overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 150;
}

.app-layout__main {
  margin-left: var(--sidebar-width);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-layout__header {
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 12px 32px;
  border-bottom: 1px solid var(--surface-border);
  position: relative;
}

.app-layout__header-inner {
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.app-layout__theme-toggle {
  position: absolute;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
}

.app-layout__search {
  flex: 1;
  max-width: 480px;
  position: relative;
}

.app-layout__search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  pointer-events: none;
}

.app-layout__search-input {
  width: 100%;
  height: 40px;
  padding: 0 16px 0 42px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease,
  box-shadow 0.2s ease,
  background-color 0.2s ease;
}

.app-layout__search-input::placeholder {
  color: var(--text-muted);
}

.app-layout__search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.app-layout__content {
  flex: 1;
  padding: 32px;
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
    padding-top: 64px;
  }

  .app-layout__header {
    display: none;
  }

  .app-layout__content {
    padding: 16px;
  }
}
</style>
