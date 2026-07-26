<script lang="ts" setup>
import {computed, ref} from 'vue'

interface Option {
  id: number
  label: string
  color: string
  weight: number
}

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f43f5e', '#14b8a6', '#6366f1', '#d946ef',
]

let nextId = 5
const options = ref<Option[]>([
  {id: 1, label: '选项 A', color: PALETTE[0], weight: 1},
  {id: 2, label: '选项 B', color: PALETTE[1], weight: 1},
  {id: 3, label: '选项 C', color: PALETTE[2], weight: 1},
  {id: 4, label: '选项 D', color: PALETTE[3], weight: 1},
])

const spinning = ref(false)
const wheelRotation = ref(0)
const result = ref<string | null>(null)
const resultColor = ref('')
const history = ref<Array<{label: string; color: string}>>([])
const showResultPanel = ref(false)
const speakEnabled = ref(true)
const errorMessage = ref('')
const showWeights = ref(false)

const hasOptions = computed(() => options.value.length >= 2)

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
      id: opt.id,
      path,
      color: opt.color,
      tx: cx + textRadius * Math.cos(midAngle),
      ty: cy + textRadius * Math.sin(midAngle),
      rotation: midAngle * (180 / Math.PI) + 90,
    }
  })
})

function addOption() {
  if (options.value.length >= 24) { errorMessage.value = '最多支持 24 个选项'; return }
  const idx = options.value.length % PALETTE.length
  options.value.push({id: nextId++, label: '', color: PALETTE[idx], weight: 1})
  errorMessage.value = ''
}

function removeOption(id: number) {
  if (options.value.length <= 2) { errorMessage.value = '至少需要 2 个选项'; return }
  options.value = options.value.filter((o) => o.id !== id)
  errorMessage.value = ''
}

function updateLabel(id: number, value: string) {
  const opt = options.value.find((o) => o.id === id)
  if (opt) opt.label = value
}

function cycleColor(id: number) {
  const opt = options.value.find((o) => o.id === id)
  if (opt) opt.color = PALETTE[(PALETTE.indexOf(opt.color) + 1) % PALETTE.length]
}

function updateWeight(id: number, value: string) {
  const opt = options.value.find((o) => o.id === id)
  if (!opt) return
  const n = parseInt(value, 10)
  opt.weight = Number.isFinite(n) && n >= 1 ? n : 1
}

function spin() {
  const labels = options.value.map((o) => o.label.trim()).filter(Boolean)
  if (labels.length < 2) { errorMessage.value = '至少需要 2 个有效选项'; return }
  if (spinning.value) return

  // 加权随机确定赢家
  const totalW = options.value.reduce((s, o) => s + Math.max(1, o.weight), 0)
  const rand = Math.random() * totalW
  let acc = 0
  let index = 0
  for (let i = 0; i < options.value.length; i++) {
    acc += Math.max(1, options.value[i].weight)
    if (rand < acc) { index = i; break }
  }

  spinning.value = true
  result.value = null
  showResultPanel.value = true

  // 计算旋转角度使指针精确指向赢家扇区
  const segAngle = 360 / options.value.length
  const winCenter = 360 - (index + 0.5) * segAngle
  const extraRounds = (5 + Math.floor(Math.random() * 6)) * 360
  const targetRotation = extraRounds + winCenter
  wheelRotation.value = targetRotation

  setTimeout(() => {
    spinning.value = false
    const winner = options.value[index]
    const label = winner.label.trim() || '(空)'
    result.value = label
    resultColor.value = winner.color
    history.value = [{label, color: winner.color}, ...history.value].slice(0, 12)

    if (speakEnabled.value) {
      const u = new SpeechSynthesisUtterance(label)
      u.lang = 'zh-CN'; u.rate = 0.9
      speechSynthesis.speak(u)
    }
    wheelRotation.value = targetRotation % 360
  }, 4200)
}

function clearHistory() { history.value = [] }
</script>

