<script setup lang="ts">
/**
 * 规则分类树 · 十大类可折叠,显示各类规则数量
 * 单选:点击任一节点(含「全部规则」/父类/子类)向上抛出 code;
 * 折叠:点击父类前的三角展开/收起,默认展开全部,便于检索。
 */
import { ref, computed, watch } from 'vue'
import type { RuleCategoryNode } from '@/api/types'

const props = defineProps<{
  /** 分类树数据 */
  nodes: RuleCategoryNode[]
  /** 当前选中的分类编码('all' 表示全部) */
  activeCode: string
}>()

const emit = defineEmits<{ (e: 'select', code: string): void }>()

/** 展开的父类编码集合;默认全部展开 */
const openKeys = ref<Set<string>>(new Set())
watch(
  () => props.nodes,
  (nodes) => {
    if (nodes && nodes.length && openKeys.value.size === 0) {
      openKeys.value = new Set(nodes.map((n) => n.code))
    }
  },
  { immediate: true },
)

/** 全部规则合计 */
const totalCount = computed(() => props.nodes.reduce((s, n) => s + n.count, 0))

function toggle(code: string) {
  const next = new Set(openKeys.value)
  next.has(code) ? next.delete(code) : next.add(code)
  openKeys.value = next
}
function isOpen(code: string) {
  return openKeys.value.has(code)
}
</script>

<template>
  <aside class="tree">
    <div class="tree__head">
      <span class="tree__head-title">规则分类</span>
    </div>

    <div class="tree__body">
      <!-- 全部规则 -->
      <div
        class="tree__node tree__node--root"
        :class="{ 'tree__node--active': activeCode === 'all' }"
        @click="emit('select', 'all')"
      >
        <span class="tree__name">全部规则</span>
        <span class="tree__count num">{{ totalCount }}</span>
      </div>

      <!-- 十大类 -->
      <template v-for="n in nodes" :key="n.code">
        <div
          class="tree__node tree__node--parent"
          :class="{ 'tree__node--active': activeCode === n.code }"
          @click="emit('select', n.code)"
        >
          <span
            class="tree__caret"
            :class="{ 'tree__caret--open': isOpen(n.code) }"
            @click.stop="toggle(n.code)"
          >›</span>
          <span class="tree__name">{{ n.name }}</span>
          <span class="tree__count num">{{ n.count }}</span>
        </div>

        <div v-show="isOpen(n.code)" class="tree__children">
          <div
            v-for="c in n.children"
            :key="c.code"
            class="tree__node tree__node--leaf"
            :class="{ 'tree__node--active': activeCode === c.code }"
            @click="emit('select', c.code)"
          >
            <span class="tree__name">{{ c.name }}</span>
            <span class="tree__count num">{{ c.count }}</span>
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.tree {
  --tree-w: 208px;
  width: var(--tree-w);
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.tree__head {
  height: 46px;
  flex: none;
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  border-bottom: var(--border-line);
}
.tree__head-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.tree__body {
  flex: 1;
  overflow: auto;
  padding: var(--space-2) 0;
}

.tree__node {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 34px;
  padding: 0 var(--space-4);
  font-size: var(--fs-aux);
  color: var(--color-neutral-700);
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background var(--motion-fast) ease, color var(--motion-fast) ease;
}
.tree__node:hover {
  background: var(--color-neutral-100);
}
.tree__node--active,
.tree__node--active:hover {
  color: var(--color-primary);
  background: var(--color-primary-tint);
  border-left-color: var(--color-primary);
  font-weight: var(--fw-semibold);
}
.tree__node--root {
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-900);
}
.tree__node--leaf {
  padding-left: 40px;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  height: 30px;
}
.tree__caret {
  flex: none;
  width: 14px;
  text-align: center;
  font-size: var(--fs-body);
  line-height: 1;
  color: var(--color-neutral-500);
  transform: rotate(0deg);
  transition: transform var(--motion-fast) ease;
}
.tree__caret--open {
  transform: rotate(90deg);
}
.tree__name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tree__count {
  flex: none;
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.tree__node--active .tree__count {
  color: var(--color-primary);
}
</style>
