<script setup lang="ts">
/**
 * 税源监控 · 重点税源监控(《需求文档》6.1)
 * 无设计稿;这是「盯人」的清单页 —— 对象是有责任管理员的固定名录,不是模型算出来的名单。
 * 版式:分档标签页(A/B/C) + 预警分组区 + 名录表(末列内联迷你趋势)。
 * 点击行整页切换到「监控详情态」(不是抽屉、不是内嵌展开):
 *   多指标同步时间轴需要横向空间,交叉印证才看得出「税额掉了但用电没掉」。
 * 迷你趋势线用轻量 SVG(Sparkline),不为每行创建 ECharts 实例。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { KeyAlertType, KeySourceQuery, KeySourceRow, TaxSourceTier } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import TabNav from '@/components/common/TabNav.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import Toast from '@/components/common/Toast.vue'
import Sparkline from '@/components/charts/Sparkline.vue'
import MultiTrack from '@/components/charts/MultiTrack.vue'
import type { SortDir, TableColumn } from '@/components/common/table'
import {
  DELTA_TONE,
  KEY_STATUS_LABEL,
  KEY_STATUS_TONE,
  RISK_TONE,
  toneClass,
} from '@/components/common/tone'

const route = useRoute()
const router = useRouter()

/* ---------------- 清单态:筛选(与 URL query 同步) ---------------- */
const tier = ref<TaxSourceTier>('A')
const keyword = ref('')
const districtCode = ref('all')
const alertType = ref('all')
const sortKey = ref('yearTax')
const sortDir = ref<SortDir>(-1)
const page = ref(1)
const pageSize = ref(20)

/** 详情态:选中的纳税人;为空即清单态 */
const openTaxId = ref('')

function readQuery() {
  const q = route.query
  if (typeof q.tier === 'string' && q.tier) tier.value = q.tier as TaxSourceTier
  keyword.value = typeof q.keyword === 'string' ? q.keyword : ''
  districtCode.value = typeof q.district === 'string' ? q.district : 'all'
  alertType.value = typeof q.alert === 'string' ? q.alert : 'all'
  sortKey.value = typeof q.sort === 'string' ? q.sort : 'yearTax'
  sortDir.value = q.dir === 'asc' ? 1 : -1
  page.value = typeof q.page === 'string' ? Math.max(1, parseInt(q.page, 10) || 1) : 1
  openTaxId.value = typeof q.taxId === 'string' ? q.taxId : ''
}

function writeQuery() {
  const q: Record<string, string> = {}
  if (tier.value !== 'A') q.tier = tier.value
  if (keyword.value) q.keyword = keyword.value
  if (districtCode.value !== 'all') q.district = districtCode.value
  if (alertType.value !== 'all') q.alert = alertType.value
  if (sortKey.value !== 'yearTax') q.sort = sortKey.value
  if (sortDir.value === 1) q.dir = 'asc'
  if (page.value > 1) q.page = String(page.value)
  if (openTaxId.value) q.taxId = openTaxId.value
  router.replace({ query: q })
}

