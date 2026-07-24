<script lang="ts" setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {useToast} from '@/stores/toast'
import {ASCII_FONTS, type AsciiFontName, ensureFont, LAYOUT_OPTIONS, type LayoutMethod,} from './fonts'

const toast = useToast()

const text = ref('WebTools')
const font = ref<AsciiFontName>('Standard')
const charWidth = ref(8)
const charHeight = ref(12)
const lineWidthInput = ref('')
const horizontalLayout = ref<LayoutMethod>('default')
const verticalLayout = ref<LayoutMethod>('default')
const whitespaceBreak = ref(true)

const output = ref('')
const errorMessage = ref<string | null>(null)
const isGenerating = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let generateSeq = 0

const hasOutput = computed(() => output.value.length > 0)

const previewStyle = computed(() => ({
  fontSize: `${charHeight.value}px`,
  lineHeight: '1',
  letterSpacing: `${Math.max(charWidth.value - charHeight.value * 0.6, -2)}px`,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
}))

function parseOptionalPositiveInt(raw: string): number | null | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null
  return n
}

function clampNumber(raw: number, min: number, max: number): number {
  if (!Number.isFinite(raw)) return min
  return Math.min(max, Math.max(min, Math.round(raw)))
}

async function generate() {
  const seq = ++generateSeq
  errorMessage.value = null

  const content = text.value
  if (!content.trim()) {
    output.value = ''
    return
  }

  const width = parseOptionalPositiveInt(lineWidthInput.value)
  if (width === null) {
    errorMessage.value = '行宽必须是大于 0 的整数，或留空'
    return
  }

  charWidth.value = clampNumber(charWidth.value, 4, 32)
  charHeight.value = clampNumber(charHeight.value, 6, 36)

  isGenerating.value = true

  try {
    await ensureFont(font.value)
    if (seq !== generateSeq) return

    const figlet = (await import('figlet')).default
    const options: {
      font: string
      horizontalLayout: LayoutMethod
      verticalLayout: LayoutMethod
      width?: number
      whitespaceBreak?: boolean
    } = {
      font: font.value,
      horizontalLayout: horizontalLayout.value,
      verticalLayout: verticalLayout.value,
    }

    if (width !== undefined) {
      options.width = width
      options.whitespaceBreak = whitespaceBreak.value
    }

    const result = await figlet.text(content, options)
    if (seq !== generateSeq) return
    output.value = result
  } catch (err) {
    if (seq !== generateSeq) return
    output.value = ''
    errorMessage.value = err instanceof Error ? err.message : '生成失败'
  } finally {
    if (seq === generateSeq) {
      isGenerating.value = false
    }
  }
}

function scheduleGenerate() {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void generate()
  }, 180)
}

function copyOutput() {
  if (!hasOutput.value) return
  navigator.clipboard.writeText(output.value)
  toast.success('复制成功')
}

