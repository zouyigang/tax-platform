<script setup lang="ts">
/** 带标题的面板卡 · 分析类页面通用容器(标题 + 可选副标题 + 右侧操作 + 内容) */
defineProps<{
  title: string
  /** 副标题(如单位说明) */
  subtitle?: string
}>()
</script>

<template>
  <section class="panel-card">
    <div class="panel-card__head">
      <span class="panel-card__title">{{ title }}</span>
      <span v-if="subtitle" class="panel-card__sub">{{ subtitle }}</span>
      <div class="panel-card__actions"><slot name="actions" /></div>
    </div>
    <div class="panel-card__body"><slot /></div>
  </section>
</template>

<style scoped>
.panel-card {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.panel-card__head {
  flex: none;
  height: 46px;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: 0 18px;
  border-bottom: var(--border-line);
}
.panel-card__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  align-self: center;
}
.panel-card__sub {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  align-self: center;
}
.panel-card__actions {
  margin-left: auto;
  align-self: center;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.panel-card__body {
  flex: 1;
  min-height: 0;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
}
</style>
