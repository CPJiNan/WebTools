<script lang="ts" setup>
import {computed, onBeforeUnmount, ref} from 'vue'
import lamejs from 'lamejs'
import {useToast} from '@/stores/toast'

type OutputFormat = 'wav' | 'mp3' | 'webm' | 'ogg' | 'm4a'
type ChannelMode = 'keep' | 'mono' | 'stereo'
type SampleRateMode = 'keep' | '8000' | '16000' | '22050' | '32000' | '44100' | '48000'
type BitrateMode = 'keep' | '64' | '96' | '128' | '160' | '192' | '256' | '320'

interface FormatOption {
  value: OutputFormat
  label: string
  mime: string
  ext: string
  offline: boolean
  recorderMimes?: string[]
}

interface ConvertOptions {
  format: OutputFormat
  bitrateMode: BitrateMode
  sampleRateMode: SampleRateMode
  channelMode: ChannelMode
}

interface AudioItem {
  id: string
  file: File
  name: string
  sourceType: string
  size: number
  duration: number
  sampleRate: number
  channels: number
  bitrateKbps: number | null
  objectUrl: string
  buffer: AudioBuffer
  status: 'ready' | 'converting' | 'done' | 'error'
  errorMessage?: string
  resultBlob?: Blob
  resultUrl?: string
  resultSize?: number
  resultDuration?: number
  resultSampleRate?: number
  resultChannels?: number
}

const toast = useToast()

const MAX_BITRATE = 320
const STANDARD_BITRATES = [64, 96, 128, 160, 192, 256, 320] as const

const items = ref<AudioItem[]>([])
const outputFormat = ref<OutputFormat>('wav')
const bitrateMode = ref<BitrateMode>('keep')
const sampleRateMode = ref<SampleRateMode>('keep')
const channelMode = ref<ChannelMode>('keep')
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const converting = ref(false)

let sharedAudioContext: AudioContext | null = null

const acceptTypes = [
  'audio/*',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/x-flac',
  'audio/x-m4a',
  '.mp3',
  '.wav',
  '.ogg',
  '.oga',
  '.webm',
  '.m4a',
  '.aac',
  '.flac',
  '.opus',
].join(',')

const allFormatOptions: FormatOption[] = [
  {value: 'wav', label: 'WAV', mime: 'audio/wav', ext: 'wav', offline: true},
  {value: 'mp3', label: 'MP3', mime: 'audio/mpeg', ext: 'mp3', offline: true},
  {
    value: 'webm',
    label: 'WebM',
    mime: 'audio/webm',
    ext: 'webm',
    offline: false,
    recorderMimes: ['audio/webm;codecs=opus', 'audio/webm'],
  },
  {
    value: 'ogg',
    label: 'OGG',
    mime: 'audio/ogg',
    ext: 'ogg',
    offline: false,
    recorderMimes: ['audio/ogg;codecs=opus', 'audio/ogg'],
  },
  {
    value: 'm4a',
    label: 'M4A',
    mime: 'audio/mp4',
    ext: 'm4a',
    offline: false,
    recorderMimes: ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac'],
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
  allFormatOptions.filter((option) => {
    if (option.offline) return true
    return Boolean(pickRecorderMime(option.recorderMimes))
  }),
)

const hasItems = computed(() => items.value.length > 0)
const hasResults = computed(() => items.value.some((item) => item.status === 'done' && item.resultBlob))
const showBitrate = computed(() => outputFormat.value !== 'wav')

const bitrateOptions: { value: BitrateMode; label: string }[] = [
  {value: 'keep', label: '原比特率'},
  ...STANDARD_BITRATES.map((value) => ({
    value: String(value) as BitrateMode,
    label: `${value} kbps`,
  })),
]


const sampleRateOptions: { value: SampleRateMode; label: string }[] = [
  {value: 'keep', label: '原采样率'},
  {value: '8000', label: '8000 Hz'},
  {value: '16000', label: '16000 Hz'},
  {value: '22050', label: '22050 Hz'},
  {value: '32000', label: '32000 Hz'},
  {value: '44100', label: '44100 Hz'},
  {value: '48000', label: '48000 Hz'},
]

const channelOptions: { value: ChannelMode; label: string }[] = [
  {value: 'keep', label: '原声道'},
  {value: 'mono', label: '单声道'},
  {value: 'stereo', label: '立体声'},
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
        .replace('MPEG', 'MP3')
        .replace('X-M4A', 'M4A')
        .replace('MP4', 'M4A')
        .replace('X-WAV', 'WAV')
        .replace('WAVE', 'WAV')
        .replace('X-FLAC', 'FLAC')
        .replace('X-AAC', 'AAC')
    }
  }
  const ext = name.includes('.') ? name.split('.').pop() : ''
  return (ext || '未知').toUpperCase()
}

function stripExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(0, index) : name
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

function resolveBitrate(item: AudioItem, mode: BitrateMode): number {
  if (mode !== 'keep') {
    const value = Number(mode)
    return Number.isFinite(value) && value > 0 ? value : MAX_BITRATE
  }
  if (item.bitrateKbps == null) return MAX_BITRATE
  return snapBitrate(item.bitrateKbps)
}

function getFormatMeta(format: OutputFormat): FormatOption {
  return allFormatOptions.find((item) => item.value === format)!
}

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const Ctx = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext
    }).webkitAudioContext
    if (!Ctx) throw new Error('当前浏览器不支持 Web Audio')
    sharedAudioContext = new Ctx()
  }
  return sharedAudioContext
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i))
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i += 1, offset += 2) {
    const sample = Math.max(-1, Math.min(1, input[i]!))
    output.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
}

function interleaveChannels(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels
  if (channels === 1) return buffer.getChannelData(0)

  const length = buffer.length
  const result = new Float32Array(length * channels)
  const channelData: Float32Array[] = []
  for (let ch = 0; ch < channels; ch += 1) {
    channelData.push(buffer.getChannelData(ch))
  }

  let offset = 0
  for (let i = 0; i < length; i += 1) {
    for (let ch = 0; ch < channels; ch += 1) {
      result[offset] = channelData[ch]![i]!
      offset += 1
    }
  }
  return result
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const interleaved = interleaveChannels(buffer)
  const dataLength = interleaved.length * 2
  const arrayBuffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(arrayBuffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)
  floatTo16BitPCM(view, 44, interleaved)

  return new Blob([arrayBuffer], {type: 'audio/wav'})
}

function floatToInt16(channel: Float32Array): Int16Array {
  const result = new Int16Array(channel.length)
  for (let i = 0; i < channel.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, channel[i]!))
    result[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return result
}

function encodeMp3(buffer: AudioBuffer, kbps: number): Blob {
  const channels = Math.min(2, buffer.numberOfChannels) as 1 | 2
  const sampleRate = buffer.sampleRate
  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps)
  const blockSize = 1152
  const left = floatToInt16(buffer.getChannelData(0))
  const right = channels === 2
    ? floatToInt16(buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0))
    : null

  const parts: BlobPart[] = []
  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize)
    const mp3buf = right
      ? encoder.encodeBuffer(leftChunk, right.subarray(i, i + blockSize))
      : encoder.encodeBuffer(leftChunk)
    if (mp3buf.length > 0) {
      const bytes = new Uint8Array(mp3buf.length)
      bytes.set(mp3buf as unknown as ArrayLike<number>)
      parts.push(bytes)
    }
  }

  const end = encoder.flush()
  if (end.length > 0) {
    const bytes = new Uint8Array(end.length)
    bytes.set(end as unknown as ArrayLike<number>)
    parts.push(bytes)
  }

  return new Blob(parts, {type: 'audio/mpeg'})
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length
  const mono = new Float32Array(length)
  const channelCount = buffer.numberOfChannels
  for (let ch = 0; ch < channelCount; ch += 1) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i += 1) {
      mono[i]! += data[i]! / channelCount
    }
  }
  return mono
}

