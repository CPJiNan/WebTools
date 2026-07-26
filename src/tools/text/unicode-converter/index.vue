<script lang="ts" setup>
import {computed, ref} from 'vue'
import {useToast} from '@/stores/toast'

const toast = useToast()

const inputText = ref('')
const mode = ref<'char-to-unicode' | 'unicode-to-char'>('char-to-unicode')
const format = ref<'\\u' | 'U+' | '\\x' | 'decimal' | 'html'>('\\u')

const charToUnicodeResult = computed(() => {
  if (!inputText.value) return ''
  const chars = [...inputText.value]
  return chars.map(ch => {
    const code = ch.codePointAt(0)!
    switch (format.value) {
      case '\\u':
        return code > 0xFFFF
          ? `\\u{${code.toString(16).toUpperCase()}}`
          : `\\u${code.toString(16).toUpperCase().padStart(4, '0')}`
      case 'U+':
        return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`
      case '\\x':
        return code <= 0xFF
          ? `\\x${code.toString(16).toUpperCase().padStart(2, '0')}`
          : code > 0xFFFF
            ? `\\u{${code.toString(16).toUpperCase()}}`
            : `\\u${code.toString(16).toUpperCase().padStart(4, '0')}`
      case 'decimal':
        return `&#${code};`
      case 'html':
        return `&#x${code.toString(16).toUpperCase()};`
    }
  }).join(format.value === 'U+' || format.value === '\\x' ? ' ' : '')
})

const unicodeToCharResult = computed(() => {
  if (!inputText.value) return ''
  const raw = inputText.value.trim()

  const tokens: string[] = []
  let i = 0
  while (i < raw.length) {
    if (/\s/.test(raw[i])) {
      i++
      continue
    }

    if (raw.startsWith('\\u{', i)) {
      const end = raw.indexOf('}', i + 3)
      if (end !== -1) {
        tokens.push(raw.slice(i, end + 1))
        i = end + 1
        continue
      }
    }

    if (raw.startsWith('\\u', i)) {
      tokens.push(raw.slice(i, i + 6))
      i += 6
      continue
    }

    if (raw.startsWith('\\x', i)) {
      tokens.push(raw.slice(i, i + 4))
      i += 4
      continue
    }

    if (raw.startsWith('U+', i)) {
      const match = raw.slice(i + 2).match(/^[0-9a-fA-F]{1,6}/)
      if (match) {
        tokens.push(raw.slice(i, i + 2 + match[0].length))
        i += 2 + match[0].length
        continue
      }
    }

    if (raw.startsWith('&#x', i)) {
      const end = raw.indexOf(';', i + 3)
      if (end !== -1) {
        tokens.push(raw.slice(i, end + 1))
        i = end + 1
        continue
      }
    }

    if (raw.startsWith('&#', i)) {
      const end = raw.indexOf(';', i + 2)
      if (end !== -1) {
        tokens.push(raw.slice(i, end + 1))
        i = end + 1
        continue
      }
    }

    const rest = raw.slice(i)
    const m = rest.match(/^[0-9a-fA-F]+|^\d+/)
    if (m) {
      tokens.push(m[0])
      i += m[0].length
      continue
    }

    i++
  }

  const chars: string[] = []
  for (const token of tokens) {
    let code: number | null = null

    if (token.startsWith('\\u{') && token.endsWith('}')) {
      code = parseInt(token.slice(3, -1), 16)
    } else if (token.startsWith('\\u')) {
      code = parseInt(token.slice(2), 16)
    } else if (token.startsWith('U+')) {
      code = parseInt(token.slice(2), 16)
    } else if (token.startsWith('\\x')) {
      code = parseInt(token.slice(2), 16)
    } else if (token.startsWith('&#x') && token.endsWith(';')) {
      code = parseInt(token.slice(3, -1), 16)
    } else if (token.startsWith('&#') && token.endsWith(';')) {
      code = parseInt(token.slice(2, -1), 10)
    } else if (/^[0-9a-fA-F]{1,8}$/.test(token)) {
      code = parseInt(token, 16)
    } else if (/^\d+$/.test(token)) {
      code = parseInt(token, 10)
    }

    if (code !== null && Number.isFinite(code) && code >= 0 && code <= 0x10FFFF) {
      chars.push(String.fromCodePoint(code))
    }
  }
  return chars.join('')
})

const output = computed(() => {
  if (mode.value === 'char-to-unicode') return charToUnicodeResult.value
  return unicodeToCharResult.value
})

