<script setup lang="ts" generic="T">
/**
 * 数据表格(对应设计系统「数据表格」)
 * - 表头吸顶,表体独立滚动
 * - density='compact' 用于高密度业务列表(一线人员长时间盯屏)
 * - 加载态:表头正常显示,表体渲染骨架行(《交互说明》2.1)
 * - 单元格可通过具名插槽 #cell-<key> 自定义渲染
 */
import BaseCheckbox from './BaseCheckbox.vue'
import type { TableColumn } from './table'

const props = withDefaults(
  defineProps<{
    /** 列定义 */
    columns: TableColumn[]
    /** 行数据 */
    rows: T[]
    /** 行唯一键取值函数 */
    rowKey: (row: T) => string
    /** 密度:compact 高密度 / normal 常规 */
    density?: 'compact' | 'normal'
    /** 是否显示勾选列 */
    selectable?: boolean
    /** 已选中的行键 */
    selectedKeys?: string[]
    /** 高亮行(如抽屉当前打开的行) */
    activeKey?: string
    /** 行是否可点击 */
    clickable?: boolean
    /** 加载中:渲染骨架行 */
    loading?: boolean
    /** 骨架行数 */
    skeletonRows?: number
  }>(),
  {
    density: 'normal',
    selectable: false,
    selectedKeys: () => [],
    activeKey: '',
    clickable: false,
    loading: false,
    skeletonRows: 8,
  },
)

const emit = defineEmits<{
  (e: 'row-click', row: T): void
  (e: 'update:selectedKeys', keys: string[]): void
}>()

/** 取单元格原始值(泛型行需在此收窄) */
function cellValue(row: T, key: string): unknown {
  return (row as unknown as Record<string, unknown>)[key]
}

function isSelected(key: string) {
  return props.selectedKeys.indexOf(key) >= 0
}

function toggleRow(key: string) {
  const next = isSelected(key)
    ? props.selectedKeys.filter((k) => k !== key)
    : props.selectedKeys.concat([key])
  emit('update:selectedKeys', next)
}

/** 全选框状态:仅针对当前页可见行 */
function visibleKeys(): string[] {
  return props.rows.map((r) => props.rowKey(r))
}
function allSelected(): boolean {
  const keys = visibleKeys()
  return keys.length > 0 && keys.every((k) => isSelected(k))
}
function someSelected(): boolean {
  return !allSelected() && visibleKeys().some((k) => isSelected(k))
}
function toggleAll() {
  const keys = visibleKeys()
  if (allSelected()) {
    emit('update:selectedKeys', props.selectedKeys.filter((k) => keys.indexOf(k) < 0))
  } else {
    const merged = props.selectedKeys.slice()
    keys.forEach((k) => {
      if (merged.indexOf(k) < 0) merged.push(k)
    })
    emit('update:selectedKeys', merged)
  }
}

/** 骨架条宽度在 40%–80% 间按列变化,避免整齐得像真实内容 */
function skeletonWidth(index: number): string {
  const steps = [72, 56, 80, 44, 64, 50, 68, 40, 60]
  return `${steps[index % steps.length]}%`
}
</script>

<template>
  <div class="table-wrap">
    <table class="table" :class="`table--${density}`">
      <colgroup>
        <col v-if="selectable" style="width: 40px" />
        <col v-for="c in columns" :key="c.key" :style="c.width ? { width: c.width } : undefined" />
      </colgroup>

      <thead>
        <tr>
          <th v-if="selectable" class="table__th table__th--check">
            <BaseCheckbox
              :model-value="allSelected()"
              :indeterminate="someSelected()"
              @update:model-value="toggleAll"
            />
          </th>
          <th
            v-for="c in columns"
            :key="c.key"
            class="table__th"
            :style="{ textAlign: c.align || 'left' }"
          >
            {{ c.label }}
          </th>
        </tr>
      </thead>

      <!-- 加载态:表头保留,表体骨架 -->
      <tbody v-if="loading">
        <tr v-for="n in skeletonRows" :key="`sk-${n}`" class="table__row">
          <td v-if="selectable" class="table__td">
            <span class="skeleton table__skel" style="width: 15px; height: 15px"></span>
          </td>
          <td v-for="(c, i) in columns" :key="c.key" class="table__td">
            <span class="skeleton table__skel" :style="{ width: skeletonWidth(i) }"></span>
          </td>
        </tr>
      </tbody>

      <tbody v-else>
        <tr
          v-for="row in rows"
          :key="rowKey(row)"
          class="table__row"
          :class="{
            'table__row--clickable': clickable,
            'table__row--active': rowKey(row) === activeKey,
            'table__row--selected': isSelected(rowKey(row)),
          }"
          @click="clickable && emit('row-click', row)"
        >
          <td v-if="selectable" class="table__td" @click.stop>
            <BaseCheckbox
              :model-value="isSelected(rowKey(row))"
              @update:model-value="toggleRow(rowKey(row))"
            />
          </td>
          <td
            v-for="c in columns"
            :key="c.key"
            class="table__td"
            :class="{ num: c.numeric, 'table__td--ellipsis': c.ellipsis }"
            :style="{ textAlign: c.align || 'left' }"
          >
            <slot :name="`cell-${c.key}`" :row="row">{{ cellValue(row, c.key) }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-aux);
  table-layout: fixed;
}

/* 表头吸顶 */
.table__th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-neutral-100);
  padding: 10px 12px;
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-600);
  letter-spacing: 0.03em;
  border-bottom: var(--border-line);
  white-space: nowrap;
  text-align: left;
}
.table__th--check {
  padding-left: 16px;
  padding-right: 8px;
}

.table__row {
  border-bottom: 1px solid var(--color-neutral-200);
}
.table__row--clickable {
  cursor: pointer;
}
.table__row--clickable:hover {
  background: var(--color-neutral-100);
}
.table__row--selected,
.table__row--active,
.table__row--active:hover,
.table__row--selected:hover {
  background: var(--color-primary-tint);
}

.table__td {
  padding: 11px 12px;
  vertical-align: middle;
}
.table__td--ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 高密度:压紧行高,供一线人员一屏看更多
   行高 ≈ 36px(徽章 22.8 + 上下 6 + 边框 1),1440×940 下可见 15 行以上 */
.table--compact .table__td {
  padding: 6px 12px;
}
.table--compact .table__th {
  padding: 8px 12px;
}

.table__skel {
  display: block;
  height: 12px;
}
</style>
