<script lang="ts" setup>
import {computed, onBeforeUnmount, ref} from 'vue'
import {useToast} from '@/stores/toast'

type OutputFormat = 'png' | 'jpeg' | 'webp' | 'bmp' | 'gif' | 'svg' | 'ico'

interface FormatOption {
  value: OutputFormat
  label: string
  mime: string
  ext: string
}

type Rotation = 0 | 90 | 180 | 270

interface ConvertOptions {
  format: OutputFormat
  quality: number
  scale: number
  targetWidth: string
  targetHeight: string
  keepAspect: boolean
  rotation: Rotation
  flipH: boolean
  flipV: boolean
  backgroundColor: string
}

interface ImageItem {
  id: string
  file: File
  name: string
  sourceType: string
  size: number
  width: number
  height: number
  previewUrl: string
  status: 'ready' | 'converting' | 'done' | 'error'
  errorMessage?: string
  resultBlob?: Blob
  resultUrl?: string
  resultSize?: number
  resultWidth?: number
  resultHeight?: number
}

const toast = useToast()

const items = ref<ImageItem[]>([])
const outputFormat = ref<OutputFormat>('png')
const quality = ref(100)
const scale = ref(100)
const targetWidth = ref('')
const targetHeight = ref('')
const keepAspect = ref(true)
const rotation = ref<Rotation>(0)
const flipH = ref(false)
const flipV = ref(false)
const backgroundColor = ref('#ffffff')
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const converting = ref(false)

const rotationOptions: { value: Rotation; label: string }[] = [
  {value: 0, label: '0°'},
  {value: 90, label: '90°'},
  {value: 180, label: '180°'},
  {value: 270, label: '270°'},
]

const acceptTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/x-ms-bmp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  '.ico',
  'image/*',
].join(',')

const opaqueFormats = new Set<OutputFormat>(['jpeg', 'bmp'])

const hasItems = computed(() => items.value.length > 0)
const hasResults = computed(() => items.value.some((item) => item.status === 'done' && item.resultBlob))
const showQuality = computed(() => outputFormat.value === 'jpeg' || outputFormat.value === 'webp')
const showBackground = computed(() => opaqueFormats.has(outputFormat.value))

const formatOptions: FormatOption[] = [
  {value: 'png', label: 'PNG', mime: 'image/png', ext: 'png'},
  {value: 'jpeg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg'},
  {value: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp'},
  {value: 'bmp', label: 'BMP', mime: 'image/bmp', ext: 'bmp'},
  {value: 'gif', label: 'GIF', mime: 'image/gif', ext: 'gif'},
  {value: 'svg', label: 'SVG', mime: 'image/svg+xml', ext: 'svg'},
  {value: 'ico', label: 'ICO', mime: 'image/x-icon', ext: 'ico'},
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getSourceLabel(type: string, name: string): string {
  if (type) {
    const subtype = type.split('/')[1]
    if (subtype)
      return subtype
        .toUpperCase()
        .replace('SVG+XML', 'SVG')
        .replace('JPEG', 'JPG')
        .replace('X-ICON', 'ICO')
        .replace('VND.MICROSOFT.ICON', 'ICO')
        .replace('X-MS-BMP', 'BMP')
  }
  const ext = name.includes('.') ? name.split('.').pop() : ''
  return (ext || '未知').toUpperCase()
}

function stripExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(0, index) : name
}

function getFormatMeta(format: OutputFormat): FormatOption {
  return formatOptions.find((item) => item.value === format)!
}

function parsePositiveInt(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null
  return n
}

function normalizeHexColor(raw: string): string {
  const value = raw.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1]
    const g = value[2]
    const b = value[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return '#ffffff'
}

function resolveOutputSize(srcW: number, srcH: number, options: ConvertOptions): { width: number; height: number } {
  const tw = parsePositiveInt(options.targetWidth)
  const th = parsePositiveInt(options.targetHeight)
  let width: number
  let height: number

  if (tw || th) {
    if (options.keepAspect) {
      if (tw && th) {
        const ratio = Math.min(tw / srcW, th / srcH)
        width = Math.max(1, Math.round(srcW * ratio))
        height = Math.max(1, Math.round(srcH * ratio))
      } else if (tw) {
        width = tw
        height = Math.max(1, Math.round(srcH * (tw / srcW)))
      } else {
        height = th!
        width = Math.max(1, Math.round(srcW * (th! / srcH)))
      }
    } else {
      width = tw ?? srcW
      height = th ?? srcH
    }
  } else {
    const ratio = Math.max(1, options.scale) / 100
    width = Math.max(1, Math.round(srcW * ratio))
    height = Math.max(1, Math.round(srcH * ratio))
  }

  return {width, height}
}

function writeUint16LE(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true)
}