const query = computed<KeySourceQuery>(() => ({
  keyword: keyword.value,
  tier: tier.value,
  districtCode: districtCode.value,
  alertType: alertType.value,
  sortKey: sortKey.value,
  sortDir: sortDir.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const filters = useResource(() => api.taxsource.getKeySourceFilters())
const list = useResource(() => api.taxsource.getKeySources(query.value), { isEmpty: (d) => d.items.length === 0 })
const detail = useResource(() => api.taxsource.getKeySourceDetail(openTaxId.value))

const ft = computed(() => filters.data.value)
const dt = computed(() => detail.data.value)

onMounted(() => {
  readQuery()
  filters.load()
  list.load()
  if (openTaxId.value) detail.load()
})

function reload() {
  writeQuery()
  list.load()
}
function search() {
  page.value = 1
  reload()
}
function reset() {
  keyword.value = ''
  districtCode.value = 'all'
  alertType.value = 'all'
  page.value = 1
  reload()
}
function changeTier(v: string) {
  tier.value = v as TaxSourceTier
  page.value = 1
  reload()
}
/** 点击预警分组过滤名录;再点一次取消 */
function toggleAlert(t: KeyAlertType) {
  alertType.value = alertType.value === t ? 'all' : t
  page.value = 1
  reload()
}
function clearAlert() {
  alertType.value = 'all'
  page.value = 1
  reload()
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

/* ---------------- 清单态 ⇄ 详情态 ---------------- */
function openDetail(row: KeySourceRow) {
  openTaxId.value = row.taxId
  writeQuery()
  detail.load()
}
function backToList() {
  openTaxId.value = ''
  writeQuery()
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}
function viewArchive() {
  if (dt.value) router.push(`/archive?taxId=${encodeURIComponent(dt.value.taxId)}`)
}

/* ---------------- 展示辅助 ---------------- */
const tierTabs = computed(() => (ft.value ? ft.value.tiers.map((t) => ({ value: t.value, label: t.label })) : []))
const tierCounts = computed(() => {
  const m: Record<string, number> = {}
  if (ft.value) ft.value.tiers.forEach((t) => (m[t.value] = t.count))
  return m
})
const tierNotes = computed(() => {
  const m: Record<string, string> = {}
  if (ft.value) ft.value.tiers.forEach((t) => (m[t.value] = t.desc))
  return m
})
/** 当前预警过滤对应的分组(用于名录标题提示) */
const activeAlert = computed(() =>
  ft.value ? ft.value.alertGroups.filter((g) => g.type === alertType.value)[0] : undefined,
)
/** 支撑数据的立场 → 语气 */
const STANCE_TONE: Record<string, 'danger' | 'success' | 'neutral'> = {
  support: 'danger',
  against: 'success',
  neutral: 'neutral',
}
const STANCE_MARK: Record<string, string> = { support: '支持', against: '排除', neutral: '参考' }
/** 可能性分档 → 语气 */
function likelihoodTone(v: number) {
  return v >= 50 ? 'danger' : v >= 30 ? 'warn' : 'neutral'
}

const columns: TableColumn[] = [
  { key: 'name', label: '纳税人名称', ellipsis: true, sortable: false },
  { key: 'tier', label: '分档', width: '64px', align: 'center', sortable: false },
  { key: 'industry', label: '行业', width: '92px', sortable: false },
  { key: 'manager', label: '责任管理员', width: '98px', sortable: false },
  { key: 'yearTax', label: '本年入库(万)', width: '120px', align: 'right', numeric: true },
  { key: 'yoy', label: '同比', width: '88px', align: 'right', numeric: true },
  { key: 'burdenRate', label: '税负率', width: '90px', align: 'right', numeric: true },
  { key: 'status', label: '状态', width: '86px', sortable: false },
  { key: 'spark', label: '近 12 期税额', width: '100px', sortable: false },
]
const rowKey = (r: KeySourceRow) => r.taxId
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))
const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })
</script>

