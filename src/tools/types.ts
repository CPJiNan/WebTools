export interface ToolCategory {
  id: string
  name: string
  icon: string
  description: string
}

export interface Tool {
  id: string
  categoryId: string
  name: string
  description: string
  icon: string
  tags: string[]
  component: () => Promise<any>
  introComponent?: () => Promise<any>
}