const hasOutput = computed(() => output.value.length > 0)

function copyOutput() {
  if (!hasOutput.value) return
  navigator.clipboard.writeText(output.value)
  toast.success('复制成功')
}

function clearAll() {
  inputText.value = ''
}

const modes = [
  {value: 'char-to-unicode' as const, label: '字符 → Unicode'},
  {value: 'unicode-to-char' as const, label: 'Unicode → 字符'},
]

const formats = [
  {value: '\\u' as const, label: '\\uXXXX'},
  {value: 'U+' as const, label: 'U+XXXX'},
  {value: '\\x' as const, label: '\\xXX'},
  {value: 'decimal' as const, label: '&#NNN'},
  {value: 'html' as const, label: '&#xXXXX'},
]

const inputPlaceholder = computed(() => {
  if (mode.value === 'char-to-unicode') return '输入要转换的文本...'
  return '输入要转换的 Unicode 编码...'
})

const showFormat = computed(() => mode.value === 'char-to-unicode')
</script>

<template>
  <div class="unicode-converter">
    <div class="unicode-converter__panel">
      <label class="unicode-converter__field unicode-converter__field--full">
        <span class="unicode-converter__input-head">
          <span class="unicode-converter__label">输入</span>
          <button
            :disabled="!inputText"
            class="unicode-converter__btn unicode-converter__btn--ghost pressable"
            type="button"
            @click="clearAll"
          >
            清空
          </button>
        </span>
        <textarea
          v-model="inputText"
          :placeholder="inputPlaceholder"
          class="unicode-converter__textarea"
          rows="4"
          spellcheck="false"
        />
      </label>

      <div v-if="hasOutput" class="unicode-converter__output">
        <div class="unicode-converter__output-head">
          <span class="unicode-converter__label">输出</span>
          <button
            :disabled="!hasOutput"
            class="unicode-converter__btn unicode-converter__btn--ghost pressable"
            type="button"
            @click="copyOutput"
          >
            复制
          </button>
        </div>
        <pre class="unicode-converter__preview">{{ output }}</pre>
      </div>

      <div class="unicode-converter__options">
        <label class="unicode-converter__field">
          <span class="unicode-converter__label">转换模式</span>
          <select v-model="mode" class="unicode-converter__select">
            <option v-for="m in modes" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
        </label>

        <label v-if="showFormat" class="unicode-converter__field">
          <span class="unicode-converter__label">编码格式</span>
          <select v-model="format" class="unicode-converter__select">
            <option v-for="f in formats" :key="f.value" :value="f.value">
              {{ f.label }}
            </option>
          </select>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unicode-converter {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.unicode-converter__panel {
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

[data-theme="dark"] .unicode-converter__panel {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.unicode-converter__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.unicode-converter__input-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.unicode-converter__field--full {
  width: 100%;
}

.unicode-converter__label {
  font-size: 11px;
  font-weight: 650;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.unicode-converter__textarea {
  width: 100%;
  min-height: 88px;
  padding: 10px 12px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.5;
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

.unicode-converter__textarea:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background: var(--bg-secondary);
}

.unicode-converter__output {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.unicode-converter__output-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.unicode-converter__preview {
  margin: 0;
  padding: 14px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.6;
  min-height: 60px;
  overflow: auto;
  max-height: min(60vh, 520px);
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border-strong);
  background: color-mix(in srgb, var(--bg-secondary) 78%, transparent);
}

.unicode-converter__options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unicode-converter__select {
  width: 100%;
  height: 40px;
  padding: 0 28px 0 12px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-sm);
  background-color: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  background-image: linear-gradient(45deg, transparent 50%, var(--text-muted) 50%),
  linear-gradient(135deg, var(--text-muted) 50%, transparent 50%);
  background-position: calc(100% - 16px) calc(50% - 2px), calc(100% - 11px) calc(50% - 2px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: border-color var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-fast) var(--ease-out),
  background-color var(--duration-fast) var(--ease-out);
  box-sizing: border-box;
}

.unicode-converter__select:focus {
  border-color: color-mix(in srgb, var(--color-primary) 48%, transparent);
  box-shadow: var(--ring);
  background-color: var(--bg-secondary);
}

.unicode-converter__btn {
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

.unicode-converter__btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.unicode-converter__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.unicode-converter__btn--ghost {
  padding: 6px 12px;
  font-size: 12px;
}
</style>
