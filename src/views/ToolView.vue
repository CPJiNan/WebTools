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
    <nav class="tool-view__breadcrumb">
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
      <div class="tool-view__header">
        <div class="tool-view__header-left">
          <div class="tool-view__icon">
            <svg
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
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
      <svg
        class="tool-view__not-found-icon"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4m0 4h.01"/>
      </svg>
      <h2 class="tool-view__not-found-title">工具不存在</h2>
      <p class="tool-view__not-found-desc">
        找不到 ID 为 "{{ toolId }}" 的工具
      </p>
      <RouterLink class="tool-view__not-found-btn" to="/">返回首页</RouterLink>
    </Card>
  </div>
</template>

<style scoped>
.tool-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tool-view__breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.tool-view__breadcrumb-link {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.tool-view__breadcrumb-link:hover {
  color: var(--color-primary);
}

.tool-view__breadcrumb-sep {
  color: var(--text-muted);
}

.tool-view__breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
}

.tool-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.tool-view__header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tool-view__icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: transparent;
  border: 2px solid var(--border);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

[data-theme="dark"] .tool-view__icon {
  border-color: #404040;
  color: #fafafa;
}

.tool-view__icon svg {
  width: 28px;
  height: 28px;
}

.tool-view__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}

.tool-view__desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.tool-view__content {
  padding: 24px;
  min-height: 400px;
}

.tool-view__error {
  padding: 48px;
  text-align: center;
  color: #ef4444;
}

.tool-view__not-found {
  padding: 64px 24px;
  text-align: center;
}

.tool-view__not-found-icon {
  width: 56px;
  height: 56px;
  color: var(--text-muted);
  margin: 0 auto 16px;
}

.tool-view__not-found-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.tool-view__not-found-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0 0 24px;
}

.tool-view__not-found-btn {
  display: inline-block;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: white;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.tool-view__not-found-btn:hover {
  background: var(--color-primary-hover);
  color: white;
}
</style>
