<script lang="ts" setup>
import Card from '@/components/ui/Card.vue'
import type {Tool} from '@/tools/types'
import {RouterLink} from 'vue-router'

interface Props {
  tool: Tool
}

defineProps<Props>()
</script>

<template>
  <RouterLink :to="`/tool/${tool.id}`" class="tool-card-link">
    <Card class="tool-card" clickable hover>
      <div class="tool-card__icon">
        <svg
          v-if="tool.icon === 'color-picker'"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
          <path d="M11 7l6 6"/>
          <path d="M4 16l11.7 -11.7a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4l-11.7 11.7h-4v-4"/>
        </svg>
        <svg
          v-else-if="tool.icon === 'sqlite-editor'"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <ellipse cx="12" cy="6" rx="8" ry="3"/>
          <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/>
          <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/>
        </svg>
        <svg
          v-else-if="tool.icon === 'random-number'"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
          <rect height="16" rx="2" width="16" x="4" y="4"/>
          <circle cx="8.5" cy="8.5" fill="currentColor" r=".5"/>
          <circle cx="15.5" cy="8.5" fill="currentColor" r=".5"/>
          <circle cx="15.5" cy="15.5" fill="currentColor" r=".5"/>
          <circle cx="8.5" cy="15.5" fill="currentColor" r=".5"/>
          <circle cx="12" cy="12" fill="currentColor" r=".5"/>
        </svg>
        <svg
          v-else
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
        </svg>
      </div>
      <h3 class="tool-card__title">{{ tool.name }}</h3>
      <p class="tool-card__desc">{{ tool.description }}</p>
      <div class="tool-card__footer">
        <span class="tool-card__btn">
          查看
          <svg
            class="tool-card__btn-icon"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="M9 5l7 7-7 7"/>
          </svg>
        </span>
      </div>
    </Card>
  </RouterLink>
</template>

<style scoped>
.tool-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
  height: 100%;
}

.tool-card {
  padding: 22px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tool-card__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: transparent;
  border: 1px solid color-mix(in srgb, #000 14%, var(--surface-solid));
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  transition: transform var(--duration-hover) var(--ease-out-soft),
  border-color var(--duration-fast) var(--ease-out-soft);
}

[data-theme="dark"] .tool-card__icon {
  border-color: color-mix(in srgb, #fff 14%, var(--surface-solid));
}

@media (hover: hover) and (pointer: fine) {
  .tool-card:hover .tool-card__icon {
    transform: scale(1.05);
    border-color: color-mix(in srgb, #000 22%, var(--surface-solid));
  }

  [data-theme="dark"] .tool-card:hover .tool-card__icon {
    border-color: color-mix(in srgb, #fff 22%, var(--surface-solid));
  }
}

.tool-card:active .tool-card__icon {
  transform: scale(0.98);
  transition: transform var(--duration-press) ease-out;
}

.tool-card__icon svg {
  width: 22px;
  height: 22px;
}

.tool-card__title {
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.022em;
  color: var(--text-primary);
  margin: 0 0 6px;
  line-height: 1.3;
}

.tool-card__desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 18px;
  line-height: 1.55;
  letter-spacing: -0.005em;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tool-card__footer {
  display: flex;
  justify-content: flex-end;
}

.tool-card__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 550;
  letter-spacing: -0.01em;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
  transition: background-color var(--duration-fast) var(--ease-out-soft),
  border-color var(--duration-fast) var(--ease-out-soft),
  box-shadow var(--duration-fast) var(--ease-out-soft);
}

.tool-card__btn-icon {
  width: 14px;
  height: 14px;
  transition: transform var(--duration-hover) var(--ease-out-soft);
}

@media (hover: hover) and (pointer: fine) {
  .tool-card:hover .tool-card__btn {
    background: color-mix(in srgb, var(--color-primary) 14%, transparent);
    border-color: color-mix(in srgb, var(--color-primary) 26%, transparent);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 14%, transparent);
  }

  .tool-card:hover .tool-card__btn-icon {
    transform: translateX(3px);
  }
}
</style>
