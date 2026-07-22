<script lang="ts" setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'

interface TimezoneOption {
  id: string
  label: string
}

const TIMEZONES: TimezoneOption[] = [
  {id: 'Asia/Shanghai', label: '北京'},
  {id: 'Asia/Hong_Kong', label: '香港'},
  {id: 'Asia/Taipei', label: '台北'},
  {id: 'Asia/Tokyo', label: '东京'},
  {id: 'Asia/Seoul', label: '首尔'},
  {id: 'Asia/Singapore', label: '新加坡'},
  {id: 'Asia/Bangkok', label: '曼谷'},
  {id: 'Asia/Kolkata', label: '新德里'},
  {id: 'Asia/Dubai', label: '迪拜'},
  {id: 'Europe/Moscow', label: '莫斯科'},
  {id: 'Europe/London', label: '伦敦'},
  {id: 'Europe/Paris', label: '巴黎'},
  {id: 'Europe/Berlin', label: '柏林'},
  {id: 'America/New_York', label: '纽约'},
  {id: 'America/Chicago', label: '芝加哥'},
  {id: 'America/Denver', label: '丹佛'},
  {id: 'America/Los_Angeles', label: '洛杉矶'},
  {id: 'America/Sao_Paulo', label: '圣保罗'},
  {id: 'Australia/Sydney', label: '悉尼'},
  {id: 'Pacific/Auckland', label: '奥克兰'},
  {id: 'UTC', label: '协调世界时'},
]

const timezone = ref('Asia/Shanghai')
const now = ref(new Date())
const isFullscreen = ref(false)
const displayRef = ref<HTMLElement | null>(null)

let frameId = 0

const ticks = Array.from({length: 60}, (_, i) => i)

const timeParts = computed(() => getZonedParts(now.value, timezone.value))

const digitalTime = computed(() => {
  const {hour, minute, second} = timeParts.value
  return `${pad(hour)}:${pad(minute)}:${pad(second)}`
})

const digitalDate = computed(() => {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone.value,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(now.value)
  } catch {
    return ''
  }
})

const handAngles = computed(() => {
  const {hour, minute, second, ms} = timeParts.value
  const s = second + ms / 1000
  const m = minute + s / 60
  const h = (hour % 12) + m / 60
  return {
    hour: h * 30,
    minute: m * 6,
    second: s * 6,
  }
})

const hourHand = computed(() => handCoords(handAngles.value.hour, 52, 12))
const minuteHand = computed(() => handCoords(handAngles.value.minute, 68, 14))
const secondHand = computed(() => handCoords(handAngles.value.second, 76, 18))

const timezoneOptions = computed(() =>
  TIMEZONES.map((tz) => ({
    id: tz.id,
    label: formatTimezoneLabel(tz.label, tz.id, now.value),
  })),
)

const timezoneLabel = computed(() => {
  const city = TIMEZONES.find((z) => z.id === timezone.value)?.label ?? timezone.value
  return formatTimezoneLabel(city, timezone.value, now.value)
})

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatUtcOffset(timeZone: string, date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(date)
    const raw = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
    if (raw === 'GMT' || raw === 'UTC') return 'UTC+00:00'
    const m = raw.replace(/^GMT|^UTC/, '').match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/)
    if (!m) return raw.replace(/^GMT/, 'UTC')
    const sign = m[1]
    const hh = m[2].padStart(2, '0')
    const mm = (m[3] ?? '00').padStart(2, '0')
    return `UTC${sign}${hh}:${mm}`
  } catch {
    return 'UTC'
  }
}

function formatTimezoneLabel(city: string, timeZone: string, date: Date): string {
  return `${city} (${formatUtcOffset(timeZone, date)})`
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

function getZonedParts(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    }).formatToParts(date)

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value ?? '0')

    let hour = get('hour')
    if (hour === 24) hour = 0

    return {
      hour,
      minute: get('minute'),
      second: get('second'),
      ms: date.getMilliseconds(),
    }
  } catch {
    return {
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      ms: date.getMilliseconds(),
    }
  }
}

function tick() {
  now.value = new Date()
  frameId = requestAnimationFrame(tick)
}

async function enterFullscreen() {
  isFullscreen.value = true
  document.body.style.overflow = 'hidden'

  const el = displayRef.value
  if (el && el.requestFullscreen) {
    try {
      await el.requestFullscreen()
    } catch {
    }
  }
}

async function exitFullscreen() {
  isFullscreen.value = false
  document.body.style.overflow = ''

  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen()
    } catch {
    }
  }
}

function toggleFullscreen() {
  if (isFullscreen.value) {
    void exitFullscreen()
  } else {
    void enterFullscreen()
  }
}

function onFullscreenChange() {
  if (!document.fullscreenElement && isFullscreen.value) {
    isFullscreen.value = false
    document.body.style.overflow = ''
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFullscreen.value && !document.fullscreenElement) {
    void exitFullscreen()
  }
}

onMounted(() => {
  frameId = requestAnimationFrame(tick)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('keydown', onKeydown)
  if (isFullscreen.value) {
    document.body.style.overflow = ''
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    }
  }
})
</script>