<template>
  <div class="ks">
    <PageHeader
      :title="openTaxId && dt ? `重点税源监控 · ${dt.name}` : '重点税源监控'"
      :breadcrumb="openTaxId ? '首页 / 税源监控 / 重点税源监控 / 监控详情' : '首页 / 税源监控 / 重点税源监控'"
    >
      <template #actions>
        <span v-if="ft" class="ks__upd num">数据更新 {{ ft.updatedAt }}</span>
        <template v-if="openTaxId">
          <button type="button" class="btn" @click="viewArchive">查看一户式档案</button>
          <button type="button" class="btn btn--primary" @click="backToList">返回名录</button>
        </template>
        <template v-else>
          <button type="button" class="btn" @click="toast('演示环境:名录导出功能待接入')">导出名录</button>
          <button type="button" class="btn btn--primary" @click="toast('演示环境:走访台账需连接征管系统')">
            登记走访
          </button>
        </template>
      </template>
    </PageHeader>

    <!-- ══════════════════ 清单态 ══════════════════ -->
    <div v-if="!openTaxId" class="ks__body">
      <div v-if="ft" class="ks__kpis">
        <MetricCard
          v-for="k in ft.kpis"
          :key="k.label"
          :label="k.label"
          :value="k.value"
          :unit="k.unit"
          :accent="k.accent"
          variant="card"
        />
      </div>

      <!-- 预警区:独立于名录之上,按触发类型分组,点击过滤下方表格 -->
      <PanelCard title="当前预警" subtitle="按触发类型分组 · 点击可过滤下方名录" class="ks__alerts">
        <template #actions>
          <span v-if="alertType !== 'all'" class="ks__clear" @click="clearAlert">清除过滤 ✕</span>
        </template>
        <div v-if="ft" class="al">
          <div
            v-for="g in ft.alertGroups"
            :key="g.type"
            class="al__card"
            :class="[toneClass(RISK_TONE[g.level]), { 'al__card--on': alertType === g.type }]"
            @click="toggleAlert(g.type)"
          >
            <div class="al__top">
              <span class="al__dot"></span>
              <span class="al__label">{{ g.label }}</span>
            </div>
            <div class="al__count num">{{ g.count }}<i>户</i></div>
            <div class="al__desc">{{ g.desc }}</div>
          </div>
        </div>
      </PanelCard>

      <!-- 分档标签页 + 名录 -->
      <div class="ks__list">
        <div class="ks__tiers">
          <TabNav
            :model-value="tier"
            :tabs="tierTabs"
            :counts="tierCounts"
            :notes="tierNotes"
            @update:model-value="changeTier"
          />
        </div>

        <div class="ks__toolbar">
          <BaseInput v-model="keyword" placeholder="纳税人名称 / 识别号" width="200px" @enter="search" />
          <BaseSelect
            v-model="districtCode"
            :options="ft ? ft.districts : []"
            width="140px"
            @update:model-value="search"
          />
          <button type="button" class="btn btn--primary" @click="search">查询</button>
          <button type="button" class="btn" @click="reset">重置</button>
          <span class="ks__total num">共 {{ total }} 户</span>
          <span v-if="activeAlert" class="ks__filter-tag">
            已按「{{ activeAlert.label }}」过滤
            <i @click="clearAlert">✕</i>
          </span>
          <span class="ks__tip">点击行进入监控详情</span>
        </div>

        <StateBlock
          v-if="list.status.value === 'empty' || list.status.value === 'error'"
          :status="list.status.value"
          :error="list.error.value"
          empty-text="该分档下未查询到符合条件的重点税源"
          empty-hint="可切换分档或清除预警过滤"
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
          :loading="list.status.value === 'loading' || list.status.value === 'idle'"
          :skeleton-rows="12"
          @sort="sortBy"
          @row-click="openDetail"
        >
          <template #cell-name="{ row }">
            <span class="ks__name">{{ row.name }}</span>
            <span v-for="a in row.alerts" :key="a" class="ks__flag">!</span>
          </template>
          <template #cell-tier="{ row }">
            <span class="ks__tier" :class="`ks__tier--${row.tier.toLowerCase()}`">{{ row.tier }}</span>
          </template>
          <template #cell-yearTax="{ row }">{{ money(row.yearTax) }}</template>
          <template #cell-yoy="{ row }">
            <span :class="toneClass(DELTA_TONE[row.yoyTone])" class="ks__yoy">{{ row.yoy }}</span>
          </template>
          <template #cell-burdenRate="{ row }">{{ row.burdenRate.toFixed(2) }}%</template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="KEY_STATUS_TONE[row.status]" variant="dot">
              {{ KEY_STATUS_LABEL[row.status] }}
            </BaseBadge>
          </template>
          <template #cell-spark="{ row }">
            <Sparkline :values="row.spark" />
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
    </div>

    <!-- ══════════════════ 详情态 ══════════════════ -->
    <div v-else class="ks__body">
      <StateBlock :status="detail.status.value" :error="detail.error.value" @retry="detail.load()">
        <template v-if="dt">
          <div class="dh">
            <span class="dh__back" @click="backToList">‹ 返回名录</span>
            <span class="dh__name">{{ dt.name }}</span>
            <span class="ks__tier" :class="`ks__tier--${dt.tier.toLowerCase()}`">{{ dt.tier }}</span>
            <BaseBadge :tone="KEY_STATUS_TONE[dt.status]" variant="dot">{{ KEY_STATUS_LABEL[dt.status] }}</BaseBadge>
            <span v-for="a in dt.alerts" :key="a.type" class="dh__alert" :class="toneClass(RISK_TONE[a.level])">
              {{ a.label }}
            </span>
          </div>

          <PanelCard title="档案摘要" subtitle="监控要素">
            <div class="prof">
              <div v-for="p in dt.profile" :key="p.key" class="prof__row">
                <span class="prof__k">{{ p.key }}</span>
                <span class="prof__v" :class="{ num: p.numeric }">{{ p.value }}</span>
              </div>
            </div>
          </PanelCard>

          <PanelCard
            title="多指标同步时间轴"
            subtitle="共用时间轴 · 量纲不归一 · 悬停竖线贯通全部轨道,便于交叉印证"
            class="ks__track"
          >
            <MultiTrack :periods="dt.periods" :tracks="dt.tracks" />
          </PanelCard>

          <PanelCard title="下降归因" :subtitle="`候选原因 ${dt.causes.length} 项 · 按可能性降序`">
            <p class="cz__summary">{{ dt.declineSummary }}</p>
            <div class="cz">
              <div v-for="c in dt.causes" :key="c.key" class="cz__card" :class="`tone-${likelihoodTone(c.likelihood)}`">
                <div class="cz__head">
                  <span class="cz__name">{{ c.name }}</span>
                  <span class="cz__like num">可能性 {{ c.likelihood }}%</span>
                </div>
                <div class="cz__bar"><div class="cz__fill" :style="{ width: c.likelihood + '%' }"></div></div>
                <p class="cz__conclusion">{{ c.conclusion }}</p>
                <div class="cz__ev">
                  <div v-for="(e, i) in c.evidences" :key="i" class="ev" :class="`tone-${STANCE_TONE[e.stance]}`">
                    <span class="ev__mark">{{ STANCE_MARK[e.stance] }}</span>
                    <span class="ev__label">{{ e.label }}</span>
                    <span class="ev__value num">{{ e.value }}</span>
                  </div>
                </div>
              </div>
            </div>
            <p class="cz__warn">
              归因结论由指标交叉比对得出,仅用于确定核实方向;实际原因须经约谈核实或实地核查确认。
            </p>
          </PanelCard>
        </template>
      </StateBlock>
    </div>

    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.ks {
  /* 页面级令牌:预警卡户数不在全局字阶内(介于 --fs-h1 与指标卡 md 之间) */
  --ks-alert-count: 22px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.ks__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.ks__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
/* 可滚动的纵向 flex 容器:所有直接子项一律不收缩。
   PanelCard 自带 min-height:0,不加这条会在内容超出视口时被压扁到只剩标题栏。 */
.ks__body > * {
  flex: none;
}
.ks__kpis {
  flex: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

/* ---------- 预警区 ---------- */
.ks__alerts {
  flex: none;
}
.ks__clear {
  font-size: var(--fs-label);
  color: var(--color-primary);
  cursor: pointer;
}
.al {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
}
.al__card {
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--tone-main);
  border-radius: var(--radius-control);
  padding: 10px 14px;
  cursor: pointer;
  transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease;
}
.al__card:hover {
  background: var(--color-row-hover);
}
.al__card--on {
  background: var(--color-primary-tint);
  border-color: var(--color-primary);
  border-left-color: var(--tone-main);
}
.al__top {
  display: flex;
  align-items: center;
  gap: 6px;
}
.al__dot {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 50%;
  background: var(--tone-main);
}
.al__label {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-800);
}
.al__count {
  font-size: var(--ks-alert-count);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
  line-height: 1.3;
}
.al__count i {
  font-style: normal;
  font-size: var(--fs-label);
  font-weight: var(--fw-regular);
  color: var(--color-neutral-600);
  margin-left: 3px;
}
.al__desc {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  line-height: 1.5;
}

