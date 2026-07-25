<script setup lang="ts">
// 占位页 · 未实现模块统一落此,保持侧栏/布局一致,展示模块功能说明。
// 内容取自 menu.ts 配置(唯一数据源):模块标题、所属分组、功能说明。
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { findLeafByPath, findGroupTitle } from '@/config/menu'
import PageHeader from '@/components/common/PageHeader.vue'

const route = useRoute()
const leaf = computed(() => findLeafByPath(route.path))
const title = computed(() => leaf.value?.title ?? '功能模块')
const group = computed(() => (leaf.value ? findGroupTitle(leaf.value.key) : ''))
const breadcrumb = computed(() =>
  ['首页', group.value, title.value].filter(Boolean).join(' / '),
)
const desc = computed(() => leaf.value?.desc ?? [])
</script>

<template>
  <div class="ph">
    <PageHeader :title="title" :breadcrumb="breadcrumb" />

    <div class="ph__body">
      <div class="ph__card">
        <div class="ph__badge">
          <span class="ph__badge-dot"></span>
          本模块正在建设中
        </div>
        <h2 class="ph__heading">{{ title }}</h2>
        <p class="ph__lead">
          该功能已纳入平台规划,页面尚在建设中。以下为本模块的功能说明:
        </p>

        <ul v-if="desc.length" class="ph__list">
          <li v-for="(line, i) in desc" :key="i" class="ph__list-item">
            <span class="ph__list-mark">▹</span>
            <span>{{ line }}</span>
          </li>
        </ul>
        <p v-else class="ph__empty">功能说明待补充。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 页面级令牌 */
.ph {
  --ph-max-w: 720px;
  --ph-pad: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.ph__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--ph-pad);
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.ph__card {
  width: 100%;
  max-width: var(--ph-max-w);
  margin-top: 48px;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 28px 32px 32px;
  box-shadow: var(--shadow-sm);
}
.ph__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-aux);
  font-weight: var(--fw-medium);
  color: var(--color-primary);
  background: var(--color-primary-tint);
  border-radius: 999px;
  padding: 4px 12px;
}
.ph__badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
}
.ph__heading {
  margin: 16px 0 0;
  font-size: var(--fs-h1);
  font-weight: var(--fw-h1);
  color: var(--color-neutral-900);
}
.ph__lead {
  margin: 8px 0 20px;
  font-size: var(--fs-body);
  color: var(--color-neutral-600);
  line-height: 1.6;
}
.ph__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ph__list-item {
  display: flex;
  gap: 10px;
  font-size: var(--fs-body);
  color: var(--color-neutral-800);
  line-height: 1.6;
}
.ph__list-mark {
  flex: none;
  color: var(--color-primary);
  line-height: 1.6;
}
.ph__empty {
  margin: 0;
  font-size: var(--fs-body);
  color: var(--color-neutral-500);
}
</style>
