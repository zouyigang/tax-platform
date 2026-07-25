<script setup lang="ts">
/**
 * 单选组 · 自绘(无 UI 库)
 * 用于核查结论(三选一)、误报原因(七类)等场景。
 */
import type { FilterOption } from '@/api/types'

withDefaults(
  defineProps<{
    modelValue: string
    options: FilterOption[]
    /** 排列方向:行内 / 竖排 */
    direction?: 'row' | 'column'
    /** 是否禁用整组 */
    disabled?: boolean
  }>(),
  { direction: 'row', disabled: false },
)

defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <div class="radio-group" :class="[`radio-group--${direction}`, { 'radio-group--disabled': disabled }]">
    <label
      v-for="o in options"
      :key="o.value"
      class="radio"
      :class="{ 'radio--on': o.value === modelValue }"
    >
      <input
        class="radio__input"
        type="radio"
        :value="o.value"
        :checked="o.value === modelValue"
        :disabled="disabled"
        @change="$emit('update:modelValue', o.value)"
      />
      <span class="radio__dot"></span>
      <span class="radio__label">{{ o.label }}</span>
    </label>
  </div>
</template>

<style scoped>
.radio-group {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.radio-group--column {
  flex-direction: column;
  gap: var(--space-2);
}
.radio-group--disabled {
  opacity: 0.5;
  pointer-events: none;
}
.radio {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--fs-aux);
  color: var(--color-neutral-800);
}
.radio__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.radio__dot {
  width: 15px;
  height: 15px;
  flex: none;
  border-radius: 50%;
  border: 1px solid var(--color-neutral-400);
  background: var(--color-panel);
  transition: border-color var(--motion-fast) ease;
  position: relative;
}
.radio--on .radio__dot {
  border-color: var(--color-primary);
}
.radio--on .radio__dot::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary);
}
.radio--on .radio__label {
  color: var(--color-neutral-900);
}
</style>
