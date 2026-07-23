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
  <aside :class="['sidebar', 'glass-elevated', { 'sidebar--open': open }]">
    <div class="sidebar__header">
      <div class="sidebar__logo">
        <div class="sidebar__logo-badge">
          <img alt="WebTools" class="sidebar__logo-icon" src="/favicon.png"/>
        </div>
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
        href="https://github.com/CPJiNan/WebTools"
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
  top: var(--layout-inset);
  left: var(--layout-inset);
  bottom: var(--layout-inset);
  width: var(--sidebar-width);
  height: auto;
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  z-index: 200;
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

[data-theme="dark"] .sidebar {
  box-shadow: var(--shadow-lg), inset 0 0.5px 0 rgba(255, 255, 255, 0.08);
}

.sidebar__header {
  padding: 4px 8px 16px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--surface-border-strong);
}

.sidebar__logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar__logo-badge {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar__logo-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
}

.sidebar__logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.01em;
  transition: background-color var(--duration-hover) var(--ease-hover),
  color var(--duration-hover) var(--ease-hover),
  box-shadow var(--duration-hover) var(--ease-hover),
  border-color var(--duration-hover) var(--ease-hover),
  transform var(--duration-press) var(--ease-out);
  position: relative;
  border: 1px solid transparent;
}

@media (hover: hover) and (pointer: fine) {
  .sidebar__item:hover {
    background: color-mix(in srgb, var(--bg-tertiary) 65%, transparent);
    color: var(--text-primary);
  }
}

.sidebar__item:active {
  transform: scale(0.97);
  transition-duration: 80ms;
}

.sidebar__item--active {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 18%, transparent);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.12),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
  font-weight: 600;
}

[data-theme="dark"] .sidebar__item--active {
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.18),
  inset 0 0.5px 0 rgba(255, 255, 255, 0.05);
}

.sidebar__item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  background: var(--color-primary);
  border-radius: 0 3px 3px 0;
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 55%, transparent);
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
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px solid var(--surface-border-strong);
}

.sidebar__footer-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  border: 1px solid transparent;
  transition: background-color var(--duration-hover) var(--ease-hover),
  color var(--duration-hover) var(--ease-hover),
  border-color var(--duration-hover) var(--ease-hover),
  transform var(--duration-press) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .sidebar__footer-link:hover {
    background: color-mix(in srgb, var(--bg-tertiary) 65%, transparent);
    color: var(--text-primary);
    border-color: var(--surface-border-strong);
  }
}

.sidebar__footer-link:active {
  transform: scale(0.97);
  transition-duration: 80ms;
}

.sidebar__footer-icon {
  width: 18px;
  height: 18px;
}

@media (max-width: 768px) {
  .sidebar {
    top: 0;
    left: 0;
    bottom: 0;
    width: min(var(--sidebar-width), 86vw);
    height: 100dvh;
    border-radius: 0 var(--radius-2xl) var(--radius-2xl) 0;
    transform: translateX(-105%);
    transition: transform var(--duration-sheet) var(--ease-drawer);
    z-index: 200;
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(var(--blur-strong)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--blur-strong)) saturate(180%);
    border-color: rgba(255, 255, 255, 0.85);
    padding-top: max(16px, env(safe-area-inset-top));
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }

  [data-theme="dark"] .sidebar {
    background: rgba(18, 18, 18, 0.98);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .sidebar--open {
    transform: translateX(0);
  }

  .sidebar__item--active::before {
    display: none;
  }
}
</style>
