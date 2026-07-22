<script lang="ts" setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {useToast} from '@/stores/toast'

type Status = 'idle' | 'running' | 'paused' | 'finished'

const toast = useToast()

const status = ref<Status>('idle')
const hoursInput = ref(0)
const minutesInput = ref(5)
const secondsInput = ref(0)
const remainingMs = ref(0)
const totalMs = ref(0)
const soundEnabled = ref(true)

let endsAt = 0
let frameId = 0
let audioContext: AudioContext | null = null
let completeToneBuffer: AudioBuffer | null = null
let completeToneLoading: Promise<void> | null = null

const isEditing = computed(() => status.value === 'idle' || status.value === 'finished')

const display = computed(() => formatTime(remainingMs.value))

const progress = computed(() => {
  if (totalMs.value <= 0) return 0
  return Math.min(1, Math.max(0, remainingMs.value / totalMs.value))
})

const ringOffset = computed(() => {
  const circumference = 2 * Math.PI * 86
  return circumference * (1 - progress.value)
})

const primaryLabel = computed(() => {
  if (status.value === 'running') return '暂停'
  if (status.value === 'paused') return '继续'
  if (status.value === 'finished') return '重复'
  return '开始'
})

const canStart = computed(() => {
  if (status.value === 'running' || status.value === 'paused') return true
  return durationFromInputs() > 0
})

const canReset = computed(() => {
  return status.value !== 'idle' || remainingMs.value > 0
})

const statusLabel = computed(() => {
  if (status.value === 'running') return '倒计时中'
  if (status.value === 'paused') return '已暂停'
  if (status.value === 'finished') return '已结束'
  return '就绪'
})

watch([hoursInput, minutesInput, secondsInput], () => {
  if (!isEditing.value) return
  remainingMs.value = durationFromInputs()
  totalMs.value = remainingMs.value
})

function clampUnit(value: number, max: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(max, Math.max(0, Math.floor(value)))
}

function durationFromInputs() {
  const h = clampUnit(hoursInput.value, 99)
  const m = clampUnit(minutesInput.value, 59)
  const s = clampUnit(secondsInput.value, 59)
  return (h * 3600 + m * 60 + s) * 1000
}

function pad(n: number, width = 2) {
  return String(n).padStart(width, '0')
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return {
      main: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
      hasHours: true,
    }
  }

  return {
    main: `${pad(minutes)}:${pad(seconds)}`,
    hasHours: false,
  }
}

function tick() {
  const left = Math.max(0, endsAt - performance.now())
  remainingMs.value = left

  if (left <= 0) {
    finish()
    return
  }

  frameId = requestAnimationFrame(tick)
}

function startTicker() {
  cancelAnimationFrame(frameId)
  frameId = requestAnimationFrame(tick)
}

function stopTicker() {
  cancelAnimationFrame(frameId)
  frameId = 0
}

function togglePrimary() {
  if (status.value === 'running') {
    pause()
    return
  }
  if (status.value === 'finished') {
    restart()
    return
  }
  start()
}

function start() {
  if (status.value === 'running') return

  if (status.value === 'idle' || status.value === 'finished') {
    const duration = durationFromInputs()
    if (duration <= 0) return
    totalMs.value = duration
    remainingMs.value = duration
  }

  if (remainingMs.value <= 0) return

  if (soundEnabled.value) void prepareCompleteTone()

  endsAt = performance.now() + remainingMs.value
  status.value = 'running'
  startTicker()
}

function pause() {
  if (status.value !== 'running') return
  stopTicker()
  remainingMs.value = Math.max(0, endsAt - performance.now())
  status.value = 'paused'
}

function reset() {
  stopTicker()
  status.value = 'idle'
  remainingMs.value = durationFromInputs()
  totalMs.value = remainingMs.value
  endsAt = 0
}

function restart() {
  stopTicker()
  status.value = 'idle'
  remainingMs.value = totalMs.value > 0 ? totalMs.value : durationFromInputs()
  if (remainingMs.value <= 0) {
    remainingMs.value = durationFromInputs()
  }
  if (remainingMs.value <= 0) return
  if (soundEnabled.value) void prepareCompleteTone()
  endsAt = performance.now() + remainingMs.value
  status.value = 'running'
  startTicker()
}

function finish() {
  stopTicker()
  remainingMs.value = 0
  status.value = 'finished'
  if (soundEnabled.value) playCompleteTone()
  toast.success('倒计时结束')
}

