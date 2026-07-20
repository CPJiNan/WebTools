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
    <nav class="category-view__breadcrumb">
      <RouterLink class="category-view__breadcrumb-link" to="/">首页</RouterLink>
      <span class="category-view__breadcrumb-sep">/</span>
      <span class="category-view__breadcrumb-current">{{ category?.name || '分类' }}</span>
    </nav>

    <div v-if="category" class="category-view__header">
      <h1 class="category-view__title">{{ category.name }}</h1>
      <p class="category-view__desc">{{ category.description }}</p>
      <div class="category-view__count">共 {{ tools.length }} 个工具</div>
    </div>

    <div v-if="tools.length > 0" class="category-view__grid">
      <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool"/>
    </div>

    <Card v-else class="category-view__empty">
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
      <h3 class="category-view__empty-title">该分类暂无工具</h3>
      <p class="category-view__empty-desc">敬请期待更多工具上线！</p>
    </Card>
  </div>
</template>

<style scoped>
.category-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.category-view__breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.category-view__breadcrumb-link {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.category-view__breadcrumb-link:hover {
  color: var(--color-primary);
}

.category-view__breadcrumb-sep {
  color: var(--text-muted);
}

.category-view__breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
}

.category-view__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-view__title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.5px;
}

.category-view__desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.category-view__count {
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 4px 12px;
  border-radius: 999px;
  display: inline-block;
  align-self: flex-start;
  font-weight: 500;
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

.category-view__empty-icon {
  width: 56px;
  height: 56px;
  color: var(--text-muted);
  margin: 0 auto 16px;
}

.category-view__empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.category-view__empty-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
}
</style>
