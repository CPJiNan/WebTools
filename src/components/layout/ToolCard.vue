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
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
          <path d="M11 7l6 6"/>
          <path d="M4 16l11.7 -11.7a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4l-11.7 11.7h-4v-4"/>
        </svg>
        <svg
          v-else
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
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
}

.tool-card {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tool-card__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: transparent;
  border: 2px solid var(--border);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

[data-theme="dark"] .tool-card__icon {
  border-color: #404040;
  color: #fafafa;
}

.tool-card__icon svg {
  width: 24px;
  height: 24px;
}

.tool-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
  line-height: 1.4;
}

.tool-card__desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 16px;
  line-height: 1.6;
  flex: 1;
}

.tool-card__footer {
  display: flex;
  justify-content: flex-end;
}

.tool-card__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary);
  transition: gap 0.2s ease;
}

.tool-card:hover .tool-card__btn {
  gap: 8px;
}

.tool-card__btn-icon {
  width: 14px;
  height: 14px;
}
</style>