async function reshapeBuffer(
  source: AudioBuffer,
  targetChannels: number,
  targetSampleRate: number,
): Promise<AudioBuffer> {
  const duration = source.duration
  const frameCount = Math.max(1, Math.ceil(duration * targetSampleRate))
  const offline = new OfflineAudioContext(targetChannels, frameCount, targetSampleRate)
  const temp = offline.createBuffer(
    source.numberOfChannels,
    source.length,
    source.sampleRate,
  )

  for (let ch = 0; ch < source.numberOfChannels; ch += 1) {
    temp.copyToChannel(new Float32Array(source.getChannelData(ch)), ch)
  }

  const node = offline.createBufferSource()
  node.buffer = temp

  if (targetChannels === source.numberOfChannels) {
    node.connect(offline.destination)
  } else if (targetChannels === 1) {
    const merger = offline.createChannelMerger(1)
    const splitter = offline.createChannelSplitter(source.numberOfChannels)
    node.connect(splitter)
    const gain = offline.createGain()
    gain.gain.value = 1 / source.numberOfChannels
    for (let ch = 0; ch < source.numberOfChannels; ch += 1) {
      splitter.connect(gain, ch)
    }
    gain.connect(merger, 0, 0)
    merger.connect(offline.destination)
  } else {
    const merger = offline.createChannelMerger(2)
    if (source.numberOfChannels === 1) {
      node.connect(merger, 0, 0)
      node.connect(merger, 0, 1)
    } else {
      const splitter = offline.createChannelSplitter(source.numberOfChannels)
      node.connect(splitter)
      splitter.connect(merger, 0, 0)
      splitter.connect(merger, Math.min(1, source.numberOfChannels - 1), 1)
    }
    merger.connect(offline.destination)
  }

  node.start(0)
  return offline.startRendering()
}

async function prepareBuffer(source: AudioBuffer, options: ConvertOptions): Promise<AudioBuffer> {
  const targetSampleRate = options.sampleRateMode === 'keep'
    ? source.sampleRate
    : Number(options.sampleRateMode)

  let targetChannels = source.numberOfChannels
  if (options.channelMode === 'mono') targetChannels = 1
  if (options.channelMode === 'stereo') targetChannels = 2
  if (options.format === 'mp3') targetChannels = Math.min(2, targetChannels)

  if (targetSampleRate === source.sampleRate && targetChannels === source.numberOfChannels) {
    return source
  }

  if (targetSampleRate === source.sampleRate && targetChannels === 1 && source.numberOfChannels > 1) {
    const mono = mixToMono(source)
    const ctx = getAudioContext()
    const buffer = ctx.createBuffer(1, mono.length, source.sampleRate)
    buffer.copyToChannel(new Float32Array(mono), 0)
    return buffer
  }

  if (targetSampleRate === source.sampleRate && targetChannels === 2 && source.numberOfChannels === 1) {
    const ctx = getAudioContext()
    const data = new Float32Array(source.getChannelData(0))
    const buffer = ctx.createBuffer(2, data.length, source.sampleRate)
    buffer.copyToChannel(data, 0)
    buffer.copyToChannel(data, 1)
    return buffer
  }

  return reshapeBuffer(source, targetChannels, targetSampleRate)
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function encodeWithMediaRecorder(
  buffer: AudioBuffer,
  mimeType: string,
  bitsPerSecond: number,
): Promise<Blob> {
  const Ctx = window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext
  }).webkitAudioContext
  if (!Ctx) throw new Error('当前浏览器不支持 Web Audio')

  const ctx = new Ctx({sampleRate: buffer.sampleRate})
  try {
    if (ctx.state === 'suspended') await ctx.resume()

    const source = ctx.createBufferSource()
    source.buffer = buffer
    const dest = ctx.createMediaStreamDestination()
    source.connect(dest)

    const chunks: BlobPart[] = []
    const recorder = new MediaRecorder(dest.stream, {
      mimeType,
      audioBitsPerSecond: bitsPerSecond,
    })

    const stopped = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onerror = () => reject(new Error('编码失败'))
      recorder.onstop = () => {
        resolve(new Blob(chunks, {type: mimeType.split(';')[0] || mimeType}))
      }
    })

    recorder.start(250)
    source.start(0)

    await new Promise<void>((resolve) => {
      source.onended = () => resolve()
      window.setTimeout(() => resolve(), Math.ceil(buffer.duration * 1000) + 300)
    })

    await wait(120)
    if (recorder.state !== 'inactive') recorder.stop()
    return await stopped
  } finally {
    await ctx.close().catch(() => undefined)
  }
}

