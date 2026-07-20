<script lang="ts" setup>
import {computed, onMounted, ref, watch} from 'vue'
import {useToast} from '@/stores/toast'

const toast = useToast()

interface HSL {
  h: number
  s: number
  l: number
}

interface HSV {
  h: number
  s: number
  v: number
}

interface RGB {
  r: number
  g: number
  b: number
}

type DragTarget = 'saturation' | 'hue' | 'alpha' | null

const hue = ref(0)
const saturation = ref(100)
const value = ref(100)
const alpha = ref(100)

const activeDrag = ref<DragTarget>(null)

const saturationRef = ref<HTMLDivElement | null>(null)
const hueRef = ref<HTMLDivElement | null>(null)
const alphaRef = ref<HTMLDivElement | null>(null)

const eyedropperSupported = ref(false)
const hexFocused = ref(false)
const hexDraft = ref('#ff0000')

const hsv = computed<HSV>(() => ({
  h: Math.round(hue.value),
  s: Math.round(saturation.value),
  v: Math.round(value.value),
}))

const rgb = computed<RGB>(() => hsvToRgb(hsv.value))
const hsl = computed<HSL>(() => hsvToHsl(hsv.value))
const hex = computed(() => rgbToHex(rgb.value))

const previewColor = computed(() => {
  const {r, g, b} = rgb.value
  return `rgba(${r}, ${g}, ${b}, ${alpha.value / 100})`
})

watch(
  hex,
  (next) => {
    if (!hexFocused.value) {
      hexDraft.value = next
    }
  },
  {immediate: true},
)

function applyHsv(next: HSV) {
  hue.value = clamp(next.h, 0, 360)
  saturation.value = clamp(next.s, 0, 100)
  value.value = clamp(next.v, 0, 100)
}

function updateRgbChannel(channel: keyof RGB, raw: number | string) {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return
  const next: RGB = {
    ...rgb.value,
    [channel]: clamp(Math.round(n), 0, 255),
  }
  applyHsv(rgbToHsv(next))
}

function updateHslChannel(channel: keyof HSL, raw: number | string) {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return
  const max = channel === 'h' ? 360 : 100
  const next: HSL = {
    ...hsl.value,
    [channel]: clamp(Math.round(n), 0, max),
  }
  applyHsv(hslToHsv(next))
}

function updateHsvChannel(channel: keyof HSV, raw: number | string) {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return
  const max = channel === 'h' ? 360 : 100
  applyHsv({
    ...hsv.value,
    [channel]: clamp(Math.round(n), 0, max),
  })
}

function updateAlpha(raw: number | string) {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return
  alpha.value = clamp(Math.round(n), 0, 100)
}

function onHexInput(raw: string) {
  hexDraft.value = raw
  const parsed = hexToRgb(raw.trim())
  if (parsed) {
    applyHsv(rgbToHsv(parsed))
  }
}

function onHexBlur() {
  hexFocused.value = false
  const parsed = hexToRgb(hexDraft.value.trim())
  if (parsed) {
    applyHsv(rgbToHsv(parsed))
    hexDraft.value = rgbToHex(parsed)
  } else {
    hexDraft.value = hex.value
  }
}

