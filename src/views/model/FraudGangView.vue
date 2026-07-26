<script setup lang="ts">
/**
 * 智能模型 · 虚开团伙识别(《需求文档》3.7 / 4.3.2)
 * 无设计稿;布局范式参照「风险线索池」的筛选 + 列表,下钻区复用「关联图谱分析」的画布组件。
 * 与风险评分模型的刻意区分:
 *   - 单位是「团伙」不是「户」,主视觉是结构模式与子图拓扑,不是分值排序条;
 *   - 归因不是 SHAP 贡献值,而是「认定依据」证据清单(命中 / 未命中都列出)。
 * 点击团伙行在列表下方原地展开子图,不用抽屉——子图需要横向空间,抽屉会压扁画布。
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { GangPattern, GangQuery, GangRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ModelNotice from '@/components/common/ModelNotice.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterField from '@/components/common/FilterField.vue'
import FilterChip from '@/components/common/FilterChip.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import Toast from '@/components/common/Toast.vue'
import GraphCanvas from '@/components/graph/GraphCanvas.vue'
import type { SortDir, TableColumn } from '@/components/common/table'
import {
  GANG_PATTERN_LABEL,
  GANG_PATTERN_NOTE,
  GANG_STATUS_LABEL,
  GANG_STATUS_TONE,
  RISK_LABEL,
  RISK_TONE,
  toneClass,
} from '@/components/common/tone'

const route = useRoute()
const router = useRouter()

/* ---------------- 筛选状态(与 URL query 同步) ---------------- */
const keyword = ref('')
const districtCode = ref('all')
const patterns = ref<GangPattern[]>([])
const sortKey = ref('suspicion')
const sortDir = ref<SortDir>(-1)
const page = ref(1)
const pageSize = ref(20)

function readQuery() {
  const q = route.query
  keyword.value = typeof q.keyword === 'string' ? q.keyword : ''
  districtCode.value = typeof q.district === 'string' ? q.district : 'all'
  patterns.value = typeof q.pattern === 'string' && q.pattern ? (q.pattern.split(',') as GangPattern[]) : []
  sortKey.value = typeof q.sort === 'string' ? q.sort : 'suspicion'
  sortDir.value = q.dir === 'asc' ? 1 : -1
  page.value = typeof q.page === 'string' ? Math.max(1, parseInt(q.page, 10) || 1) : 1
}

function writeQuery() {
  const q: Record<string, string> = {}
  if (keyword.value) q.keyword = keyword.value
  if (districtCode.value !== 'all') q.district = districtCode.value
  if (patterns.value.length) q.pattern = patterns.value.join(',')
  if (sortKey.value !== 'suspicion') q.sort = sortKey.value
  if (sortDir.value === 1) q.dir = 'asc'
  if (page.value > 1) q.page = String(page.value)
  if (openId.value) q.gang = openId.value
  router.replace({ query: q })
}

