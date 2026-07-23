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
          v-else-if="tool.icon === 'lottery'"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
          <path d="M8 4h8a2 2 0 0 1 2 2v14l-3 -2l-3 2l-3 -2l-3 2v-14a2 2 0 0 1 2 -2"/>
          <path d="M12 8v4"/>
          <path d="M10 10h4"/>
        </svg>
        <svg
          v-else-if="tool.icon === 'clock'"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 7v5l3 3"/>
        </svg>
        <svg
          v-else-if="tool.icon === 'stopwatch'"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
          <path d="M5 13a7 7 0 1 0 14 0a7 7 0 0 0 -14 0"/>
          <path d="M14.5 10.5l-2.5 2.5"/>
          <path d="M17 8l1 -1"/>
          <path d="M9 3h6"/>
        </svg>
        <svg
          v-else-if="tool.icon === 'timer'"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
          <path d="M10 2h4"/>
          <path d="M12 14v-4"/>
          <path d="M12 22a8 8 0 1 0 0 -16a8 8 0 0 0 0 16"/>
        </svg>
        <svg
          v-else-if="tool.icon === 'image-format'"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
          <path d="M15 8h.01"/>
          <path d="M12.5 21h-6.5a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6.5"/>
          <path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l3.5 3.5"/>
          <path d="M14 14l1 -1c.679 -.653 1.473 -.829 2.208 -.526"/>
          <path d="M19 22v-6"/>
          <path d="M22 19l-3 -3l-3 3"/>
        </svg>
        <svg
          v-else-if="tool.icon === 'audio-format'"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
          <path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>
          <path d="M9 17v-13h10v6"/>
          <path d="M9 8h10"/>
          <path d="M19 22v-6"/>
          <path d="M22 19l-3 -3l-3 3"/>
        </svg>
        <svg
          v-else-if="tool.icon === 'video-format'"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
          <path d="M12.5 21h-6.5a3 3 0 0 1 -3 -3v-10a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v5"/>
          <path d="M10.5 10.5l5 2.5l-5 2.5z"/>
          <path d="M19 22v-6"/>
          <path d="M22 19l-3 -3l-3 3"/>
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
  display: flex;
  min-width: 0;
  height: 100%;
}

.tool-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.tool-card__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.14);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  transition: transform var(--duration-hover) var(--ease-out),
  box-shadow var(--duration-hover) var(--ease-hover);
}

[data-theme="dark"] .tool-card__icon {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

@media (hover: hover) and (pointer: fine) {
  .tool-card:hover .tool-card__icon {
    transform: scale(1.04);
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.22);
  }

  [data-theme="dark"] .tool-card:hover .tool-card__icon {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
  }
}

.tool-card:active .tool-card__icon {
  transform: scale(0.97);
  transition: transform 80ms var(--ease-out);
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
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.tool-card__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
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
  transition: background-color var(--duration-hover) var(--ease-hover),
  border-color var(--duration-hover) var(--ease-hover),
  box-shadow var(--duration-hover) var(--ease-hover);
}

.tool-card__btn-icon {
  width: 14px;
  height: 14px;
  transition: transform var(--duration-hover) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .tool-card:hover .tool-card__btn {
    background: color-mix(in srgb, var(--color-primary) 14%, transparent);
    border-color: color-mix(in srgb, var(--color-primary) 26%, transparent);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 14%, transparent);
  }

  .tool-card:hover .tool-card__btn-icon {
    transform: translateX(2px);
  }
}
</style>
