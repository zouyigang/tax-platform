<script setup lang="ts">
/** 业务页顶栏 · 标题 + 面包屑 + 右侧操作区 */
defineProps<{
  title: string
  /** 面包屑文案,如「首页 / 风险管理 / 风险线索工作台」 */
  breadcrumb?: string
}>()
</script>

<template>
  <header class="page-header">
    <h1 class="page-header__title">{{ title }}</h1>
    <span v-if="breadcrumb" class="page-header__crumb">{{ breadcrumb }}</span>
    <div class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  /* 页面主标题字号(介于 h2 与 h3 之间) */
  --ph-title: 17px;
  height: 52px;
  flex: none;
  background: var(--color-panel);
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: var(--space-3);
}
.page-header__title {
  font-size: var(--ph-title);
  font-weight: var(--fw-semibold);
  margin: 0;
  white-space: nowrap;
}
.page-header__crumb {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
}
.page-header__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
