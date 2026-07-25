<script setup lang="ts">
/** 文本输入框 · 自绘,视觉对齐设计稿的输入控件 */
withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    /** 等宽数字显示(金额、识别号) */
    numeric?: boolean
    /** 控件宽度,如 '220px' */
    width?: string
  }>(),
  { placeholder: '', numeric: false, width: '' },
)

defineEmits<{ (e: 'update:modelValue', v: string): void; (e: 'enter'): void }>()
</script>

<template>
  <input
    class="input"
    :class="{ num: numeric }"
    :style="width ? { width } : undefined"
    :value="modelValue"
    :placeholder="placeholder"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    @keyup.enter="$emit('enter')"
  />
</template>

<style scoped>
.input {
  height: 32px;
  padding: 0 10px;
  border: var(--border-line);
  border-radius: var(--radius-control);
  font-size: var(--fs-aux);
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-panel);
  outline: none;
  transition: border-color var(--motion-fast) ease;
}
.input::placeholder {
  color: var(--color-neutral-500);
}
.input:focus {
  border-color: var(--color-primary);
}
</style>
