<script lang="ts" setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {useToast} from '@/stores/toast'

type RadiusUnit = 'px' | 'percent'
type OutputFormat = 'png' | 'webp' | 'jpeg'
type ItemStatus = 'ready' | 'processing' | 'done' | 'error'

interface CornerRadii {
  tl: number
  tr: number
  br: number
  bl: number
}

interface RoundOptions {
  unit: RadiusUnit
  corners: CornerRadii
  scale: number
  format: OutputFormat
  quality: number
  backgroundColor: string
}

interface FormatOption {
  value: OutputFormat
  label: string
  mime: string
  ext: string
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
  status: ItemStatus
  errorMessage?: string
  resultBlob?: Blob
  resultUrl?: string
  resultSize?: number
  resultWidth?: number
  resultHeight?: number
}

const PREVIEW_SIZE = 104
const PX_MAX = 500
const PERCENT_MAX = 100
const DEFAULTS = {
  unit: 'px' as RadiusUnit,
  corner: 10,
  linked: true,
  scale: 100,
  format: 'png' as OutputFormat,
  quality: 100,
  backgroundColor: '#ffffff',
}

const toast = useToast()

const items = ref<ImageItem[]>([])
const unit = ref<RadiusUnit>(DEFAULTS.unit)
const linked = ref(DEFAULTS.linked)
const corners = ref<CornerRadii>({
  tl: DEFAULTS.corner,
  tr: DEFAULTS.corner,
  br: DEFAULTS.corner,
  bl: DEFAULTS.corner,
})
const scale = ref(DEFAULTS.scale)
const format = ref<OutputFormat>(DEFAULTS.format)
const quality = ref(DEFAULTS.quality)
const backgroundColor = ref(DEFAULTS.backgroundColor)
const isDragging = ref(false)
const converting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const formatOptions: FormatOption[] = [
  {value: 'png', label: 'PNG', mime: 'image/png', ext: 'png'},
  {value: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp'},
  {value: 'jpeg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg'},
]

const acceptTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/*',
].join(',')

const hasItems = computed(() => items.value.length > 0)
const hasResults = computed(() => items.value.some((item) => item.status === 'done' && item.resultBlob))
const showQuality = computed(() => format.value === 'webp' || format.value === 'jpeg')
const showBackground = computed(() => format.value === 'jpeg')

const optionsSignature = computed(() =>
  JSON.stringify({
    unit: unit.value,
    corners: corners.value,
    scale: scale.value,
    format: format.value,
    quality: quality.value,
    backgroundColor: backgroundColor.value,
  }),
)

function currentOptions(): RoundOptions {
  return {
    unit: unit.value,
    corners: {...corners.value},
    scale: scale.value,
    format: format.value,
    quality: quality.value,
    backgroundColor: backgroundColor.value,
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getSourceLabel(type: string, name: string): string {
  if (type) {
    const subtype = type.split('/')[1]
    if (subtype) {
      return subtype
        .toUpperCase()
        .replace('SVG+XML', 'SVG')
        .replace('JPEG', 'JPG')
        .replace('X-MS-BMP', 'BMP')
    }
  }
  const ext = name.includes('.') ? name.split('.').pop() : ''
  return (ext || '未知').toUpperCase()
}

function stripExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(0, index) : name
}

function getFormatMeta(value: OutputFormat): FormatOption {
  return formatOptions.find((option) => option.value === value) ?? formatOptions[0]!
}

function clampValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
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

function toRadiusPx(value: number, unitValue: RadiusUnit, minSide: number): number {
  const max = minSide / 2
  const raw = unitValue === 'percent' ? (value / 100) * max : value
  return clampValue(raw, 0, max)
}

function scaleRadii(radii: CornerRadii, width: number, height: number): CornerRadii {
  let {tl, tr, br, bl} = radii

  const fit = (a: number, b: number, side: number): [number, number] => {
      const sum = a + b
      if (sum > side && sum > 0) {
        const k = side / sum
        return [a * k, b * k]
      }
      return [a, b]
    }

  ;[tl, tr] = fit(tl, tr, width)
  ;[bl, br] = fit(bl, br, width)
  ;[tl, bl] = fit(tl, bl, height)
  ;[tr, br] = fit(tr, br, height)

  return {tl, tr, br, bl}
}

function resolveRadii(width: number, height: number, options: RoundOptions): CornerRadii {
  const minSide = Math.max(1, Math.min(width, height))
  const radii: CornerRadii = {
    tl: toRadiusPx(options.corners.tl, options.unit, minSide),
    tr: toRadiusPx(options.corners.tr, options.unit, minSide),
    br: toRadiusPx(options.corners.br, options.unit, minSide),
    bl: toRadiusPx(options.corners.bl, options.unit, minSide),
  }

  return scaleRadii(radii, width, height)
}

function toCssRadius(radii: CornerRadii, factor: number): string {
  return [
    `${radii.tl * factor}px`,
    `${radii.tr * factor}px`,
    `${radii.br * factor}px`,
    `${radii.bl * factor}px`,
  ].join(' ')
}

function sourceStyle(item: ImageItem): Record<string, string> {
  const width = item.width || 1
  const height = item.height || 1
  const factor = Math.min(PREVIEW_SIZE / width, PREVIEW_SIZE / height)
  const radii = resolveRadii(width, height, currentOptions())

  return {
    width: `${Math.max(1, Math.round(width * factor))}px`,
    height: `${Math.max(1, Math.round(height * factor))}px`,
    borderRadius: toCssRadius(radii, factor),
    backgroundColor: showBackground.value ? normalizeHexColor(backgroundColor.value) : 'transparent',
  }
}

function roundedRectPath(ctx: CanvasRenderingContext2D, width: number, height: number, radii: CornerRadii) {
  const {tl, tr, br, bl} = radii

  ctx.beginPath()
  ctx.moveTo(tl, 0)
  ctx.lineTo(width - tr, 0)
  ctx.arcTo(width, 0, width, tr, tr)
  ctx.lineTo(width, height - br)
  ctx.arcTo(width, height, width - br, height, br)
  ctx.lineTo(bl, height)
  ctx.arcTo(0, height, 0, height - bl, bl)
  ctx.lineTo(0, tl)
  ctx.arcTo(0, 0, tl, 0, tl)
  ctx.closePath()
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

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, qualityValue?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('导出失败'))
      },
      mime,
      qualityValue,
    )
  })
}

async function renderItem(item: ImageItem, options: RoundOptions): Promise<{
  blob: Blob;
  width: number;
  height: number
}> {
  const image = await loadImageElement(item.previewUrl)
  const srcWidth = image.naturalWidth || image.width || item.width
  const srcHeight = image.naturalHeight || image.height || item.height

  if (!srcWidth || !srcHeight) throw new Error('图片尺寸无效')

  const ratio = clampValue(Number(options.scale), 1, 1000) / 100
  const outWidth = Math.max(1, Math.round(srcWidth * ratio))
  const outHeight = Math.max(1, Math.round(srcHeight * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = outWidth
  canvas.height = outHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')

  const baseRadii = resolveRadii(srcWidth, srcHeight, options)
  const radii = scaleRadii(
    {
      tl: baseRadii.tl * ratio,
      tr: baseRadii.tr * ratio,
      br: baseRadii.br * ratio,
      bl: baseRadii.bl * ratio,
    },
    outWidth,
    outHeight,
  )

  if (options.format === 'jpeg') {
    ctx.fillStyle = normalizeHexColor(options.backgroundColor)
    ctx.fillRect(0, 0, outWidth, outHeight)
  }

  ctx.save()
  roundedRectPath(ctx, outWidth, outHeight, radii)
  ctx.clip()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, outWidth, outHeight)
  ctx.restore()

  const meta = getFormatMeta(options.format)
  const qualityValue = options.format === 'png' ? undefined : clampValue(options.quality, 1, 100) / 100
  const blob = await canvasToBlob(canvas, meta.mime, qualityValue)

  return {blob, width: outWidth, height: outHeight}
}

function revokeItemUrls(item: ImageItem) {
  URL.revokeObjectURL(item.previewUrl)
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
}

function clearResult(item: ImageItem) {
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

async function loadImageFromFile(file: File): Promise<{ width: number; height: number; previewUrl: string }> {
  const previewUrl = URL.createObjectURL(file)

  try {
    const image = await loadImageElement(previewUrl)
    return {
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
    (file) => file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(file.name),
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
  for (const item of items.value) revokeItemUrls(item)
  items.value = []
}

async function convertItem(item: ImageItem, options: RoundOptions): Promise<boolean> {
  clearResult(item)
  item.status = 'processing'

  try {
    const {blob, width, height} = await renderItem(item, options)
    item.resultBlob = blob
    item.resultSize = blob.size
    item.resultWidth = width
    item.resultHeight = height
    item.resultUrl = URL.createObjectURL(blob)
    item.status = 'done'
    return true
  } catch (error) {
    item.status = 'error'
    item.errorMessage = error instanceof Error ? error.message : '处理失败'
    return false
  }
}

async function convertAll() {
  if (!hasItems.value || converting.value) return

  converting.value = true
  const options = currentOptions()
  let success = 0

  try {
    for (const item of items.value) {
      const ok = await convertItem(item, options)
      if (ok) success += 1
    }

    if (success > 0) toast.success(`已处理 ${success} 张图片`)
    else toast.error('处理失败')
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

function resultFilename(item: ImageItem): string {
  const meta = getFormatMeta(format.value)
  return `${stripExtension(item.name)}-rounded.${meta.ext}`
}

function downloadItem(item: ImageItem) {
  if (!item.resultBlob) return
  downloadBlob(item.resultBlob, resultFilename(item))
}

async function downloadAll() {
  const doneItems = items.value.filter((item) => item.status === 'done' && item.resultBlob)
  if (!doneItems.length) return

  for (const item of doneItems) {
    downloadBlob(item.resultBlob!, resultFilename(item))
    await new Promise((resolve) => setTimeout(resolve, 80))
  }
  toast.success(`开始下载 ${doneItems.length} 个文件`)
}

function statusLabel(item: ImageItem): string {
  if (item.status === 'processing') return '处理中'
  if (item.status === 'done') return '已完成'
  if (item.status === 'error') return '失败'
  return '待处理'
}

function onCornerInput(key: keyof CornerRadii, event: Event) {
  const target = event.target as HTMLInputElement
  const parsed = Number(target.value)
  const value = target.value === '' || !Number.isFinite(parsed) ? 0 : Math.max(0, parsed)

  if (linked.value) {
    corners.value = {tl: value, tr: value, br: value, bl: value}
    return
  }
  corners.value = {...corners.value, [key]: value}
}

watch(unit, (value) => {
  const max = value === 'px' ? PX_MAX : PERCENT_MAX
  corners.value = {
    tl: clampValue(corners.value.tl, 0, max),
    tr: clampValue(corners.value.tr, 0, max),
    br: clampValue(corners.value.br, 0, max),
    bl: clampValue(corners.value.bl, 0, max),
  }
})

watch(optionsSignature, () => {
  for (const item of items.value) {
    if (item.status === 'done' || item.status === 'error') clearResult(item)
  }
})

onBeforeUnmount(() => {
  for (const item of items.value) revokeItemUrls(item)
})
</script>

<template>
  <div class="image-rounded">
    <div class="image-rounded__panel">
      <div
        :class="['image-rounded__dropzone', { 'image-rounded__dropzone--active': isDragging }]"
        role="button"
        tabindex="0"
        @click="openFilePicker"
        @dragleave="onDragLeave"
        @dragover="onDragOver"
        @drop="onDrop"
        @keydown.enter.prevent="openFilePicker"
        @keydown.space.prevent="openFilePicker"
      >
        <div class="image-rounded__dropzone-icon">
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
            <path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12"/>
            <path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5"/>
            <path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3"/>
          </svg>
        </div>
        <div class="image-rounded__dropzone-text">
          <p class="image-rounded__dropzone-title">点击或拖拽图片到此处</p>
          <p class="image-rounded__dropzone-desc">支持 PNG、JPG、WebP、GIF、BMP、SVG 等格式</p>
        </div>
        <input
          ref="fileInputRef"
          :accept="acceptTypes"
          class="image-rounded__file-input"
          multiple
          type="file"
          @change="onFileChange"
        />
      </div>

      <div class="image-rounded__options">
        <div class="image-rounded__row image-rounded__row--unit">
          <label class="image-rounded__field">
            <span class="image-rounded__label">圆角单位</span>
            <select v-model="unit" class="image-rounded__select">
              <option value="px">像素</option>
              <option value="percent">百分比</option>
            </select>
          </label>
        </div>

        <div class="image-rounded__corners">
          <label class="image-rounded__field">
            <span class="image-rounded__label">左上</span>
            <input
              :value="corners.tl"
              class="image-rounded__input"
              inputmode="numeric"
              min="0"
              type="number"
              @input="onCornerInput('tl', $event)"
            />
          </label>
          <label class="image-rounded__field">
            <span class="image-rounded__label">右上</span>
            <input
              :value="corners.tr"
              class="image-rounded__input"
              inputmode="numeric"
              min="0"
              type="number"
              @input="onCornerInput('tr', $event)"
            />
          </label>
          <label class="image-rounded__field">
            <span class="image-rounded__label">右下</span>
            <input
              :value="corners.br"
              class="image-rounded__input"
              inputmode="numeric"
              min="0"
              type="number"
              @input="onCornerInput('br', $event)"
            />
          </label>
          <label class="image-rounded__field">
            <span class="image-rounded__label">左下</span>
            <input
              :value="corners.bl"
              class="image-rounded__input"
              inputmode="numeric"
              min="0"
              type="number"
              @input="onCornerInput('bl', $event)"
            />
          </label>

          <button
            :aria-pressed="linked"
            :class="['image-rounded__icon-btn', {'image-rounded__icon-btn--active': linked}]"
            type="button"
            @click="linked = !linked"
          >
            <svg
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              viewBox="0 0 24 24"
            >
              <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
              <path d="M9 15l6 -6"/>
              <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/>
              <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/>
            </svg>
          </button>
        </div>

        <div class="image-rounded__row">
          <label class="image-rounded__field">
            <span class="image-rounded__label">输出格式</span>
            <select v-model="format" class="image-rounded__select">
              <option
                v-for="option in formatOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="image-rounded__field">
            <span class="image-rounded__label">缩放</span>
            <input
              v-model.number="scale"
              class="image-rounded__input"
              inputmode="numeric"
              min="1"
              type="number"
            />
          </label>
        </div>

        <div v-if="showQuality || showBackground" class="image-rounded__row">
          <label v-if="showQuality" class="image-rounded__field">
            <span class="image-rounded__label">
              图片质量
              <span class="image-rounded__label-value">{{ quality }}%</span>
            </span>
            <span class="image-rounded__range-wrap">
              <input
                v-model.number="quality"
                class="image-rounded__range"
                max="100"
                min="1"
                type="range"
              />
            </span>
          </label>

          <label v-if="showBackground" class="image-rounded__field image-rounded__field--color">
            <span class="image-rounded__label">背景色</span>
            <span class="image-rounded__color">
              <input v-model="backgroundColor" class="image-rounded__color-swatch" type="color"/>
              <input
                v-model="backgroundColor"
                class="image-rounded__input image-rounded__input--compact"
                maxlength="7"
                placeholder="#ffffff"
                type="text"
              />
            </span>
          </label>
        </div>
      </div>

      <div class="image-rounded__actions">
        <button
          :disabled="!hasItems || converting"
          class="image-rounded__btn image-rounded__btn--primary pressable"
          type="button"
          @click="convertAll"
        >
          {{ converting ? '处理中…' : '应用圆角' }}
        </button>
        <button
          :disabled="!hasResults || converting"
          class="image-rounded__btn pressable"
          type="button"
          @click="downloadAll"
        >
          全部下载
        </button>
        <button
          :disabled="!hasItems || converting"
          class="image-rounded__btn pressable"
          type="button"
          @click="clearAll"
        >
          清空
        </button>
      </div>
    </div>

    <div v-if="hasItems" class="image-rounded__list">
      <article
        v-for="item in items"
        :key="item.id"
        class="image-rounded__item"
      >
        <div class="image-rounded__previews">
          <figure class="image-rounded__preview">
            <div class="image-rounded__preview-box">
              <img :alt="item.name" :src="item.previewUrl" :style="sourceStyle(item)"/>
            </div>
            <figcaption class="image-rounded__preview-label">原图</figcaption>
          </figure>

          <figure class="image-rounded__preview">
            <div class="image-rounded__preview-box">
              <img v-if="item.resultUrl" :alt="`${item.name} 圆角结果`" :src="item.resultUrl"/>
              <span v-else class="image-rounded__preview-empty">待处理</span>
            </div>
            <figcaption class="image-rounded__preview-label">结果</figcaption>
          </figure>
        </div>

        <div class="image-rounded__meta">
          <div class="image-rounded__meta-top">
            <h3 :title="item.name" class="image-rounded__name">{{ item.name }}</h3>
            <span
              :class="[
                'image-rounded__status',
                `image-rounded__status--${item.status}`,
              ]"
            >
              {{ statusLabel(item) }}
            </span>
          </div>

          <p class="image-rounded__info">
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

          <p v-if="item.errorMessage" class="image-rounded__error">{{ item.errorMessage }}</p>

          <div class="image-rounded__item-actions">
            <button
              :disabled="item.status !== 'done' || !item.resultBlob"
              class="image-rounded__btn image-rounded__btn--ghost pressable"
              type="button"
              @click="downloadItem(item)"
            >
              下载
            </button>
            <button
              :disabled="converting"
              class="image-rounded__btn image-rounded__btn--ghost pressable"
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
.image-rounded {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.image-rounded__panel {
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

[data-theme="dark"] .image-rounded__panel {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.image-rounded__dropzone {
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

.image-rounded__dropzone--active,
.image-rounded__dropzone:hover {
  border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.image-rounded__dropzone-icon {
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

.image-rounded__dropzone-icon svg {
  width: 24px;
  height: 24px;
}

.image-rounded__dropzone-text {
  text-align: center;
}

.image-rounded__dropzone-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.image-rounded__dropzone-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.image-rounded__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.image-rounded__options {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.image-rounded__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.image-rounded__row--unit {
  grid-template-columns: minmax(180px, 260px);
}

.image-rounded__corners {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
}

.image-rounded__corners .image-rounded__field {
  flex: 1 1 96px;
}

.image-rounded__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.image-rounded__icon-btn {
  flex: 0 0 auto;
  margin-left: auto;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--duration-hover) var(--ease-hover),
  background-color var(--duration-hover) var(--ease-hover),
  border-color var(--duration-hover) var(--ease-hover),
  box-shadow var(--duration-hover) var(--ease-hover);
}

.image-rounded__icon-btn svg {
  width: 20px;
  height: 20px;
}

.image-rounded__icon-btn:hover:not(.image-rounded__icon-btn--active) {
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 28%, var(--surface-border-strong));
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
}

.image-rounded__icon-btn--active {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
  box-shadow: 0 6px 14px color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.image-rounded__field--color {
  max-width: 260px;
}

.image-rounded__label {
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

.image-rounded__label-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--color-primary);
  letter-spacing: 0;
  text-transform: none;
}

.image-rounded__input,
.image-rounded__select {
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
  box-sizing: border-box;
  transition: border-color var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-fast) var(--ease-out),
  background-color var(--duration-fast) var(--ease-out);
}

.image-rounded__select {
  font-family: inherit;
}

.image-rounded__input:focus,
.image-rounded__select:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.image-rounded__input--compact {
  width: 88px;
  flex-shrink: 0;
}

.image-rounded__range-wrap {
  display: flex;
  align-items: center;
  height: 40px;
}

.image-rounded__range {
  width: 100%;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.image-rounded__color {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-rounded__color-swatch {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
}

.image-rounded__color-swatch::-webkit-color-swatch-wrapper {
  padding: 3px;
}

.image-rounded__color-swatch::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}

.image-rounded__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.image-rounded__btn {
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

.image-rounded__btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.image-rounded__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.image-rounded__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.image-rounded__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.image-rounded__btn--ghost {
  padding: 6px 12px;
  font-size: 12px;
}

.image-rounded__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-rounded__item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  padding: 14px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .image-rounded__item {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.image-rounded__previews {
  display: flex;
  gap: 12px;
}

.image-rounded__preview {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.image-rounded__preview-box {
  width: 104px;
  height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: color-mix(in srgb, var(--surface-solid) 90%, transparent);
  background-image: linear-gradient(
    45deg,
    color-mix(in srgb, var(--text-muted) 16%, transparent) 25%,
    transparent 25%,
    transparent 75%,
    color-mix(in srgb, var(--text-muted) 16%, transparent) 75%
  ),
  linear-gradient(
    45deg,
    color-mix(in srgb, var(--text-muted) 16%, transparent) 25%,
    transparent 25%,
    transparent 75%,
    color-mix(in srgb, var(--text-muted) 16%, transparent) 75%
  );
  background-size: 16px 16px;
  background-position: 0 0, 8px 8px;
}

.image-rounded__preview-box img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-rounded__preview-empty {
  font-size: 12px;
  color: var(--text-muted);
}

.image-rounded__preview-label {
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.image-rounded__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-rounded__meta-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.image-rounded__name {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-rounded__status {
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

.image-rounded__status--ready {
  color: #64748b;
  background: color-mix(in srgb, #64748b 14%, transparent);
  border-color: color-mix(in srgb, #64748b 22%, transparent);
}

[data-theme="dark"] .image-rounded__status--ready {
  color: #94a3b8;
  background: color-mix(in srgb, #94a3b8 16%, transparent);
  border-color: color-mix(in srgb, #94a3b8 24%, transparent);
}

.image-rounded__status--processing {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  border-color: color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.image-rounded__status--done {
  color: #16a34a;
  background: color-mix(in srgb, #22c55e 16%, transparent);
  border-color: color-mix(in srgb, #22c55e 28%, transparent);
}

[data-theme="dark"] .image-rounded__status--done {
  color: #4ade80;
  background: color-mix(in srgb, #22c55e 18%, transparent);
  border-color: color-mix(in srgb, #4ade80 28%, transparent);
}

.image-rounded__status--error {
  color: #dc2626;
  background: color-mix(in srgb, #ef4444 14%, transparent);
  border-color: color-mix(in srgb, #ef4444 28%, transparent);
}

[data-theme="dark"] .image-rounded__status--error {
  color: #f87171;
  background: color-mix(in srgb, #ef4444 18%, transparent);
  border-color: color-mix(in srgb, #f87171 28%, transparent);
}

.image-rounded__info {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.45;
}

.image-rounded__error {
  margin: 0;
  font-size: 12px;
  color: #ef4444;
}

.image-rounded__item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

@media (max-width: 720px) {
  .image-rounded__item {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .image-rounded__preview-box {
    width: 88px;
    height: 88px;
  }
}
</style>
