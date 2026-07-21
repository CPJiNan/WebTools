import type {ToolCategory} from './types'

export const categories: ToolCategory[] = [
  {
    id: 'design',
    name: '设计',
  },
  {
    id: 'database',
    name: '数据库',
  },
]

export function getCategoryById(id: string): ToolCategory | undefined {
  return categories.find((c) => c.id === id)
}
