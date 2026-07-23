<script lang="ts" setup>
import {computed, onBeforeUnmount, ref} from 'vue'
import {useToast} from '@/stores/toast'

type OutputFormat = 'webm' | 'mp4'
type BitrateMode = 'keep' | '1000' | '2500' | '5000' | '8000' | '12000' | '20000'
type ResolutionMode = 'keep' | '50' | '480' | '720' | '1080' | '1440' | '2160'

interface FormatOption {
  value: OutputFormat
  label: string
  mime: string
  ext: string
  recorderMimes: string[]
}

interface ConvertOptions {
  format: OutputFormat
  bitrateMode: BitrateMode
  resolutionMode: ResolutionMode
  keepAudio: boolean
}

interface VideoItem {
  id: string
  file: File
  name: string
  sourceType: string
  size: number
  duration: number
  width: number
  height: number
  bitrateKbps: number | null
  objectUrl: string
  status: 'ready' | 'converting' | 'done' | 'error'
  errorMessage?: string
  resultBlob?: Blob
  resultUrl?: string
  resultSize?: number
  resultDuration?: number
  resultWidth?: number
  resultHeight?: number
}

const toast = useToast()

const MAX_BITRATE = 20000
const STANDARD_BITRATES = [1000, 2500, 5000, 8000, 12000, 20000] as const

const items = ref<VideoItem[]>([])
const outputFormat = ref<OutputFormat>('webm')
const bitrateMode = ref<BitrateMode>('keep')
const resolutionMode = ref<ResolutionMode>('keep')
const keepAudio = ref(true)
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const converting = ref(false)

const acceptTypes = [
  'video/*',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  '.mp4',
  '.webm',
  '.ogg',
  '.ogv',
  '.mov',
  '.avi',
  '.mkv',
  '.m4v',
].join(',')

const allFormatOptions: FormatOption[] = [
  {
    value: 'webm',
    label: 'WebM',
    mime: 'video/webm',
    ext: 'webm',
    recorderMimes: [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ],
  },
  {
    value: 'mp4',
    label: 'MP4',
    mime: 'video/mp4',
    ext: 'mp4',
    recorderMimes: [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4',
    ],
  },
]

function pickRecorderMime(candidates: string[] = []): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null
  }
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return null
}

const formatOptions = computed(() =>
  allFormatOptions.filter((option) => Boolean(pickRecorderMime(option.recorderMimes))),
)

const hasItems = computed(() => items.value.length > 0)
const hasResults = computed(() => items.value.some((item) => item.status === 'done' && item.resultBlob))

