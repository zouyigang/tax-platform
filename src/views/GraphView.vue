<script setup lang="ts">
/**
 * 关联图谱分析(《需求文档》3.9 / 4.3.2)
 * 左:SVG 关联图谱画布(节点按坐标渲染,可缩放,点击选中);
 * 右:节点详情面板(属性 + 关联关系,点击关系跳转选中,《交互说明》1.6)。
 * 节点/连线颜色由前端按类型分配(取 charts/palette,SVG 不能消费 CSS 变量)。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { GraphNode, GraphNodeType } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import Toast from '@/components/common/Toast.vue'
import { toneClass, RISK_LABEL, RISK_TONE } from '@/components/common/tone'
import { GRAPH_NODE_COLOR, GRAPH_EDGE } from '@/charts/palette'

const route = useRoute()
const router = useRouter()

/** 节点类型 → 图标 / 名称(UI 文本,颜色取 palette) */
const TYPE_META: Record<GraphNodeType, { name: string; icon: string }> = {
  ent: { name: '企业', icon: '企' },
  person: { name: '人员', icon: '人' },
  fund: { name: '资金账户', icon: '￥' },
  invoice: { name: '受票企业', icon: '票' },
}
const TYPE_ORDER: GraphNodeType[] = ['ent', 'person', 'fund', 'invoice']

const rootId = computed(() => (typeof route.query.rootId === 'string' ? route.query.rootId : ''))
const graph = useResource(() => api.graph.getGraph(rootId.value))

const selectedId = ref('')
const zoom = ref(1)

onMounted(async () => {
  await graph.load()
  if (graph.data.value) selectedId.value = graph.data.value.rootId
})

const data = computed(() => graph.data.value)
function findNode(id: string): GraphNode | undefined {
  return data.value ? data.value.nodes.find((n) => n.id === id) : undefined
}

/* ---------------- 画布图元 ---------------- */
const resolvedEdges = computed(() => {
  if (!data.value) return []
  return data.value.edges.map((e) => {
    const a = findNode(e.source)!
    const b = findNode(e.target)!
    const active = selectedId.value === e.source || selectedId.value === e.target
    return {
      key: `${e.source}-${e.target}`,
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
      label: e.label,
      stroke: active ? GRAPH_EDGE.active : e.strong ? GRAPH_EDGE.strong : GRAPH_EDGE.weak,
      w: active ? 2 : e.strong ? 1.6 : 1,
      dash: e.strong ? '0' : '5 4',
    }
  })
})

const resolvedNodes = computed(() => {
  if (!data.value) return []
  return data.value.nodes.map((n) => {
    const on = selectedId.value === n.id
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
  })
})

const legend = computed(() =>
  TYPE_ORDER.map((t) => ({ name: TYPE_META[t].name, color: GRAPH_NODE_COLOR[t] })),
)

/* ---------------- 选中节点详情 ---------------- */
const selNode = computed(() => findNode(selectedId.value))
const selDetail = computed(() => (data.value ? data.value.details[selectedId.value] : undefined))
const selColor = computed(() => (selNode.value ? GRAPH_NODE_COLOR[selNode.value.type] : ''))
const selIcon = computed(() => (selNode.value ? TYPE_META[selNode.value.type].icon : ''))
const selTypeName = computed(() => (selNode.value ? TYPE_META[selNode.value.type].name : ''))

/** SVG 缩放:围绕视图中心(460,310) */
const zoomTransform = computed(
  () => `translate(460 310) scale(${zoom.value}) translate(-460 -310)`,
)
function zoomIn() {
  zoom.value = Math.min(2, +(zoom.value + 0.2).toFixed(2))
}
function zoomOut() {
  zoom.value = Math.max(0.6, +(zoom.value - 0.2).toFixed(2))
}
function zoomReset() {
  zoom.value = 1
}

function selectNode(id: string) {
  selectedId.value = id
}

/* 轻量反馈 / 跳转 */
const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}
function viewArchive() {
  router.push('/archive')
}
</script>

