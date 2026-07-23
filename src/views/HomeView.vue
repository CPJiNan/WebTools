<script lang="ts" setup>
import {computed} from 'vue'
import {categories, tools} from '@/tools'
import {useSearch} from '@/stores/search'
import ToolCard from '@/components/layout/ToolCard.vue'
import Card from '@/components/ui/Card.vue'

const {searchKeyword} = useSearch()

const filteredTools = computed(() => {
  const keyword = searchKeyword.value.toLowerCase().trim()
  if (!keyword) return tools

  return tools.filter((tool) => {
    return (
      tool.name.toLowerCase().includes(keyword)
      || tool.description.toLowerCase().includes(keyword)
      || tool.tags.some((tag) => tag.toLowerCase().includes(keyword))
    )
  })
})

const groupedTools = computed(() => {
  const result: Array<{ categoryId: string; categoryName: string; tools: typeof tools }> = []

  for (const category of categories) {
    const categoryTools = filteredTools.value.filter((t) => t.categoryId === category.id)
    if (categoryTools.length > 0) {
      result.push({
        categoryId: category.id,
        categoryName: category.name,
        tools: categoryTools,
      })
    }
  }

  return result
})
</script>

<template>
  <div class="home">
    <template v-if="groupedTools.length > 0">
      <section
        v-for="group in groupedTools"
        :key="group.categoryId"
        class="home__section"
      >
        <div class="home__section-head">
          <h2 class="home__section-title">
            {{ searchKeyword.trim() ? '搜索结果' : group.categoryName }}
          </h2>
          <span v-if="searchKeyword.trim()" class="home__section-badge">
            {{ filteredTools.length }}
          </span>
          <span v-else class="home__section-badge home__section-badge--muted">
            {{ group.tools.length }}
          </span>
        </div>
        <div class="home__tools-grid">
          <ToolCard v-for="tool in group.tools" :key="tool.id" :tool="tool"/>
        </div>
      </section>
    </template>

    <section v-else class="home__section">
      <Card class="home__empty">
        <div class="home__empty-icon-wrap">
          <svg
            class="home__empty-icon"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <h3 class="home__empty-title">{{ searchKeyword.trim() ? '未找到相关工具' : '暂无工具' }}</h3>
      </Card>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.home__section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  animation: home-section-in var(--duration-page) var(--ease-out) both;
}

.home__section:nth-child(1) {
  animation-delay: 0ms;
}

.home__section:nth-child(2) {
  animation-delay: calc(var(--stagger-step) * 1);
}

.home__section:nth-child(3) {
  animation-delay: calc(var(--stagger-step) * 2);
}

.home__section:nth-child(4) {
  animation-delay: calc(var(--stagger-step) * 3);
}

.home__section:nth-child(5) {
  animation-delay: calc(var(--stagger-step) * 4);
}

.home__section:nth-child(6) {
  animation-delay: calc(var(--stagger-step) * 5);
}

.home__section:nth-child(n + 7) {
  animation-delay: calc(var(--stagger-step) * 6);
}

@keyframes home-section-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.home__section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 2px;
}

.home__section-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.2;
  color: var(--text-primary);
  margin: 0;
}

.home__section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 8px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 16%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.home__section-badge--muted {
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-secondary) 55%, transparent);
  border-color: var(--surface-border-strong);
}

.home__tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 16px;
  min-width: 0;
  align-items: start;
}

.home__empty {
  padding: 64px 24px;
  text-align: center;
}

.home__empty-icon-wrap {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.14);
  color: var(--color-primary);
}

[data-theme="dark"] .home__empty-icon-wrap {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.home__empty-icon {
  width: 22px;
  height: 22px;
  color: var(--color-primary);
}

.home__empty-title {
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0;
}
</style>