function onUnitInput(kind: 'hours' | 'minutes' | 'seconds', event: Event) {
  const target = event.target as HTMLInputElement
  const raw = Number(target.value)
  const max = kind === 'hours' ? 99 : 59
  const value = clampUnit(raw, max)

  if (kind === 'hours') hoursInput.value = value
  if (kind === 'minutes') minutesInput.value = value
  if (kind === 'seconds') secondsInput.value = value

  target.value = String(value)
}

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext

  const Ctor = window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext
  }).webkitAudioContext
  if (!Ctor) return null

  audioContext = new Ctor()
  return audioContext
}

function buildCompleteToneGraph(ctx: BaseAudioContext, when = 0) {
  const partials: Array<{ freq: number; type: OscillatorType; gain: number; decay: number }> = [
    {freq: 3136, type: 'sine', gain: 0.95, decay: 0.9},
    {freq: 4699, type: 'sine', gain: 0.35, decay: 0.55},
    {freq: 6272, type: 'triangle', gain: 0.12, decay: 0.32},
  ]

  for (const partial of partials) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = partial.type
    osc.frequency.setValueAtTime(partial.freq, when)
    osc.frequency.exponentialRampToValueAtTime(partial.freq * 0.992, when + partial.decay)
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(partial.gain, when + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + partial.decay)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(when)
    osc.stop(when + partial.decay + 0.04)
  }
}

async function prepareCompleteTone() {
  if (completeToneBuffer) {
    const ctx = getAudioContext()
    if (ctx?.state === 'suspended') await ctx.resume()
    return
  }
  if (completeToneLoading) {
    await completeToneLoading
    return
  }

  completeToneLoading = (async () => {
    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    const duration = 1.1
    const offline = new OfflineAudioContext(1, Math.ceil(duration * ctx.sampleRate), ctx.sampleRate)
    buildCompleteToneGraph(offline, 0)
    completeToneBuffer = await offline.startRendering()
  })()

  try {
    await completeToneLoading
  } finally {
    completeToneLoading = null
  }
}

function playCompleteTone() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    if (completeToneBuffer) {
      if (ctx.state === 'suspended') void ctx.resume()
      const source = ctx.createBufferSource()
      source.buffer = completeToneBuffer
      source.connect(ctx.destination)
      source.start(0)
      return
    }

    if (ctx.state === 'suspended') void ctx.resume()
    buildCompleteToneGraph(ctx, ctx.currentTime)
    void prepareCompleteTone()
  } catch {
  }
}

remainingMs.value = durationFromInputs()
totalMs.value = remainingMs.value

onBeforeUnmount(() => {
  stopTicker()
  if (audioContext) {
    void audioContext.close()
    audioContext = null
  }
  completeToneBuffer = null
  completeToneLoading = null
})
</script>