function downloadOutput() {
  if (!hasOutput.value) return
  const blob = new Blob([output.value], {type: 'text/plain;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ascii-art.txt'
  a.click()
  URL.revokeObjectURL(url)
  toast.success('已下载')
}

function clearAll() {
  text.value = ''
  output.value = ''
  errorMessage.value = null
}

watch(
  [
    text,
    font,
    lineWidthInput,
    horizontalLayout,
    verticalLayout,
    whitespaceBreak,
  ],
  scheduleGenerate,
  {immediate: true},
)

onBeforeUnmount(() => {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
  }
  generateSeq += 1
})
</script>

<template>
  <div class="ascii-art">
    <div class="ascii-art__panel">
      <label class="ascii-art__field ascii-art__field--full">
        <span class="ascii-art__label">文本内容</span>
        <textarea
          v-model="text"
          class="ascii-art__textarea"
          placeholder="输入要转换的文字…"
          rows="3"
          spellcheck="false"
        />
      </label>

      <div class="ascii-art__fields">
        <label class="ascii-art__field">
          <span class="ascii-art__label">字体</span>
          <select v-model="font" class="ascii-art__select">
            <option v-for="name in ASCII_FONTS" :key="name" :value="name">
              {{ name }}
            </option>
          </select>
        </label>

        <label class="ascii-art__field">
          <span class="ascii-art__label">字符宽度</span>
          <input
            v-model.number="charWidth"
            class="ascii-art__input"
            max="32"
            min="4"
            step="1"
            type="number"
          />
        </label>

        <label class="ascii-art__field">
          <span class="ascii-art__label">字符高度</span>
          <input
            v-model.number="charHeight"
            class="ascii-art__input"
            max="36"
            min="6"
            step="1"
            type="number"
          />
        </label>

        <label class="ascii-art__field">
          <span class="ascii-art__label">行宽</span>
          <input
            v-model="lineWidthInput"
            class="ascii-art__input"
            inputmode="numeric"
            placeholder="可选"
            type="text"
          />
        </label>

        <label class="ascii-art__field">
          <span class="ascii-art__label">水平格式化</span>
          <select v-model="horizontalLayout" class="ascii-art__select">
            <option
              v-for="item in LAYOUT_OPTIONS"
              :key="`h-${item.value}`"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="ascii-art__field">
          <span class="ascii-art__label">垂直格式化</span>
          <select v-model="verticalLayout" class="ascii-art__select">
            <option
              v-for="item in LAYOUT_OPTIONS"
              :key="`v-${item.value}`"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </label>
      </div>

      <label
        v-if="lineWidthInput.trim()"
        class="ascii-art__checkbox"
      >
        <input v-model="whitespaceBreak" type="checkbox"/>
        <span>优先在空白处换行</span>
      </label>

      <div class="ascii-art__actions">
        <button
          :disabled="isGenerating"
          class="ascii-art__btn ascii-art__btn--primary pressable"
          type="button"
          @click="generate"
        >
          生成
        </button>
        <button
          :disabled="!text && !hasOutput"
          class="ascii-art__btn pressable"
          type="button"
          @click="clearAll"
        >
          清空
        </button>
      </div>

      <p v-if="errorMessage" class="ascii-art__error">{{ errorMessage }}</p>
    </div>

    <div v-if="hasOutput || isGenerating" class="ascii-art__result-panel">
      <div class="ascii-art__result-head">
        <span class="ascii-art__result-title">生成结果</span>
        <div class="ascii-art__result-actions">
          <button
            :disabled="!hasOutput"
            class="ascii-art__btn ascii-art__btn--ghost pressable"
            type="button"
            @click="copyOutput"
          >
            复制
          </button>
          <button
            :disabled="!hasOutput"
            class="ascii-art__btn ascii-art__btn--ghost pressable"
            type="button"
            @click="downloadOutput"
          >
            下载
          </button>
        </div>
      </div>

      <div class="ascii-art__preview-wrap">
        <pre
          v-if="hasOutput"
          :style="previewStyle"
          class="ascii-art__preview"
        >{{ output }}</pre>
        <p v-else class="ascii-art__preview-placeholder">正在生成…</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ascii-art {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.ascii-art__panel,
.ascii-art__result-panel {
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

[data-theme="dark"] .ascii-art__panel,
[data-theme="dark"] .ascii-art__result-panel {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.ascii-art__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.ascii-art__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.ascii-art__field--full {
  width: 100%;
}

.ascii-art__label {
  font-size: 11px;
  font-weight: 650;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.ascii-art__input,
.ascii-art__select,
.ascii-art__textarea {
  width: 100%;
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

.ascii-art__input,
.ascii-art__select {
  height: 40px;
  padding: 0 12px;
}

.ascii-art__textarea {
  min-height: 88px;
  padding: 10px 12px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.5;
}

.ascii-art__select {
  cursor: pointer;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--text-muted) 50%),
  linear-gradient(135deg, var(--text-muted) 50%, transparent 50%);
  background-position: calc(100% - 16px) calc(50% - 2px), calc(100% - 11px) calc(50% - 2px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  padding-right: 28px;
}

.ascii-art__input:focus,
.ascii-art__select:focus,
.ascii-art__textarea:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.ascii-art__checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  user-select: none;
  width: fit-content;
  cursor: pointer;
}

.ascii-art__checkbox input {
  width: 15px;
  height: 15px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.ascii-art__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.ascii-art__btn {
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

.ascii-art__btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.ascii-art__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ascii-art__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.ascii-art__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent),
  inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.ascii-art__btn--ghost {
  padding: 6px 12px;
  font-size: 12px;
}

.ascii-art__error {
  margin: 0;
  font-size: 13px;
  color: #ef4444;
}

.ascii-art__result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ascii-art__result-title {
  font-size: 13px;
  font-weight: 650;
  color: var(--text-secondary);
  letter-spacing: -0.01em;
}

.ascii-art__result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ascii-art__preview-wrap {
  overflow: auto;
  max-height: min(60vh, 520px);
  padding: 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border-strong);
  background: color-mix(in srgb, var(--bg-secondary) 78%, transparent);
}

.ascii-art__preview {
  margin: 0;
  color: var(--text-primary);
  white-space: pre;
  tab-size: 4;
  overflow: visible;
  min-width: max-content;
}

.ascii-art__preview-placeholder {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .ascii-art__fields {
    grid-template-columns: 1fr;
  }
}
</style>
