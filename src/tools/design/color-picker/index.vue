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

const hue = ref(0)
const saturation = ref(100)
const value = ref(100)
const alpha = ref(100)

const isDraggingSaturation = ref(false)
const isDraggingHue = ref(false)
const isDraggingAlpha = ref(false)

const saturationRef = ref<HTMLDivElement | null>(null)
const hueRef = ref<HTMLDivElement | null>(null)
const alphaRef = ref<HTMLDivElement | null>(null)

const eyedropperSupported = ref(false)

onMounted(() => {
  eyedropperSupported.value = 'EyeDropper' in window
})

const hsv = computed<HSV>({
  get: () => ({
    h: Math.round(hue.value),
    s: Math.round(saturation.value),
    v: Math.round(value.value),
  }),
  set: (val) => {
    hue.value = val.h
    saturation.value = val.s
    value.value = val.v
  },
})

const rgb = computed<RGB>({
  get: () => hsvToRgb(hsv.value),
  set: (val) => {
    hsv.value = rgbToHsv(val)
  },
})

const hsl = computed<HSL>({
  get: () => hsvToHsl(hsv.value),
  set: (val) => {
    hsv.value = hslToHsv(val)
  },
})

const hex = computed<string>({
  get: () => rgbToHex(rgb.value),
  set: (val) => {
    const parsed = hexToRgb(val)
    if (parsed) {
      rgb.value = parsed
    }
  },
})

const previewColor = computed(() => {
  const {r, g, b} = rgb.value
  const a = alpha.value / 100
  return `rgba(${r}, ${g}, ${b}, ${a})`
})

