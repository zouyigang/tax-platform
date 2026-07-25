<script setup lang="ts">
/**
 * 筛选栏容器(对应设计系统「筛选栏」)
 * 默认插槽:字段行(FilterField 若干 + 操作按钮)
 * chips 插槽:下方以分隔线隔开的快捷筛选芯片行,可选
 */
</script>

<template>
  <div class="filter-bar">
    <div class="filter-bar__fields">
      <slot />
    </div>
    <div v-if="$slots.chips" class="filter-bar__chips">
      <slot name="chips" />
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.filter-bar__fields {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  flex-wrap: wrap;
}
.filter-bar__chips {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
  border-top: 1px solid var(--color-neutral-200);
  padding-top: 12px;
}
</style>