function writeUint32LE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true)
}

function encodeBmp(imageData: ImageData): Blob {
  const {width, height, data} = imageData
  const rowSize = width * 4
  const pixelSize = rowSize * height
  const fileSize = 54 + pixelSize
  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  view.setUint8(0, 0x42)
  view.setUint8(1, 0x4d)
  writeUint32LE(view, 2, fileSize)
  writeUint32LE(view, 10, 54)

  writeUint32LE(view, 14, 40)
  writeUint32LE(view, 18, width)
  writeUint32LE(view, 22, height)
  writeUint16LE(view, 26, 1)
  writeUint16LE(view, 28, 32)
  writeUint32LE(view, 30, 0)
  writeUint32LE(view, 34, pixelSize)

  let offset = 54
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = y * width * 4
    for (let x = 0; x < width; x++) {
      const i = rowStart + x * 4
      bytes[offset++] = data[i + 2]!
      bytes[offset++] = data[i + 1]!
      bytes[offset++] = data[i]!
      bytes[offset++] = data[i + 3]!
    }
  }

  return new Blob([buffer], {type: 'image/bmp'})
}

function quantizeImage(imageData: ImageData): {
  indices: Uint8Array
  palette: number[]
  transparentIndex: number
} {
  const {width, height, data} = imageData
  const pixelCount = width * height
  const indices = new Uint8Array(pixelCount)
  const colorMap = new Map<number, number>()
  const palette: number[] = []
  let transparentIndex: number

  const pushColor = (key: number) => {
    let index = colorMap.get(key)
    if (index !== undefined) return index
    if (palette.length >= 256) return -1
    index = palette.length
    palette.push(key)
    colorMap.set(key, index)
    return index
  }

  transparentIndex = pushColor(0x00000000)

  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4
    const a = data[o + 3]!
    if (a < 128) {
      indices[i] = transparentIndex
      continue
    }
    const key = (255 << 24) | (data[o]! << 16) | (data[o + 1]! << 8) | data[o + 2]!
    let index = pushColor(key)
    if (index === -1) {
      let best = 0
      let bestDist = Infinity
      const r = data[o]!
      const g = data[o + 1]!
      const b = data[o + 2]!
      for (let p = 0; p < palette.length; p++) {
        if (p === transparentIndex) continue
        const c = palette[p]!
        const pr = (c >> 16) & 0xff
        const pg = (c >> 8) & 0xff
        const pb = c & 0xff
        const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
        if (dist < bestDist) {
          bestDist = dist
          best = p
        }
      }
      index = best
    }
    indices[i] = index
  }

  return {indices, palette, transparentIndex}
}

function lzwEncodeGif(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize
  const endCode = clearCode + 1
  let codeSize = minCodeSize + 1
  let nextCode = endCode + 1
  const maxCodeSize = 12

  const bitBuffer: number[] = []
  let cur = 0
  let curBits = 0

  const writeCode = (code: number) => {
    cur |= code << curBits
    curBits += codeSize
    while (curBits >= 8) {
      bitBuffer.push(cur & 0xff)
      cur >>= 8
      curBits -= 8
    }
  }

  let dict = new Map<string, number>()
  const initDict = () => {
    dict = new Map()
    for (let i = 0; i < clearCode; i++) {
      dict.set(String.fromCharCode(i), i)
    }
    codeSize = minCodeSize + 1
    nextCode = endCode + 1
  }

  initDict()
  writeCode(clearCode)

  let w = String.fromCharCode(indices[0]!)
  for (let i = 1; i < indices.length; i++) {
    const c = String.fromCharCode(indices[i]!)
    const wc = w + c
    if (dict.has(wc)) {
      w = wc
      continue
    }
    writeCode(dict.get(w)!)
    if (nextCode < 1 << maxCodeSize) {
      dict.set(wc, nextCode++)
      if (nextCode > 1 << codeSize && codeSize < maxCodeSize) codeSize++
    } else {
      writeCode(clearCode)
      initDict()
    }
    w = c
  }
  writeCode(dict.get(w)!)
  writeCode(endCode)

  if (curBits > 0) bitBuffer.push(cur & 0xff)

  return Uint8Array.from(bitBuffer)
}

