<script setup lang="ts">
/**
 * 关联图谱画布(原生 SVG)
 * 由「关联图谱分析」页抽出,供「虚开团伙识别」的团伙子图复用,行为与视觉保持一致:
 *   - 节点按后端下发的画布坐标渲染,点击选中(选中态加外环);
 *   - 与选中节点相连的边高亮;强关联实线、弱关联虚线;
 *   - 左上缩放工具条(围绕视图中心缩放),右上类型图例。
 * 颜色取 charts/palette(SVG 的 fill/stroke 不能消费 CSS 变量)。
 */
import { computed, ref } from 'vue'
import type { GraphEdge, GraphNode } from '@/api/types'
import { GRAPH_EDGE, GRAPH_NODE_COLOR } from '@/charts/palette'
import { TYPE_META, TYPE_ORDER } from './nodeMeta'

const props = withDefaults(
  defineProps<{
    /** 节点 */
    nodes: GraphNode[]
    /** 连线 */
    edges: GraphEdge[]
    /** 当前选中节点 id */
    selectedId?: string
    /** 视图坐标系宽度 */
    width?: number
    /** 视图坐标系高度 */
    height?: number
    /** 工具条右侧的说明芯片(纯展示) */
    chips?: string[]
  }>(),
  {
    selectedId: '',
    width: 920,
    height: 620,
    chips: () => ['力导向布局 ▾', '2 层关联 ▾'],
  },
)

const emit = defineEmits<{ (e: 'select', id: string): void }>()

function findNode(id: string): GraphNode | undefined {
  return props.nodes.filter((n) => n.id === id)[0]
}

/* ---------------- 图元 ---------------- */
const resolvedEdges = computed(() =>
  props.edges
    .filter((e) => findNode(e.source) && findNode(e.target))
    .map((e) => {
      const a = findNode(e.source)!
      const b = findNode(e.target)!
      const active = props.selectedId === e.source || props.selectedId === e.target
      return {
        key: `${e.source}-${e.target}`,
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
        label: e.label,
        stroke: active ? GRAPH_EDGE.active : e.strong ? GRAPH_EDGE.strong : GRAPH_EDGE.weak,
        w: active ? 2 : e.strong ? 1.6 : 1,
        dash: e.strong ? '0' : '5 4',
      }
    }),
)

const resolvedNodes = computed(() =>
  props.nodes.map((n) => {
    const on = props.selectedId === n.id
    const r = n.core ? 26 : 19
    const color = GRAPH_NODE_COLOR[n.type]
    return {
      id: n.id, x: n.x, y: n.y, r,
      ring: on ? r + 5 : r,
      ringColor: on ? GRAPH_EDGE.selectedRing : color,
      fill: color,
      icon: TYPE_META[n.type].icon,
      iconSize: n.core ? 15 : 12,
      iconY: n.y + (n.core ? 5 : 4),
      label: n.label,
      labelY: n.y + r + 16,
      labelWeight: on ? 600 : 400,
    }
  }),
)

const legend = computed(() =>
  TYPE_ORDER.map((t) => ({ name: TYPE_META[t].name, color: GRAPH_NODE_COLOR[t] })),
)

/* ---------------- 缩放:围绕视图中心 ---------------- */
const zoom = ref(1)
const zoomTransform = computed(() => {
  const cx = props.width / 2
  const cy = props.height / 2
  return `translate(${cx} ${cy}) scale(${zoom.value}) translate(${-cx} ${-cy})`
})
function zoomIn() {
  zoom.value = Math.min(2, +(zoom.value + 0.2).toFixed(2))
}
function zoomOut() {
  zoom.value = Math.max(0.6, +(zoom.value - 0.2).toFixed(2))
}
function zoomReset() {
  zoom.value = 1
}
</script>

<template>
  <div class="canvas">
    <!-- 工具条 -->
    <div class="canvas__tools">
      <div class="zoom">
        <span class="zoom__btn" @click="zoomIn">＋</span>
        <span class="zoom__btn" @click="zoomOut">－</span>
        <span class="zoom__btn zoom__btn--last" @click="zoomReset">⤢</span>
      </div>
      <span v-for="c in chips" :key="c" class="canvas__chip">{{ c }}</span>
    </div>
    <!-- 图例 -->
    <div class="canvas__legend">
      <div v-for="l in legend" :key="l.name" class="legend__item">
        <span class="legend__dot" :style="{ background: l.color }"></span>{{ l.name }}
      </div>
    </div>

    <svg class="canvas__svg" :viewBox="`0 0 ${width} ${height}`">
      <g :transform="zoomTransform">
        <!-- 连线 -->
        <line
          v-for="e in resolvedEdges"
          :key="e.key"
          :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2"
          :stroke="e.stroke" :stroke-width="e.w" :stroke-dasharray="e.dash"
        />
        <!-- 连线标签 -->
        <text
          v-for="e in resolvedEdges"
          :key="`l-${e.key}`"
          :x="e.mx" :y="e.my" text-anchor="middle" font-size="11"
          :fill="GRAPH_EDGE.label" :stroke="GRAPH_EDGE.halo" stroke-width="3"
          style="paint-order: stroke"
        >{{ e.label }}</text>
        <!-- 节点 -->
        <g v-for="n in resolvedNodes" :key="n.id" class="node" @click="emit('select', n.id)">
          <circle :cx="n.x" :cy="n.y" :r="n.ring" fill="none" :stroke="n.ringColor" stroke-width="2" />
          <circle :cx="n.x" :cy="n.y" :r="n.r" :fill="n.fill" />
          <text
            :x="n.x" :y="n.iconY" text-anchor="middle" :font-size="n.iconSize"
            :fill="GRAPH_EDGE.nodeIcon" font-weight="600"
          >{{ n.icon }}</text>
          <text
            :x="n.x" :y="n.labelY" text-anchor="middle" font-size="12"
            :fill="GRAPH_EDGE.nodeLabel" :stroke="GRAPH_EDGE.halo" stroke-width="3"
            style="paint-order: stroke" :font-weight="n.labelWeight"
          >{{ n.label }}</text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.canvas {
  flex: 1;
  min-width: 0;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  position: relative;
  overflow: hidden;
}
.canvas__svg {
  width: 100%;
  height: 100%;
  display: block;
}
.node {
  cursor: pointer;
}

.canvas__tools {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.zoom {
  display: flex;
  border: var(--border-line);
  border-radius: var(--radius-control);
  background: var(--color-panel);
}
.zoom__btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-neutral-700);
  border-right: 1px solid var(--color-neutral-200);
}
.zoom__btn--last {
  border-right: none;
}
.zoom__btn:hover {
  color: var(--color-primary);
  background: var(--color-neutral-100);
}
.canvas__chip {
  font-size: var(--fs-label);
  padding: 6px 12px;
  border: var(--border-line);
  border-radius: var(--radius-control);
  background: var(--color-panel);
  color: var(--color-neutral-700);
  cursor: pointer;
}

.canvas__legend {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.legend__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
}
.legend__dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}
</style>
