<script lang="ts" setup>
import {computed, nextTick, onBeforeUnmount, ref} from 'vue'
import {useToast} from '@/stores/toast'

const toast = useToast()

type Mode = 'ui' | 'text'

const mode = ref<Mode>('ui')
const optionsList = ref(['选项 A', '选项 B', '选项 C'])
const optionsText = ref(optionsList.value.join('\n'))
const draftInput = ref('')
const draftInputRef = ref<HTMLInputElement | null>(null)

const result = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const isSpinning = ref(false)
const history = ref<string[]>([])

const reelItems = ref<string[]>([])
const reelOffset = ref(0)
const reelBlur = ref(0)
const showResultPanel = ref(false)

const ITEM_HEIGHT = 72
const SPIN_DURATION_MS = 4200

let rafId: number | null = null

const options = computed(() => {
  if (mode.value === 'text') {
    return optionsText.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }
  return optionsList.value
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
})

const optionCount = computed(() => options.value.length)
const canDraw = computed(() => optionCount.value >= 2 && !isSpinning.value)
const hasResult = computed(() => result.value !== null)

function parseTextToList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function listToText(list: string[]): string {
  return list.join('\n')
}

function setMode(next: Mode) {
  if (next === mode.value || isSpinning.value) return

  if (next === 'text') {
    optionsText.value = listToText(
      optionsList.value
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    )
  } else {
    const parsed = parseTextToList(optionsText.value)
    optionsList.value = parsed.length > 0 ? parsed : ['']
  }

  mode.value = next
  errorMessage.value = null
}

function clearTimers() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

function pickIndex(length: number): number {
  return Math.floor(Math.random() * length)
}

/** Stronger ease-out for a snappy start and tense slowdown. */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function startSpin(list: string[], winnerIndex: number) {
  clearTimers()
  showResultPanel.value = true
  isSpinning.value = true
  result.value = null
  reelBlur.value = 0
  reelOffset.value = 0

  const cycles = 12 + pickIndex(6)
  const sequence: string[] = []

  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < list.length; i++) {
      sequence.push(list[i])
    }
  }
  const lead = pickIndex(list.length)
  for (let i = 0; i < lead; i++) {
    sequence.push(list[i])
  }
  sequence.push(list[winnerIndex])

  reelItems.value = sequence
  const finalOffset = -(sequence.length - 1) * ITEM_HEIGHT
  const start = performance.now()

  const tick = (now: number) => {
    const elapsed = now - start
    const progress = Math.min(elapsed / SPIN_DURATION_MS, 1)
    const eased = easeOutExpo(progress)

    reelOffset.value = finalOffset * eased

    const speed = progress < 0.15
      ? progress / 0.15
      : progress > 0.75
        ? Math.max(0, 1 - (progress - 0.75) / 0.25)
        : 1
    reelBlur.value = speed * 1.6

    if (progress < 1) {
      rafId = requestAnimationFrame(tick)
      return
    }

    rafId = null
    reelOffset.value = finalOffset
    reelBlur.value = 0
    result.value = list[winnerIndex]
    history.value = [list[winnerIndex], ...history.value].slice(0, 12)
    isSpinning.value = false
  }

  rafId = requestAnimationFrame(tick)
}

function draw() {
  errorMessage.value = null

  if (mode.value === 'text') {
    optionsList.value = parseTextToList(optionsText.value)
  } else {
    optionsText.value = listToText(
      optionsList.value
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    )
  }

  const list = options.value

  const winnerIndex = pickIndex(list.length)
  startSpin(list, winnerIndex)
}

function copyResult() {
  if (!result.value) return
  navigator.clipboard.writeText(result.value)
  toast.success('复制成功')
}

function clearHistory() {
  history.value = []
}

function addOption() {
  if (isSpinning.value) return
  const value = draftInput.value.trim()
  if (!value) {
    nextTick(() => draftInputRef.value?.focus())
    return
  }
  optionsList.value = [...optionsList.value, value]
  draftInput.value = ''
  nextTick(() => draftInputRef.value?.focus())
}

function removeOption(index: number) {
  if (isSpinning.value) return
  const next = optionsList.value.filter((_, i) => i !== index)
  optionsList.value = next.length > 0 ? next : ['']
}

function updateOption(index: number, value: string) {
  if (isSpinning.value) return
  const next = [...optionsList.value]
  next[index] = value
  optionsList.value = next
}

function onDraftKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    addOption()
  }
}

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<template>
  <div class="lottery">
    <div class="lottery__panel">
      <div class="lottery__panel-head">
        <span class="lottery__section-title">抽签选项</span>
        <div class="lottery__tabs">
          <button
            :class="['lottery__tab', mode === 'ui' && 'lottery__tab--active']"
            :disabled="isSpinning"
            type="button"
            @click="setMode('ui')"
          >
            列表
          </button>
          <button
            :class="['lottery__tab', mode === 'text' && 'lottery__tab--active']"
            :disabled="isSpinning"
            type="button"
            @click="setMode('text')"
          >
            文本
          </button>
        </div>
      </div>

      <div v-if="mode === 'ui'" class="lottery__ui">
        <div class="lottery__option-list">
          <div
            v-for="(item, index) in optionsList"
            :key="index"
            class="lottery__option-row"
          >
            <span class="lottery__option-index">{{ index + 1 }}</span>
            <input
              :disabled="isSpinning"
              :value="item"
              class="lottery__option-input"
              placeholder="输入选项"
              spellcheck="false"
              type="text"
              @input="updateOption(index, ($event.target as HTMLInputElement).value)"
            />
            <button
              :disabled="isSpinning || optionsList.length <= 1"
              class="lottery__option-remove pressable"
              title="删除"
              type="button"
              @click="removeOption(index)"
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

        <div class="lottery__add-row">
          <input
            ref="draftInputRef"
            v-model="draftInput"
            :disabled="isSpinning"
            class="lottery__option-input lottery__option-input--draft"
            placeholder="输入选项"
            spellcheck="false"
            type="text"
            @keydown="onDraftKeydown"
          />
          <button
            :disabled="isSpinning"
            class="lottery__btn lottery__btn--soft pressable"
            type="button"
            @click="addOption"
          >
            添加
          </button>
        </div>
      </div>

      <div v-else class="lottery__text">
        <textarea
          v-model="optionsText"
          :disabled="isSpinning"
          class="lottery__textarea"
          placeholder="输入选项"
          rows="8"
          spellcheck="false"
        />
      </div>

      <div class="lottery__actions">
        <button
          :disabled="!canDraw"
          class="lottery__btn lottery__btn--primary pressable"
          type="button"
          @click="draw"
        >
          {{ isSpinning ? '抽签中…' : '开始抽签' }}
        </button>
      </div>

      <p v-if="errorMessage" class="lottery__error">{{ errorMessage }}</p>
    </div>

    <div v-if="showResultPanel" class="lottery__result-panel">
      <div class="lottery__result-head">
        <span class="lottery__section-title">抽签结果</span>
        <button
          v-if="hasResult && !isSpinning"
          class="lottery__btn lottery__btn--ghost pressable"
          type="button"
          @click="copyResult"
        >
          复制
        </button>
      </div>

      <div
        :class="{
          'lottery__reel-wrap--spinning': isSpinning,
          'lottery__reel-wrap--winner': hasResult && !isSpinning,
        }"
        class="lottery__reel-wrap"
      >
        <div class="lottery__reel-viewport">
          <div
            :style="{
              transform: `translate3d(0, ${reelOffset}px, 0)`,
              filter: reelBlur > 0.05 ? `blur(${reelBlur}px)` : undefined,
            }"
            class="lottery__reel-track"
          >
            <div
              v-for="(item, index) in reelItems"
              :key="`${index}-${item}`"
              class="lottery__reel-item"
            >
              {{ item }}
            </div>
          </div>
        </div>
        <div aria-hidden="true" class="lottery__reel-fade lottery__reel-fade--top"/>
        <div aria-hidden="true" class="lottery__reel-fade lottery__reel-fade--bottom"/>
        <div aria-hidden="true" class="lottery__reel-line lottery__reel-line--top"/>
        <div aria-hidden="true" class="lottery__reel-line lottery__reel-line--bottom"/>
      </div>
    </div>

    <div v-if="history.length" class="lottery__history-panel">
      <div class="lottery__result-head">
        <span class="lottery__section-title">历史记录</span>
        <button
          class="lottery__btn lottery__btn--ghost pressable"
          type="button"
          @click="clearHistory"
        >
          清空
        </button>
      </div>
      <div class="lottery__history-list">
        <span
          v-for="(item, index) in history"
          :key="`${item}-${index}`"
          class="lottery__chip"
        >
          {{ item }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lottery {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.lottery__panel,
.lottery__result-panel,
.lottery__history-panel {
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

[data-theme="dark"] .lottery__panel,
[data-theme="dark"] .lottery__result-panel,
[data-theme="dark"] .lottery__history-panel {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.lottery__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.lottery__section-title {
  font-size: 13px;
  font-weight: 650;
  color: var(--text-secondary);
  letter-spacing: -0.01em;
}

.lottery__tabs {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--bg-tertiary) 55%, transparent);
  border: 1px solid var(--surface-border-strong);
  flex-shrink: 0;
}

.lottery__tab {
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 550;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out),
  color var(--duration-fast) var(--ease-out),
  opacity var(--duration-fast) var(--ease-out);
}

.lottery__tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lottery__tab--active {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--bg-secondary) 88%, transparent);
  box-shadow: var(--shadow-sm);
}