function encodeGif(imageData: ImageData): Blob {
  const {width, height} = imageData
  const {indices, palette, transparentIndex} = quantizeImage(imageData)

  let colorBits = 1
  while (1 << colorBits < palette.length && colorBits < 8) colorBits++
  const colorCount = 1 << colorBits
  const minCodeSize = Math.max(2, colorBits)

  const parts: number[] = []
  const pushBytes = (...values: number[]) => {
    for (const v of values) parts.push(v & 0xff)
  }
  const pushU16 = (value: number) => {
    parts.push(value & 0xff, (value >> 8) & 0xff)
  }

  pushBytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)
  pushU16(width)
  pushU16(height)
  pushBytes(0x80 | ((colorBits - 1) << 4) | (colorBits - 1), 0x00, 0x00)

  for (let i = 0; i < colorCount; i++) {
    if (i < palette.length) {
      const c = palette[i]!
      pushBytes((c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff)
    } else pushBytes(0, 0, 0)
  }

  pushBytes(0x21, 0xf9, 0x04)
  pushBytes(transparentIndex >= 0 ? 0x01 : 0x00, 0x00, 0x00, transparentIndex >= 0 ? transparentIndex : 0x00, 0x00)

  pushBytes(0x2c)
  pushU16(0)
  pushU16(0)
  pushU16(width)
  pushU16(height)
  pushBytes(0x00)
  pushBytes(minCodeSize)

  const compressed = lzwEncodeGif(indices, minCodeSize)
  let offset = 0
  while (offset < compressed.length) {
    const size = Math.min(255, compressed.length - offset)
    pushBytes(size)
    for (let i = 0; i < size; i++) {
      pushBytes(compressed[offset + i]!)
    }
    offset += size
  }
  pushBytes(0x00)
  pushBytes(0x3b)

  return new Blob([Uint8Array.from(parts)], {type: 'image/gif'})
}

