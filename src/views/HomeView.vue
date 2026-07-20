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
        <h2 class="home__section-title">
          {{ searchKeyword.trim() ? `搜索结果 (${filteredTools.length})` : group.categoryName }}
        </h2>
        <div class="home__tools-grid">
          <ToolCard v-for="tool in group.tools" :key="tool.id" :tool="tool"/>
        </div>
      </section>
    </template>

    <section v-else class="home__section">
      <Card class="home__empty">
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
        <h3 class="home__empty-title">{{ searchKeyword.trim() ? '未找到相关工具' : '暂无工具' }}</h3>
      </Card>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.home__section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.home__section-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.home__tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.home__empty {
  padding: 64px 24px;
  text-align: center;
}

.home__empty-icon {
  width: 56px;
  height: 56px;
  color: var(--text-muted);
  margin: 0 auto 16px;
}

.home__empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}
</style>