/* ---------- 名录 ---------- */
.ks__list {
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
}
.ks__tiers {
  flex: none;
  padding: 0 var(--space-3);
}
.ks__toolbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) 18px;
  border-bottom: var(--border-line);
}
.ks__toolbar .btn {
  height: 32px;
}
.ks__total {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-left: var(--space-2);
}
.ks__filter-tag {
  font-size: var(--fs-label);
  color: var(--color-primary);
  background: var(--color-primary-tint);
  border-radius: var(--radius-control);
  padding: 2px 8px;
}
.ks__filter-tag i {
  font-style: normal;
  cursor: pointer;
  margin-left: var(--space-1);
}
.ks__tip {
  margin-left: auto;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.ks__name {
  color: var(--color-neutral-900);
}
.ks__flag {
  color: var(--color-risk-high);
  font-weight: var(--fw-semibold);
  margin-left: 3px;
}
.ks__yoy {
  color: var(--tone-text);
  font-weight: var(--fw-semibold);
}
/* 分档标记:A 深、B 中、C 浅 */
.ks__tier {
  display: inline-block;
  min-width: 20px;
  text-align: center;
  font-size: var(--fs-micro);
  font-weight: var(--fw-semibold);
  color: var(--color-text-inverse);
  border-radius: var(--radius-control);
  padding: 1px 5px;
}
.ks__tier--a {
  background: var(--color-primary-deep);
}
.ks__tier--b {
  background: var(--color-primary);
}
.ks__tier--c {
  background: var(--color-secondary-steel);
}

/* ---------- 详情态 ---------- */
.dh {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
}
.dh__back {
  font-size: var(--fs-label);
  color: var(--color-primary);
  cursor: pointer;
  white-space: nowrap;
}
.dh__back:hover {
  text-decoration: underline;
}
.dh__name {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
}
.dh__alert {
  font-size: var(--fs-micro);
  color: var(--tone-text);
  background: var(--tone-tint);
  border: 1px solid var(--tone-main);
  border-radius: var(--radius-control);
  padding: 1px 7px;
}

.prof {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2) var(--space-4);
}
.prof__row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-neutral-200);
  padding-bottom: 5px;
}
.prof__k {
  width: 82px;
  flex: none;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.prof__v {
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ks__track {
  flex: none;
  height: 420px;
}
.ks__track :deep(.panel-card__body) {
  overflow: hidden;
}

/* ---------- 下降归因 ---------- */
.cz__summary {
  margin: 0 0 var(--space-3);
  font-size: var(--fs-aux);
  color: var(--color-neutral-800);
  line-height: 1.7;
  background: var(--color-neutral-100);
  border-left: 3px solid var(--color-primary);
  padding: 10px 14px;
}
.cz {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
}
.cz__card {
  border: 1px solid var(--color-neutral-200);
  border-top: 3px solid var(--tone-main);
  border-radius: var(--radius-control);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
}
.cz__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.cz__name {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  flex: 1;
  min-width: 0;
}
.cz__like {
  font-size: var(--fs-micro);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
  white-space: nowrap;
}
.cz__bar {
  height: 5px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  margin: 6px 0 8px;
}
.cz__fill {
  height: 5px;
  border-radius: 1px;
  background: var(--tone-main);
}
.cz__conclusion {
  margin: 0 0 var(--space-2);
  font-size: var(--fs-micro);
  color: var(--color-neutral-700);
  line-height: 1.6;
}
.cz__ev {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
  border-top: 1px solid var(--color-neutral-200);
  padding-top: var(--space-2);
}
.ev {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: var(--fs-micro);
}
.ev__mark {
  flex: none;
  color: var(--tone-text);
  background: var(--tone-tint);
  border-radius: var(--radius-control);
  padding: 0 4px;
}
.ev__label {
  color: var(--color-neutral-600);
  flex: none;
}
/* 支撑数据是判断依据,宁可折行也不截断 */
.ev__value {
  color: var(--color-neutral-800);
  min-width: 0;
  line-height: 1.5;
}
.cz__warn {
  margin: var(--space-3) 0 0;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-neutral-200);
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  line-height: 1.6;
}
</style>