async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') await ctx.resume()
  const data = await file.arrayBuffer()
  const copy = data.slice(0)
  try {
    return await ctx.decodeAudioData(copy)
  } catch {
    throw new Error('无法解码该音频文件')
  }
}

function revokeItemUrls(item: AudioItem) {
  URL.revokeObjectURL(item.objectUrl)
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
}

function clearResults(item: AudioItem) {
  if (item.resultUrl) {
    URL.revokeObjectURL(item.resultUrl)
    item.resultUrl = undefined
  }
  item.resultBlob = undefined
  item.resultSize = undefined
  item.resultDuration = undefined
  item.resultSampleRate = undefined
  item.resultChannels = undefined
  item.status = 'ready'
  item.errorMessage = undefined
}

async function addFiles(fileList: FileList | File[]) {
  const files = Array.from(fileList).filter(
    (file) =>
      file.type.startsWith('audio/')
      || /\.(mp3|wav|ogg|oga|webm|m4a|aac|flac|opus)$/i.test(file.name),
  )

  if (!files.length) return

  let added = 0
  for (const file of files) {
    try {
      const buffer = await decodeAudioFile(file)
      const objectUrl = URL.createObjectURL(file)
      items.value.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        name: file.name,
        sourceType: getSourceLabel(file.type, file.name),
        size: file.size,
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        bitrateKbps: estimateBitrateKbps(file.size, buffer.duration),
        objectUrl,
        buffer,
        status: 'ready',
      })
      added += 1
    } catch {
      toast.error(`无法读取文件：${file.name}`)
    }
  }

  if (added > 0) toast.success(`已添加 ${added} 个音频`)
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

async function convertItem(item: AudioItem, options: ConvertOptions): Promise<void> {
  clearResults(item)
  item.status = 'converting'

  try {
    const prepared = await prepareBuffer(item.buffer, options)
    const meta = getFormatMeta(options.format)
    let blob: Blob

    const bitrate = resolveBitrate(item, options.bitrateMode)

    if (options.format === 'wav') {
      blob = encodeWav(prepared)
    } else if (options.format === 'mp3') {
      blob = encodeMp3(prepared, bitrate)
    } else {
      const mime = pickRecorderMime(meta.recorderMimes)
      if (!mime) {
        item.status = 'error'
        item.errorMessage = '当前浏览器不支持该格式'
        return
      }
      blob = await encodeWithMediaRecorder(prepared, mime, bitrate * 1000)
    }

    item.resultBlob = blob
    item.resultSize = blob.size
    item.resultDuration = prepared.duration
    item.resultSampleRate = prepared.sampleRate
    item.resultChannels = prepared.numberOfChannels
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
    bitrateMode: bitrateMode.value,
    sampleRateMode: sampleRateMode.value,
    channelMode: channelMode.value,
  }
  let success = 0

  try {
    for (const item of items.value) {
      await convertItem(item, options)
      if (item.status === 'done') success += 1
    }

    if (success > 0) toast.success(`已转换 ${success} 个音频`)
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

function downloadItem(item: AudioItem) {
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
    await wait(80)
  }
  toast.success(`开始下载 ${doneItems.length} 个文件`)
}

function statusLabel(item: AudioItem): string {
  if (item.status === 'converting') return '转换中'
  if (item.status === 'done') return '已完成'
  if (item.status === 'error') return '失败'
  return '待转换'
}

function channelLabel(channels: number): string {
  if (channels <= 1) return '单声道'
  if (channels === 2) return '立体声'
  return `${channels} 声道`
}

onBeforeUnmount(() => {
  for (const item of items.value) {
    revokeItemUrls(item)
  }
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    void sharedAudioContext.close()
  }
  sharedAudioContext = null
})
</script>

