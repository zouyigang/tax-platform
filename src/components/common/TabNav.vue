<script setup lang="ts">
/** 标签页导航 · 下划线式,当前项主色 */
import type { FilterOption } from '@/api/types'

withDefaults(
  defineProps<{
    modelValue: string
    tabs: FilterOption[]
    /** lg 页面级标签(档案六大类) / sm 抽屉内标签 */
    size?: 'lg' | 'sm'
    /**
     * 各标签后的数量徽章,键为 tab 的 value;不传则不显示。
     * 用于「分档标签带户数」这类场景,不影响未传该属性的既有调用。
     */
    counts?: Record<string, number>
    /** 各标签下方的补充说明,键为 tab 的 value;不传则不显示 */
    notes?: Record<string, string>
  }>(),
  { size: 'lg', counts: undefined, notes: undefined },
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
      <span class="tabs__line">
        {{ t.label }}
        <span v-if="counts && counts[t.value] !== undefined" class="tabs__badge num">{{ counts[t.value] }}</span>
      </span>
      <span v-if="notes && notes[t.value]" class="tabs__note">{{ notes[t.value] }}</span>
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

/* 数量徽章与补充说明:仅在传入 counts / notes 时出现 */
.tabs__line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tabs__badge {
  font-size: var(--fs-micro);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-600);
  background: var(--color-neutral-100);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-control);
  padding: 0 6px;
}
.tabs__item--on .tabs__badge {
  color: var(--color-text-inverse);
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.tabs__note {
  display: block;
  font-size: var(--fs-micro);
  font-weight: var(--fw-regular);
  color: var(--color-neutral-500);
  margin-top: 2px;
}
</style>
