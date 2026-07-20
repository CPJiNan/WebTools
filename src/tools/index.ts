import type {Tool} from './types'
import {categories, getCategoryById} from './categories'

export const tools: Tool[] = []

export function getToolById(id: string): Tool | undefined {
  return tools.find((t) => t.id === id)
}

export function getToolsByCategory(categoryId: string): Tool[] {
  return tools.filter((t) => t.categoryId === categoryId)
}

export {categories, getCategoryById}
