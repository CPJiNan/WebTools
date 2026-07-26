<script lang="ts" setup>
import {computed, nextTick, ref} from 'vue'

interface Option {
  label: string
  color: string
  weight: number
}

const PALETTE = [
  '#ff5555', '#ff7711', '#ffdd66', '#22cc55',
  '#66eeff', '#3388ff', '#8855ff', '#ff4499',
]

const options = ref<Option[]>([
  {label: '选项 A', color: PALETTE[0], weight: 1},
  {label: '选项 B', color: PALETTE[1], weight: 1},
  {label: '选项 C', color: PALETTE[2], weight: 1},
  {label: '选项 D', color: PALETTE[3], weight: 1},
])

const spinning = ref(false)
const wheelRotation = ref(0)
const result = ref<string | null>(null)
const resultColor = ref('')
const history = ref<string[]>([])
const showResultPanel = ref(false)
const errorMessage = ref('')
const draftInput = ref('')
const draftInputRef = ref<HTMLInputElement | null>(null)

const hasOptions = computed(() => options.value.length > 0)

const segmentAngle = computed(() => 360 / options.value.length)

const segments = computed(() => {
  const angle = segmentAngle.value
  const radius = 160
  const cx = 200
  const cy = 200

  return options.value.map((opt, i) => {
    const startAngle = (i * angle * Math.PI) / 180 - Math.PI / 2
    const endAngle = ((i + 1) * angle * Math.PI) / 180 - Math.PI / 2
    const x1 = cx + radius * Math.cos(startAngle)
    const y1 = cy + radius * Math.sin(startAngle)
    const x2 = cx + radius * Math.cos(endAngle)
    const y2 = cy + radius * Math.sin(endAngle)
    const largeArc = angle > 180 ? 1 : 0
    const path = 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + radius + ' ' + radius + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z'
    const midAngle = (startAngle + endAngle) / 2
    const textRadius = radius * 0.62
    return {
      index: i,
      path,
      color: opt.color,
      tx: cx + textRadius * Math.cos(midAngle),
      ty: cy + textRadius * Math.sin(midAngle),
      rotation: midAngle * (180 / Math.PI) + 90,
    }
  })
})

function addOption() {
  if (spinning.value) return
  const value = draftInput.value.trim()
  if (!value) {
    nextTick(() => draftInputRef.value?.focus())
    return
  }
  const idx = options.value.length % PALETTE.length
  options.value.push({label: value, color: PALETTE[idx], weight: 1})
  draftInput.value = ''
  errorMessage.value = ''
  nextTick(() => draftInputRef.value?.focus())
}

function onDraftKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    addOption()
  }
}

function removeOption(index: number) {
  options.value.splice(index, 1)
  errorMessage.value = ''
}

function updateLabel(index: number, value: string) {
  if (options.value[index]) options.value[index].label = value
}

function updateColor(index: number, value: string) {
  const opt = options.value[index]
  if (opt) opt.color = value
}

function updateWeight(index: number, value: string) {
  const opt = options.value[index]
  if (!opt) return
  const n = parseInt(value, 10)
  opt.weight = Number.isFinite(n) && n >= 1 ? n : 1
}

function spin() {
  if (spinning.value) return

  const totalW = options.value.reduce((s, o) => s + Math.max(1, o.weight), 0)
  const rand = Math.random() * totalW
  let acc = 0
  let index = 0
  for (let i = 0; i < options.value.length; i++) {
    acc += Math.max(1, options.value[i].weight)
    if (rand < acc) {
      index = i;
      break
    }
  }

  spinning.value = true
  result.value = null
  showResultPanel.value = true

  const segAngle = 360 / options.value.length
  const winCenter = 360 - (index + 0.5) * segAngle
  const extraRounds = (5 + Math.floor(Math.random() * 6)) * 360
  const currentBase = Math.floor(wheelRotation.value / 360) * 360
  wheelRotation.value = currentBase + extraRounds + winCenter

  setTimeout(() => {
    spinning.value = false
    const winner = options.value[index]
    const label = winner.label.trim() || '(空)'
    result.value = label
    resultColor.value = winner.color
    history.value = [label, ...history.value].slice(0, 12)
  }, 4200)
}

function clearHistory() {
  history.value = []
}
</script>

