<script lang="ts" setup>
import {computed, onBeforeUnmount, ref} from 'vue'
import {useToast} from '@/stores/toast'

interface Lap {
  index: number
  totalMs: number
  splitMs: number
}

type Status = 'idle' | 'running' | 'paused'

const toast = useToast()

const status = ref<Status>('idle')
const elapsedMs = ref(0)
const laps = ref<Lap[]>([])

let baseElapsed = 0
let startedAt = 0
let frameId = 0

const ticks = Array.from({length: 60}, (_, i) => i)
const faceNumbers = Array.from({length: 12}, (_, i) => (i + 1) * 5)

const display = computed(() => formatTime(elapsedMs.value))

const hasLaps = computed(() => laps.value.length > 0)

const primaryLabel = computed(() => {
  if (status.value === 'running') return '暂停'
  if (status.value === 'paused') return '继续'
  return '开始'
})

const canReset = computed(() => status.value !== 'idle' || elapsedMs.value > 0 || hasLaps.value)

const canLap = computed(() => status.value === 'running' || status.value === 'paused')

const handAngles = computed(() => {
  const ms = Math.max(0, elapsedMs.value)
  const totalSeconds = ms / 1000
  const seconds = totalSeconds % 60
  const minutes = (totalSeconds / 60) % 60
  const hours = (totalSeconds / 3600) % 12
  return {
    hour: hours * 30,
    minute: minutes * 6,
    second: seconds * 6,
  }
})

const hourHand = computed(() => handCoords(handAngles.value.hour, 48, 10))
const minuteHand = computed(() => handCoords(handAngles.value.minute, 66, 12))
const secondHand = computed(() => handCoords(handAngles.value.second, 76, 18))

function pad(n: number, width = 2) {
  return String(n).padStart(width, '0')
}

function formatTime(ms: number) {
  const totalMs = Math.max(0, Math.floor(ms))
  const hours = Math.floor(totalMs / 3_600_000)
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000)
  const seconds = Math.floor((totalMs % 60_000) / 1000)
  const centiseconds = Math.floor((totalMs % 1000) / 10)

  if (hours > 0) {
    return {
      main: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
      fraction: pad(centiseconds),
    }
  }

  return {
    main: `${pad(minutes)}:${pad(seconds)}`,
    fraction: pad(centiseconds),
  }
}

function formatDuration(ms: number) {
  const {main, fraction} = formatTime(ms)
  return `${main}.${fraction}`
}

function handCoords(angleDeg: number, length: number, tail: number) {
  const rad = (angleDeg * Math.PI) / 180
  const sin = Math.sin(rad)
  const cos = Math.cos(rad)
  return {
    x1: 100 - sin * tail,
    y1: 100 + cos * tail,
    x2: 100 + sin * length,
    y2: 100 - cos * length,
  }
}

function tick() {
  elapsedMs.value = baseElapsed + (performance.now() - startedAt)
  frameId = requestAnimationFrame(tick)
}

function startTicker() {
  cancelAnimationFrame(frameId)
  startedAt = performance.now()
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
  start()
}

function start() {
  if (status.value === 'running') return
  baseElapsed = elapsedMs.value
  status.value = 'running'
  startTicker()
}

function pause() {
  if (status.value !== 'running') return
  stopTicker()
  elapsedMs.value = baseElapsed + (performance.now() - startedAt)
  baseElapsed = elapsedMs.value
  status.value = 'paused'
}

function reset() {
  stopTicker()
  status.value = 'idle'
  elapsedMs.value = 0
  baseElapsed = 0
  startedAt = 0
  laps.value = []
}

function currentElapsed() {
  if (status.value === 'running') {
    return baseElapsed + (performance.now() - startedAt)
  }
  return elapsedMs.value
}

function addLap() {
  if (!canLap.value) return

  const totalMs = currentElapsed()
  const previousTotal = laps.value[0]?.totalMs ?? 0
  const splitMs = totalMs - previousTotal

  laps.value = [
    {
      index: laps.value.length + 1,
      totalMs,
      splitMs,
    },
    ...laps.value,
  ]
}

function copyLaps() {
  if (!hasLaps.value) return

  const lines = [...laps.value]
    .reverse()
    .map((lap) => `#${lap.index}\t${formatDuration(lap.splitMs)}\t${formatDuration(lap.totalMs)}`)

  const text = ['计次\t分段\t总计', ...lines, '', `总计\t${formatDuration(elapsedMs.value)}`].join('\n')
  navigator.clipboard.writeText(text)
  toast.success('复制成功')
}

