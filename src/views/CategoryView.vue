<script lang="ts" setup>
import {RouterLink, useRoute} from 'vue-router'
import {computed} from 'vue'
import {getCategoryById, getToolsByCategory} from '@/tools'
import ToolCard from '@/components/layout/ToolCard.vue'
import Card from '@/components/ui/Card.vue'

const route = useRoute()

const categoryId = computed(() => route.params.categoryId as string)
const category = computed(() => getCategoryById(categoryId.value))
const tools = computed(() => getToolsByCategory(categoryId.value))
</script>

<template>
  <div class="category-view">
    <nav class="category-view__breadcrumb glass">
      <RouterLink class="category-view__breadcrumb-link" to="/">首页</RouterLink>
      <span class="category-view__breadcrumb-sep">/</span>
      <span class="category-view__breadcrumb-current">{{ category?.name || '分类' }}</span>
    </nav>

    <div v-if="tools.length > 0" class="category-view__grid">
      <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool"/>
    </div>

    <Card v-else class="category-view__empty">
      <div class="category-view__empty-icon-wrap">
        <svg
          class="category-view__empty-icon"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
        </svg>
      </div>
      <h3 class="category-view__empty-title">该分类暂无工具</h3>
      <p class="category-view__empty-desc">敬请期待更多工具上线！</p>
    </Card>
  </div>
</template>

<style scoped>
.category-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-view__breadcrumb {
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

[data-theme="dark"] .category-view__breadcrumb {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.category-view__breadcrumb-link {
  color: var(--text-muted);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-out-soft);
}

.category-view__breadcrumb-link:hover {
  color: var(--color-primary);
}

.category-view__breadcrumb-sep {
  color: var(--text-muted);
  opacity: 0.55;
}

.category-view__breadcrumb-current {
  color: var(--text-primary);
  font-weight: 550;
}

.category-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.category-view__empty {
  padding: 64px 24px;
  text-align: center;
}

.category-view__empty-icon-wrap {
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

.category-view__empty-icon {
  width: 28px;
  height: 28px;
  color: var(--color-primary);
}

.category-view__empty-title {
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0 0 6px;
}

.category-view__empty-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
}
</style>