<template>
  <div class="spin-wheel">
    <div class="spin-wheel__panel">
      <span class="spin-wheel__section-title">转盘选项</span>
      <div class="spin-wheel__option-list">
        <div v-for="(opt, index) in options" :key="index" class="spin-wheel__option-row">
          <span class="spin-wheel__option-index">{{ index + 1 }}</span>
          <input :disabled="spinning" :value="opt.color"
                 class="spin-wheel__color-input" type="color"
                 @input="updateColor(index, ($event.target as HTMLInputElement).value)"/>
          <input :disabled="spinning" :value="opt.label"
                 class="spin-wheel__option-input" placeholder="名称" spellcheck="false" type="text"
                 @input="updateLabel(index, ($event.target as HTMLInputElement).value)"/>
          <input :disabled="spinning" :value="opt.weight"
                 class="spin-wheel__weight-input" min="1" placeholder="权重" step="1" type="number"
                 @input="updateWeight(index, ($event.target as HTMLInputElement).value)"/>
          <button :disabled="spinning"
                  class="spin-wheel__option-remove pressable" title="删除" type="button"
                  @click="removeOption(index)">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                 viewBox="0 0 24 24">
              <path d="M18 6L6 18"/>
              <path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="spin-wheel__add-row">
        <input
          ref="draftInputRef"
          v-model="draftInput"
          :disabled="spinning"
          class="spin-wheel__option-input spin-wheel__option-input--draft"
          placeholder="输入选项"
          spellcheck="false"
          type="text"
          @keydown="onDraftKeydown"
        />
        <button
          :disabled="spinning"
          class="spin-wheel__add-btn pressable"
          type="button"
          @click="addOption"
        >
          添加
        </button>
      </div>
      <p v-if="errorMessage" class="spin-wheel__error">{{ errorMessage }}</p>
    </div>

    <div class="spin-wheel__display">
      <div class="spin-wheel__pointer">
        <svg height="27" viewBox="0 0 24 36" width="18">
          <polygon fill="var(--text-primary)" points="12,36 0,0 24,0"/>
        </svg>
      </div>
      <div class="spin-wheel__wheel-wrap">
        <svg
          :style="{ transform: 'rotate(' + wheelRotation + 'deg)', transition: spinning ? 'transform 4s cubic-bezier(0.15, 0.7, 0.1, 1)' : 'none' }"
          class="spin-wheel__wheel" viewBox="0 0 400 400">
          <circle cx="200" cy="200" fill="none" r="166" stroke="var(--surface-border-strong)" stroke-width="4"/>
          <g v-for="(seg, i) in segments" :key="i">
            <path :d="seg.path" :fill="seg.color"/>
            <text :font-size="options.length > 8 ? 11 : 13"
                  :transform="'rotate(' + seg.rotation + ', ' + seg.tx + ', ' + seg.ty + ')'" :x="seg.tx" :y="seg.ty"
                  dominant-baseline="middle" fill="#fff" font-weight="600"
                  letter-spacing="-0.02em" text-anchor="middle"
            >{{ options[seg.index]?.label.slice(0, 5) || '?' }}
            </text>
          </g>
          <circle cx="200" cy="200" fill="var(--surface-solid)" r="24" stroke="var(--surface-border-strong)"
                  stroke-width="3"/>
        </svg>
      </div>
      <button :disabled="!hasOptions || spinning" class="spin-wheel__spin-btn pressable" type="button" @click="spin">
        {{ spinning ? '旋转中...' : '开始旋转' }}
      </button>
    </div>

    <div v-if="showResultPanel" class="spin-wheel__result-panel">
      <span class="spin-wheel__section-title">抽奖结果</span>
      <div v-if="result" :style="{ color: resultColor }" class="spin-wheel__result-value">{{ result }}</div>
      <div v-else class="spin-wheel__result-placeholder">旋转中...</div>
    </div>

    <div v-if="history.length" class="spin-wheel__history-panel">
      <div class="spin-wheel__history-head">
        <span class="spin-wheel__section-title">历史记录</span>
        <button class="spin-wheel__ghost-btn pressable" type="button" @click="clearHistory">清空</button>
      </div>
      <div class="spin-wheel__history-list">
        <span
          v-for="(item, idx) in history"
          :key="idx"
          class="spin-wheel__chip"
        >{{ item }}</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.spin-wheel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.spin-wheel__panel, .spin-wheel__result-panel, .spin-wheel__history-panel {
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

[data-theme="dark"] .spin-wheel__panel, [data-theme="dark"] .spin-wheel__result-panel, [data-theme="dark"] .spin-wheel__history-panel {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.spin-wheel__section-title {
  font-size: 13px;
  font-weight: 650;
  color: var(--text-secondary);
  letter-spacing: -0.01em;
}

.spin-wheel__option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow: auto;
  padding-right: 2px;
}

.spin-wheel__option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.spin-wheel__option-index {
  flex-shrink: 0;
  width: 24px;
  text-align: center;
  font-size: 12px;
  font-weight: 650;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.spin-wheel__color-input {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 2px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: none;
  -webkit-appearance: none;
  appearance: none;
  box-sizing: border-box;
  transition: border-color var(--duration-hover) var(--ease-hover), transform var(--duration-hover) var(--ease-hover);
}

.spin-wheel__color-input:hover:not(:disabled) {
  border-color: var(--text-primary);
  transform: scale(1.12);
}

.spin-wheel__color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.spin-wheel__color-input::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}

.spin-wheel__color-input::-moz-color-swatch {
  border: none;
  border-radius: 2px;
}

.spin-wheel__color-input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spin-wheel__option-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out);
}