const query = computed<GangQuery>(() => ({
  keyword: keyword.value,
  districtCode: districtCode.value,
  patterns: patterns.value,
  sortKey: sortKey.value,
  sortDir: sortDir.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const filters = useResource(() => api.model.getGangFilters())
const list = useResource(() => api.model.getGangs(query.value), { isEmpty: (d) => d.items.length === 0 })

function reload() {
  writeQuery()
  list.load()
}

onMounted(() => {
  readQuery()
  filters.load()
  list.load()
  // 支持带 ?gang=XK2026-xxxx 直接进入某个团伙的下钻视图
  const g = route.query.gang
  if (typeof g === 'string' && g) openGang(g)
})

/* ---------------- 筛选 / 排序 / 分页 ---------------- */
function search() {
  page.value = 1
  reload()
}
function reset() {
  keyword.value = ''
  districtCode.value = 'all'
  patterns.value = []
  page.value = 1
  reload()
}
function togglePattern(p: GangPattern) {
  const i = patterns.value.indexOf(p)
  if (i >= 0) patterns.value.splice(i, 1)
  else patterns.value.push(p)
  search()
}
function sortBy(key: string) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 1 ? -1 : 1
  else {
    sortKey.value = key
    sortDir.value = -1
  }
  page.value = 1
  reload()
}
function onPageChange(p: number) {
  page.value = p
  reload()
}
function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  reload()
}

/* ---------------- 团伙下钻 ---------------- */
const openId = ref('')
const detail = useResource(() => api.model.getGangDetail(openId.value))
const gd = computed(() => detail.data.value)
const selectedNode = ref('')
const drillEl = ref<HTMLElement | null>(null)
const evidenceEl = ref<HTMLElement | null>(null)

async function openGang(id: string, target: 'graph' | 'evidence' = 'graph') {
  const changed = openId.value !== id
  openId.value = id
  writeQuery()
  if (changed) {
    await detail.load()
    selectedNode.value = gd.value ? gd.value.coreId : ''
  }
  await nextTick()
  const el = target === 'evidence' ? evidenceEl.value : drillEl.value
  if (el) el.scrollIntoView({ block: 'nearest' })
}
function onRowClick(row: GangRow) {
  openGang(row.id)
}
function closeGang() {
  openId.value = ''
  writeQuery()
}

/** 命中项占可疑度的比重,用于证据条归一 */
const maxEvidence = computed(() => {
  if (!gd.value) return 1
  return gd.value.evidences.reduce((m, e) => (e.weight > m ? e.weight : m), 0) || 1
})

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}
function viewMemberArchive(taxId: string) {
  router.push(`/archive?taxId=${encodeURIComponent(taxId)}`)
}

/* ---------------- 表格 ---------------- */
const columns: TableColumn[] = [
  { key: 'id', label: '团伙编号', width: '122px', numeric: true, sortable: false },
  { key: 'pattern', label: '结构模式', width: '112px', sortable: false },
  { key: 'memberCount', label: '成员数', width: '82px', align: 'right', numeric: true },
  { key: 'invoiceAmount', label: '涉票金额(万)', width: '118px', align: 'right', numeric: true },
  { key: 'coreName', label: '核心节点', ellipsis: true, sortable: false },
  { key: 'district', label: '所属区县', width: '86px', sortable: false },
  { key: 'suspicion', label: '可疑度评分', width: '146px' },
  { key: 'status', label: '核查状态', width: '90px', sortable: false },
  { key: 'discoveredAt', label: '识别时间', width: '100px', numeric: true, sortable: false },
  { key: 'actions', label: '操作', width: '140px', sortable: false },
]
const rowKey = (r: GangRow) => r.id
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })
</script>

