<script lang="ts" setup>
import {computed, ref} from 'vue'
import {useToast} from '@/stores/toast'

const toast = useToast()

const minInput = ref('1')
const maxInput = ref('100')
const countInput = ref('1')
const unique = ref(false)
const results = ref<number[]>([])
const errorMessage = ref<string | null>(null)

const hasResults = computed(() => results.value.length > 0)
const resultText = computed(() => results.value.join(', '))

function parseInteger(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null
  return n
}

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return Math.floor(Math.random() * (hi - lo + 1)) + lo
}

function generate() {
  errorMessage.value = null

  const min = parseInteger(minInput.value)
  const max = parseInteger(maxInput.value)
  const count = parseInteger(countInput.value)

  if (min === null || max === null) {
    errorMessage.value = '最小值和最大值必须是整数'
    results.value = []
    return
  }

  if (count === null || count < 1) {
    errorMessage.value = '生成数量必须是大于 0 的整数'
    results.value = []
    return
  }

  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const rangeSize = hi - lo + 1

  if (unique.value && count > rangeSize) {
    errorMessage.value = `生成数量不能超过范围大小（${count}/${rangeSize}）`
    results.value = []
    return
  }

  minInput.value = String(lo)
  maxInput.value = String(hi)

  if (unique.value) {
    const pool = Array.from({length: rangeSize}, (_, i) => lo + i)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    results.value = pool.slice(0, count)
    return
  }

  const next: number[] = []
  for (let i = 0; i < count; i++) {
    next.push(randomInt(lo, hi))
  }
  results.value = next
}

function copyResult() {
  if (!hasResults.value) return
  navigator.clipboard.writeText(resultText.value)
  toast.success('复制成功')
}

function clearResult() {
  results.value = []
  errorMessage.value = null
}
</script>

<template>
  <div class="random-number">
    <div class="random-number__panel">
      <div class="random-number__fields">
        <label class="random-number__field">
          <span class="random-number__label">最小值</span>
          <input
            v-model="minInput"
            class="random-number__input"
            inputmode="numeric"
            placeholder="1"
            type="text"
            @keydown.enter="generate"
          />
        </label>

        <label class="random-number__field">
          <span class="random-number__label">最大值</span>
          <input
            v-model="maxInput"
            class="random-number__input"
            inputmode="numeric"
            placeholder="100"
            type="text"
            @keydown.enter="generate"
          />
        </label>

        <label class="random-number__field">
          <span class="random-number__label">生成数量</span>
          <input
            v-model="countInput"
            class="random-number__input"
            inputmode="numeric"
            placeholder="1"
            type="text"
            @keydown.enter="generate"
          />
        </label>
      </div>

      <label class="random-number__checkbox">
        <input v-model="unique" type="checkbox"/>
        <span>去重</span>
      </label>

      <div class="random-number__actions">
        <button class="random-number__btn random-number__btn--primary pressable" type="button" @click="generate">
          生成
        </button>
        <button
          :disabled="!hasResults"
          class="random-number__btn pressable"
          type="button"
          @click="clearResult"
        >
          清空
        </button>
      </div>

      <p v-if="errorMessage" class="random-number__error">{{ errorMessage }}</p>
    </div>

    <div v-if="hasResults" class="random-number__result-panel">
      <div class="random-number__result-head">
        <span class="random-number__result-title">生成结果</span>
        <button
          class="random-number__btn random-number__btn--ghost pressable"
          type="button"
          @click="copyResult"
        >
          复制
        </button>
      </div>

      <div class="random-number__result">
        <div v-if="results.length === 1" class="random-number__result-single">
          {{ results[0] }}
        </div>
        <div v-else class="random-number__result-list">
          <span
            v-for="(n, index) in results"
            :key="`${n}-${index}`"
            class="random-number__chip"
          >
            {{ n }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.random-number {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.random-number__panel,
.random-number__result-panel {
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

[data-theme="dark"] .random-number__panel,
[data-theme="dark"] .random-number__result-panel {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.random-number__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.random-number__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.random-number__label {
  font-size: 11px;
  font-weight: 650;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.random-number__input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  color: var(--text-primary);
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-fast) var(--ease-out),
  background-color var(--duration-fast) var(--ease-out);
  box-sizing: border-box;
}

.random-number__input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.random-number__checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  user-select: none;
  width: fit-content;
  cursor: pointer;
}

.random-number__checkbox input {
  width: 15px;
  height: 15px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.random-number__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.random-number__btn {
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

.random-number__btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.random-number__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.random-number__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.random-number__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.random-number__btn--ghost {
  padding: 6px 12px;
  font-size: 12px;
}

.random-number__error {
  margin: 0;
  font-size: 13px;
  color: #ef4444;
}

.random-number__result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.random-number__result-title {
  font-size: 13px;
  font-weight: 650;
  color: var(--text-secondary);
  letter-spacing: -0.01em;
}

.random-number__result {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.random-number__result-single {
  font-size: clamp(2.5rem, 8vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.1;
  word-break: break-all;
}

.random-number__result-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.random-number__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: -0.01em;
}

@media (max-width: 640px) {
  .random-number__fields {
    grid-template-columns: 1fr;
  }
}
</style>