<template>
  <div class="graph">
    <PageHeader title="关联图谱分析" breadcrumb="首页 / 智能模型 / 关联图谱分析">
      <template #actions>
        <div class="graph__search">
          {{ data ? data.rootName : '—' }}
          <span class="graph__search-icon">⌕</span>
        </div>
        <button type="button" class="btn btn--primary" @click="toast('演示环境:分析报告生成功能待接入')">
          生成分析报告
        </button>
      </template>
    </PageHeader>

    <div class="graph__body">
      <StateBlock :status="graph.status.value" :error="graph.error.value" @retry="graph.load()">
        <template v-if="data">
          <div class="graph__layout">
            <!-- ══ 画布 ══ -->
            <div class="canvas">
              <!-- 工具条 -->
              <div class="canvas__tools">
                <div class="zoom">
                  <span class="zoom__btn" @click="zoomIn">＋</span>
                  <span class="zoom__btn" @click="zoomOut">－</span>
                  <span class="zoom__btn zoom__btn--last" @click="zoomReset">⤢</span>
                </div>
                <span class="canvas__chip">力导向布局 ▾</span>
                <span class="canvas__chip">2 层关联 ▾</span>
              </div>
              <!-- 图例 -->
              <div class="canvas__legend">
                <div v-for="l in legend" :key="l.name" class="legend__item">
                  <span class="legend__dot" :style="{ background: l.color }"></span>{{ l.name }}
                </div>
              </div>

              <svg class="canvas__svg" viewBox="0 0 920 620">
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
                  <g
                    v-for="n in resolvedNodes"
                    :key="n.id"
                    class="node"
                    @click="selectNode(n.id)"
                  >
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

            <!-- ══ 节点详情面板 ══ -->
            <aside class="detail">
              <div class="detail__head">
                <span class="detail__avatar" :style="{ background: selColor }">{{ selIcon }}</span>
                <div class="detail__titles">
                  <div class="detail__name">{{ selNode ? selNode.label : '' }}</div>
                  <div class="detail__type">{{ selTypeName }}</div>
                </div>
                <BaseBadge v-if="selNode && selNode.risk" :tone="RISK_TONE[selNode.risk]" class="detail__risk">
                  {{ RISK_LABEL[selNode.risk] }}
                </BaseBadge>
              </div>

              <div class="detail__body">
                <div class="detail__sec-title">节点属性</div>
                <div class="attrs">
                  <div v-for="a in selDetail ? selDetail.attrs : []" :key="a.key" class="attrs__row">
                    <div class="attrs__k">{{ a.key }}</div>
                    <div class="attrs__v" :class="{ num: a.numeric }">{{ a.value }}</div>
                  </div>
                </div>

                <div class="detail__sec-title">
                  关联关系 · 共 {{ selDetail ? selDetail.relations.length : 0 }} 条
                </div>
                <div class="rels">
                  <div
                    v-for="(r, i) in selDetail ? selDetail.relations : []"
                    :key="i"
                    class="rel"
                    :class="toneClass(r.tone)"
                    @click="selectNode(r.targetId)"
                  >
                    <div class="rel__line">
                      <span class="rel__dot"></span>
                      <span class="rel__name">{{ r.targetName }}</span>
                      <span class="rel__type">{{ r.rel }}</span>
                    </div>
                    <div class="rel__note">{{ r.note }}</div>
                  </div>
                </div>
              </div>

              <div class="detail__foot">
                <button type="button" class="btn detail__btn" @click="toast('演示环境:已展开该节点下级关联')">
                  展开下级
                </button>
                <button type="button" class="btn btn--primary detail__btn" @click="viewArchive">
                  查看档案
                </button>
              </div>
            </aside>
          </div>
        </template>
      </StateBlock>
    </div>

    <Toast :visible="toastVisible" :text="toastText" tone="primary" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.graph {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.graph__search {
  width: 260px;
  height: 32px;
  padding: 0 12px;
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--fs-aux);
  background: var(--color-panel);
}
.graph__search-icon {
  color: var(--color-neutral-500);
}

.graph__body {
  flex: 1;
  min-height: 0;
  display: flex;
  padding: var(--space-4) 20px;
}
.graph__layout {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  gap: var(--space-4);
}

/* ══ 画布 ══ */
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

/* ══ 详情面板 ══ */
.detail {
  --detail-w: 360px;
  width: var(--detail-w);
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.detail__head {
  flex: none;
  padding: 16px 18px;
  border-bottom: 1px solid var(--color-neutral-200);
  display: flex;
  align-items: center;
  gap: 10px;
}
.detail__avatar {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 50%;
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
}
.detail__titles {
  min-width: 0;
}
.detail__name {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.detail__type {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.detail__risk {
  margin-left: auto;
  white-space: nowrap;
}
.detail__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: 16px 18px;
}
.detail__sec-title {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-600);
  margin-bottom: 10px;
}

.attrs {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  margin-bottom: 20px;
}
.attrs__row {
  display: flex;
  font-size: var(--fs-aux);
  border-bottom: 1px solid var(--color-neutral-200);
}
.attrs__row:last-child {
  border-bottom: none;
}
.attrs__k {
  width: 96px;
  flex: none;
  padding: 9px 14px;
  color: var(--color-neutral-600);
  background: var(--color-neutral-100);
}
.attrs__v {
  flex: 1;
  padding: 9px 14px;
}

.rels {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rel {
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--tone-main);
  border-radius: var(--radius-control);
  padding: 11px 14px;
  cursor: pointer;
  transition: background var(--motion-fast) ease;
}
.rel:hover {
  background: var(--color-neutral-100);
}
.rel__line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.rel__dot {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: var(--tone-main);
}
.rel__name {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rel__type {
  white-space: nowrap;
  font-size: var(--fs-label);
  color: var(--color-primary);
  background: var(--color-primary-tint);
  padding: 1px 8px;
  border-radius: var(--radius-control);
}
.rel__note {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 5px;
}

.detail__foot {
  flex: none;
  padding: var(--space-3) 18px;
  border-top: 1px solid var(--color-neutral-200);
  display: flex;
  gap: 10px;
}
.detail__btn {
  flex: 1;
  height: 34px;
}
</style>