<template>
  <div class="gang">
    <PageHeader title="虚开团伙识别" breadcrumb="首页 / 智能模型 / 虚开团伙识别">
      <template #actions>
        <span v-if="filters.data.value" class="gang__upd num">识别批次 {{ filters.data.value.updatedAt }}</span>
        <button type="button" class="btn" @click="toast('演示环境:团伙清单导出功能待接入')">导出团伙清单</button>
        <button type="button" class="btn btn--primary" @click="toast('演示环境:团伙立案移送需连接稽查系统')">
          移送稽查
        </button>
      </template>
    </PageHeader>

    <ModelNotice extra="团伙识别基于图结构与开票行为特征" />

    <div class="gang__body">
      <div v-if="filters.data.value" class="gang__kpis">
        <MetricCard
          v-for="k in filters.data.value.kpis"
          :key="k.label"
          :label="k.label"
          :value="k.value"
          :unit="k.unit"
          :accent="k.accent"
          variant="card"
        />
      </div>

      <FilterBar>
        <FilterField label="团伙编号 / 核心节点">
          <BaseInput v-model="keyword" placeholder="请输入关键字" width="220px" @enter="search" />
        </FilterField>
        <FilterField label="所属区县">
          <BaseSelect
            v-model="districtCode"
            :options="filters.data.value ? filters.data.value.districts : []"
            width="150px"
            @update:model-value="search"
          />
        </FilterField>
        <div class="gang__actions">
          <button type="button" class="btn btn--primary" @click="search">查询</button>
          <button type="button" class="btn" @click="reset">重置</button>
        </div>

        <template #chips>
          <div class="gang__chip-group">
            <span class="gang__chip-label">结构模式</span>
            <FilterChip
              v-for="p in filters.data.value ? filters.data.value.patterns : []"
              :key="p.value"
              :active="patterns.indexOf(p.value as GangPattern) >= 0"
              :count="p.count"
              @toggle="togglePattern(p.value as GangPattern)"
            >
              {{ p.label }}
            </FilterChip>
          </div>
        </template>
      </FilterBar>

      <div class="gang__list">
        <div class="gang__toolbar">
          <span class="gang__toolbar-title">团伙清单</span>
          <span class="gang__toolbar-total num">共 {{ total }} 个</span>
          <span class="gang__toolbar-tip">点击行展开团伙子图</span>
        </div>

        <StateBlock
          v-if="list.status.value === 'empty' || list.status.value === 'error'"
          :status="list.status.value"
          :error="list.error.value"
          empty-text="未识别到符合条件的团伙"
          empty-hint="可尝试放宽结构模式或区县筛选"
          @retry="list.load()"
        />
        <DataTable
          v-else
          :columns="columns"
          :rows="rows"
          :row-key="rowKey"
          density="compact"
          clickable
          sortable
          :sort-key="sortKey"
          :sort-dir="sortDir"
          :active-key="openId"
          :loading="list.status.value === 'loading' || list.status.value === 'idle'"
          :skeleton-rows="10"
          @sort="sortBy"
          @row-click="onRowClick"
        >
          <template #cell-id="{ row }">
            <span class="gang__id">{{ row.id }}</span>
          </template>
          <template #cell-pattern="{ row }">
            <span class="pat">
              <span class="pat__ico" :class="`pat__ico--${row.pattern}`"></span>
              <span class="pat__txt">
                <b>{{ GANG_PATTERN_LABEL[row.pattern] }}</b>
                <i>{{ GANG_PATTERN_NOTE[row.pattern] }}</i>
              </span>
            </span>
          </template>
          <template #cell-memberCount="{ row }">{{ row.memberCount }} 户</template>
          <template #cell-invoiceAmount="{ row }">{{ fmt(row.invoiceAmount) }}</template>
          <template #cell-suspicion="{ row }">
            <div class="sus" :class="toneClass(RISK_TONE[row.level])">
              <div class="sus__track"><div class="sus__fill" :style="{ width: row.suspicion + '%' }"></div></div>
              <span class="sus__num num">{{ row.suspicion.toFixed(1) }}</span>
            </div>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="GANG_STATUS_TONE[row.status]" variant="dot">
              {{ GANG_STATUS_LABEL[row.status] }}
            </BaseBadge>
          </template>
          <template #cell-actions="{ row }">
            <span class="gang__link" @click.stop="openGang(row.id, 'graph')">查看子图</span>
            <span class="gang__link" @click.stop="openGang(row.id, 'evidence')">查看归因</span>
          </template>
        </DataTable>

        <Pagination
          :total="total"
          :page="page"
          :page-size="pageSize"
          @update:page="onPageChange"
          @update:page-size="onPageSizeChange"
        />
      </div>

      <!-- ══════════ 团伙下钻 ══════════ -->
      <div v-if="openId" ref="drillEl" class="gang__drill">
        <div class="gang__sec">
          <span class="gang__sec-tick"></span>
          <span class="gang__sec-title">团伙下钻 · {{ openId }}</span>
          <span v-if="gd" class="gang__sec-note">{{ gd.summary }}</span>
          <span class="gang__sec-close" @click="closeGang">收起 ✕</span>
        </div>

        <StateBlock :status="detail.status.value" :error="detail.error.value" @retry="detail.load()">
          <template v-if="gd">
            <div class="gang__drill-row">
              <PanelCard
                :title="`团伙子图 · ${GANG_PATTERN_LABEL[gd.pattern]}结构`"
                :subtitle="GANG_PATTERN_NOTE[gd.pattern]"
                class="gang__graph"
              >
                <GraphCanvas
                  :nodes="gd.nodes"
                  :edges="gd.edges"
                  :selected-id="selectedNode"
                  :width="760"
                  :height="420"
                  :chips="[`${GANG_PATTERN_LABEL[gd.pattern]}结构`, '团伙内 1 层关联']"
                  @select="selectedNode = $event"
                />
              </PanelCard>

              <PanelCard title="成员清单" :subtitle="`${gd.members.length} 户 · 按风险分降序`" class="gang__members">
                <div class="mem-list">
                  <div
                    v-for="m in gd.members"
                    :key="m.nodeId"
                    class="mem"
                    :class="{ 'mem--on': m.nodeId === selectedNode }"
                    @click="selectedNode = m.nodeId"
                  >
                    <div class="mem__top">
                      <span class="mem__name">{{ m.name }}</span>
                      <BaseBadge :tone="RISK_TONE[m.level]">{{ RISK_LABEL[m.level] }}</BaseBadge>
                    </div>
                    <div class="mem__mid">
                      <span class="mem__role">{{ m.role }}</span>
                      <span class="mem__tax num">{{ m.taxId }}</span>
                    </div>
                    <div class="mem__score" :class="toneClass(RISK_TONE[m.level])">
                      <span class="mem__k">风险分</span>
                      <div class="mem__track"><div class="mem__fill" :style="{ width: m.score + '%' }"></div></div>
                      <span class="mem__v num">{{ m.score.toFixed(1) }}</span>
                    </div>
                    <div class="mem__amt num">涉票 {{ fmt(m.invoiceAmount) }} 万元</div>
                    <div class="mem__note">{{ m.note }}</div>
                    <span class="mem__link" @click.stop="viewMemberArchive(m.taxId)">查看档案</span>
                  </div>
                </div>
              </PanelCard>
            </div>

            <div ref="evidenceEl">
              <PanelCard
                title="可疑度归因 · 认定依据"
                :subtitle="`可疑度 ${gd.suspicion.toFixed(1)} 分 = 各命中项贡献之和`"
              >
              <div class="ev">
                <div v-for="e in gd.evidences" :key="e.name" class="ev__row" :class="{ 'ev__row--off': !e.hit }">
                  <span class="ev__mark">{{ e.hit ? '✓' : '—' }}</span>
                  <div class="ev__main">
                    <div class="ev__name">{{ e.name }}</div>
                    <div class="ev__detail">{{ e.detail }}</div>
                  </div>
                  <div class="ev__bar">
                    <div class="ev__track">
                      <div class="ev__fill" :style="{ width: `${(e.weight / maxEvidence) * 100}%` }"></div>
                    </div>
                  </div>
                  <span class="ev__w num">{{ e.hit ? `+${e.weight.toFixed(1)}` : '0' }}</span>
                </div>
              </div>
                <p class="ev__warn">
                  认定依据为图结构与开票行为的统计特征,不等同于虚开事实;是否构成虚开须经调查取证与法定程序认定。
                </p>
              </PanelCard>
            </div>
          </template>
        </StateBlock>
      </div>
    </div>

    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.gang {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.gang__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.gang__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.gang__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.gang__actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.gang__actions .btn {
  height: 32px;
}
.gang__chip-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.gang__chip-label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  flex: none;
}

