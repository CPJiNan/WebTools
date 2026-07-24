<script lang="ts" setup>
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {useToast} from '@/stores/toast'

const toast = useToast()

interface ColorStop {
  id: string
  color: string
  position: number
}

interface GradientItem {
  id: string
  angle: number
  stops: ColorStop[]
  height: number
}

const BATCH_SIZE = 24
const gradients = ref<GradientItem[]>([])
const selectedId = ref<string | null>(null)
const draft = ref<GradientItem | null>(null)
const isLoading = ref(false)
const loadMoreTrigger = ref<HTMLElement | null>(null)

const draftCss = computed(() => (draft.value ? toCss(draft.value) : ''))

let idSeq = 0
let loadMoreObserver: IntersectionObserver | null = null

function nextId(prefix = 'g') {
  idSeq += 1
  return `${prefix}-${idSeq}-${Math.random().toString(36).slice(2, 7)}`
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function vividHex(h: number): string {
  const s = randomInt(65, 85)
  const l = randomInt(65, 85)
  return hslToHex(h, s, l)
}

function randomVividHex(): string {
  return vividHex(randomInt(0, 359))
}

function randomColorPair(): [string, string] {
  const h1 = randomInt(0, 359)
  const offset = Math.random() > 0.1 ? randomInt(15, 60) : randomInt(120, 240)
  const h2 = (h1 + offset) % 360
  return [vividHex(h1), vividHex(h2)]
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100
  const lNorm = l / 100
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lNorm - c / 2

  let r = 0
  let g = 0
  let b = 0

  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function normalizeHex(raw: string): string | null {
  const match = raw.trim().match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i)
  if (!match) return null
  let hex = match[1]
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }
  return `#${hex.toLowerCase()}`
}

function createRandomGradient(): GradientItem {
  const [c1, c2] = randomColorPair()

  return {
    id: nextId('grad'),
    angle: randomInt(0, 359),
    stops: [
      {id: nextId('stop'), color: c1, position: 0},
      {id: nextId('stop'), color: c2, position: 100},
    ],
    height: 200,
  }
}

