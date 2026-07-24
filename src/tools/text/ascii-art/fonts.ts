export const ASCII_FONTS = [
  'Standard',
  'Big',
  'Slant',
  'Small',
  'Mini',
  'Doom',
  'Ghost',
  'Banner',
  'Banner3',
  'Banner3-D',
  'Block',
  'Bubble',
  'Digital',
  'Shadow',
  'ANSI Shadow',
  'Speed',
  'Script',
  'Star Wars',
  'Stop',
  'Thick',
  'Thin',
  '3D-ASCII',
  '3D Diagonal',
  'Alligator',
  'Alpha',
  'Big Money-ne',
  'Chunky',
  'Colossal',
  'Computer',
  'Cyberlarge',
  'Doh',
  'Epic',
  'Graceful',
  'Impossible',
  'Isometric1',
  'Isometric2',
  'Isometric3',
  'Larry 3D',
  'Lean',
  'Letters',
  'Ogre',
  'Pagga',
  'Puffy',
  'Rectangles',
  'Roman',
  'Rounded',
  'Soft',
  'Sub-Zero',
  'Sweet',
  'Tinker-Toy',
  'Varsity',
  'Weird',
] as const

export type AsciiFontName = (typeof ASCII_FONTS)[number]

export const LAYOUT_OPTIONS = [
  {value: 'default', label: '默认'},
  {value: 'full', label: '完整间距'},
  {value: 'fitted', label: '紧凑贴合'},
  {value: 'controlled smushing', label: '受控挤压'},
  {value: 'universal smushing', label: '通用挤压'},
] as const

export type LayoutMethod = (typeof LAYOUT_OPTIONS)[number]['value']

type FontModule = { default: string }

const fontLoaders: Record<string, () => Promise<FontModule>> = {
  Standard: () => import('figlet/fonts/Standard'),
  Big: () => import('figlet/fonts/Big'),
  Slant: () => import('figlet/fonts/Slant'),
  Small: () => import('figlet/fonts/Small'),
  Mini: () => import('figlet/fonts/Mini'),
  Doom: () => import('figlet/fonts/Doom'),
  Ghost: () => import('figlet/fonts/Ghost'),
  Banner: () => import('figlet/fonts/Banner'),
  Banner3: () => import('figlet/fonts/Banner3'),
  'Banner3-D': () => import('figlet/fonts/Banner3-D'),
  Block: () => import('figlet/fonts/Block'),
  Bubble: () => import('figlet/fonts/Bubble'),
  Digital: () => import('figlet/fonts/Digital'),
  Shadow: () => import('figlet/fonts/Shadow'),
  'ANSI Shadow': () => import('figlet/fonts/ANSI Shadow'),
  Speed: () => import('figlet/fonts/Speed'),
  Script: () => import('figlet/fonts/Script'),
  'Star Wars': () => import('figlet/fonts/Star Wars'),
  Stop: () => import('figlet/fonts/Stop'),
  Thick: () => import('figlet/fonts/Thick'),
  Thin: () => import('figlet/fonts/Thin'),
  '3D-ASCII': () => import('figlet/fonts/3D-ASCII'),
  '3D Diagonal': () => import('figlet/fonts/3D Diagonal'),
  Alligator: () => import('figlet/fonts/Alligator'),
  Alpha: () => import('figlet/fonts/Alpha'),
  'Big Money-ne': () => import('figlet/fonts/Big Money-ne'),
  Chunky: () => import('figlet/fonts/Chunky'),
  Colossal: () => import('figlet/fonts/Colossal'),
  Computer: () => import('figlet/fonts/Computer'),
  Cyberlarge: () => import('figlet/fonts/Cyberlarge'),
  Doh: () => import('figlet/fonts/Doh'),
  Epic: () => import('figlet/fonts/Epic'),
  Graceful: () => import('figlet/fonts/Graceful'),
  Impossible: () => import('figlet/fonts/Impossible'),
  Isometric1: () => import('figlet/fonts/Isometric1'),
  Isometric2: () => import('figlet/fonts/Isometric2'),
  Isometric3: () => import('figlet/fonts/Isometric3'),
  'Larry 3D': () => import('figlet/fonts/Larry 3D'),
  Lean: () => import('figlet/fonts/Lean'),
  Letters: () => import('figlet/fonts/Letters'),
  Ogre: () => import('figlet/fonts/Ogre'),
  Pagga: () => import('figlet/fonts/Pagga'),
  Puffy: () => import('figlet/fonts/Puffy'),
  Rectangles: () => import('figlet/fonts/Rectangles'),
  Roman: () => import('figlet/fonts/Roman'),
  Rounded: () => import('figlet/fonts/Rounded'),
  Soft: () => import('figlet/fonts/Soft'),
  'Sub-Zero': () => import('figlet/fonts/Sub-Zero'),
  Sweet: () => import('figlet/fonts/Sweet'),
  'Tinker-Toy': () => import('figlet/fonts/Tinker-Toy'),
  Varsity: () => import('figlet/fonts/Varsity'),
  Weird: () => import('figlet/fonts/Weird'),
}

const loaded = new Set<string>()

export async function ensureFont(fontName: string): Promise<void> {
  if (loaded.has(fontName)) return

  const loader = fontLoaders[fontName]
  if (!loader) {
    throw new Error(`不支持的字体：${fontName}`)
  }

  const {default: fontData} = await loader()
  const figlet = (await import('figlet')).default
  figlet.parseFont(fontName, fontData)
  loaded.add(fontName)
}