<template>
  <div class="spin-wheel">
    <!-- 选项编辑 -->
    <div class="spin-wheel__panel">
      <span class="spin-wheel__section-title">转盘选项</span>
      <div class="spin-wheel__option-list">
        <div v-for="(opt, index) in options" :key="opt.id" class="spin-wheel__option-row">
          <span class="spin-wheel__option-index">{{ index + 1 }}</span>
          <button class="spin-wheel__color-badge pressable" :style="{ background: opt.color }"
            type="button" @click="cycleColor(opt.id)"
            :title="'当前颜色: ' + opt.color + ' — 点击切换'" />
          <input :disabled="spinning" :value="opt.label"
            class="spin-wheel__option-input" placeholder="名称" spellcheck="false" type="text"
            @input="updateLabel(opt.id, ($event.target as HTMLInputElement).value)" />
          <button :disabled="spinning || options.length <= 2"
            class="spin-wheel__option-remove pressable" title="删除" type="button"
            @click="removeOption(opt.id)">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="spin-wheel__actions">
        <button :disabled="spinning" class="spin-wheel__add-btn pressable" type="button" @click="addOption">添加选项</button>
        <button class="spin-wheel__weight-btn pressable" type="button" @click="showWeights = true">权重设置</button>
      </div>
      <label class="spin-wheel__speak-toggle">
        <input v-model="speakEnabled" type="checkbox" />
        <span>语音播报结果</span>
      </label>
      <p v-if="errorMessage" class="spin-wheel__error">{{ errorMessage }}</p>
    </div>

    <!-- 转盘 -->
    <div class="spin-wheel__display">
      <div class="spin-wheel__pointer">
        <svg viewBox="0 0 24 36" width="18" height="27">
          <polygon fill="var(--text-primary)" points="12,36 0,0 24,0"/>
        </svg>
      </div>
      <div class="spin-wheel__wheel-wrap">
        <svg :style="{ transform: 'rotate(' + wheelRotation + 'deg)', transition: spinning ? 'transform 4s cubic-bezier(0.15, 0.7, 0.1, 1)' : 'none' }"
          class="spin-wheel__wheel" viewBox="0 0 400 400">
          <circle cx="200" cy="200" fill="none" r="166" stroke="var(--surface-border-strong)" stroke-width="4"/>
          <g v-for="seg in segments" :key="seg.id">
            <path :d="seg.path" :fill="seg.color"/>
            <text fill="#fff" :font-size="options.length > 8 ? 11 : 13" font-weight="650" text-anchor="middle"
              :transform="'rotate(' + seg.rotation + ', ' + seg.tx + ', ' + seg.ty + ')'" :x="seg.tx" :y="seg.ty"
              dominant-baseline="middle" letter-spacing="-0.02em"
            >{{ options.find((o) => o.id === seg.id)?.label.slice(0, 5) || '?' }}</text>
          </g>
          <circle cx="200" cy="200" fill="var(--surface-solid)" r="24" stroke="var(--surface-border-strong)" stroke-width="3"/>
        </svg>
      </div>
      <button :disabled="!hasOptions || spinning" class="spin-wheel__spin-btn pressable" type="button" @click="spin">
        {{ spinning ? '旋转中...' : '开始旋转' }}
      </button>
    </div>

    <!-- 结果 -->
    <div v-if="showResultPanel" class="spin-wheel__result-panel">
      <span class="spin-wheel__section-title">抽奖结果</span>
      <div v-if="result" class="spin-wheel__result-value" :style="{ color: resultColor }">{{ result }}</div>
      <div v-else class="spin-wheel__result-placeholder">旋转中...</div>
    </div>

    <!-- 历史 -->
    <div v-if="history.length" class="spin-wheel__history-panel">
      <div class="spin-wheel__history-head">
        <span class="spin-wheel__section-title">历史记录</span>
        <button class="spin-wheel__ghost-btn pressable" type="button" @click="clearHistory">清空</button>
      </div>
      <div class="spin-wheel__history-list">
        <span v-for="(item, idx) in history" :key="idx" class="spin-wheel__chip"
          :style="{ borderColor: item.color, color: item.color }">{{ item.label }}</span>
      </div>
    </div>

    <!-- 权重弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showWeights" class="spin-wheel__modal-overlay" @click.self="showWeights = false">
          <div class="spin-wheel__modal glass-elevated">
            <div class="spin-wheel__modal-head">
              <span class="spin-wheel__modal-title">权重设置</span>
              <button class="spin-wheel__modal-close pressable" type="button" @click="showWeights = false">
                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <p class="spin-wheel__modal-desc">权重越高，抽中概率越大。所有权重之和不用等于特定值。</p>
            <div class="spin-wheel__modal-list">
              <div v-for="opt in options" :key="'w-' + opt.id" class="spin-wheel__modal-row">
                <span class="spin-wheel__modal-row-label" :style="{ color: opt.color }">{{ opt.label || '(空)' }}</span>
                <input class="spin-wheel__modal-input" type="number" min="1"
                  :value="opt.weight"
                  @change="updateWeight(opt.id, ($event.target as HTMLInputElement).value)" />
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.spin-wheel { display: flex; flex-direction: column; gap: 18px; width: 100%; }