function hsvToRgb(hsvVal: HSV): RGB {
  const {h, s, v} = hsvVal
  const sNorm = s / 100
  const vNorm = v / 100

  const c = vNorm * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = vNorm - c

  let r: number
  let g: number
  let b: number

  if (h < 60) {
    r = c
    g = x
    b = 0
  } else if (h < 120) {
    r = x
    g = c
    b = 0
  } else if (h < 180) {
    r = 0
    g = c
    b = x
  } else if (h < 240) {
    r = 0
    g = x
    b = c
  } else if (h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

function rgbToHsv(rgbVal: RGB): HSV {
  const rNorm = rgbVal.r / 255
  const gNorm = rgbVal.g / 255
  const bNorm = rgbVal.b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const d = max - min

  let h = 0
  const s = max === 0 ? 0 : (d / max) * 100
  const v = max * 100

  if (d !== 0) {
    if (max === rNorm) {
      h = 60 * (((gNorm - bNorm) / d) % 6)
    } else if (max === gNorm) {
      h = 60 * ((bNorm - rNorm) / d + 2)
    } else {
      h = 60 * ((rNorm - gNorm) / d + 4)
    }
  }

  if (h < 0) h += 360

  return {h: Math.round(h), s: Math.round(s), v: Math.round(v)}
}

function hsvToHsl(hsvVal: HSV): HSL {
  const sNorm = hsvVal.s / 100
  const vNorm = hsvVal.v / 100

  const l = (2 - sNorm) * vNorm
  const lNorm = l / 2
  const sHsl = vNorm === 0
    ? 0
    : (sNorm * vNorm) / (lNorm <= 0.5 ? l : 2 - lNorm)

  return {
    h: Math.round(hsvVal.h),
    s: Math.round(sHsl * 100),
    l: Math.round(lNorm * 100),
  }
}

function hslToHsv(hslVal: HSL): HSV {
  const sNorm = hslVal.s / 100
  const lNorm = hslVal.l / 100

  const v = lNorm + sNorm * Math.min(lNorm, 1 - lNorm)
  const sHsv = v === 0 ? 0 : (2 - (2 * lNorm) / v)

  return {
    h: Math.round(hslVal.h),
    s: Math.round(sHsv * 100),
    v: Math.round(v * 100),
  }
}

function rgbToHex(rgbVal: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(rgbVal.r)}${toHex(rgbVal.g)}${toHex(rgbVal.b)}`
}

function hexToRgb(hexVal: string): RGB | null {
  const match = hexVal.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!match) return null
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  }
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}

function beginDrag(target: Exclude<DragTarget, null>, e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  activeDrag.value = target
  updateFromPointer(target, e)
}

function onPointerMove(e: PointerEvent) {
  if (!activeDrag.value) return
  updateFromPointer(activeDrag.value, e)
}

function endDrag(e: PointerEvent) {
  if (!activeDrag.value) return
  const el = e.currentTarget as HTMLElement
  if (el.hasPointerCapture?.(e.pointerId)) {
    el.releasePointerCapture(e.pointerId)
  }
  activeDrag.value = null
}

function updateFromPointer(target: Exclude<DragTarget, null>, e: PointerEvent) {
  if (target === 'saturation') {
    if (!saturationRef.value) return
    const rect = saturationRef.value.getBoundingClientRect()
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1)
    saturation.value = Math.round(x * 100)
    value.value = Math.round((1 - y) * 100)
    return
  }

  if (target === 'hue') {
    if (!hueRef.value) return
    const rect = hueRef.value.getBoundingClientRect()
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    hue.value = Math.round(x * 360)
    return
  }

  if (!alphaRef.value) return
  const rect = alphaRef.value.getBoundingClientRect()
  const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
  alpha.value = Math.round(x * 100)
}

async function pickColor() {
  if (!eyedropperSupported.value) return

  try {
    const eyeDropper = new (window as any).EyeDropper()
    const result = await eyeDropper.open()
    const parsed = hexToRgb(result.sRGBHex)
    if (parsed) {
      applyHsv(rgbToHsv(parsed))
      alpha.value = 100
      hexDraft.value = rgbToHex(parsed)
    }
  } catch {
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  toast.success('复制成功')
}

onMounted(() => {
  eyedropperSupported.value = 'EyeDropper' in window
})
</script>

<template>
  <div class="color-picker">
    <div class="color-picker__main">
      <div class="color-picker__picker">
        <div
          ref="saturationRef"
          :style="{ background: `hsl(${hue}, 100%, 50%)` }"
          class="color-picker__saturation"
          @pointercancel="endDrag"
          @pointermove="onPointerMove"
          @pointerup="endDrag"
          @pointerdown.prevent="beginDrag('saturation', $event)"
        >
          <div class="color-picker__saturation-white"></div>
          <div class="color-picker__saturation-black"></div>
          <div
            :style="{
              left: `${saturation}%`,
              top: `${100 - value}%`,
              backgroundColor: previewColor,
            }"
            class="color-picker__saturation-pointer"
          ></div>
        </div>

        <div class="color-picker__sliders">
          <div
            ref="hueRef"
            class="color-picker__hue"
            @pointercancel="endDrag"
            @pointermove="onPointerMove"
            @pointerup="endDrag"
            @pointerdown.prevent="beginDrag('hue', $event)"
          >
            <div
              :style="{ left: `${(hue / 360) * 100}%` }"
              class="color-picker__hue-pointer"
            ></div>
          </div>

          <div
            ref="alphaRef"
            :style="{ background: `linear-gradient(to right, transparent, ${hex})` }"
            class="color-picker__alpha"
            @pointercancel="endDrag"
            @pointermove="onPointerMove"
            @pointerup="endDrag"
            @pointerdown.prevent="beginDrag('alpha', $event)"
          >
            <div
              :style="{ left: `${alpha}%` }"
              class="color-picker__alpha-pointer"
            ></div>
          </div>
        </div>
      </div>

      <div class="color-picker__preview">
        <div
          :style="{ backgroundColor: previewColor }"
          class="color-picker__preview-color"
        ></div>
        <div class="color-picker__preview-info">
          <div class="color-picker__preview-hex">{{ hex }}</div>
          <div class="color-picker__preview-alpha">Alpha: {{ alpha }}%</div>
        </div>
      </div>
    </div>

    <div class="color-picker__inputs">
      <div class="color-picker__input-group">
        <label>RGB</label>
        <div class="color-picker__input-row">
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">R</span>
            <input
              :value="rgb.r"
              class="color-picker__input"
              max="255"
              min="0"
              type="number"
              @input="updateRgbChannel('r', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">G</span>
            <input
              :value="rgb.g"
              class="color-picker__input"
              max="255"
              min="0"
              type="number"
              @input="updateRgbChannel('g', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">B</span>
            <input
              :value="rgb.b"
              class="color-picker__input"
              max="255"
              min="0"
              type="number"
              @input="updateRgbChannel('b', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>

      <div class="color-picker__input-group">
        <label>HSL</label>
        <div class="color-picker__input-row">
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">H</span>
            <input
              :value="hsl.h"
              class="color-picker__input"
              max="360"
              min="0"
              type="number"
              @input="updateHslChannel('h', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">S</span>
            <input
              :value="hsl.s"
              class="color-picker__input"
              max="100"
              min="0"
              type="number"
              @input="updateHslChannel('s', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">L</span>
            <input
              :value="hsl.l"
              class="color-picker__input"
              max="100"
              min="0"
              type="number"
              @input="updateHslChannel('l', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>

      <div class="color-picker__input-group">
        <label>HSV</label>
        <div class="color-picker__input-row">
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">H</span>
            <input
              :value="hsv.h"
              class="color-picker__input"
              max="360"
              min="0"
              type="number"
              @input="updateHsvChannel('h', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">S</span>
            <input
              :value="hsv.s"
              class="color-picker__input"
              max="100"
              min="0"
              type="number"
              @input="updateHsvChannel('s', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">V</span>
            <input
              :value="hsv.v"
              class="color-picker__input"
              max="100"
              min="0"
              type="number"
              @input="updateHsvChannel('v', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>

      <div class="color-picker__input-group">
        <label>HEX</label>
        <div class="color-picker__input-row">
          <input
            v-model="hexDraft"
            class="color-picker__input color-picker__input--hex"
            spellcheck="false"
            type="text"
            @blur="onHexBlur"
            @focus="hexFocused = true"
            @input="onHexInput(hexDraft)"
          />
        </div>
      </div>

      <div class="color-picker__input-group">
        <label>Alpha</label>
        <div class="color-picker__input-row">
          <input
            :value="alpha"
            class="color-picker__input"
            max="100"
            min="0"
            type="number"
            @input="updateAlpha(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <div class="color-picker__actions">
      <button
        v-if="eyedropperSupported"
        class="color-picker__eyedropper pressable"
        type="button"
        @click="pickColor"
      >
        屏幕取色
      </button>

      <div class="color-picker__copy-group">
        <button class="color-picker__copy pressable" type="button" @click="copyToClipboard(hex)">
          复制 HEX
        </button>
        <button
          class="color-picker__copy pressable"
          type="button"
          @click="copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)"
        >
          复制 RGB
        </button>
        <button
          class="color-picker__copy pressable"
          type="button"
          @click="copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)"
        >
          复制 HSL
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.color-picker__main {
  display: flex;
  gap: 24px;
  padding: 20px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .color-picker__main {
  box-shadow: var(--shadow-sm), inset 0 0.5px 0 rgba(255, 255, 255, 0.05);
}

.color-picker__picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.color-picker__saturation {
  width: 280px;
  height: 200px;
  position: relative;
  border-radius: var(--radius-lg);
  cursor: crosshair;
  overflow: hidden;
  touch-action: none;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--surface-border-strong);
  user-select: none;
}

.color-picker__saturation-white {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #fff, transparent);
}

.color-picker__saturation-black {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, #000, transparent);
}

.color-picker__saturation-pointer {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2.5px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.32);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.color-picker__sliders {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-picker__hue,
.color-picker__alpha {
  width: 280px;
  height: 14px;
  border-radius: var(--radius-full);
  position: relative;
  cursor: pointer;
  touch-action: none;
  user-select: none;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.color-picker__hue {
  background: linear-gradient(
    to right,
    #ff0000,
    #ffff00,
    #00ff00,
    #00ffff,
    #0000ff,
    #ff00ff,
    #ff0000
  );
}

.color-picker__alpha {
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
  linear-gradient(-45deg, #ccc 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, #ccc 75%),
  linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
  overflow: hidden;
}

.color-picker__hue-pointer,
.color-picker__alpha-pointer {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 24px;
  background: #fff;
  border-radius: var(--radius-full);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.06);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.color-picker__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding-left: 24px;
  border-left: 1px solid var(--surface-border-strong);
}

.color-picker__preview-color {
  width: 112px;
  height: 112px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--surface-border-strong);
  box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.color-picker__preview-info {
  text-align: center;
}

.color-picker__preview-hex {
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.color-picker__preview-alpha {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  letter-spacing: -0.01em;
}

.color-picker__inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .color-picker__inputs {
  box-shadow: var(--shadow-sm), inset 0 0.5px 0 rgba(255, 255, 255, 0.05);
}

.color-picker__input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-secondary) 55%, transparent);
  min-width: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

[data-theme="dark"] .color-picker__input-group {
  box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.04);
}

.color-picker__input-group label {
  font-size: 11px;
  font-weight: 650;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.color-picker__input-row {
  display: flex;
  gap: 6px;
  min-width: 0;
}

.color-picker__input-item {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1 1 0;
  min-width: 0;
}

.color-picker__input-label {
  font-size: 11px;
  font-weight: 650;
  color: var(--text-muted);
  width: 12px;
  flex-shrink: 0;
}

.color-picker__input {
  width: 100%;
  min-width: 3.25ch;
  height: 36px;
  padding: 0 6px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-primary);
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  text-align: center;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out-soft),
  box-shadow var(--duration-fast) var(--ease-out-soft),
  background-color var(--duration-fast) var(--ease-out-soft);
  box-sizing: border-box;
  line-height: 36px;
  overflow: visible;
}

.color-picker__input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.color-picker__input--hex {
  text-align: left;
  padding: 0 12px;
  min-width: 0;
  flex: 1;
  line-height: normal;
}

.color-picker__input::-webkit-inner-spin-button,
.color-picker__input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.color-picker__input[type="number"] {
  appearance: textfield;
  -moz-appearance: textfield;
}

.color-picker__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .color-picker__actions {
  box-shadow: var(--shadow-sm), inset 0 0.5px 0 rgba(255, 255, 255, 0.05);
}

.color-picker__eyedropper {
  padding: 12px 20px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 550;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
  transition: box-shadow var(--duration-fast) var(--ease-out-soft),
  background-color var(--duration-fast) var(--ease-out-soft);
}

.color-picker__eyedropper:hover {
  background: var(--color-primary-hover);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.color-picker__copy-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-picker__copy {
  flex: 1;
  min-width: 100px;
  padding: 10px 16px;
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-primary);
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 550;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: background-color var(--duration-fast) var(--ease-out-soft),
  border-color var(--duration-fast) var(--ease-out-soft),
  box-shadow var(--duration-fast) var(--ease-out-soft);
}

[data-theme="dark"] .color-picker__copy {
  box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.04);
}

.color-picker__copy:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--color-primary) 32%, transparent);
  box-shadow: var(--shadow-glow);
}

@media (max-width: 768px) {
  .color-picker__main {
    flex-direction: column;
  }

  .color-picker__saturation {
    width: 100%;
    height: 180px;
  }

  .color-picker__hue,
  .color-picker__alpha {
    width: 100%;
  }

  .color-picker__preview {
    flex-direction: row;
    justify-content: flex-start;
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--surface-border-strong);
    padding-top: 16px;
  }

  .color-picker__preview-color {
    width: 72px;
    height: 72px;
  }
}
</style>
