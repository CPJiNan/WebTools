<script lang="ts" setup>
import {RouterLink, useRoute} from 'vue-router'

interface Props {
  open?: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const route = useRoute()

function handleClose() {
  emit('close')
}
</script>

<template>
  <aside :class="['sidebar', 'glass', { 'sidebar--open': open }]">
    <div class="sidebar__header">
      <div class="sidebar__logo">
        <img alt="WebTools" class="sidebar__logo-icon" src="/favicon.png"/>
        <span class="sidebar__logo-text">WebTools</span>
      </div>
    </div>

    <nav class="sidebar__nav">
      <RouterLink
        :class="{ 'sidebar__item--active': route.path === '/' }"
        class="sidebar__item"
        to="/"
        @click="handleClose"
      >
        <svg
          class="sidebar__item-icon"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
        <span class="sidebar__item-label">首页</span>
      </RouterLink>
    </nav>

    <div class="sidebar__footer">
      <a
        class="sidebar__footer-link"
        href="https://github.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        <svg
          class="sidebar__footer-icon"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        <span>GitHub</span>
      </a>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
  z-index: 200;
  border-right: 1px solid var(--surface-border);
}

.sidebar__header {
  padding: 8px 12px 20px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}

.sidebar__logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar__logo-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
}

.sidebar__logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s ease,
  color 0.2s ease;
  position: relative;
}

.sidebar__item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar__item--active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

[data-theme="dark"] .sidebar__item--active {
  background: rgba(59, 130, 246, 0.15);
}

.sidebar__item--active::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--color-primary);
  border-radius: 0 3px 3px 0;
}

.sidebar__item-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.sidebar__item-label {
  flex: 1;
}

.sidebar__footer {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.sidebar__footer-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s ease,
  color 0.2s ease;
}

.sidebar__footer-link:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar__footer-icon {
  width: 18px;
  height: 18px;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 200;
    background: rgba(255, 255, 255, 0.92);
  }

  [data-theme="dark"] .sidebar {
    background: rgba(23, 23, 23, 0.92);
  }

  .sidebar--open {
    transform: translateX(0);
  }

  .sidebar__item--active::before {
    display: none;
  }
}
</style>