function hsvToRgb(hsv: HSV): RGB {
  const {h, s, v} = hsv
  const sNorm = s / 100
  const vNorm = v / 100

  const c = vNorm * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = vNorm - c

  let r: number, g: number, b: number

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

function rgbToHsv(rgb: RGB): HSV {
  const {r, g, b} = rgb
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

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

function hsvToHsl(hsv: HSV): HSL {
  const {h, s, v} = hsv
  const sNorm = s / 100
  const vNorm = v / 100

  const l = (2 - sNorm) * vNorm
  const lNorm = l / 2

  const sHsl = vNorm === 0 ? 0 : (sNorm * vNorm) / (lNorm <= 0.5 ? l : 2 - lNorm)

  return {
    h: Math.round(h),
    s: Math.round(sHsl * 100),
    l: Math.round(lNorm * 100),
  }
}

function hslToHsv(hsl: HSL): HSV {
  const {h, s, l} = hsl
  const sNorm = s / 100
  const lNorm = l / 100

  const v = lNorm + sNorm * Math.min(lNorm, 1 - lNorm)
  const sHsv = v === 0 ? 0 : (2 - (2 * lNorm) / v)

  return {
    h: Math.round(h),
    s: Math.round(sHsv * 100),
    v: Math.round(v * 100),
  }
}

function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

function hexToRgb(hex: string): RGB | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
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

function handleSaturationMouseDown(e: MouseEvent) {
  isDraggingSaturation.value = true
  updateSaturationFromMouse(e)
}

function handleSaturationMouseMove(e: MouseEvent) {
  if (!isDraggingSaturation.value) return
  updateSaturationFromMouse(e)
}

function updateSaturationFromMouse(e: MouseEvent) {
  if (!saturationRef.value) return
  const rect = saturationRef.value.getBoundingClientRect()
  const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
  const y = clamp((e.clientY - rect.top) / rect.height, 0, 1)
  saturation.value = Math.round(x * 100)
  value.value = Math.round((1 - y) * 100)
}

function handleHueMouseDown(e: MouseEvent) {
  isDraggingHue.value = true
  updateHueFromMouse(e)
}

function handleHueMouseMove(e: MouseEvent) {
  if (!isDraggingHue.value) return
  updateHueFromMouse(e)
}

function updateHueFromMouse(e: MouseEvent) {
  if (!hueRef.value) return
  const rect = hueRef.value.getBoundingClientRect()
  const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
  hue.value = Math.round(x * 360)
}

function handleAlphaMouseDown(e: MouseEvent) {
  isDraggingAlpha.value = true
  updateAlphaFromMouse(e)
}

function handleAlphaMouseMove(e: MouseEvent) {
  if (!isDraggingAlpha.value) return
  updateAlphaFromMouse(e)
}

function updateAlphaFromMouse(e: MouseEvent) {
  if (!alphaRef.value) return
  const rect = alphaRef.value.getBoundingClientRect()
  const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
  alpha.value = Math.round(x * 100)
}

function handleMouseUp() {
  isDraggingSaturation.value = false
  isDraggingHue.value = false
  isDraggingAlpha.value = false
}

async function pickColor() {
  if (!eyedropperSupported.value) return

  try {
    const eyeDropper = new (window as any).EyeDropper()
    const result = await eyeDropper.open()
    hex.value = result.sRGBHex
    alpha.value = 100
  } catch {
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  toast.success('复制成功')
}

watch(
  () => [rgb.value, hsl.value],
  () => {
  },
  {deep: true}
)

onMounted(() => {
  document.addEventListener('mousemove', (e) => {
    handleSaturationMouseMove(e)
    handleHueMouseMove(e)
    handleAlphaMouseMove(e)
  })
  document.addEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div class="color-picker">
    <div class="color-picker__main">
      <div class="color-picker__picker">
        <div
          ref="saturationRef"
          :style="{
            background: `hsl(${hue}, 100%, 50%)`,
          }"
          class="color-picker__saturation"
          @mousedown="handleSaturationMouseDown"
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
          <div ref="hueRef" class="color-picker__hue" @mousedown="handleHueMouseDown">
            <div
              :style="{left: `${(hue / 360) * 100}%`}"
              class="color-picker__hue-pointer"
            ></div>
          </div>

          <div
            ref="alphaRef"
            :style="{
              background: `linear-gradient(to right, transparent, ${hex})`,
            }"
            class="color-picker__alpha"
            @mousedown="handleAlphaMouseDown"
          >
            <div
              :style="{left: `${alpha}%`}"
              class="color-picker__alpha-pointer"
            ></div>
          </div>
        </div>
      </div>

      <div class="color-picker__preview">
        <div :style="{backgroundColor: previewColor}" class="color-picker__preview-color"></div>
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
              v-model.number="rgb.r"
              class="color-picker__input"
              max="255"
              min="0"
              type="number"
              @input="rgb.r = clamp(rgb.r, 0, 255)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">G</span>
            <input
              v-model.number="rgb.g"
              class="color-picker__input"
              max="255"
              min="0"
              type="number"
              @input="rgb.g = clamp(rgb.g, 0, 255)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">B</span>
            <input
              v-model.number="rgb.b"
              class="color-picker__input"
              max="255"
              min="0"
              type="number"
              @input="rgb.b = clamp(rgb.b, 0, 255)"
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
              v-model.number="hsl.h"
              class="color-picker__input"
              max="360"
              min="0"
              type="number"
              @input="hsl.h = clamp(hsl.h, 0, 360)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">S</span>
            <input
              v-model.number="hsl.s"
              class="color-picker__input"
              max="100"
              min="0"
              type="number"
              @input="hsl.s = clamp(hsl.s, 0, 100)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">L</span>
            <input
              v-model.number="hsl.l"
              class="color-picker__input"
              max="100"
              min="0"
              type="number"
              @input="hsl.l = clamp(hsl.l, 0, 100)"
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
              v-model.number="hsv.h"
              class="color-picker__input"
              max="360"
              min="0"
              type="number"
              @input="hsv.h = clamp(hsv.h, 0, 360)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">S</span>
            <input
              v-model.number="hsv.s"
              class="color-picker__input"
              max="100"
              min="0"
              type="number"
              @input="hsv.s = clamp(hsv.s, 0, 100)"
            />
          </div>
          <div class="color-picker__input-item">
            <span class="color-picker__input-label">V</span>
            <input
              v-model.number="hsv.v"
              class="color-picker__input"
              max="100"
              min="0"
              type="number"
              @input="hsv.v = clamp(hsv.v, 0, 100)"
            />
          </div>
        </div>
      </div>

      <div class="color-picker__input-group">
        <label>HEX</label>
        <div class="color-picker__input-row">
          <input
            v-model="hex"
            class="color-picker__input color-picker__input--hex"
            type="text"
          />
        </div>
      </div>

      <div class="color-picker__input-group">
        <label>Alpha</label>
        <div class="color-picker__input-row">
          <input
            v-model.number="alpha"
            class="color-picker__input"
            max="100"
            min="0"
            type="number"
            @input="alpha = clamp(alpha, 0, 100)"
          />
        </div>
      </div>
    </div>

    <div class="color-picker__actions">
      <button
        v-if="eyedropperSupported"
        class="color-picker__eyedropper"
        @click="pickColor"
      >
        屏幕取色
      </button>

      <div class="color-picker__copy-group">
        <button class="color-picker__copy" @click="copyToClipboard(hex)">复制 HEX</button>
        <button class="color-picker__copy" @click="copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)">
          复制 RGB
        </button>
        <button class="color-picker__copy" @click="copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)">
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
  gap: 24px;
}

.color-picker__main {
  display: flex;
  gap: 24px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.color-picker__picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-picker__saturation {
  width: 280px;
  height: 200px;
  position: relative;
  border-radius: var(--radius-md);
  cursor: crosshair;
  overflow: hidden;
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
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.color-picker__sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-picker__hue {
  width: 280px;
  height: 16px;
  border-radius: var(--radius-sm);
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
  position: relative;
  cursor: crosshair;
}

.color-picker__hue-pointer {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 20px;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.color-picker__alpha {
  width: 280px;
  height: 16px;
  border-radius: var(--radius-sm);
  position: relative;
  cursor: crosshair;
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
  linear-gradient(-45deg, #ccc 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, #ccc 75%),
  linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
}

.color-picker__alpha-pointer {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 20px;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.color-picker__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-left: 24px;
  border-left: 1px solid var(--border);
}

.color-picker__preview-color {
  width: 120px;
  height: 120px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
}

.color-picker__preview-info {
  text-align: center;
}

.color-picker__preview-hex {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: monospace;
}

.color-picker__preview-alpha {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.color-picker__inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.color-picker__input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  min-width: 0;
  overflow: hidden;
}

.color-picker__input-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.color-picker__input-row {
  display: flex;
  gap: 8px;
}

.color-picker__input-item {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.color-picker__input-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  width: 12px;
  flex-shrink: 0;
}

.color-picker__input {
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: monospace;
  text-align: center;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.color-picker__input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.color-picker__input--hex {
  text-align: left;
  padding-left: 12px;
}

.color-picker__input::-webkit-inner-spin-button,
.color-picker__input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.color-picker__input[type="number"] {
  appearance: textfield;
}

.color-picker__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.color-picker__eyedropper {
  padding: 12px 20px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.color-picker__eyedropper:hover {
  background: #2563eb;
}

.color-picker__eyedropper:active {
  transform: scale(0.98);
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
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.color-picker__copy:hover {
  background: var(--bg-tertiary);
  border-color: var(--color-primary);
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
  }

  .color-picker__preview-color {
    width: 80px;
    height: 80px;
  }
}
</style>
