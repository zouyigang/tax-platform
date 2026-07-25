<script setup lang="ts">
/** 复选框 · 自绘(无 UI 库),支持半选态 */
defineProps<{
  /** 是否选中 */
  modelValue: boolean
  /** 半选(部分选中) */
  indeterminate?: boolean
}>()

defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>

<template>
  <span
    class="checkbox"
    :class="{ 'checkbox--on': modelValue || indeterminate }"
    role="checkbox"
    :aria-checked="indeterminate ? 'mixed' : modelValue"
    @click.stop="$emit('update:modelValue', !modelValue)"
  >
    <span v-if="modelValue && !indeterminate" class="checkbox__mark">✓</span>
    <span v-else-if="indeterminate" class="checkbox__dash"></span>
  </span>
</template>

<style scoped>
.checkbox {
  width: 15px;
  height: 15px;
  flex: none;
  border: 1px solid var(--color-neutral-400);
  background: var(--color-panel);
  border-radius: var(--radius-control);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-inverse);
  font-size: var(--fs-micro);
  line-height: 1;
  cursor: pointer;
  transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease;
}
.checkbox--on {
  border-color: var(--color-primary);
  background: var(--color-primary);
}
.checkbox__dash {
  width: 7px;
  height: 2px;
  background: var(--color-text-inverse);
}
</style>