[data-theme="dark"] .lottery__tab--active {
  background: color-mix(in srgb, #fff 8%, var(--surface-solid));
}

.lottery__ui {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lottery__option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
  padding-right: 2px;
}

.lottery__option-row,
.lottery__add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.lottery__option-index {
  flex-shrink: 0;
  width: 24px;
  text-align: center;
  font-size: 12px;
  font-weight: 650;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.lottery__option-input {
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
  transition: border-color var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-fast) var(--ease-out),
  background-color var(--duration-fast) var(--ease-out);
  box-sizing: border-box;
}

.lottery__option-input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.lottery__option-input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.lottery__option-input--draft {
  margin-left: 32px;
}

.lottery__option-remove {
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
  transition: background-color var(--duration-hover) var(--ease-hover),
  border-color var(--duration-hover) var(--ease-hover),
  color var(--duration-hover) var(--ease-hover),
  opacity var(--duration-fast) var(--ease-out);
}

.lottery__option-remove svg {
  width: 14px;
  height: 14px;
}

.lottery__option-remove:hover:not(:disabled) {
  color: #ef4444;
  border-color: color-mix(in srgb, #ef4444 28%, var(--surface-border-strong));
  background: color-mix(in srgb, #ef4444 8%, var(--surface-solid));
}

.lottery__option-remove:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lottery__text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lottery__textarea {
  width: 100%;
  min-height: 180px;
  padding: 12px 14px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-primary);
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.55;
  outline: none;
  resize: vertical;
  transition: border-color var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-fast) var(--ease-out),
  background-color var(--duration-fast) var(--ease-out);
  box-sizing: border-box;
}

.lottery__textarea:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.lottery__textarea:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.lottery__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.lottery__btn {
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

.lottery__btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.lottery__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.lottery__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.lottery__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.lottery__btn--soft {
  padding: 9px 14px;
  height: 40px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.lottery__btn--ghost {
  padding: 6px 12px;
  font-size: 12px;
}

.lottery__error {
  margin: 0;
  font-size: 13px;
  color: #ef4444;
}

.lottery__reel-wrap {
  position: relative;
  width: 100%;
  height: v-bind(ITEM_HEIGHT+ 'px');
}

.lottery__reel-viewport {
  position: relative;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}

.lottery__reel-track {
  will-change: transform, filter;
  transform: translate3d(0, 0, 0);
}

.lottery__reel-item {
  height: v-bind(ITEM_HEIGHT+ 'px');
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  box-sizing: border-box;
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--text-primary);
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.lottery__reel-wrap--winner .lottery__reel-item {
  color: var(--color-primary);
  animation: lottery-settle 480ms var(--ease-out-spring);
}

.lottery__reel-fade {
  position: absolute;
  left: 0;
  right: 0;
  height: 22px;
  pointer-events: none;
  z-index: 2;
}

.lottery__reel-fade--top {
  top: 0;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--bg-secondary) 88%, transparent),
    transparent
  );
}

.lottery__reel-fade--bottom {
  bottom: 0;
  background: linear-gradient(
    0deg,
    color-mix(in srgb, var(--bg-secondary) 88%, transparent),
    transparent
  );
}

.lottery__reel-line {
  position: absolute;
  left: 8%;
  right: 8%;
  height: 1px;
  pointer-events: none;
  z-index: 3;
  background: color-mix(in srgb, var(--color-primary) 35%, transparent);
  opacity: 0;
  transition: opacity var(--duration-ui) var(--ease-out);
}

.lottery__reel-wrap--spinning .lottery__reel-line,
.lottery__reel-wrap--winner .lottery__reel-line {
  opacity: 1;
}

.lottery__reel-line--top {
  top: 0;
}

.lottery__reel-line--bottom {
  bottom: 0;
}

.lottery__result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
}

.lottery__history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lottery__chip {
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

@keyframes lottery-settle {
  0% {
    transform: scale(0.94);
    opacity: 0.75;
  }
  55% {
    transform: scale(1.04);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .lottery__option-input--draft {
    margin-left: 0;
  }

  .lottery__add-row {
    flex-wrap: wrap;
  }

  .lottery__add-row .lottery__option-input--draft {
    flex: 1 1 100%;
  }
}
</style>
