import type {ToolCategory} from './types'

export const categories: ToolCategory[] = []

export function getCategoryById(id: string): ToolCategory | undefined {
  return categories.find((c) => c.id === id)
}