onBeforeUnmount(() => {
  stopTicker()
})
</script>

<template>
  <div class="stopwatch">
    <div class="stopwatch__display">
      <div class="stopwatch__face-wrap">
        <svg class="stopwatch__face" viewBox="0 0 200 200">
          <circle class="stopwatch__dial" cx="100" cy="100" r="94"/>

          <g class="stopwatch__ticks">
            <line
              v-for="i in ticks"
              :key="i"
              :class="i % 5 === 0 ? 'stopwatch__tick stopwatch__tick--major' : 'stopwatch__tick'"
              :transform="`rotate(${i * 6} 100 100)`"
              :x1="100"
              :x2="100"
              :y1="12"
              :y2="i % 5 === 0 ? 20 : 18"
            />
          </g>

          <g class="stopwatch__numbers">
            <text
              v-for="n in faceNumbers"
              :key="n"
              :x="100 + Math.sin((n * 6 * Math.PI) / 180) * 68"
              :y="100 - Math.cos((n * 6 * Math.PI) / 180) * 68"
              class="stopwatch__number"
              dominant-baseline="middle"
              text-anchor="middle"
            >
              {{ n }}
            </text>
          </g>

          <line
            :x1="hourHand.x1"
            :x2="hourHand.x2"
            :y1="hourHand.y1"
            :y2="hourHand.y2"
            class="stopwatch__hand stopwatch__hand--hour"
          />
          <line
            :x1="minuteHand.x1"
            :x2="minuteHand.x2"
            :y1="minuteHand.y1"
            :y2="minuteHand.y2"
            class="stopwatch__hand stopwatch__hand--minute"
          />
          <line
            :x1="secondHand.x1"
            :x2="secondHand.x2"
            :y1="secondHand.y1"
            :y2="secondHand.y2"
            class="stopwatch__hand stopwatch__hand--second"
          />

          <circle class="stopwatch__pivot" cx="100" cy="100" r="3.5"/>
        </svg>
      </div>

      <div class="stopwatch__digital">
        <div aria-live="polite" class="stopwatch__time">
          <span class="stopwatch__time-main">{{ display.main }}</span>
          <span class="stopwatch__time-fraction">.{{ display.fraction }}</span>
        </div>
        <div class="stopwatch__status">
          <span
            :class="{
              'stopwatch__badge--running': status === 'running',
              'stopwatch__badge--paused': status === 'paused',
            }"
            class="stopwatch__badge"
          >
            {{ status === 'running' ? '计时中' : status === 'paused' ? '已暂停' : '就绪' }}
          </span>
        </div>
      </div>
    </div>

    <div class="stopwatch__actions">
      <button
        :class="status === 'running' ? 'stopwatch__btn--warn' : 'stopwatch__btn--primary'"
        class="stopwatch__btn pressable"
        type="button"
        @click="togglePrimary"
      >
        {{ primaryLabel }}
      </button>

      <button
        :disabled="!canLap"
        class="stopwatch__btn pressable"
        type="button"
        @click="addLap"
      >
        计次
      </button>

      <button
        :disabled="!canReset"
        class="stopwatch__btn pressable"
        type="button"
        @click="reset"
      >
        重置
      </button>
    </div>

    <div v-if="hasLaps" class="stopwatch__laps">
      <div class="stopwatch__laps-head">
        <span class="stopwatch__laps-title">计次记录</span>
        <button class="stopwatch__btn stopwatch__btn--ghost pressable" type="button" @click="copyLaps">
          复制
        </button>
      </div>

      <div class="stopwatch__laps-table" role="table">
        <div class="stopwatch__laps-row stopwatch__laps-row--head" role="row">
          <span role="columnheader">#</span>
          <span role="columnheader">分段</span>
          <span role="columnheader">总计</span>
        </div>
        <div
          v-for="lap in laps"
          :key="lap.index"
          class="stopwatch__laps-row"
          role="row"
        >
          <span class="stopwatch__laps-index" role="cell">{{ lap.index }}</span>
          <span class="stopwatch__laps-split" role="cell">{{ formatDuration(lap.splitMs) }}</span>
          <span class="stopwatch__laps-total" role="cell">{{ formatDuration(lap.totalMs) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stopwatch {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.stopwatch__display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 28px 20px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .stopwatch__display {
  box-shadow: var(--shadow-sm), inset 0 0.5px 0 rgba(255, 255, 255, 0.05);
}

.stopwatch__face-wrap {
  width: min(320px, 72vw);
  aspect-ratio: 1;
}

.stopwatch__face {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 8px 24px color-mix(in srgb, #000 6%, transparent));
}

[data-theme="dark"] .stopwatch__face {
  filter: drop-shadow(0 8px 24px color-mix(in srgb, #000 40%, transparent));
}

.stopwatch__dial {
  fill: var(--surface-solid);
  stroke: var(--surface-border-strong);
  stroke-width: 1;
}

.stopwatch__tick {
  stroke: var(--text-muted);
  stroke-width: 1.2;
  stroke-linecap: round;
  opacity: 0.75;
}

.stopwatch__tick--major {
  stroke: var(--text-primary);
  stroke-width: 1.5;
  opacity: 1;
}

.stopwatch__number {
  fill: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-family: inherit;
}

.stopwatch__hand {
  stroke-linecap: round;
}

.stopwatch__hand--hour {
  stroke: var(--text-primary);
  stroke-width: 4.5;
}

.stopwatch__hand--minute {
  stroke: var(--text-primary);
  stroke-width: 3;
  opacity: 0.88;
}

.stopwatch__hand--second {
  stroke: var(--color-primary);
  stroke-width: 1.5;
}

.stopwatch__pivot {
  fill: var(--text-primary);
}

.stopwatch__digital {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.stopwatch__time {
  display: flex;
  align-items: baseline;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1;
  letter-spacing: -0.04em;
  user-select: none;
}

.stopwatch__time-main {
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 700;
  color: var(--text-primary);
}

.stopwatch__time-fraction {
  font-size: clamp(1.1rem, 4vw, 1.5rem);
  font-weight: 650;
  color: var(--color-primary);
  margin-left: 2px;
}

.stopwatch__status {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stopwatch__badge {
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

.stopwatch__badge--running {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-primary) 22%, transparent);
}

.stopwatch__badge--paused {
  color: #f59e0b;
  background: color-mix(in srgb, #f59e0b 12%, transparent);
  border-color: color-mix(in srgb, #f59e0b 22%, transparent);
}

.stopwatch__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.stopwatch__btn {
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
  transition: transform var(--duration-press) var(--ease-out),
  background-color var(--duration-hover) var(--ease-hover),
  border-color var(--duration-hover) var(--ease-hover),
  opacity var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-hover) var(--ease-hover);
}

.stopwatch__btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.stopwatch__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.stopwatch__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.stopwatch__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.stopwatch__btn--warn {
  color: #fff;
  background: #f59e0b;
  border-color: color-mix(in srgb, #f59e0b 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, #f59e0b 28%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.stopwatch__btn--warn:hover:not(:disabled) {
  background: #d97706;
  border-color: #d97706;
  box-shadow: 0 12px 28px color-mix(in srgb, #f59e0b 34%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.stopwatch__btn--ghost {
  min-width: 0;
  padding: 6px 12px;
  font-size: 12px;
}

.stopwatch__laps {
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

[data-theme="dark"] .stopwatch__laps {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.stopwatch__laps-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stopwatch__laps-title {
  font-size: 13px;
  font-weight: 650;
  color: var(--text-secondary);
  letter-spacing: -0.01em;
}

.stopwatch__laps-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stopwatch__laps-row {
  display: grid;
  grid-template-columns: 48px 1fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--text-primary);
}

.stopwatch__laps-row--head {
  padding-top: 0;
  padding-bottom: 6px;
  font-size: 11px;
  font-weight: 650;
  font-family: inherit;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.stopwatch__laps-row:not(.stopwatch__laps-row--head):nth-child(even) {
  background: color-mix(in srgb, var(--bg-tertiary) 35%, transparent);
}

.stopwatch__laps-index {
  color: var(--text-muted);
  font-weight: 600;
}

.stopwatch__laps-split {
  color: var(--color-primary);
  font-weight: 600;
}

.stopwatch__laps-total {
  color: var(--text-secondary);
  text-align: right;
}

.stopwatch__laps-row--head span:last-child,
.stopwatch__laps-total {
  text-align: right;
}

@media (max-width: 480px) {
  .stopwatch__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .stopwatch__actions .stopwatch__btn:first-child {
    grid-column: 1 / -1;
  }

  .stopwatch__btn {
    width: 100%;
  }
}
</style>