<template>
  <div class="audio-format">
    <div class="audio-format__panel">
      <div
        :class="['audio-format__dropzone', { 'audio-format__dropzone--active': isDragging }]"
        role="button"
        tabindex="0"
        @click="openFilePicker"
        @dragleave="onDragLeave"
        @dragover="onDragOver"
        @drop="onDrop"
        @keydown.enter.prevent="openFilePicker"
        @keydown.space.prevent="openFilePicker"
      >
        <div class="audio-format__dropzone-icon">
          <svg
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            viewBox="0 0 24 24"
          >
            <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
            <path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>
            <path d="M9 17v-13h10v6"/>
            <path d="M9 8h10"/>
            <path d="M19 22v-6"/>
            <path d="M22 19l-3 -3l-3 3"/>
          </svg>
        </div>
        <div class="audio-format__dropzone-text">
          <p class="audio-format__dropzone-title">点击或拖拽音频到此处</p>
          <p class="audio-format__dropzone-desc">支持 MP3、WAV、OGG、WebM、M4A、AAC、FLAC 等格式</p>
        </div>
        <input
          ref="fileInputRef"
          :accept="acceptTypes"
          class="audio-format__file-input"
          multiple
          type="file"
          @change="onFileChange"
        />
      </div>

      <div class="audio-format__options">
        <label class="audio-format__field">
          <span class="audio-format__label">目标格式</span>
          <select v-model="outputFormat" class="audio-format__select">
            <option
              v-for="option in formatOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label v-if="showBitrate" class="audio-format__field">
          <span class="audio-format__label">比特率</span>
          <select v-model="bitrateMode" class="audio-format__select">
            <option
              v-for="option in bitrateOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <div class="audio-format__row">
          <label class="audio-format__field">
            <span class="audio-format__label">采样率</span>
            <select v-model="sampleRateMode" class="audio-format__select">
              <option
                v-for="option in sampleRateOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="audio-format__field">
            <span class="audio-format__label">声道</span>
            <select v-model="channelMode" class="audio-format__select">
              <option
                v-for="option in channelOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <div class="audio-format__actions">
        <button
          :disabled="!hasItems || converting"
          class="audio-format__btn audio-format__btn--primary pressable"
          type="button"
          @click="convertAll"
        >
          {{ converting ? '转换中…' : '开始转换' }}
        </button>
        <button
          :disabled="!hasResults || converting"
          class="audio-format__btn pressable"
          type="button"
          @click="downloadAll"
        >
          全部下载
        </button>
        <button
          :disabled="!hasItems || converting"
          class="audio-format__btn pressable"
          type="button"
          @click="clearAll"
        >
          清空
        </button>
      </div>
    </div>

    <div v-if="hasItems" class="audio-format__list">
      <article
        v-for="item in items"
        :key="item.id"
        class="audio-format__item"
      >
        <div class="audio-format__preview">
          <div class="audio-format__preview-icon">
            <svg
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              viewBox="0 0 24 24"
            >
              <path d="M0 0h24v24H0z" fill="none" stroke="none"/>
              <path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>
              <path d="M9 17v-13h10v13"/>
              <path d="M9 8h10"/>
            </svg>
          </div>
          <audio
            :src="item.resultUrl || item.objectUrl"
            class="audio-format__player"
            controls
            preload="metadata"
          />
        </div>

        <div class="audio-format__meta">
          <div class="audio-format__meta-top">
            <h3 :title="item.name" class="audio-format__name">{{ item.name }}</h3>
            <span
              :class="[
                'audio-format__status',
                `audio-format__status--${item.status}`,
              ]"
            >
              {{ statusLabel(item) }}
            </span>
          </div>

          <p class="audio-format__info">
            {{ item.sourceType }}
            · {{ formatDuration(item.duration) }}
            · {{ item.sampleRate }} Hz
            · {{ channelLabel(item.channels) }}
            <template v-if="item.bitrateKbps != null">
              · {{ item.bitrateKbps }} kbps
            </template>
            · {{ formatBytes(item.size) }}
            <template v-if="item.resultSize != null">
              →
              <template v-if="item.resultDuration != null">
                {{ formatDuration(item.resultDuration) }} ·
              </template>
              <template v-if="item.resultSampleRate">
                {{ item.resultSampleRate }} Hz ·
              </template>
              <template v-if="item.resultChannels">
                {{ channelLabel(item.resultChannels) }} ·
              </template>
              {{ formatBytes(item.resultSize) }}
            </template>
          </p>

          <p v-if="item.errorMessage" class="audio-format__error">{{ item.errorMessage }}</p>

          <div class="audio-format__item-actions">
            <button
              :disabled="item.status !== 'done' || !item.resultBlob"
              class="audio-format__btn audio-format__btn--ghost pressable"
              type="button"
              @click="downloadItem(item)"
            >
              下载
            </button>
            <button
              :disabled="converting"
              class="audio-format__btn audio-format__btn--ghost pressable"
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
.audio-format {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.audio-format__panel {
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

[data-theme="dark"] .audio-format__panel {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.audio-format__dropzone {
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

.audio-format__dropzone--active,
.audio-format__dropzone:hover {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.audio-format__dropzone-icon {
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

.audio-format__dropzone-icon svg {
  width: 24px;
  height: 24px;
}

.audio-format__dropzone-text {
  text-align: center;
}

.audio-format__dropzone-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.audio-format__dropzone-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.audio-format__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.audio-format__options {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.audio-format__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.audio-format__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.audio-format__label {
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

.audio-format__select {
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

.audio-format__select:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.audio-format__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.audio-format__btn {
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

.audio-format__btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.audio-format__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.audio-format__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.audio-format__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.audio-format__btn--ghost {
  padding: 6px 12px;
  font-size: 12px;
}

.audio-format__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audio-format__item {
  display: grid;
  grid-template-columns: minmax(180px, 240px) 1fr;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .audio-format__item {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.audio-format__preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.audio-format__preview-icon {
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

.audio-format__preview-icon svg {
  width: 22px;
  height: 22px;
}

.audio-format__player {
  width: 100%;
  height: 36px;
}

.audio-format__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.audio-format__meta-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.audio-format__name {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-format__status {
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

.audio-format__status--ready {
  color: #64748b;
  background: color-mix(in srgb, #64748b 14%, transparent);
  border-color: color-mix(in srgb, #64748b 22%, transparent);
}

[data-theme="dark"] .audio-format__status--ready {
  color: #94a3b8;
  background: color-mix(in srgb, #94a3b8 16%, transparent);
  border-color: color-mix(in srgb, #94a3b8 24%, transparent);
}

.audio-format__status--converting {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  border-color: color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.audio-format__status--done {
  color: #16a34a;
  background: color-mix(in srgb, #22c55e 16%, transparent);
  border-color: color-mix(in srgb, #22c55e 28%, transparent);
}

[data-theme="dark"] .audio-format__status--done {
  color: #4ade80;
  background: color-mix(in srgb, #22c55e 18%, transparent);
  border-color: color-mix(in srgb, #4ade80 28%, transparent);
}

.audio-format__status--error {
  color: #dc2626;
  background: color-mix(in srgb, #ef4444 14%, transparent);
  border-color: color-mix(in srgb, #ef4444 28%, transparent);
}

[data-theme="dark"] .audio-format__status--error {
  color: #f87171;
  background: color-mix(in srgb, #ef4444 18%, transparent);
  border-color: color-mix(in srgb, #f87171 28%, transparent);
}

.audio-format__info {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.45;
}

.audio-format__error {
  margin: 0;
  font-size: 12px;
  color: #ef4444;
}

.audio-format__item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

@media (max-width: 640px) {
  .audio-format__item {
    grid-template-columns: 1fr;
  }
}
</style>