<template>
  <div class="clock">
    <div class="clock__controls">
      <label class="clock__field">
        <span class="clock__label">时区</span>
        <select v-model="timezone" class="clock__select">
          <option v-for="tz in timezoneOptions" :key="tz.id" :value="tz.id">
            {{ tz.label }}
          </option>
        </select>
      </label>

      <button
        class="clock__btn clock__btn--primary pressable"
        type="button"
        @click="toggleFullscreen"
      >
        全屏
      </button>
    </div>

    <div
      ref="displayRef"
      :class="{ 'clock__display--fullscreen': isFullscreen }"
      class="clock__display"
    >
      <button
        v-if="isFullscreen"
        class="clock__exit pressable"
        type="button"
        @click="exitFullscreen"
      >
        退出全屏
      </button>

      <div class="clock__face-wrap">
        <svg class="clock__face" viewBox="0 0 200 200">
          <circle class="clock__dial" cx="100" cy="100" r="94"/>

          <g class="clock__ticks">
            <line
              v-for="i in ticks"
              :key="i"
              :class="i % 5 === 0 ? 'clock__tick clock__tick--hour' : 'clock__tick'"
              :transform="`rotate(${i * 6} 100 100)`"
              :x1="100"
              :x2="100"
              :y1="12"
              :y2="i % 5 === 0 ? 20 : 18"
            />
          </g>

          <g class="clock__numbers">
            <text
              v-for="n in 12"
              :key="n"
              :x="100 + Math.sin((n * 30 * Math.PI) / 180) * 68"
              :y="100 - Math.cos((n * 30 * Math.PI) / 180) * 68"
              class="clock__number"
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
            class="clock__hand clock__hand--hour"
          />
          <line
            :x1="minuteHand.x1"
            :x2="minuteHand.x2"
            :y1="minuteHand.y1"
            :y2="minuteHand.y2"
            class="clock__hand clock__hand--minute"
          />
          <line
            :x1="secondHand.x1"
            :x2="secondHand.x2"
            :y1="secondHand.y1"
            :y2="secondHand.y2"
            class="clock__hand clock__hand--second"
          />

          <circle class="clock__pivot" cx="100" cy="100" r="3.5"/>
        </svg>
      </div>

      <div class="clock__digital">
        <div class="clock__digital-time">{{ digitalTime }}</div>
        <div class="clock__digital-meta">
          <span>{{ digitalDate }}</span>
          <span class="clock__digital-sep">·</span>
          <span>{{ timezoneLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clock {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.clock__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

.clock__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: min(100%, 280px);
  flex: 1;
}

.clock__label {
  font-size: 11px;
  font-weight: 650;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.clock__select {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out-soft),
  box-shadow var(--duration-fast) var(--ease-out-soft),
  background-color var(--duration-fast) var(--ease-out-soft);
}

.clock__select:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.clock__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
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
  box-shadow var(--duration-fast) var(--ease-out-soft);
}

.clock__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.clock__btn--primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.clock__display {
  position: relative;
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

[data-theme="dark"] .clock__display {
  box-shadow: var(--shadow-sm), inset 0 0.5px 0 rgba(255, 255, 255, 0.05);
}

.clock__display--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  border: none;
  border-radius: 0;
  gap: clamp(20px, 3.5vh, 36px);
  padding: 24px;
  background: var(--bg);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: none;
  justify-content: center;
}

.clock__display--fullscreen .clock__face-wrap,
.clock__display--fullscreen .clock__digital {
  transform: translateY(-3vh);
}

.clock__exit {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  right: max(16px, env(safe-area-inset-right));
  padding: 8px 14px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 550;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-secondary) 80%, transparent);
  border: 1px solid var(--surface-border-strong);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity var(--duration-fast) var(--ease-out-soft),
  background-color var(--duration-fast) var(--ease-out-soft),
  color var(--duration-fast) var(--ease-out-soft);
}

.clock__exit:hover {
  opacity: 1;
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.clock__face-wrap {
  width: min(320px, 72vw);
  aspect-ratio: 1;
}

.clock__display--fullscreen .clock__face-wrap {
  width: min(560px, 86vmin);
}

.clock__face {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 8px 24px color-mix(in srgb, #000 6%, transparent));
}

[data-theme="dark"] .clock__face {
  filter: drop-shadow(0 8px 24px color-mix(in srgb, #000 40%, transparent));
}

.clock__dial {
  fill: var(--surface-solid);
  stroke: var(--surface-border-strong);
  stroke-width: 1;
}

.clock__tick {
  stroke: var(--text-muted);
  stroke-width: 1.2;
  stroke-linecap: round;
  opacity: 0.75;
}

.clock__tick--hour {
  stroke: var(--text-primary);
  stroke-width: 1.5;
  opacity: 1;
}

.clock__number {
  fill: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-family: inherit;
}

.clock__hand {
  stroke-linecap: round;
}

.clock__hand--hour {
  stroke: var(--text-primary);
  stroke-width: 4.5;
}

.clock__hand--minute {
  stroke: var(--text-primary);
  stroke-width: 3;
  opacity: 0.88;
}

.clock__hand--second {
  stroke: var(--color-primary);
  stroke-width: 1.5;
}

.clock__pivot {
  fill: var(--text-primary);
}

.clock__digital {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.clock__digital-time {
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--text-primary);
  line-height: 1.1;
}

.clock__display--fullscreen .clock__digital-time {
  font-size: clamp(2.8rem, 9.5vmin, 4.4rem);
}

.clock__digital-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
  letter-spacing: -0.01em;
}

.clock__digital-sep {
  opacity: 0.55;
}

@media (max-width: 480px) {
  .clock__controls {
    flex-direction: column;
    align-items: stretch;
  }

  .clock__btn {
    width: 100%;
  }
}
</style>
