<script setup lang="ts">
/** 筛选项 · 标签 + 控件 */
defineProps<{ label: string }>()
</script>

<template>
  <div class="field">
    <label class="field__label">{{ label }}</label>
    <div class="field__control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.field__label {
  display: block;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-bottom: 5px;
}
.field__control {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
</style>