.spin-wheel__option-input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.spin-wheel__option-input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spin-wheel__option-remove {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color var(--duration-hover) var(--ease-hover), border-color var(--duration-hover) var(--ease-hover), color var(--duration-hover) var(--ease-hover), opacity var(--duration-fast) var(--ease-out);
}

.spin-wheel__option-remove svg {
  width: 14px;
  height: 14px;
}

.spin-wheel__option-remove:hover:not(:disabled) {
  color: #ef4444;
  border-color: color-mix(in srgb, #ef4444 28%, var(--surface-border-strong));
  background: color-mix(in srgb, #ef4444 8%, var(--surface-solid));
}

.spin-wheel__option-remove:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spin-wheel__add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.spin-wheel__option-input--draft {
  margin-left: 32px;
}

.spin-wheel__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.spin-wheel__add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 14px;
  height: 40px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 550;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  border: 1px solid var(--surface-border-strong);
  flex-shrink: 0;
  cursor: pointer;
  transition: transform var(--duration-press) var(--ease-out), background-color var(--duration-hover) var(--ease-hover), border-color var(--duration-hover) var(--ease-hover), box-shadow var(--duration-hover) var(--ease-hover);
}

.spin-wheel__add-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.spin-wheel__add-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.spin-wheel__weight-input {
  width: 64px;
  flex-shrink: 0;
  height: 40px;
  padding: 0 8px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-primary);
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  text-align: center;
  outline: none;
  box-sizing: border-box;
  appearance: textfield;
  -moz-appearance: textfield;
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out);
}

.spin-wheel__weight-input::-webkit-inner-spin-button,
.spin-wheel__weight-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.spin-wheel__weight-input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.spin-wheel__weight-input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spin-wheel__display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 20px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

[data-theme="dark"] .spin-wheel__display {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.spin-wheel__pointer {
  position: relative;
  z-index: 2;
  margin-bottom: -60px;
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
}

.spin-wheel__wheel-wrap {
  width: min(320px, 72vw);
  aspect-ratio: 1;
  overflow: hidden;
  pointer-events: none;
}

.spin-wheel__wheel {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.12));
}

[data-theme="dark"] .spin-wheel__wheel {
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.4));
}

.spin-wheel__spin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 32px;
  border-radius: var(--radius-full);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #fff;
  background: var(--color-primary);
  border: none;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-primary) 35%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.28);
  cursor: pointer;
  transition: transform var(--duration-press) var(--ease-out), background-color var(--duration-hover) var(--ease-hover), box-shadow var(--duration-hover) var(--ease-hover), opacity var(--duration-fast) var(--ease-out);
}

.spin-wheel__spin-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--color-primary) 42%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.spin-wheel__spin-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.spin-wheel__result-value {
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.1;
  text-align: center;
}

.spin-wheel__result-placeholder {
  font-size: 18px;
  color: var(--text-muted);
  text-align: center;
}

.spin-wheel__history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.spin-wheel__history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.spin-wheel__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  max-width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spin-wheel__ghost-btn {
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 550;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  border: 1px solid var(--surface-border-strong);
  cursor: pointer;
  transition: transform var(--duration-press) var(--ease-out), background-color var(--duration-hover) var(--ease-hover), border-color var(--duration-hover) var(--ease-hover);
}

.spin-wheel__error {
  margin: 0;
  font-size: 13px;
  color: #ef4444;
}

</style>
