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
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease,
  box-shadow 0.2s ease,
  border-color 0.2s ease;
  overflow: hidden;
}

.card--hover:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary);
}

.card--clickable {
  cursor: pointer;
}
</style>
