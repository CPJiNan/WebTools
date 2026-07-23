<script lang="ts" setup>
import {RouterLink, useRoute} from 'vue-router'
import {computed, defineAsyncComponent, ref, watch} from 'vue'
import {getCategoryById, getToolById} from '@/tools'
import Card from '@/components/ui/Card.vue'

const route = useRoute()

const toolId = computed(() => route.params.toolId as string)
const tool = computed(() => getToolById(toolId.value))
const category = computed(() => tool.value ? getCategoryById(tool.value.categoryId) : undefined)

const error = ref<string | null>(null)

const AsyncToolComponent = computed(() => {
  if (!tool.value) return null
  return defineAsyncComponent({
    loader: tool.value.component,
    onError: () => {
      error.value = '工具加载失败'
    },
  })
})

watch(
  toolId,
  () => {
    error.value = null
  },
)
</script>

<template>
  <div class="tool-view">
    <nav class="tool-view__breadcrumb glass">
      <RouterLink class="tool-view__breadcrumb-link" to="/">首页</RouterLink>
      <span class="tool-view__breadcrumb-sep">/</span>
      <RouterLink
        v-if="category"
        :to="`/category/${category.id}`"
        class="tool-view__breadcrumb-link"
      >
        {{ category.name }}
      </RouterLink>
      <span v-if="category" class="tool-view__breadcrumb-sep">/</span>
      <span class="tool-view__breadcrumb-current">{{ tool?.name || '工具' }}</span>
    </nav>

    <template v-if="tool">
      <div class="tool-view__header glass">
        <div class="tool-view__header-left">
          <div class="tool-view__icon">
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
            </svg>
          </div>
          <div>
            <h1 class="tool-view__title">{{ tool.name }}</h1>
            <p class="tool-view__desc">{{ tool.description }}</p>
          </div>
        </div>
      </div>

      <Card v-if="!error && AsyncToolComponent" class="tool-view__content">
        <component :is="AsyncToolComponent"/>
      </Card>

      <Card v-else-if="error" class="tool-view__error">
        {{ error }}
      </Card>
    </template>

    <Card v-else class="tool-view__not-found">
      <div class="tool-view__not-found-icon-wrap">
        <svg
          class="tool-view__not-found-icon"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4m0 4h.01"/>
        </svg>
      </div>
      <h2 class="tool-view__not-found-title">工具不存在</h2>
      <p class="tool-view__not-found-desc">
        找不到 ID 为 "{{ toolId }}" 的工具
      </p>
      <RouterLink class="tool-view__not-found-btn pressable" to="/">返回首页</RouterLink>
    </Card>
  </div>
</template>

<style scoped>
.tool-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.tool-view__breadcrumb {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 7px 14px;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  letter-spacing: -0.01em;
}

[data-theme="dark"] .tool-view__breadcrumb {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.tool-view__breadcrumb-link {
  color: var(--text-muted);
  text-decoration: none;
  transition: color var(--duration-hover) var(--ease-hover);
}

@media (hover: hover) and (pointer: fine) {
  .tool-view__breadcrumb-link:hover {
    color: var(--color-primary);
  }
}

.tool-view__breadcrumb-sep {
  color: var(--text-muted);
  opacity: 0.55;
}

.tool-view__breadcrumb-current {
  color: var(--text-primary);
  font-weight: 550;
}

.tool-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

[data-theme="dark"] .tool-view__header {
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.tool-view__header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.tool-view__icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: transparent;
  border: none;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.14);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

[data-theme="dark"] .tool-view__icon {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.tool-view__icon svg {
  width: 26px;
  height: 26px;
}

.tool-view__title {
  font-size: clamp(1.25rem, 2.5vw, 1.5rem);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.tool-view__desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
  letter-spacing: -0.01em;
}

.tool-view__content {
  padding: 24px;
}

.tool-view__error {
  padding: 48px;
  text-align: center;
  color: var(--color-primary);
}

.tool-view__not-found {
  padding: 64px 24px;
  text-align: center;
}

.tool-view__not-found-icon-wrap {
  width: 68px;
  height: 68px;
  margin: 0 auto 16px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 14%, var(--surface-border));
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.tool-view__not-found-icon {
  width: 28px;
  height: 28px;
  color: var(--color-primary);
}

.tool-view__not-found-title {
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0 0 6px;
}

.tool-view__not-found-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0 0 22px;
}

.tool-view__not-found-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 24px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: white;
  font-size: 14px;
  font-weight: 550;
  letter-spacing: -0.01em;
  text-decoration: none;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
  transition: transform var(--duration-press) var(--ease-out),
  box-shadow var(--duration-hover) var(--ease-hover),
  background-color var(--duration-hover) var(--ease-hover);
}

.tool-view__not-found-btn:active {
  transform: scale(0.97);
  transition-duration: 80ms;
}

@media (hover: hover) and (pointer: fine) {
  .tool-view__not-found-btn:hover {
    color: white;
    background: var(--color-primary-hover);
    box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.32);
  }
}
</style>
