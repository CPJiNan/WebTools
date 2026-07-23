import type {Tool} from './types'
import {categories, getCategoryById} from './categories'

export const tools: Tool[] = [
  {
    id: 'clock',
    categoryId: 'time',
    name: '时钟',
    description: '查看当前时间。',
    icon: 'clock',
    tags: ['时钟', '时间', '时区'],
    component: () => import('./time/clock/index.vue'),
  },
  {
    id: 'stopwatch',
    categoryId: 'time',
    name: '秒表',
    description: '计时工具。',
    icon: 'stopwatch',
    tags: ['秒表', '计时'],
    component: () => import('./time/stopwatch/index.vue'),
  },
  {
    id: 'timer',
    categoryId: 'time',
    name: '计时器',
    description: '倒计时工具。',
    icon: 'timer',
    tags: ['计时器', '倒计时'],
    component: () => import('./time/timer/index.vue'),
  },
  {
    id: 'random-number',
    categoryId: 'random',
    name: '随机数生成器',
    description: '在自定义范围内生成随机数。',
    icon: 'random-number',
    tags: ['随机数'],
    component: () => import('./random/random-number/index.vue'),
  },
  {
    id: 'color-picker',
    categoryId: 'design',
    name: '取色器',
    description: '颜色选择工具。支持 RGB、HSL、HSV、HEX 等多种颜色格式。',
    icon: 'color-picker',
    tags: ['取色器', 'RGB', 'HSL', 'HSV', 'HEX'],
    component: () => import('./design/color-picker/index.vue'),
  },
  {
    id: 'image-format',
    categoryId: 'image',
    name: '图片格式转换',
    description: '将图片转换为 PNG、JPG、WebP、BMP、GIF、SVG、ICO 等格式。',
    icon: 'image-format',
    tags: ['图片格式转换', 'PNG', 'JPG', 'WebP', 'BMP', 'GIF', 'SVG', 'ICO'],
    component: () => import('./image/image-format/index.vue'),
  },
  {
    id: 'audio-format',
    categoryId: 'audio',
    name: '音频格式转换',
    description: '将音频转换为 WAV、MP3、WebM、OGG、M4A 等格式。',
    icon: 'audio-format',
    tags: ['音频格式转换', 'WAV', 'MP3', 'WebM', 'OGG', 'M4A', 'AAC'],
    component: () => import('./audio/audio-format/index.vue'),
  },
  {
    id: 'sqlite-editor',
    categoryId: 'database',
    name: 'SQLite 编辑器',
    description: 'SQLite 可视化编辑器。',
    icon: 'sqlite-editor',
    tags: ['SQLite', 'SQL', '数据库'],
    component: () => import('./database/sqlite-editor/index.vue'),
  },
]

export function getToolById(id: string): Tool | undefined {
  return tools.find((t) => t.id === id)
}

export function getToolsByCategory(categoryId: string): Tool[] {
  return tools.filter((t) => t.categoryId === categoryId)
}

export {categories, getCategoryById}
