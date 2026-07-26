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
import type { GraphNode } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import Toast from '@/components/common/Toast.vue'
import GraphCanvas from '@/components/graph/GraphCanvas.vue'
import { TYPE_META } from '@/components/graph/nodeMeta'
import { toneClass, RISK_LABEL, RISK_TONE } from '@/components/common/tone'
import { GRAPH_NODE_COLOR } from '@/charts/palette'

const route = useRoute()
const router = useRouter()

const rootId = computed(() => (typeof route.query.rootId === 'string' ? route.query.rootId : ''))
const graph = useResource(() => api.graph.getGraph(rootId.value))

const selectedId = ref('')

onMounted(async () => {
  await graph.load()
  if (graph.data.value) selectedId.value = graph.data.value.rootId
})

const data = computed(() => graph.data.value)
function findNode(id: string): GraphNode | undefined {
  return data.value ? data.value.nodes.find((n) => n.id === id) : undefined
}

/* ---------------- 选中节点详情 ---------------- */
const selNode = computed(() => findNode(selectedId.value))
const selDetail = computed(() => (data.value ? data.value.details[selectedId.value] : undefined))
const selColor = computed(() => (selNode.value ? GRAPH_NODE_COLOR[selNode.value.type] : ''))
const selIcon = computed(() => (selNode.value ? TYPE_META[selNode.value.type].icon : ''))
const selTypeName = computed(() => (selNode.value ? TYPE_META[selNode.value.type].name : ''))

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
/**
 * 查看档案:企业类节点带 taxpayerId,直接进该户档案;
 * 人员 / 资金账户等节点没有纳税人主体,退化为按名称检索,不假装能定位到某一户。
 */
function viewArchive() {
  const n = selNode.value
  if (!n) return
  if (n.taxpayerId) router.push(`/archive?taxpayerId=${encodeURIComponent(n.taxpayerId)}`)
  else router.push(`/archive?keyword=${encodeURIComponent(n.label)}`)
}
/** 当前选中节点是否可直接进档案(用于按钮文案) */
const canViewArchive = computed(() => !!(selNode.value && selNode.value.taxpayerId))
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
            <GraphCanvas
              :nodes="data.nodes"
              :edges="data.edges"
              :selected-id="selectedId"
              @select="selectNode"
            />

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
                  {{ canViewArchive ? '查看档案' : '按名称检索' }}
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

/* 画布已抽为 components/graph/GraphCanvas.vue,其样式随组件迁移 */

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