.spin-wheel__panel, .spin-wheel__result-panel, .spin-wheel__history-panel {
  display: flex; flex-direction: column; gap: 16px;
  padding: 18px; border: 1px solid var(--surface-border-strong); border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%); -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.32);
}
[data-theme="dark"] .spin-wheel__panel, [data-theme="dark"] .spin-wheel__result-panel, [data-theme="dark"] .spin-wheel__history-panel {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.05);
}
.spin-wheel__section-title { font-size: 13px; font-weight: 650; color: var(--text-secondary); letter-spacing: -0.01em; }

.spin-wheel__option-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow: auto; padding-right: 2px; }
.spin-wheel__option-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.spin-wheel__option-index { flex-shrink: 0; width: 24px; text-align: center; font-size: 12px; font-weight: 650; color: var(--text-muted); font-variant-numeric: tabular-nums; }

.spin-wheel__color-badge {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: var(--radius-sm);
  border: 2px solid var(--surface-border-strong); cursor: pointer;
  transition: border-color var(--duration-hover) var(--ease-hover), transform var(--duration-hover) var(--ease-hover);
}
.spin-wheel__color-badge:hover { border-color: var(--text-primary); transform: scale(1.12); }

.spin-wheel__option-input {
  flex: 1; min-width: 0; height: 40px; padding: 0 12px;
  border: 1px solid var(--surface-border-strong); border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent); color: var(--text-primary);
  font-size: 14px; outline: none; box-sizing: border-box;
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out);
}
.spin-wheel__option-input:focus { border-color: color-mix(in srgb, var(--color-primary) 48%, transparent); box-shadow: var(--ring); background: var(--bg-secondary); }
.spin-wheel__option-input:disabled { opacity: 0.65; cursor: not-allowed; }

.spin-wheel__option-remove {
  flex-shrink: 0; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--surface-border-strong); border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent); color: var(--text-secondary); cursor: pointer;
  transition: background-color var(--duration-hover) var(--ease-hover), border-color var(--duration-hover) var(--ease-hover), color var(--duration-hover) var(--ease-hover), opacity var(--duration-fast) var(--ease-out);
}
.spin-wheel__option-remove svg { width: 14px; height: 14px; }
.spin-wheel__option-remove:hover:not(:disabled) { color: #ef4444; border-color: color-mix(in srgb, #ef4444 28%, var(--surface-border-strong)); background: color-mix(in srgb, #ef4444 8%, var(--surface-solid)); }
.spin-wheel__option-remove:disabled { opacity: 0.4; cursor: not-allowed; }

.spin-wheel__actions { display: flex; gap: 10px; flex-wrap: wrap; }

.spin-wheel__add-btn, .spin-wheel__weight-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 10px 16px; border-radius: var(--radius-full); font-size: 13px; font-weight: 550; letter-spacing: -0.01em;
  color: var(--text-primary); background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  border: 1px solid var(--surface-border-strong); cursor: pointer;
  transition: transform var(--duration-press) var(--ease-out), background-color var(--duration-hover) var(--ease-hover), border-color var(--duration-hover) var(--ease-hover), box-shadow var(--duration-hover) var(--ease-hover);
}
.spin-wheel__add-btn:hover:not(:disabled), .spin-wheel__weight-btn:hover { background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid)); border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong)); }
.spin-wheel__add-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.spin-wheel__speak-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); user-select: none; cursor: pointer; width: fit-content; }
.spin-wheel__speak-toggle input { width: 15px; height: 15px; accent-color: var(--color-primary); cursor: pointer; }

.spin-wheel__ghost-btn { padding: 6px 12px; border-radius: var(--radius-full); font-size: 12px; font-weight: 550; color: var(--text-secondary); background: color-mix(in srgb, var(--bg-secondary) 70%, transparent); border: 1px solid var(--surface-border-strong); cursor: pointer; transition: transform var(--duration-press) var(--ease-out), background-color var(--duration-hover) var(--ease-hover), border-color var(--duration-hover) var(--ease-hover); }

