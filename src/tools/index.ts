import type {Tool} from './types'
import {categories, getCategoryById} from './categories'

export const tools: Tool[] = [
  {
    id: 'color-picker',
    categoryId: 'design',
    name: '取色器',
    description: '颜色选择工具。支持 RGB、HSL、HSV、HEX 等多种颜色格式。',
    icon: 'color-picker',
    tags: ['取色器', 'RGB', 'HSL', 'HSV', 'HEX'],
    component: () => import('./design/color-picker/index.vue'),
  },
]

export function getToolById(id: string): Tool | undefined {
  return tools.find((t) => t.id === id)
}

export function getToolsByCategory(categoryId: string): Tool[] {
  return tools.filter((t) => t.categoryId === categoryId)
}

export {categories, getCategoryById}
