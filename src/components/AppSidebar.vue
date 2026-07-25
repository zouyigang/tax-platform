<script setup lang="ts">
// 全局侧栏 · 两级折叠菜单(深色表面色体系,沿用《平台侧栏》视觉)
// 一级:单页型直接跳转;分组型点击折叠/展开。二级:叶子路由项。
// 当前路由高亮,并默认展开其所在的一级分组。
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { MENU, isGroup } from '@/config/menu'

const route = useRoute()

// 当前激活叶子 key(取 route.meta.nav,详情页如 /clues/:id 也能正确点亮所属菜单)
const activeKey = computed(() => (route.meta.nav as string) || '')
// 当前激活叶子所属分组 key(用于默认展开 / 一级高亮)
const activeGroupKey = computed(() => {
  for (const e of MENU) {
    if (isGroup(e) && e.children.some((c) => c.key === activeKey.value)) return e.key
  }
  return ''
})

// 展开的分组集合;默认展开当前所在分组
const openKeys = ref<Set<string>>(
  new Set(activeGroupKey.value ? [activeGroupKey.value] : []),
)

// 路由变化时,确保当前所在分组处于展开态(不主动收起用户已展开的其它分组)
watch(activeGroupKey, (key) => {
  if (key) {
    const next = new Set(openKeys.value)
    next.add(key)
    openKeys.value = next
  }
})

function toggle(key: string) {
  const next = new Set(openKeys.value)
  next.has(key) ? next.delete(key) : next.add(key)
  openKeys.value = next
}
function isOpen(key: string) {
  return openKeys.value.has(key)
}
function isLeafActive(key: string) {
  return key === activeKey.value
}
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
      <template v-for="entry in MENU" :key="entry.key">
        <!-- 分组型一级:可折叠 -->
        <template v-if="isGroup(entry)">
          <button
            type="button"
            class="nav-group"
            :class="{ 'nav-group--active': entry.key === activeGroupKey }"
            :aria-expanded="isOpen(entry.key)"
            @click="toggle(entry.key)"
          >
            <span class="nav-group__icon">{{ entry.icon }}</span>
            <span class="nav-group__title">{{ entry.title }}</span>
            <span class="nav-group__caret" :class="{ 'nav-group__caret--open': isOpen(entry.key) }">›</span>
          </button>

          <!-- 二级列表 -->
          <div v-show="isOpen(entry.key)" class="nav-sub">
            <router-link
              v-for="child in entry.children"
              :key="child.key"
              :to="child.path"
              class="nav-sub__item"
              :class="{ 'nav-sub__item--active': isLeafActive(child.key) }"
            >
              <span class="nav-sub__dot"></span>
              <span class="nav-sub__name">{{ child.title }}</span>
              <span v-if="child.badge" class="nav-sub__badge num">{{ child.badge }}</span>
              <span v-else-if="child.status === 'placeholder'" class="nav-sub__wip" title="建设中">·</span>
            </router-link>
          </div>
        </template>

        <!-- 单页型一级:直接跳转 -->
        <router-link
          v-else
          :to="entry.path"
          class="nav-group nav-group--leaf"
          :class="{ 'nav-group--active': isLeafActive(entry.key) }"
        >
          <span class="nav-group__icon">{{ entry.icon }}</span>
          <span class="nav-group__title">{{ entry.title }}</span>
        </router-link>
      </template>
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
  padding: 8px 0;
}

/* ---- 一级项(分组头 / 单页) ---- */
.nav-group {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 40px;
  padding: 0 16px;
  font-size: 14px;
  cursor: pointer;
  color: var(--color-surface-fg);
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  font-weight: 400;
  text-align: left;
  text-decoration: none;
  font-family: inherit;
  transition: background var(--motion-fast) ease, color var(--motion-fast) ease;
}
.nav-group:hover {
  color: var(--color-surface-fg-strong);
  background: var(--color-surface-hover-bg);
}
/* 分组头当前所在(其下有激活子项)/ 单页激活 */
.nav-group--active,
.nav-group--active:hover {
  color: var(--color-surface-fg-strong);
  font-weight: 600;
}
/* 单页型一级激活时,复用二级选中条视觉 */
.nav-group--leaf.nav-group--active,
.nav-group--leaf.nav-group--active:hover {
  background: var(--color-surface-active-bg);
  border-left-color: var(--color-surface-accent);
}
.nav-group__icon {
  width: 16px;
  text-align: center;
  opacity: 0.9;
  flex: none;
}
.nav-group__title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-group__caret {
  flex: none;
  font-size: 15px;
  line-height: 1;
  color: var(--color-surface-fg-weak);
  transform: rotate(0deg);
  transition: transform var(--motion-fast) ease;
}
.nav-group__caret--open {
  transform: rotate(90deg);
}

/* ---- 二级列表 ---- */
.nav-sub {
  padding: 2px 0 4px;
}
.nav-sub__item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 16px 0 39px; /* 与一级图标列对齐的缩进 */
  font-size: 13px;
  color: var(--color-surface-fg-weak);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: background var(--motion-fast) ease, color var(--motion-fast) ease;
}
.nav-sub__item:hover {
  color: var(--color-surface-fg-strong);
  background: var(--color-surface-hover-bg);
}
.nav-sub__item--active,
.nav-sub__item--active:hover {
  color: var(--color-surface-fg-strong);
  background: var(--color-surface-active-bg);
  border-left-color: var(--color-surface-accent);
  font-weight: 600;
}
.nav-sub__dot {
  width: 4px;
  height: 4px;
  flex: none;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
}
.nav-sub__item--active .nav-sub__dot {
  opacity: 1;
}
.nav-sub__name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-sub__badge {
  flex: none;
  font-size: 11px;
  background: var(--color-risk-high);
  color: var(--color-text-inverse);
  border-radius: 9px;
  padding: 1px 7px;
}
.nav-sub__wip {
  flex: none;
  color: var(--color-surface-fg-footer);
  opacity: 0.6;
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