.spin-wheel__display {
  display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px 20px;
  border: 1px solid var(--surface-border-strong); border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  backdrop-filter: blur(14px) saturate(160%); -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.32);
}
[data-theme="dark"] .spin-wheel__display { box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.05); }
.spin-wheel__pointer { position: relative; z-index: 2; margin-bottom: -8px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)); }
.spin-wheel__wheel-wrap { width: min(320px, 72vw); aspect-ratio: 1; }
.spin-wheel__wheel { width: 100%; height: 100%; display: block; filter: drop-shadow(0 4px 16px rgba(0,0,0,0.12)); }
[data-theme="dark"] .spin-wheel__wheel { filter: drop-shadow(0 4px 16px rgba(0,0,0,0.4)); }

.spin-wheel__spin-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 12px 32px; border-radius: var(--radius-full); font-size: 15px; font-weight: 600; letter-spacing: -0.02em;
  color: #fff; background: var(--color-primary); border: none;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-primary) 35%, transparent), inset 0 1px 0 rgba(255,255,255,0.28);
  cursor: pointer; transition: transform var(--duration-press) var(--ease-out), background-color var(--duration-hover) var(--ease-hover), box-shadow var(--duration-hover) var(--ease-hover), opacity var(--duration-fast) var(--ease-out);
}
.spin-wheel__spin-btn:hover:not(:disabled) { background: var(--color-primary-hover); box-shadow: 0 12px 32px color-mix(in srgb, var(--color-primary) 42%, transparent), inset 0 1px 0 rgba(255,255,255,0.32); }
.spin-wheel__spin-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.spin-wheel__result-value { font-size: clamp(2rem, 8vw, 3rem); font-weight: 700; letter-spacing: -0.04em; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; line-height: 1.1; text-align: center; }
.spin-wheel__result-placeholder { font-size: 18px; color: var(--text-muted); text-align: center; }

.spin-wheel__history-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.spin-wheel__history-list { display: flex; flex-wrap: wrap; gap: 8px; }
.spin-wheel__chip {
  display: inline-flex; align-items: center; justify-content: center; min-width: 40px; max-width: 100%;
  padding: 6px 12px; border-radius: var(--radius-full); background: transparent; border: 1.5px solid;
  font-size: 13px; font-weight: 550; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.spin-wheel__error { margin: 0; font-size: 13px; color: #ef4444; }

/* ====== 权重弹窗 ====== */
.spin-wheel__modal-overlay {
  position: fixed; inset: 0; z-index: 10000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.32); backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
  padding: 24px;
}
.spin-wheel__modal {
  width: 100%; max-width: 380px; max-height: 70vh; display: flex; flex-direction: column;
  padding: 24px; border-radius: var(--radius-xl);
}
.spin-wheel__modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.spin-wheel__modal-title { font-size: 17px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em; }
.spin-wheel__modal-close { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-full); color: var(--text-secondary); border: 1px solid var(--surface-border-strong); transition: color var(--duration-hover) var(--ease-hover), background-color var(--duration-hover) var(--ease-hover); }
.spin-wheel__modal-close svg { width: 14px; height: 14px; }
.spin-wheel__modal-close:hover { color: var(--text-primary); background: color-mix(in srgb, var(--bg-tertiary) 60%, transparent); }
.spin-wheel__modal-desc { font-size: 13px; color: var(--text-muted); margin: 0 0 16px; line-height: 1.5; }
.spin-wheel__modal-list { display: flex; flex-direction: column; gap: 10px; overflow: auto; padding-right: 2px; }
.spin-wheel__modal-row { display: flex; align-items: center; gap: 12px; }
.spin-wheel__modal-row-label { flex: 1; font-size: 14px; font-weight: 550; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.spin-wheel__modal-input {
  width: 72px; height: 40px; padding: 0 10px; text-align: center;
  border: 1px solid var(--surface-border-strong); border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent); color: var(--text-primary);
  font-size: 15px; font-variant-numeric: tabular-nums; outline: none; box-sizing: border-box;
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.spin-wheel__modal-input:focus { border-color: color-mix(in srgb, var(--color-primary) 48%, transparent); box-shadow: var(--ring); background: var(--bg-secondary); }
.spin-wheel__modal-input::-webkit-inner-spin-button, .spin-wheel__modal-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

.modal-enter-active { transition: opacity var(--duration-sheet) var(--ease-out); }
.modal-leave-active { transition: opacity 180ms var(--ease-out); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .spin-wheel__modal { transition: transform var(--duration-sheet) var(--ease-out-spring); }
.modal-enter-from .spin-wheel__modal { transform: translateY(12px) scale(0.96); }
</style>
