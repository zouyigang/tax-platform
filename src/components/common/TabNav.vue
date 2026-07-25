<script setup lang="ts">
/** 标签页导航 · 下划线式,当前项主色 */
import type { FilterOption } from '@/api/types'

withDefaults(
  defineProps<{
    modelValue: string
    tabs: FilterOption[]
    /** lg 页面级标签(档案六大类) / sm 抽屉内标签 */
    size?: 'lg' | 'sm'
  }>(),
  { size: 'lg' },
)

defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <div class="tabs" :class="`tabs--${size}`">
    <div
      v-for="t in tabs"
      :key="t.value"
      class="tabs__item"
      :class="{ 'tabs__item--on': t.value === modelValue }"
      @click="$emit('update:modelValue', t.value)"
    >
      {{ t.label }}
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  border-bottom: var(--border-line);
}
.tabs--lg {
  padding: 0 var(--space-2);
}
.tabs__item {
  cursor: pointer;
  white-space: nowrap;
  color: var(--color-text-sub);
  font-weight: var(--fw-regular);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--motion-fast) ease;
}
.tabs--lg .tabs__item {
  padding: 13px 20px;
  font-size: var(--fs-body);
}
.tabs--sm .tabs__item {
  padding: var(--space-2) var(--space-4);
  font-size: var(--fs-aux);
}
.tabs__item:hover {
  color: var(--color-primary);
}
.tabs__item--on,
.tabs__item--on:hover {
  color: var(--color-primary);
  font-weight: var(--fw-semibold);
  border-bottom-color: var(--color-primary);
}
</style>
