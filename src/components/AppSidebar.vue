<script setup lang="ts">
// 全局侧栏 · 1:1 复刻《平台侧栏》组件（深色表面色体系）
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { NAV_ITEMS } from '@/config/nav'

const route = useRoute()
// 当前页对应菜单高亮:以路由 meta.nav 匹配菜单名
const activeName = computed(() => (route.meta.nav as string) || '')
</script>

<template>
  <nav class="sidebar">
    <!-- 品牌区 -->
    <div class="sidebar__brand">
      <div class="sidebar__logo">税</div>
      <div class="sidebar__title">
        智慧综合治税<br />
        <span class="sidebar__subtitle">风险智能分析平台</span>
      </div>
    </div>

    <!-- 菜单区 -->
    <div class="sidebar__menu">
      <router-link
        v-for="item in NAV_ITEMS"
        :key="item.name"
        :to="item.to"
        class="nav-item"
        :class="{ 'nav-item--active': item.name === activeName }"
      >
        <span class="nav-item__icon">{{ item.icon }}</span>
        <span class="nav-item__name">{{ item.name }}</span>
        <span v-if="item.badge" class="nav-item__badge num">{{ item.badge }}</span>
      </router-link>
    </div>

    <!-- 页脚 -->
    <div class="sidebar__footer">v1.0 · 政务内网</div>
  </nav>
</template>

<style scoped>
.sidebar {
  width: var(--layout-sidebar-w);
  height: 100%;
  flex: none;
  background: var(--color-surface-dark);
  color: var(--color-surface-fg);
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-family: var(--font-sans);
}

/* 品牌区 */
.sidebar__brand {
  height: 56px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  border-bottom: 1px solid var(--color-surface-line);
}
.sidebar__logo {
  width: 28px;
  height: 28px;
  flex: none;
  background: var(--color-surface-accent);
  color: var(--color-surface-dark);
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
}
.sidebar__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-surface-fg-strong);
  line-height: 1.25;
}
.sidebar__subtitle {
  font-size: 11px;
  font-weight: 400;
  color: var(--color-surface-fg-weak);
}

/* 菜单区 */
.sidebar__menu {
  flex: 1;
  overflow: auto;
  padding: 10px 0;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 18px;
  font-size: 14px;
  cursor: pointer;
  color: var(--color-surface-fg);
  background: transparent;
  border-left: 3px solid transparent;
  font-weight: 400;
  text-decoration: none;
  transition: background var(--motion-fast) ease, color var(--motion-fast) ease;
}
.nav-item:hover {
  color: var(--color-surface-fg-strong);
  background: var(--color-surface-hover-bg);
}
.nav-item--active,
.nav-item--active:hover {
  color: var(--color-surface-fg-strong);
  background: var(--color-surface-active-bg);
  border-left-color: var(--color-surface-accent);
  font-weight: 600;
}
.nav-item__icon {
  width: 16px;
  text-align: center;
  opacity: 0.9;
}
.nav-item__name {
  white-space: nowrap;
}
.nav-item__badge {
  margin-left: auto;
  font-size: 11px;
  background: var(--color-risk-high);
  color: var(--color-text-inverse);
  border-radius: 9px;
  padding: 1px 7px;
}

/* 页脚 */
.sidebar__footer {
  flex: none;
  padding: 12px 18px;
  border-top: 1px solid var(--color-surface-line);
  font-size: 12px;
  color: var(--color-surface-fg-footer);
}
</style>