async function encodeSvg(canvas: HTMLCanvasElement): Promise<Blob> {
  const dataUrl = canvas.toDataURL('image/png')
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <image width="${canvas.width}" height="${canvas.height}" href="${dataUrl}"/>
</svg>
`
  return new Blob([svg], {type: 'image/svg+xml'})
}

async function encodeIco(canvas: HTMLCanvasElement): Promise<Blob> {
  const pngBlob = await canvasToBlob(canvas, 'image/png')
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer())
  const size = 6 + 16 + pngBytes.length
  const buffer = new ArrayBuffer(size)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  writeUint16LE(view, 0, 0)
  writeUint16LE(view, 2, 1)
  writeUint16LE(view, 4, 1)

  const w = canvas.width >= 256 ? 0 : canvas.width
  const h = canvas.height >= 256 ? 0 : canvas.height
  view.setUint8(6, w)
  view.setUint8(7, h)
  view.setUint8(8, 0)
  view.setUint8(9, 0)
  writeUint16LE(view, 10, 1)
  writeUint16LE(view, 12, 32)
  writeUint32LE(view, 14, pngBytes.length)
  writeUint32LE(view, 18, 22)

  bytes.set(pngBytes, 22)
  return new Blob([buffer], {type: 'image/x-icon'})
}

function revokeItemUrls(item: ImageItem) {
  URL.revokeObjectURL(item.previewUrl)
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
}

function clearResults(item: ImageItem) {
  if (item.resultUrl) {
    URL.revokeObjectURL(item.resultUrl)
    item.resultUrl = undefined
  }
  item.resultBlob = undefined
  item.resultSize = undefined
  item.resultWidth = undefined
  item.resultHeight = undefined
  item.status = 'ready'
  item.errorMessage = undefined
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.decoding = 'async'

  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = url
  })
}

async function loadImageFromFile(file: File): Promise<{
  image: HTMLImageElement;
  width: number;
  height: number;
  previewUrl: string
}> {
  const previewUrl = URL.createObjectURL(file)

  try {
    const image = await loadImageElement(previewUrl)
    return {
      image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      previewUrl,
    }
  } catch (error) {
    URL.revokeObjectURL(previewUrl)
    throw error
  }
}

async function addFiles(fileList: FileList | File[]) {
  const files = Array.from(fileList).filter(
    (file) =>
      file.type.startsWith('image/')
      || /\.(png|jpe?g|webp|gif|bmp|svg|ico)$/i.test(file.name),
  )

  if (!files.length) return

  let added = 0
  for (const file of files) {
    try {
      const loaded = await loadImageFromFile(file)
      items.value.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        name: file.name,
        sourceType: getSourceLabel(file.type, file.name),
        size: file.size,
        width: loaded.width,
        height: loaded.height,
        previewUrl: loaded.previewUrl,
        status: 'ready',
      })
      added += 1
    } catch {
      toast.error(`无法读取文件：${file.name}`)
    }
  }

  if (added > 0) toast.success(`已添加 ${added} 张图片`)
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) void addFiles(input.files)
  input.value = ''
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  isDragging.value = true
}

function onDragLeave(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  if (event.dataTransfer?.files?.length) void addFiles(event.dataTransfer.files)
}

function removeItem(id: string) {
  const index = items.value.findIndex((item) => item.id === id)
  if (index === -1) return
  const [item] = items.value.splice(index, 1)
  if (item) revokeItemUrls(item)
}

function clearAll() {
  for (const item of items.value) {
    revokeItemUrls(item)
  }
  items.value = []
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, qualityValue?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('转换失败'))
      },
      mime,
      qualityValue,
    )
  })
}

async function convertItem(item: ImageItem, options: ConvertOptions): Promise<void> {
  clearResults(item)
  item.status = 'converting'

  try {
    const image = await loadImageElement(item.previewUrl)
    const srcW = image.naturalWidth || image.width || item.width
    const srcH = image.naturalHeight || image.height || item.height

    if (srcW <= 0 || srcH <= 0) {
      item.status = 'error'
      item.errorMessage = '图片尺寸无效'
      return
    }

    const resized = resolveOutputSize(srcW, srcH, options)
    const swap = options.rotation === 90 || options.rotation === 270
    const outW = swap ? resized.height : resized.width
    const outH = swap ? resized.width : resized.height

    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d', {willReadFrequently: true})
    if (!ctx) {
      item.status = 'error'
      item.errorMessage = '无法创建画布'
      return
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const bg = normalizeHexColor(options.backgroundColor)
    if (opaqueFormats.has(options.format)) {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, outW, outH)
    }

    ctx.save()
    ctx.translate(outW / 2, outH / 2)
    ctx.rotate((options.rotation * Math.PI) / 180)
    ctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1)
    ctx.drawImage(image, -resized.width / 2, -resized.height / 2, resized.width, resized.height)
    ctx.restore()

    const meta = getFormatMeta(options.format)
    let blob: Blob

    if (options.format === 'png' || options.format === 'jpeg' || options.format === 'webp') {
      const qualityRatio = options.format === 'png' ? undefined : options.quality / 100
      blob = await canvasToBlob(canvas, meta.mime, qualityRatio)
    } else if (options.format === 'bmp') blob = encodeBmp(ctx.getImageData(0, 0, outW, outH))
    else if (options.format === 'gif') blob = encodeGif(ctx.getImageData(0, 0, outW, outH))
    else if (options.format === 'svg') blob = await encodeSvg(canvas)
    else if (options.format === 'ico') blob = await encodeIco(canvas)
    else {
      item.status = 'error'
      item.errorMessage = '不支持的目标格式'
      return
    }

    item.resultBlob = blob
    item.resultSize = blob.size
    item.resultWidth = outW
    item.resultHeight = outH
    item.resultUrl = URL.createObjectURL(blob)
    item.status = 'done'
  } catch (error) {
    item.status = 'error'
    item.errorMessage = error instanceof Error ? error.message : '转换失败'
  }
}

async function convertAll() {
  if (!hasItems.value || converting.value) return

  converting.value = true
  const options: ConvertOptions = {
    format: outputFormat.value,
    quality: quality.value,
    scale: scale.value,
    targetWidth: targetWidth.value,
    targetHeight: targetHeight.value,
    keepAspect: keepAspect.value,
    rotation: rotation.value,
    flipH: flipH.value,
    flipV: flipV.value,
    backgroundColor: backgroundColor.value,
  }
  let success = 0

  try {
    for (const item of items.value) {
      await convertItem(item, options)
      if (item.status === 'done') success += 1
    }

    if (success > 0) toast.success(`已转换 ${success} 张图片`)
    else toast.error('转换失败')
  } finally {
    converting.value = false
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadItem(item: ImageItem) {
  if (!item.resultBlob) return
  const meta = getFormatMeta(outputFormat.value)
  const filename = `${stripExtension(item.name)}.${meta.ext}`
  downloadBlob(item.resultBlob, filename)
}

async function downloadAll() {
  const doneItems = items.value.filter((item) => item.status === 'done' && item.resultBlob)
  if (!doneItems.length) return

  const meta = getFormatMeta(outputFormat.value)
  for (const item of doneItems) {
    downloadBlob(item.resultBlob!, `${stripExtension(item.name)}.${meta.ext}`)
    await new Promise((resolve) => setTimeout(resolve, 80))
  }
  toast.success(`开始下载 ${doneItems.length} 个文件`)
}

function statusLabel(item: ImageItem): string {
  if (item.status === 'converting') return '转换中'
  if (item.status === 'done') return '已完成'
  if (item.status === 'error') return '失败'
  return '待转换'
}

onBeforeUnmount(() => {
  for (const item of items.value) {
    revokeItemUrls(item)
  }
})
</script>

<template>
  <div class="image-format">
    <div class="image-format__panel">
      <div
        :class="['image-format__dropzone', { 'image-format__dropzone--active': isDragging }]"
        role="button"
        tabindex="0"
        @click="openFilePicker"
        @dragleave="onDragLeave"
        @dragover="onDragOver"
        @drop="onDrop"
        @keydown.enter.prevent="openFilePicker"
        @keydown.space.prevent="openFilePicker"
      >
        <div class="image-format__dropzone-icon">
          <svg
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            viewBox="0 0 24 24"
          >
            <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
            <path d="M15 8h.01"/>
            <path d="M12.5 21h-6.5a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6.5"/>
            <path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l3.5 3.5"/>
            <path d="M14 14l1 -1c.679 -.653 1.473 -.829 2.208 -.526"/>
            <path d="M19 22v-6"/>
            <path d="M22 19l-3 -3l-3 3"/>
          </svg>
        </div>
        <div class="image-format__dropzone-text">
          <p class="image-format__dropzone-title">点击或拖拽图片到此处</p>
          <p class="image-format__dropzone-desc">支持 PNG、JPG、WebP、GIF、BMP、SVG、ICO 等格式</p>
        </div>
        <input
          ref="fileInputRef"
          :accept="acceptTypes"
          class="image-format__file-input"
          multiple
          type="file"
          @change="onFileChange"
        />
      </div>

      <div class="image-format__options">
        <label class="image-format__field">
          <span class="image-format__label">目标格式</span>
          <select v-model="outputFormat" class="image-format__select">
            <option
              v-for="option in formatOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label v-if="showQuality" class="image-format__field">
          <span class="image-format__label">
            图片质量
            <span class="image-format__label-value">{{ quality }}%</span>
          </span>
          <input
            v-model.number="quality"
            class="image-format__range"
            max="100"
            min="1"
            type="range"
          />
        </label>

        <label class="image-format__field">
          <span class="image-format__label">缩放 (%)</span>
          <input
            v-model.number="scale"
            class="image-format__input"
            inputmode="numeric"
            placeholder="100"
            type="text"
          />
        </label>

        <div class="image-format__row">
          <label class="image-format__field">
            <span class="image-format__label">宽度</span>
            <input
              v-model="targetWidth"
              class="image-format__input"
              inputmode="numeric"
              placeholder="原宽度"
              type="text"
            />
          </label>
          <label class="image-format__field">
            <span class="image-format__label">高度</span>
            <input
              v-model="targetHeight"
              class="image-format__input"
              inputmode="numeric"
              placeholder="原高度"
              type="text"
            />
          </label>
        </div>

        <label class="image-format__checkbox">
          <input v-model="keepAspect" type="checkbox"/>
          <span>保持比例</span>
        </label>

        <div class="image-format__row">
          <label class="image-format__field">
            <span class="image-format__label">旋转</span>
            <select v-model.number="rotation" class="image-format__select">
              <option
                v-for="option in rotationOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label v-if="showBackground" class="image-format__field">
            <span class="image-format__label">背景色</span>
            <span class="image-format__color">
              <input v-model="backgroundColor" class="image-format__color-swatch" type="color"/>
              <input
                v-model="backgroundColor"
                class="image-format__input"
                maxlength="7"
                placeholder="#ffffff"
                type="text"
              />
            </span>
          </label>
        </div>

        <div class="image-format__checks">
          <label class="image-format__checkbox">
            <input v-model="flipH" type="checkbox"/>
            <span>水平翻转</span>
          </label>
          <label class="image-format__checkbox">
            <input v-model="flipV" type="checkbox"/>
            <span>垂直翻转</span>
          </label>
        </div>
      </div>

      <div class="image-format__actions">
        <button
          :disabled="!hasItems || converting"
          class="image-format__btn image-format__btn--primary pressable"
          type="button"
          @click="convertAll"
        >
          {{ converting ? '转换中…' : '开始转换' }}
        </button>
        <button
          :disabled="!hasResults || converting"
          class="image-format__btn pressable"
          type="button"
          @click="downloadAll"
        >
          全部下载
        </button>
        <button
          :disabled="!hasItems || converting"
          class="image-format__btn pressable"
          type="button"
          @click="clearAll"
        >
          清空
        </button>
      </div>
    </div>

    <div v-if="hasItems" class="image-format__list">
      <article
        v-for="item in items"
        :key="item.id"
        class="image-format__item"
      >
        <div class="image-format__preview">
          <img :alt="item.name" :src="item.resultUrl || item.previewUrl"/>
        </div>

        <div class="image-format__meta">
          <div class="image-format__meta-top">
            <h3 :title="item.name" class="image-format__name">{{ item.name }}</h3>
            <span
              :class="[
                'image-format__status',
                `image-format__status--${item.status}`,
              ]"
            >
              {{ statusLabel(item) }}
            </span>
          </div>

          <p class="image-format__info">
            {{ item.sourceType }}
            · {{ item.width }}×{{ item.height }}
            · {{ formatBytes(item.size) }}
            <template v-if="item.resultSize != null">
              →
              <template v-if="item.resultWidth && item.resultHeight">
                {{ item.resultWidth }}×{{ item.resultHeight }} ·
              </template>
              {{ formatBytes(item.resultSize) }}
            </template>
          </p>

          <p v-if="item.errorMessage" class="image-format__error">{{ item.errorMessage }}</p>

          <div class="image-format__item-actions">
            <button
              :disabled="item.status !== 'done' || !item.resultBlob"
              class="image-format__btn image-format__btn--ghost pressable"
              type="button"
              @click="downloadItem(item)"
            >
              下载
            </button>
            <button
              :disabled="converting"
              class="image-format__btn image-format__btn--ghost pressable"
              type="button"
              @click="removeItem(item.id)"
            >
              移除
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.image-format {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.image-format__panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .image-format__panel {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.image-format__dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 160px;
  padding: 28px 20px;
  border: 2px dashed color-mix(in srgb, var(--color-primary) 28%, var(--surface-border-strong));
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-primary) 4%, transparent);
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out),
  background-color var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-fast) var(--ease-out);
}

.image-format__dropzone-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 16%, transparent);
}

.image-format__dropzone-icon svg {
  width: 24px;
  height: 24px;
}

.image-format__dropzone-text {
  text-align: center;
}

.image-format__dropzone-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.image-format__dropzone-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.image-format__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.image-format__options {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.image-format__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.image-format__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.image-format__input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-primary);
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-fast) var(--ease-out),
  background-color var(--duration-fast) var(--ease-out);
  box-sizing: border-box;
}

.image-format__input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.image-format__color {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-format__color-swatch {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
}

.image-format__color-swatch::-webkit-color-swatch-wrapper {
  padding: 3px;
}

.image-format__color-swatch::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}

.image-format__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 18px;
}

.image-format__checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  user-select: none;
  width: fit-content;
  cursor: pointer;
}

.image-format__checkbox input {
  width: 15px;
  height: 15px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.image-format__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  font-weight: 650;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.image-format__label-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--color-primary);
  letter-spacing: 0;
  text-transform: none;
}

.image-format__select {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-fast) var(--ease-out),
  background-color var(--duration-fast) var(--ease-out);
}

.image-format__select:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.image-format__range {
  width: 100%;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.image-format__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.image-format__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 16px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 550;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  border: 1px solid var(--surface-border-strong);
  cursor: pointer;
  transition: transform var(--duration-press) var(--ease-out),
  background-color var(--duration-hover) var(--ease-hover),
  border-color var(--duration-hover) var(--ease-hover),
  opacity var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-hover) var(--ease-hover);
}

.image-format__btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.image-format__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.image-format__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.image-format__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.image-format__btn--ghost {
  padding: 6px 12px;
  font-size: 12px;
}

.image-format__hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.image-format__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-format__item {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .image-format__item {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.image-format__preview {
  width: 96px;
  height: 96px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: transparent;
  border: 1px solid var(--surface-border-strong);
}

.image-format__preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.image-format__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-format__meta-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.image-format__name {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-format__status {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
  background: color-mix(in srgb, var(--text-muted) 12%, transparent);
  color: var(--text-secondary);
}

.image-format__status--ready {
  color: #64748b;
  background: color-mix(in srgb, #64748b 14%, transparent);
  border-color: color-mix(in srgb, #64748b 22%, transparent);
}

[data-theme="dark"] .image-format__status--ready {
  color: #94a3b8;
  background: color-mix(in srgb, #94a3b8 16%, transparent);
  border-color: color-mix(in srgb, #94a3b8 24%, transparent);
}

.image-format__status--converting {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  border-color: color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.image-format__status--done {
  color: #16a34a;
  background: color-mix(in srgb, #22c55e 16%, transparent);
  border-color: color-mix(in srgb, #22c55e 28%, transparent);
}

[data-theme="dark"] .image-format__status--done {
  color: #4ade80;
  background: color-mix(in srgb, #22c55e 18%, transparent);
  border-color: color-mix(in srgb, #4ade80 28%, transparent);
}

.image-format__status--error {
  color: #dc2626;
  background: color-mix(in srgb, #ef4444 14%, transparent);
  border-color: color-mix(in srgb, #ef4444 28%, transparent);
}

[data-theme="dark"] .image-format__status--error {
  color: #f87171;
  background: color-mix(in srgb, #ef4444 18%, transparent);
  border-color: color-mix(in srgb, #f87171 28%, transparent);
}

.image-format__info {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.45;
}

.image-format__error {
  margin: 0;
  font-size: 12px;
  color: #ef4444;
}

.image-format__item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

@media (max-width: 640px) {
  .image-format__item {
    grid-template-columns: 72px 1fr;
  }

  .image-format__preview {
    width: 72px;
    height: 72px;
  }
}
</style>