<template>
  <div class="timer">
    <div class="timer__display">
      <div class="timer__ring-wrap">
        <svg class="timer__ring" viewBox="0 0 200 200">
          <circle class="timer__ring-track" cx="100" cy="100" r="86"/>
          <circle
            :stroke-dasharray="2 * Math.PI * 86"
            :stroke-dashoffset="ringOffset"
            class="timer__ring-progress"
            cx="100"
            cy="100"
            r="86"
            transform="rotate(-90 100 100)"
          />
        </svg>

        <div class="timer__center">
          <div aria-live="polite" class="timer__time">
            {{ display.main }}
          </div>
          <div class="timer__status">
            <span
              :class="{
                'timer__badge--running': status === 'running',
                'timer__badge--paused': status === 'paused',
                'timer__badge--finished': status === 'finished',
              }"
              class="timer__badge"
            >
              {{ statusLabel }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="timer__setup">
      <div class="timer__units">
        <label class="timer__unit">
          <span class="timer__unit-label">时</span>
          <input
            :disabled="!isEditing"
            :value="hoursInput"
            class="timer__unit-input"
            inputmode="numeric"
            max="99"
            min="0"
            type="number"
            @change="onUnitInput('hours', $event)"
          />
        </label>
        <span class="timer__unit-sep">:</span>
        <label class="timer__unit">
          <span class="timer__unit-label">分</span>
          <input
            :disabled="!isEditing"
            :value="minutesInput"
            class="timer__unit-input"
            inputmode="numeric"
            max="59"
            min="0"
            type="number"
            @change="onUnitInput('minutes', $event)"
          />
        </label>
        <span class="timer__unit-sep">:</span>
        <label class="timer__unit">
          <span class="timer__unit-label">秒</span>
          <input
            :disabled="!isEditing"
            :value="secondsInput"
            class="timer__unit-input"
            inputmode="numeric"
            max="59"
            min="0"
            type="number"
            @change="onUnitInput('seconds', $event)"
          />
        </label>
      </div>
    </div>

    <div class="timer__actions">
      <button
        :class="status === 'running' ? 'timer__btn--warn' : 'timer__btn--primary'"
        :disabled="!canStart"
        class="timer__btn pressable"
        type="button"
        @click="togglePrimary"
      >
        {{ primaryLabel }}
      </button>

      <button
        :disabled="!canReset"
        class="timer__btn pressable"
        type="button"
        @click="reset"
      >
        重置
      </button>

      <label class="timer__sound">
        <input v-model="soundEnabled" type="checkbox"/>
        <span>倒计时结束提示音</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.timer {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.timer__display {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .timer__display {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.timer__ring-wrap {
  position: relative;
  width: min(300px, 72vw);
  aspect-ratio: 1;
}

.timer__ring {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 8px 24px color-mix(in srgb, #000 6%, transparent));
}

[data-theme="dark"] .timer__ring {
  filter: drop-shadow(0 8px 24px color-mix(in srgb, #000 40%, transparent));
}

.timer__ring-track {
  fill: var(--surface-solid);
  stroke: color-mix(in srgb, var(--bg-tertiary) 80%, transparent);
  stroke-width: 10;
}

.timer__ring-progress {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 10;
  stroke-linecap: round;
  transition: stroke-dashoffset 80ms linear;
}

.timer__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  pointer-events: none;
}

.timer__time {
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--text-primary);
  line-height: 1;
  user-select: none;
}

.timer__status {
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer__badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--bg-tertiary) 55%, transparent);
  border: 1px solid var(--surface-border-strong);
}

.timer__badge--running {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-primary) 22%, transparent);
}

.timer__badge--paused {
  color: #f59e0b;
  background: color-mix(in srgb, #f59e0b 12%, transparent);
  border-color: color-mix(in srgb, #f59e0b 22%, transparent);
}

.timer__badge--finished {
  color: #10b981;
  background: color-mix(in srgb, #10b981 12%, transparent);
  border-color: color-mix(in srgb, #10b981 22%, transparent);
}

.timer__setup {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .timer__setup {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.timer__units {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 10px;
}

.timer__unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 72px;
}

.timer__unit-label {
  font-size: 11px;
  font-weight: 650;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.timer__unit-input {
  width: 72px;
  height: 48px;
  padding: 0 8px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  text-align: center;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out-soft),
  box-shadow var(--duration-fast) var(--ease-out-soft),
  background-color var(--duration-fast) var(--ease-out-soft),
  opacity var(--duration-fast) var(--ease-out-soft);
}

.timer__unit-input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.timer__unit-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.timer__unit-input::-webkit-outer-spin-button,
.timer__unit-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.timer__unit-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.timer__unit-sep {
  padding-bottom: 12px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-muted);
  line-height: 1;
}

.timer__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.timer__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  padding: 10px 16px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 550;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  border: 1px solid var(--surface-border-strong);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out-soft),
  border-color var(--duration-fast) var(--ease-out-soft),
  opacity var(--duration-fast) var(--ease-out-soft),
  box-shadow var(--duration-fast) var(--ease-out-soft);
}

.timer__btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.timer__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.timer__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.timer__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.timer__btn--warn {
  color: #fff;
  background: #f59e0b;
  border-color: color-mix(in srgb, #f59e0b 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, #f59e0b 28%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.timer__btn--warn:hover:not(:disabled) {
  background: #d97706;
  border-color: #d97706;
  box-shadow: 0 12px 28px color-mix(in srgb, #f59e0b 34%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.timer__sound {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.timer__sound input {
  width: 15px;
  height: 15px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

@media (max-width: 480px) {
  .timer__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .timer__actions .timer__btn:first-child {
    grid-column: 1 / -1;
  }

  .timer__btn {
    width: 100%;
  }

  .timer__sound {
    grid-column: 1 / -1;
    margin-left: 0;
    justify-content: center;
    padding-top: 4px;
  }

  .timer__unit {
    min-width: 64px;
  }

  .timer__unit-input {
    width: 64px;
  }
}
</style>
