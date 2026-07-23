import type {ToolCategory} from './types'

export const categories: ToolCategory[] = [
  {
    id: 'time',
    name: '时间',
  },
  {
    id: 'random',
    name: '随机',
  },
  {
    id: 'design',
    name: '设计',
  },
  {
    id: 'image',
    name: '图片',
  },
  {
    id: 'audio',
    name: '音频',
  },
  {
    id: 'video',
    name: '视频',
  },
  {
    id: 'database',
    name: '数据库',
  },
]

export function getCategoryById(id: string): ToolCategory | undefined {
  return categories.find((c) => c.id === id)
}
