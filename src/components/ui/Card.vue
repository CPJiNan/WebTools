<script lang="ts" setup>
interface Props {
  hover?: boolean
  clickable?: boolean
}

withDefaults(defineProps<Props>(), {
  hover: false,
  clickable: false,
})
</script>

<template>
  <div
    :class="{
      'card--hover': hover || clickable,
      'card--clickable': clickable,
    }"
    class="card glass"
  >
    <slot/>
  </div>
</template>

<style scoped>
.card {
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transition: transform var(--duration-hover) var(--ease-out),
  border-color var(--duration-hover) var(--ease-hover),
  background-color var(--duration-hover) var(--ease-hover),
  box-shadow var(--duration-hover) var(--ease-hover);
  overflow: hidden;
}

[data-theme="dark"] .card {
  box-shadow: var(--shadow-md), inset 0 0.5px 0 rgba(255, 255, 255, 0.06);
}

@media (hover: hover) and (pointer: fine) {
  .card--hover:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl), var(--shadow-glow);
    border-color: color-mix(in srgb, var(--color-primary) 28%, var(--surface-border));
    background: var(--surface-elevated);
  }
}

.card--clickable {
  cursor: pointer;
}

.card--clickable:active {
  transform: scale(0.97) translateY(0);
  transition: transform 80ms var(--ease-out);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
</style>