function toCss(item: GradientItem): string {
  const stops = [...item.stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${s.position}%`)
    .join(', ')
  return `linear-gradient(${item.angle}deg, ${stops})`
}

function generateBatch(count = BATCH_SIZE): GradientItem[] {
  return Array.from({length: count}, () => createRandomGradient())
}

async function loadMore() {
  if (isLoading.value) return
  isLoading.value = true

  await new Promise(resolve => setTimeout(resolve, 300))

  gradients.value = [...gradients.value, ...generateBatch(3)]
  isLoading.value = false

  await nextTick()

  if (loadMoreTrigger.value && loadMoreObserver) {
    loadMoreObserver.unobserve(loadMoreTrigger.value)
    loadMoreObserver.observe(loadMoreTrigger.value)
  }
}

function openDetail(item: GradientItem) {
  selectedId.value = item.id
  draft.value = cloneGradient(item)
}

function closeDetail() {
  selectedId.value = null
  draft.value = null
}

function cloneGradient(item: GradientItem): GradientItem {
  return {
    ...item,
    stops: item.stops.map((s) => ({...s})),
  }
}

function applyDraft() {
  if (!draft.value || !selectedId.value) return
  const idx = gradients.value.findIndex((g) => g.id === selectedId.value)
  if (idx === -1) return
  gradients.value[idx] = {
    ...cloneGradient(draft.value),
    height: gradients.value[idx].height,
  }
}

watch(
  draft,
  () => {
    applyDraft()
  },
  {deep: true},
)

function updateStopColor(stopId: string, raw: string) {
  if (!draft.value) return
  const stop = draft.value.stops.find((s) => s.id === stopId)
  if (!stop) return
  const normalized = normalizeHex(raw)
  if (normalized) {
    stop.color = normalized
  } else {
    stop.color = raw
  }
}

function commitStopColor(stopId: string) {
  if (!draft.value) return
  const stop = draft.value.stops.find((s) => s.id === stopId)
  if (!stop) return
  const normalized = normalizeHex(stop.color)
  stop.color = normalized ?? '#888888'
}

function updateStopPosition(stopId: string, raw: number | string) {
  if (!draft.value) return
  const stop = draft.value.stops.find((s) => s.id === stopId)
  if (!stop) return
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return
  stop.position = clamp(Math.round(n), 0, 100)
}

function addStop() {
  if (!draft.value) return
  draft.value.stops.push({
    id: nextId('stop'),
    color: randomVividHex(),
    position: 50,
  })
  draft.value.stops.sort((a, b) => a.position - b.position)
}

function removeStop(stopId: string) {
  if (!draft.value) return
  if (draft.value.stops.length <= 2) {
    toast.info('至少保留 2 个色标')
    return
  }
  draft.value.stops = draft.value.stops.filter((s) => s.id !== stopId)
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
  toast.success('复制成功')
}

function copyCss() {
  if (!draftCss.value) return
  copyText(draftCss.value)
}

function copyAllColors() {
  if (!draft.value) return
  const colors = [...draft.value.stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => s.color)
    .join(', ')
  copyText(colors)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && selectedId.value) {
    closeDetail()
  }
}

onMounted(() => {
  gradients.value = generateBatch()
  loadMoreObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting && !selectedId.value) {
        void loadMore()
      }
    },
    {rootMargin: '160px 0px'},
  )

  if (loadMoreTrigger.value) {
    loadMoreObserver.observe(loadMoreTrigger.value)
  }

  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  loadMoreObserver?.disconnect()
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="gradient-gen">
    <div class="gradient-gen__masonry">
      <button
        v-for="item in gradients"
        :key="item.id"
        :style="{
          height: `${item.height}px`,
        }"
        class="gradient-gen__card pressable"
        type="button"
        @click="openDetail(item)"
      >
        <span
          :style="{ background: toCss(item) }"
          aria-hidden="true"
          class="gradient-gen__card-gradient"
        />
        <span class="gradient-gen__card-meta">
          <span class="gradient-gen__card-type">{{ item.angle }}°</span>
          <span class="gradient-gen__card-colors">
            <span
              v-for="stop in item.stops"
              :key="stop.id"
              :style="{ backgroundColor: stop.color }"
              class="gradient-gen__swatch"
            />
          </span>
        </span>
      </button>
    </div>
    <div ref="loadMoreTrigger" aria-hidden="true" class="gradient-gen__load-trigger"/>

    <Teleport to="body">
      <Transition name="grad-modal">
        <div
          v-if="draft"
          aria-modal="true"
          class="gradient-gen__modal"
          role="dialog"
          @click.self="closeDetail"
        >
          <div class="gradient-gen__dialog glass-solid">
            <div class="gradient-gen__dialog-header">
              <h3 class="gradient-gen__dialog-title">编辑渐变</h3>
              <button
                aria-label="关闭"
                class="gradient-gen__icon-btn pressable"
                type="button"
                @click="closeDetail"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M18 6L6 18"/>
                  <path d="M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="gradient-gen__scroll-content">
              <div class="gradient-gen__preview">
                <div
                  :style="{ background: draftCss }"
                  class="gradient-gen__preview-gradient"
                />
              </div>

              <div class="gradient-gen__section">
                <div class="gradient-gen__section-row">
                  <span class="gradient-gen__section-label">角度</span>
                  <span class="gradient-gen__section-value">{{ draft.angle }}°</span>
                </div>
                <input
                  v-model.number="draft.angle"
                  class="gradient-gen__range"
                  max="360"
                  min="0"
                  type="range"
                />
              </div>

              <div class="gradient-gen__section">
                <div class="gradient-gen__section-row">
                  <span class="gradient-gen__section-label">色标</span>
                  <button
                    class="gradient-gen__text-btn pressable"
                    type="button"
                    @click="addStop"
                  >
                    <svg
                      aria-hidden="true"
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    <span>添加</span>
                  </button>
                </div>

                <div class="gradient-gen__stops">
                  <div
                    v-for="stop in draft.stops"
                    :key="stop.id"
                    class="gradient-gen__stop"
                  >
                    <label class="gradient-gen__color-wrap">
                      <input
                        :value="normalizeHex(stop.color) ?? stop.color"
                        class="gradient-gen__color-input"
                        type="color"
                        @input="updateStopColor(stop.id, ($event.target as HTMLInputElement).value)"
                      />
                      <span
                        :style="{ backgroundColor: normalizeHex(stop.color) ?? '#888' }"
                        class="gradient-gen__color-preview"
                      />
                    </label>

                    <input
                      :value="stop.color"
                      class="gradient-gen__hex-input"
                      spellcheck="false"
                      type="text"
                      @blur="commitStopColor(stop.id)"
                      @input="updateStopColor(stop.id, ($event.target as HTMLInputElement).value)"
                    />

                    <div class="gradient-gen__pos">
                      <input
                        :value="stop.position"
                        class="gradient-gen__pos-input"
                        max="100"
                        min="0"
                        type="number"
                        @input="updateStopPosition(stop.id, ($event.target as HTMLInputElement).value)"
                      />
                      <span class="gradient-gen__pos-unit">%</span>
                    </div>

                    <button
                      class="gradient-gen__copy-mini pressable"
                      title="复制颜色"
                      type="button"
                      @click="copyText(stop.color)"
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.75"
                        viewBox="0 0 24 24"
                      >
                        <rect height="13" rx="2" width="13" x="9" y="9"/>
                        <path d="M5 15V5a2 2 0 0 1 2-2h10"/>
                      </svg>
                    </button>

                    <button
                      class="gradient-gen__remove-btn pressable"
                      title="删除色标"
                      type="button"
                      @click="removeStop(stop.id)"
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M18 6L6 18"/>
                        <path d="M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div class="gradient-gen__css-box">
                <code class="gradient-gen__css">{{ draftCss }}</code>
              </div>
            </div>

            <div class="gradient-gen__dialog-actions">
              <button
                class="gradient-gen__btn pressable"
                type="button"
                @click="copyAllColors"
              >
                复制颜色
              </button>
              <button
                class="gradient-gen__btn gradient-gen__btn--primary pressable"
                type="button"
                @click="copyCss"
              >
                复制 CSS
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.gradient-gen {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gradient-gen__masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 12px;
}

.gradient-gen__load-trigger {
  width: 100%;
  height: 1px;
}

.gradient-gen__card {
  display: block;
  width: 100%;
  height: 200px;
  border-radius: var(--radius-xl);
  padding: 0;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: var(--surface-solid);
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transition: transform var(--duration-press) var(--ease-out),
  box-shadow var(--duration-hover) var(--ease-hover);
}

.gradient-gen__card:hover {
  box-shadow: var(--shadow-xl), var(--shadow-glow);
}

.gradient-gen__card-gradient {
  position: absolute;
  inset: 1px;
  border-radius: calc(var(--radius-xl) - 2px);
  pointer-events: none;
}

.gradient-gen__card-meta {
  position: absolute;
  z-index: 1;
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  background: rgba(20, 20, 20, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14),
  inset 0 1px 0 rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  color: #fff;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity var(--duration-hover) var(--ease-hover),
  transform var(--duration-hover) var(--ease-out);
}

.gradient-gen__card:hover .gradient-gen__card-meta,
.gradient-gen__card:focus-visible .gradient-gen__card-meta {
  opacity: 1;
  transform: translateY(0);
}

.gradient-gen__card-type {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}

.gradient-gen__card-colors {
  display: flex;
  gap: 4px;
}

.gradient-gen__swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.gradient-gen__modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 4vw, 32px);
  background: rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(14px) saturate(120%);
  -webkit-backdrop-filter: blur(14px) saturate(120%);
}

[data-theme="dark"] .gradient-gen__modal {
  background: rgba(0, 0, 0, 0.35);
}

.gradient-gen__dialog {
  width: min(560px, 100%);
  max-height: min(90vh, 820px);
  border-radius: var(--radius-2xl);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

[data-theme="dark"] .gradient-gen__dialog {
  box-shadow: var(--shadow-xl), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.gradient-gen__dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--surface-border-strong);
  flex-shrink: 0;
}

.gradient-gen__scroll-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 16px;
  scrollbar-width: thin;
}

.gradient-gen__dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.gradient-gen__icon-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border: 1px solid var(--surface-border-strong);
  background: color-mix(in srgb, var(--bg-secondary) 60%, transparent);
  transition: color var(--duration-hover) var(--ease-hover),
  background-color var(--duration-hover) var(--ease-hover);
}

.gradient-gen__icon-btn svg {
  width: 16px;
  height: 16px;
}

.gradient-gen__icon-btn:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--bg-secondary));
}

.gradient-gen__preview {
  position: relative;
  height: 180px;
  margin: 0 24px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--surface-solid);
  box-shadow: var(--shadow-md);
}

.gradient-gen__preview-gradient {
  position: absolute;
  inset: 0;
}

.gradient-gen__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 24px;
  padding: 16px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
}

[data-theme="dark"] .gradient-gen__section {
  background: var(--surface-elevated);
}

.gradient-gen__section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.gradient-gen__section-label {
  font-size: 13px;
  font-weight: 650;
  color: var(--text-primary);
  letter-spacing: 0;
}

.gradient-gen__section-value {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  padding: 3px 8px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-full);
  background: var(--surface);
}

.gradient-gen__range {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 20px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

.gradient-gen__range::-webkit-slider-runnable-track {
  height: 6px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--text-muted) 20%, transparent);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
}

.gradient-gen__range::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -7px;
  border: 4px solid var(--color-primary);
  border-radius: 50%;
  background: var(--surface-solid);
  box-shadow: var(--shadow-sm), 0 0 0 1px rgba(255, 255, 255, 0.38);
}

.gradient-gen__range::-moz-range-track {
  height: 4px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--text-muted) 20%, transparent);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
}

.gradient-gen__range::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: 4px solid var(--color-primary);
  border-radius: 50%;
  background: var(--surface-solid);
  box-shadow: var(--shadow-sm), 0 0 0 1px rgba(255, 255, 255, 0.38);
}

.gradient-gen__text-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  padding: 5px 9px;
  border-radius: var(--radius-full);
  border: 1px solid color-mix(in srgb, var(--color-primary) 14%, transparent);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.gradient-gen__text-btn svg {
  width: 13px;
  height: 13px;
}

.gradient-gen__text-btn:hover {
  border-color: color-mix(in srgb, var(--color-primary) 26%, transparent);
  background: color-mix(in srgb, var(--color-primary) 13%, transparent);
}

.gradient-gen__stops {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gradient-gen__stop {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 72px 32px 32px;
  gap: 6px;
  align-items: center;
  padding: 8px;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border);
  background: var(--surface);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
}

.gradient-gen__color-wrap {
  position: relative;
  width: 36px;
  height: 36px;
  cursor: pointer;
}

.gradient-gen__color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  border: none;
  padding: 0;
}

.gradient-gen__color-preview {
  display: block;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--surface-border-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
  pointer-events: none;
}

.gradient-gen__hex-input,
.gradient-gen__pos-input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--surface-solid) 58%, transparent);
  color: var(--text-primary);
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-fast) var(--ease-out);
}

.gradient-gen__hex-input:focus,
.gradient-gen__pos-input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.gradient-gen__pos {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.gradient-gen__pos-input {
  padding: 0 4px;
  text-align: center;
  min-width: 0;
}

.gradient-gen__pos-input::-webkit-inner-spin-button,
.gradient-gen__pos-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.gradient-gen__pos-input[type="number"] {
  appearance: textfield;
  -moz-appearance: textfield;
}

.gradient-gen__pos-unit {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.gradient-gen__copy-mini,
.gradient-gen__remove-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border: 1px solid var(--surface-border-strong);
  background: var(--surface);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.26);
  transition: color var(--duration-hover) var(--ease-hover),
  border-color var(--duration-hover) var(--ease-hover),
  background-color var(--duration-hover) var(--ease-hover);
}

.gradient-gen__copy-mini svg,
.gradient-gen__remove-btn svg {
  width: 14px;
  height: 14px;
}

.gradient-gen__copy-mini:hover {
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 32%, transparent);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface));
}

.gradient-gen__remove-btn:hover {
  color: #ef4444;
  border-color: color-mix(in srgb, #ef4444 32%, transparent);
  background: color-mix(in srgb, #ef4444 7%, var(--surface));
}

.gradient-gen__css-box {
  margin: 0 24px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--surface-border-strong);
  overflow: auto;
}

.gradient-gen__css {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-all;
  white-space: pre-wrap;
}

.gradient-gen__dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 24px 24px;
  padding: 16px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  flex-shrink: 0;
}

.gradient-gen__btn {
  flex: 1;
  min-width: 100px;
  padding: 10px 16px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 550;
  letter-spacing: 0;
  border: 1px solid var(--surface-border-strong);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-primary);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: transform var(--duration-press) var(--ease-out),
  background-color var(--duration-hover) var(--ease-hover),
  border-color var(--duration-hover) var(--ease-hover),
  box-shadow var(--duration-hover) var(--ease-hover);
}

[data-theme="dark"] .gradient-gen__btn {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.gradient-gen__btn:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--color-primary) 32%, transparent);
}

.gradient-gen__btn--primary {
  background: var(--color-primary);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.gradient-gen__btn--primary:hover {
  background: var(--color-primary-hover);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.grad-modal-enter-active,
.grad-modal-leave-active {
  transition: opacity var(--duration-sheet) var(--ease-out);
}

.grad-modal-enter-active .gradient-gen__dialog,
.grad-modal-leave-active .gradient-gen__dialog {
  transition: transform var(--duration-sheet) var(--ease-out-spring),
  opacity var(--duration-sheet) var(--ease-out);
}

.grad-modal-enter-from,
.grad-modal-leave-to {
  opacity: 0;
}

.grad-modal-enter-from .gradient-gen__dialog,
.grad-modal-leave-to .gradient-gen__dialog {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

@media (max-width: 560px) {
  .gradient-gen__card-meta {
    opacity: 1;
    transform: none;
  }

  .gradient-gen__stop {
    grid-template-columns: 36px minmax(0, 1fr) 64px 30px 30px;
  }

  .gradient-gen__modal {
    padding: 8px;
    align-items: flex-end;
  }

  .gradient-gen__dialog {
    width: 100%;
    max-height: calc(100dvh - 8px);
    border-radius: var(--radius-2xl) var(--radius-2xl) var(--radius-xl) var(--radius-xl);
    scrollbar-gutter: auto;
  }

  .gradient-gen__dialog-header {
    padding: 14px 18px;
  }

  .gradient-gen__preview {
    height: 160px;
    flex-basis: 160px;
    margin: 16px 18px 2px;
  }

  .gradient-gen__section {
    padding: 16px 18px;
  }

  .gradient-gen__css-box {
    margin: 0 18px 16px;
  }

  .gradient-gen__dialog-actions {
    padding: 14px 18px calc(14px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
