import type {ToolCategory} from './types'

export const categories: ToolCategory[] = [
  {
    id: 'design',
    name: '设计',
  },
]

export function getCategoryById(id: string): ToolCategory | undefined {
  return categories.find((c) => c.id === id)
}