/* ---------- 列表 ---------- */
.gang__list {
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
}
.gang__toolbar {
  height: 46px;
  flex: none;
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: var(--space-3);
}
.gang__toolbar-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.gang__toolbar-total {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.gang__toolbar-tip {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.gang__id {
  color: var(--color-primary);
  font-weight: var(--fw-medium);
}
.gang__link {
  color: var(--color-primary);
  cursor: pointer;
  margin-right: var(--space-3);
}
.gang__link:last-child {
  margin-right: 0;
}
.gang__link:hover {
  text-decoration: underline;
}

/* 结构模式:小图示 + 名称 */
.pat {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.pat__ico {
  width: 15px;
  height: 15px;
  flex: none;
  border: 1.5px solid var(--color-primary);
}
/* 环状:圆环 */
.pat__ico--ring {
  border-radius: 50%;
}
/* 星状:实心中心点 + 外框 */
.pat__ico--star {
  border-radius: 50%;
  background: radial-gradient(circle, var(--color-primary) 0 3px, transparent 3px);
}
/* 链状:斜向单线 */
.pat__ico--chain {
  border: none;
  border-top: 1.5px solid var(--color-primary);
  height: 8px;
  transform: rotate(-20deg);
}
.pat__txt b {
  font-weight: var(--fw-medium);
}
.pat__txt i {
  font-style: normal;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-left: 5px;
}

/* 可疑度条 */
.sus {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.sus__track {
  flex: 1;
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  min-width: 0;
}
.sus__fill {
  height: 8px;
  border-radius: 1px;
  background: var(--tone-main);
}
.sus__num {
  width: 40px;
  flex: none;
  text-align: right;
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}

/* ---------- 下钻 ---------- */
.gang__drill {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.gang__sec {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.gang__sec-tick {
  width: 3px;
  height: 13px;
  background: var(--color-primary);
  flex: none;
}
.gang__sec-title {
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
}
.gang__sec-note {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gang__sec-close {
  margin-left: auto;
  flex: none;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  cursor: pointer;
}
.gang__sec-close:hover {
  color: var(--color-primary);
}

.gang__drill-row {
  display: grid;
  grid-template-columns: 1fr 330px;
  gap: var(--space-4);
  height: 480px;
}
.gang__graph :deep(.panel-card__body),
.gang__members :deep(.panel-card__body) {
  padding: var(--space-3);
  overflow: hidden;
}
.mem-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.mem {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 9px 12px;
  cursor: pointer;
  position: relative;
  transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease;
}
.mem:hover {
  background: var(--color-row-hover);
}
.mem--on {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}
.mem__top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.mem__name {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mem__mid {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 3px;
}
.mem__role {
  font-size: var(--fs-micro);
  color: var(--color-primary);
  background: var(--color-panel);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-control);
  padding: 0 5px;
}
.mem__tax {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.mem__score {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}
.mem__k {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  flex: none;
}
.mem__track {
  flex: 1;
  height: 6px;
  min-width: 0;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.mem__fill {
  height: 6px;
  border-radius: 1px;
  background: var(--tone-main);
}
.mem__v {
  font-size: var(--fs-micro);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
  width: 32px;
  text-align: right;
  flex: none;
}
.mem__amt {
  font-size: var(--fs-micro);
  color: var(--color-neutral-700);
  margin-top: 4px;
}
.mem__note {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  margin-top: 2px;
  line-height: 1.5;
}
.mem__link {
  position: absolute;
  right: 12px;
  bottom: 9px;
  font-size: var(--fs-micro);
  color: var(--color-primary);
}
.mem__link:hover {
  text-decoration: underline;
}

/* ---------- 认定依据 ---------- */
.ev {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.ev__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 9px 14px;
}
.ev__row--off {
  background: var(--color-neutral-100);
}
.ev__mark {
  width: 18px;
  flex: none;
  text-align: center;
  font-weight: var(--fw-semibold);
  color: var(--color-risk-high);
}
.ev__row--off .ev__mark {
  color: var(--color-neutral-500);
}
.ev__main {
  width: 380px;
  flex: none;
  min-width: 0;
}
.ev__name {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.ev__row--off .ev__name {
  color: var(--color-neutral-600);
  font-weight: var(--fw-regular);
}
.ev__detail {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 2px;
}
.ev__bar {
  flex: 1;
  min-width: 0;
}
.ev__track {
  height: 10px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.ev__fill {
  height: 10px;
  border-radius: 1px;
  background: var(--color-risk-high);
}
.ev__w {
  width: 52px;
  flex: none;
  text-align: right;
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  color: var(--color-risk-high-text);
}
.ev__row--off .ev__w {
  color: var(--color-neutral-500);
}
.ev__warn {
  margin: var(--space-3) 0 0;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-neutral-200);
  font-size: var(--fs-label);
  color: var(--color-risk-high-text);
  line-height: 1.6;
}
</style>