const bitrateOptions: { value: BitrateMode; label: string }[] = [
  {value: 'keep', label: '原比特率'},
  ...STANDARD_BITRATES.map((value) => ({
    value: String(value) as BitrateMode,
    label: value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} Mbps` : `${value} kbps`,
  })),
]

const resolutionOptions: { value: ResolutionMode; label: string }[] = [
  {value: 'keep', label: '原分辨率'},
  {value: '50', label: '50%'},
  {value: '480', label: '480p'},
  {value: '720', label: '720p'},
  {value: '1080', label: '1080p'},
  {value: '1440', label: '1440p'},
  {value: '2160', label: '2160p'},
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function getSourceLabel(type: string, name: string): string {
  if (type) {
    const subtype = type.split('/')[1]
    if (subtype) {
      return subtype
        .toUpperCase()
        .replace('QUICKTIME', 'MOV')
        .replace('X-MSVIDEO', 'AVI')
        .replace('X-MATROSKA', 'MKV')
        .replace('OGG', 'OGV')
    }
  }
  const ext = name.includes('.') ? name.split('.').pop() : ''
  return (ext || '未知').toUpperCase()
}

function stripExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(0, index) : name
}

function getFormatMeta(format: OutputFormat): FormatOption {
  return allFormatOptions.find((item) => item.value === format)!
}

function estimateBitrateKbps(size: number, duration: number): number | null {
  if (!Number.isFinite(size) || !Number.isFinite(duration) || size <= 0 || duration <= 0) return null
  const kbps = Math.round((size * 8) / duration / 1000)
  if (!Number.isFinite(kbps) || kbps <= 0) return null
  return kbps
}

function snapBitrate(kbps: number): number {
  const clamped = Math.min(MAX_BITRATE, Math.max(STANDARD_BITRATES[0], Math.round(kbps)))
  return STANDARD_BITRATES.reduce((best, current) =>
    Math.abs(current - clamped) < Math.abs(best - clamped) ? current : best,
  )
}

function resolveBitrate(item: VideoItem, mode: BitrateMode): number {
  if (mode !== 'keep') {
    const value = Number(mode)
    return Number.isFinite(value) && value > 0 ? value : MAX_BITRATE
  }
  if (item.bitrateKbps == null) return MAX_BITRATE
  return snapBitrate(item.bitrateKbps)
}

function resolveOutputSize(
  srcW: number,
  srcH: number,
  mode: ResolutionMode,
): { width: number; height: number } {
  if (srcW <= 0 || srcH <= 0) return {width: 1, height: 1}

  let width = srcW
  let height = srcH

  if (mode === '50') {
    width = Math.max(2, Math.round(srcW * 0.5))
    height = Math.max(2, Math.round(srcH * 0.5))
  } else if (mode !== 'keep') {
    const maxHeight = Number(mode)
    if (srcH > maxHeight) {
      const ratio = maxHeight / srcH
      width = Math.max(2, Math.round(srcW * ratio))
      height = Math.max(2, Math.round(srcH * ratio))
    }
  }

  width = Math.max(2, width - (width % 2))
  height = Math.max(2, height - (height % 2))
  return {width, height}
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function loadVideoMetadata(url: string): Promise<{
  duration: number
  width: number
  height: number
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.setAttribute('playsinline', 'true')

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
    }

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const width = video.videoWidth || 0
      const height = video.videoHeight || 0
      cleanup()
      if (width <= 0 || height <= 0) {
        reject(new Error('无法读取视频尺寸'))
        return
      }
      resolve({duration, width, height})
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('无法读取视频文件'))
    }

    video.src = url
  })
}

function captureVideoStream(video: HTMLVideoElement): MediaStream | null {
  const anyVideo = video as HTMLVideoElement & {
    captureStream?: (frameRate?: number) => MediaStream
    mozCaptureStream?: (frameRate?: number) => MediaStream
  }
  try {
    if (typeof anyVideo.captureStream === 'function') return anyVideo.captureStream()
    if (typeof anyVideo.mozCaptureStream === 'function') return anyVideo.mozCaptureStream()
  } catch {
    return null
  }
  return null
}

async function encodeVideo(
  item: VideoItem,
  options: ConvertOptions,
): Promise<{ blob: Blob; width: number; height: number; duration: number }> {
  const meta = getFormatMeta(options.format)
  const mime = pickRecorderMime(meta.recorderMimes)
  if (!mime) throw new Error('当前浏览器不支持该格式')

  const size = resolveOutputSize(item.width, item.height, options.resolutionMode)
  const bitrate = resolveBitrate(item, options.bitrateMode)

  const video = document.createElement('video')
  video.src = item.objectUrl
  video.preload = 'auto'
  video.playsInline = true
  video.setAttribute('playsinline', 'true')
  video.muted = false
  video.volume = 0.0001
  video.crossOrigin = 'anonymous'
  video.style.position = 'fixed'
  video.style.left = '-99999px'
  video.style.top = '0'
  video.style.width = '1px'
  video.style.height = '1px'
  video.style.opacity = '0'
  video.style.pointerEvents = 'none'
  document.body.appendChild(video)

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('视频加载失败'))
      video.load()
    })

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error('视频时长无效')
    }

    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d', {alpha: false})
    if (!ctx) throw new Error('无法创建画布')

    const fps = 30
    const canvasStream = canvas.captureStream(fps)
    const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()]

    if (options.keepAudio) {
      const sourceStream = captureVideoStream(video)
      const audioTracks = sourceStream?.getAudioTracks() ?? []
      for (const track of audioTracks) {
        tracks.push(track)
      }
    }

    if (!tracks.length) throw new Error('无法捕获视频流')

    const stream = new MediaStream(tracks)
    const chunks: BlobPart[] = []
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: bitrate * 1000,
      audioBitsPerSecond: options.keepAudio ? 192000 : undefined,
    })

    const stopped = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onerror = () => reject(new Error('录制失败'))
      recorder.onstop = () => {
        resolve(new Blob(chunks, {type: mime.split(';')[0] || meta.mime}))
      }
    })

    video.currentTime = 0
    await new Promise<void>((resolve) => {
      if (video.readyState >= 2) {
        resolve()
        return
      }
      video.oncanplay = () => resolve()
    })

    let drawing = true
    const drawFrame = () => {
      if (!drawing) return
      ctx.drawImage(video, 0, 0, size.width, size.height)
      if (!video.paused && !video.ended) {
        requestAnimationFrame(drawFrame)
      }
    }

    recorder.start(250)
    try {
      await video.play()
    } catch {
      video.muted = true
      await video.play()
    }
    drawFrame()

    await new Promise<void>((resolve) => {
      const onEnded = () => {
        video.removeEventListener('ended', onEnded)
        resolve()
      }
      video.addEventListener('ended', onEnded)
      window.setTimeout(() => resolve(), Math.ceil(video.duration * 1000) + 500)
    })

    drawing = false
    ctx.drawImage(video, 0, 0, size.width, size.height)
    await wait(120)

    if (recorder.state !== 'inactive') recorder.stop()
    for (const track of stream.getTracks()) track.stop()

    const blob = await stopped
    if (!blob.size) throw new Error('转换结果为空')

    return {
      blob,
      width: size.width,
      height: size.height,
      duration: video.duration,
    }
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
    video.remove()
  }
}

function revokeItemUrls(item: VideoItem) {
  URL.revokeObjectURL(item.objectUrl)
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
}

function clearResults(item: VideoItem) {
  if (item.resultUrl) {
    URL.revokeObjectURL(item.resultUrl)
    item.resultUrl = undefined
  }
  item.resultBlob = undefined
  item.resultSize = undefined
  item.resultDuration = undefined
  item.resultWidth = undefined
  item.resultHeight = undefined
  item.status = 'ready'
  item.errorMessage = undefined
}

async function addFiles(fileList: FileList | File[]) {
  const files = Array.from(fileList).filter(
    (file) =>
      file.type.startsWith('video/')
      || /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)$/i.test(file.name),
  )

  if (!files.length) return

  let added = 0
  for (const file of files) {
    const objectUrl = URL.createObjectURL(file)
    try {
      const meta = await loadVideoMetadata(objectUrl)
      items.value.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        name: file.name,
        sourceType: getSourceLabel(file.type, file.name),
        size: file.size,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        bitrateKbps: estimateBitrateKbps(file.size, meta.duration),
        objectUrl,
        status: 'ready',
      })
      added += 1
    } catch {
      URL.revokeObjectURL(objectUrl)
      toast.error(`无法读取文件：${file.name}`)
    }
  }

  if (added > 0) toast.success(`已添加 ${added} 个视频`)
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

async function convertItem(item: VideoItem, options: ConvertOptions): Promise<void> {
  clearResults(item)
  item.status = 'converting'

  try {
    const result = await encodeVideo(item, options)
    item.resultBlob = result.blob
    item.resultSize = result.blob.size
    item.resultDuration = result.duration
    item.resultWidth = result.width
    item.resultHeight = result.height
    item.resultUrl = URL.createObjectURL(result.blob)
    item.status = 'done'
  } catch (error) {
    item.status = 'error'
    item.errorMessage = error instanceof Error ? error.message : '转换失败'
  }
}

async function convertAll() {
  if (!hasItems.value || converting.value) return
  if (!formatOptions.value.length) {
    toast.error('当前浏览器不支持视频录制')
    return
  }

  converting.value = true
  const options: ConvertOptions = {
    format: outputFormat.value,
    bitrateMode: bitrateMode.value,
    resolutionMode: resolutionMode.value,
    keepAudio: keepAudio.value,
  }
  let success = 0

  try {
    for (const item of items.value) {
      await convertItem(item, options)
      if (item.status === 'done') success += 1
    }

    if (success > 0) toast.success(`已转换 ${success} 个视频`)
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

function downloadItem(item: VideoItem) {
  if (!item.resultBlob) return
  const meta = getFormatMeta(outputFormat.value)
  downloadBlob(item.resultBlob, `${stripExtension(item.name)}.${meta.ext}`)
}

async function downloadAll() {
  const doneItems = items.value.filter((item) => item.status === 'done' && item.resultBlob)
  if (!doneItems.length) return

  const meta = getFormatMeta(outputFormat.value)
  for (const item of doneItems) {
    downloadBlob(item.resultBlob!, `${stripExtension(item.name)}.${meta.ext}`)
    await wait(80)
  }
  toast.success(`开始下载 ${doneItems.length} 个文件`)
}

function statusLabel(item: VideoItem): string {
  if (item.status === 'converting') return '转换中'
  if (item.status === 'done') return '已完成'
  if (item.status === 'error') return '失败'
  return '待转换'
}

// Prefer a supported default format when webm is unavailable (e.g. some Safari builds).
if (typeof MediaRecorder !== 'undefined') {
  const preferred = formatOptions.value[0]
  if (preferred) outputFormat.value = preferred.value
}

onBeforeUnmount(() => {
  for (const item of items.value) {
    revokeItemUrls(item)
  }
})
</script>

<template>
  <div class="video-format">
    <div class="video-format__panel">
      <div
        :class="['video-format__dropzone', { 'video-format__dropzone--active': isDragging }]"
        role="button"
        tabindex="0"
        @click="openFilePicker"
        @dragleave="onDragLeave"
        @dragover="onDragOver"
        @drop="onDrop"
        @keydown.enter.prevent="openFilePicker"
        @keydown.space.prevent="openFilePicker"
      >
        <div class="video-format__dropzone-icon">
          <svg
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            viewBox="0 0 24 24"
          >
            <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
            <path d="M12.5 21h-6.5a3 3 0 0 1 -3 -3v-10a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v5"/>
            <path d="M10.5 10.5l5 2.5l-5 2.5z"/>
            <path d="M19 22v-6"/>
            <path d="M22 19l-3 -3l-3 3"/>
          </svg>
        </div>
        <div class="video-format__dropzone-text">
          <p class="video-format__dropzone-title">点击或拖拽视频到此处</p>
          <p class="video-format__dropzone-desc">支持 MP4、WebM、MOV、MKV、AVI 等格式</p>
        </div>
        <input
          ref="fileInputRef"
          :accept="acceptTypes"
          class="video-format__file-input"
          multiple
          type="file"
          @change="onFileChange"
        />
      </div>

      <div class="video-format__options">
        <label class="video-format__field">
          <span class="video-format__label">目标格式</span>
          <select v-model="outputFormat" class="video-format__select">
            <option
              v-for="option in formatOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <div class="video-format__row">
          <label class="video-format__field">
            <span class="video-format__label">比特率</span>
            <select v-model="bitrateMode" class="video-format__select">
              <option
                v-for="option in bitrateOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="video-format__field">
            <span class="video-format__label">分辨率</span>
            <select v-model="resolutionMode" class="video-format__select">
              <option
                v-for="option in resolutionOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <label class="video-format__checkbox">
          <input v-model="keepAudio" type="checkbox"/>
          <span>保留音频</span>
        </label>
      </div>

      <div class="video-format__actions">
        <button
          :disabled="!hasItems || converting || !formatOptions.length"
          class="video-format__btn video-format__btn--primary pressable"
          type="button"
          @click="convertAll"
        >
          {{ converting ? '转换中…' : '开始转换' }}
        </button>
        <button
          :disabled="!hasResults || converting"
          class="video-format__btn pressable"
          type="button"
          @click="downloadAll"
        >
          全部下载
        </button>
        <button
          :disabled="!hasItems || converting"
          class="video-format__btn pressable"
          type="button"
          @click="clearAll"
        >
          清空
        </button>
      </div>
    </div>

    <div v-if="hasItems" class="video-format__list">
      <article
        v-for="item in items"
        :key="item.id"
        class="video-format__item"
      >
        <div class="video-format__preview">
          <video
            :src="item.resultUrl || item.objectUrl"
            class="video-format__player"
            controls
            playsinline
            preload="metadata"
          />
        </div>

        <div class="video-format__meta">
          <div class="video-format__meta-top">
            <h3 :title="item.name" class="video-format__name">{{ item.name }}</h3>
            <span
              :class="[
                'video-format__status',
                `video-format__status--${item.status}`,
              ]"
            >
              {{ statusLabel(item) }}
            </span>
          </div>

          <p class="video-format__info">
            {{ item.sourceType }}
            · {{ formatDuration(item.duration) }}
            · {{ item.width }}×{{ item.height }}
            <template v-if="item.bitrateKbps != null">
              · {{ item.bitrateKbps }} kbps
            </template>
            · {{ formatBytes(item.size) }}
            <template v-if="item.resultSize != null">
              →
              <template v-if="item.resultDuration != null">
                {{ formatDuration(item.resultDuration) }} ·
              </template>
              <template v-if="item.resultWidth && item.resultHeight">
                {{ item.resultWidth }}×{{ item.resultHeight }} ·
              </template>
              {{ formatBytes(item.resultSize) }}
            </template>
          </p>

          <p v-if="item.errorMessage" class="video-format__error">{{ item.errorMessage }}</p>

          <div class="video-format__item-actions">
            <button
              :disabled="item.status !== 'done' || !item.resultBlob"
              class="video-format__btn video-format__btn--ghost pressable"
              type="button"
              @click="downloadItem(item)"
            >
              下载
            </button>
            <button
              :disabled="converting"
              class="video-format__btn video-format__btn--ghost pressable"
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
.video-format {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.video-format__panel {
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

[data-theme="dark"] .video-format__panel {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.video-format__dropzone {
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

.video-format__dropzone--active,
.video-format__dropzone:hover {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.video-format__dropzone-icon {
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

.video-format__dropzone-icon svg {
  width: 24px;
  height: 24px;
}

.video-format__dropzone-text {
  text-align: center;
}

.video-format__dropzone-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.video-format__dropzone-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.video-format__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.video-format__options {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.video-format__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.video-format__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.video-format__label {
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

.video-format__select {
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

.video-format__select:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.video-format__checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  user-select: none;
  width: fit-content;
  cursor: pointer;
}

.video-format__checkbox input {
  width: 15px;
  height: 15px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.video-format__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.video-format__btn {
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

.video-format__btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.video-format__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.video-format__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.video-format__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.video-format__btn--ghost {
  padding: 6px 12px;
  font-size: 12px;
}

.video-format__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.video-format__item {
  display: grid;
  grid-template-columns: minmax(200px, 280px) 1fr;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .video-format__item {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.video-format__preview {
  min-width: 0;
}

.video-format__player {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-md);
  background: #000;
  border: 1px solid var(--surface-border-strong);
  display: block;
  object-fit: contain;
}

.video-format__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.video-format__meta-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.video-format__name {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-format__status {
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

.video-format__status--ready {
  color: #64748b;
  background: color-mix(in srgb, #64748b 14%, transparent);
  border-color: color-mix(in srgb, #64748b 22%, transparent);
}

[data-theme="dark"] .video-format__status--ready {
  color: #94a3b8;
  background: color-mix(in srgb, #94a3b8 16%, transparent);
  border-color: color-mix(in srgb, #94a3b8 24%, transparent);
}

.video-format__status--converting {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  border-color: color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.video-format__status--done {
  color: #16a34a;
  background: color-mix(in srgb, #22c55e 16%, transparent);
  border-color: color-mix(in srgb, #22c55e 28%, transparent);
}

[data-theme="dark"] .video-format__status--done {
  color: #4ade80;
  background: color-mix(in srgb, #22c55e 18%, transparent);
  border-color: color-mix(in srgb, #4ade80 28%, transparent);
}

.video-format__status--error {
  color: #dc2626;
  background: color-mix(in srgb, #ef4444 14%, transparent);
  border-color: color-mix(in srgb, #ef4444 28%, transparent);
}

[data-theme="dark"] .video-format__status--error {
  color: #f87171;
  background: color-mix(in srgb, #ef4444 18%, transparent);
  border-color: color-mix(in srgb, #f87171 28%, transparent);
}

.video-format__info {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.45;
}

.video-format__error {
  margin: 0;
  font-size: 12px;
  color: #ef4444;
}

.video-format__item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

@media (max-width: 640px) {
  .video-format__item {
    grid-template-columns: 1fr;
  }
}
</style>
