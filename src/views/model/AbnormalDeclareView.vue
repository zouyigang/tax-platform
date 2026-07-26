<script setup lang="ts">
/**
 * 智能模型 · 异常申报检测(《需求文档》4.3.3)
 * 无设计稿;布局范式:图在上、表在下、图表联动(与另外三页刻意区分)。
 * 方法上是**无监督离群检测**,不使用历史查实标签,表达的是
 * 「该户在同行群体中的位置有多偏」,而不是「该户有多像历史问题户」;
 * 因此对比基准是行业,切换行业即换一套样本分布,跨行业比较无意义。
 * 主可视化为平行坐标:同业样本铺底成分布带,选中企业高亮,冲出带外的即偏离维度。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { AbnormalQuery, AbnormalRow, DeviationDirection } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ModelNotice from '@/components/common/ModelNotice.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterField from '@/components/common/FilterField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import Toast from '@/components/common/Toast.vue'
import ParallelCoords from '@/components/charts/ParallelCoords.vue'
import type { SortDir, TableColumn } from '@/components/common/table'
import { RISK_LABEL, RISK_TONE, toneClass } from '@/components/common/tone'

const route = useRoute()
const router = useRouter()

/* ---------------- 筛选状态(与 URL query 同步) ---------------- */
const keyword = ref('')
const industryCode = ref('manufacture')
const sortKey = ref('score')
const sortDir = ref<SortDir>(-1)
const page = ref(1)
const pageSize = ref(10)
/** 当前选中企业(图与表共用同一个选中态) */
const selectedId = ref('')

function readQuery() {
  const q = route.query
  keyword.value = typeof q.keyword === 'string' ? q.keyword : ''
  if (typeof q.industry === 'string' && q.industry) industryCode.value = q.industry
  sortDir.value = q.dir === 'asc' ? 1 : -1
  page.value = typeof q.page === 'string' ? Math.max(1, parseInt(q.page, 10) || 1) : 1
  if (typeof q.taxId === 'string') selectedId.value = q.taxId
}

function writeQuery() {
  const q: Record<string, string> = {}
  if (keyword.value) q.keyword = keyword.value
  q.industry = industryCode.value
  if (sortDir.value === 1) q.dir = 'asc'
  if (page.value > 1) q.page = String(page.value)
  if (selectedId.value) q.taxId = selectedId.value
  router.replace({ query: q })
}

const query = computed<AbnormalQuery>(() => ({
  keyword: keyword.value,
  industryCode: industryCode.value,
  sortKey: sortKey.value,
  sortDir: sortDir.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const filters = useResource(() => api.model.getAbnormalFilters())
const chart = useResource(() => api.model.getAbnormalChart(industryCode.value))
const list = useResource(() => api.model.getAbnormals(query.value), { isEmpty: (d) => d.items.length === 0 })
const detail = useResource(() => api.model.getAbnormalDetail(selectedId.value))

const ch = computed(() => chart.data.value)
const dv = computed(() => detail.data.value)

onMounted(async () => {
  readQuery()
  await filters.load()
  // 未在 URL 指定行业时,采用后端给出的默认对比行业
  if (typeof route.query.industry !== 'string' && filters.data.value) {
    industryCode.value = filters.data.value.defaultIndustryCode
  }
  chart.load()
  await list.load()
  // 默认选中异常度最高的一户,让图上来就有高亮线
  if (!selectedId.value && list.data.value && list.data.value.items.length) {
    selectedId.value = list.data.value.items[0].taxId
  }
  if (selectedId.value) detail.load()
  writeQuery()
})

// 切换选中企业时重新取归因(图与右侧偏离面板同步)
watch(selectedId, (v) => {
  if (v) detail.load()
  writeQuery()
})

/* ---------------- 交互 ---------------- */
async function reload() {
  writeQuery()
  await list.load()
}
function search() {
  page.value = 1
  reload()
}
/** 切换对比行业:图、表、选中态整体换基准 */
async function changeIndustry() {
  page.value = 1
  selectedId.value = ''
  chart.load()
  await reload()
  if (list.data.value && list.data.value.items.length) selectedId.value = list.data.value.items[0].taxId
}
function reset() {
  keyword.value = ''
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
function onRowClick(row: AbnormalRow) {
  selectedId.value = row.taxId
}
/** 图上点线也能选中(含背景样本;背景样本无归因数据时面板给出空态) */
function onLineSelect(taxId: string) {
  if (taxId.indexOf('bg-') === 0) return
  selectedId.value = taxId
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}
function viewArchive() {
  if (dv.value) router.push(`/archive?taxId=${encodeURIComponent(dv.value.taxId)}`)
}

/* ---------------- 展示辅助 ---------------- */
/** 偏离方向 → 语气(偏离即异常,正常区间用中性) */
const DIR_TONE: Record<DeviationDirection, 'danger' | 'warn' | 'neutral'> = {
  high: 'danger',
  low: 'warn',
  normal: 'neutral',
}
const DIR_MARK: Record<DeviationDirection, string> = { high: '▲', low: '▼', normal: '·' }

const columns: TableColumn[] = [
  { key: 'rank', label: '排名', width: '58px', align: 'center', numeric: true, sortable: false },
  { key: 'taxpayerName', label: '纳税人名称', ellipsis: true, sortable: false },
  { key: 'period', label: '申报所属期', width: '104px', sortable: false },
  { key: 'score', label: '异常度', width: '146px' },
  { key: 'level', label: '异常等级', width: '90px', sortable: false },
  { key: 'topDeviations', label: '偏离最大的三个维度', sortable: false },
  { key: 'actions', label: '操作', width: '92px', sortable: false },
]
const rowKey = (r: AbnormalRow) => r.taxId
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))
</script>

<template>
  <div class="abn">
    <PageHeader title="异常申报检测" breadcrumb="首页 / 智能模型 / 异常申报检测">
      <template #actions>
        <span v-if="filters.data.value" class="abn__upd num">检测批次 {{ filters.data.value.updatedAt }}</span>
        <button type="button" class="btn" @click="toast('演示环境:离群清单导出功能待接入')">导出离群清单</button>
        <button type="button" class="btn btn--primary" @click="toast('演示环境:批量风险提示需连接风险任务服务')">
          批量风险提示
        </button>
      </template>
    </PageHeader>

    <ModelNotice :extra="ch ? ch.method : ''" />

    <div class="abn__body">
      <div v-if="filters.data.value" class="abn__kpis">
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
        <FilterField label="对比行业(基准)">
          <BaseSelect
            v-model="industryCode"
            :options="filters.data.value ? filters.data.value.industries : []"
            width="150px"
            @update:model-value="changeIndustry"
          />
        </FilterField>
        <FilterField label="纳税人名称 / 识别号">
          <BaseInput v-model="keyword" placeholder="请输入关键字" width="220px" @enter="search" />
        </FilterField>
        <span class="abn__tip">离群位置以同行业样本为参照,跨行业比较无意义</span>
        <div class="abn__actions">
          <button type="button" class="btn btn--primary" @click="search">查询</button>
          <button type="button" class="btn" @click="reset">重置</button>
        </div>
      </FilterBar>

      <!-- ══════════ 图:同业分布带 + 选中企业 ══════════ -->
      <div class="abn__row">
        <PanelCard
          :title="ch ? `${ch.industryName} · 多维指标平行坐标` : '多维指标平行坐标'"
          :subtitle="ch ? `同业样本 ${ch.sampleCount} 户 · 背景样本已脱敏` : ''"
          class="abn__chart"
        >
          <StateBlock :status="chart.status.value" :error="chart.error.value" @retry="chart.load()">
            <ParallelCoords
              v-if="ch"
              :dimensions="ch.dimensions"
              :samples="ch.samples"
              :highlight-id="selectedId"
              @select="onLineSelect"
            />
          </StateBlock>
        </PanelCard>

        <PanelCard
          title="维度偏离归因"
          :subtitle="dv ? `${dv.period} · 异常度 ${dv.score.toFixed(1)}` : ''"
          class="abn__dev"
        >
          <!-- 未选中任何企业时给出引导,而不是让四态容器停在「加载中」 -->
          <div v-if="!selectedId" class="dv__idle">请在下方列表中选择一户企业,查看其各维度偏离明细</div>
          <StateBlock
            v-else
            :status="detail.status.value"
            :error="detail.error.value"
            @retry="detail.load()"
          >
            <template v-if="dv">
              <div class="dv__head" :class="toneClass(RISK_TONE[dv.level])">
                <span class="dv__name">{{ dv.taxpayerName }}</span>
                <BaseBadge :tone="RISK_TONE[dv.level]">{{ RISK_LABEL[dv.level] }}</BaseBadge>
              </div>

              <div class="dv__list">
                <!-- 分位轴:0 —— 50(同业中位) —— 100,圆点即该户位置 -->
                <div v-for="it in dv.items" :key="it.key" class="dv" :class="`tone-${DIR_TONE[it.direction]}`">
                  <div class="dv__top">
                    <span class="dv__k">{{ it.name }}</span>
                    <span class="dv__z num">{{ DIR_MARK[it.direction] }} {{ Math.abs(it.z).toFixed(1) }}σ</span>
                  </div>
                  <div class="dv__axis">
                    <div class="dv__mid"></div>
                    <div class="dv__dot" :style="{ left: `${it.percentile}%` }"></div>
                  </div>
                  <div class="dv__vals num">
                    本户 {{ it.value }}<span class="dv__med">中位 {{ it.median }}</span>
                    <span class="dv__pct">同业分位 {{ it.percentile.toFixed(0) }}%</span>
                  </div>
                  <div v-if="it.direction !== 'normal'" class="dv__note">{{ it.note }}</div>
                </div>
              </div>

              <div class="dv__foot">
                <p class="dv__sum">{{ dv.summary }}</p>
                <p class="dv__sug">{{ dv.suggestion }}</p>
                <p class="dv__warn">
                  离群不等于违规:偏离同业中位数可能由经营模式差异导致,须经核实后方可定性。
                </p>
                <button type="button" class="btn dv__btn" @click="viewArchive">查看一户式档案</button>
              </div>
            </template>
          </StateBlock>
        </PanelCard>
      </div>

      <!-- ══════════ 表:异常度排序 ══════════ -->
      <div class="abn__list">
        <div class="abn__toolbar">
          <span class="abn__toolbar-title">异常度排序</span>
          <span class="abn__toolbar-total num">共 {{ total }} 户离群</span>
          <span class="abn__toolbar-tip">点击行在上方平行坐标中高亮该企业</span>
        </div>

        <StateBlock
          v-if="list.status.value === 'empty' || list.status.value === 'error'"
          :status="list.status.value"
          :error="list.error.value"
          empty-text="该行业本期未检出离群企业"
          empty-hint="可切换对比行业查看"
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
          :active-key="selectedId"
          :loading="list.status.value === 'loading' || list.status.value === 'idle'"
          :skeleton-rows="8"
          @sort="sortBy"
          @row-click="onRowClick"
        >
          <template #cell-rank="{ row }">
            <span class="abn__rank">{{ row.rank }}</span>
          </template>
          <template #cell-score="{ row }">
            <div class="sc" :class="toneClass(RISK_TONE[row.level])">
              <div class="sc__track"><div class="sc__fill" :style="{ width: row.score + '%' }"></div></div>
              <span class="sc__num num">{{ row.score.toFixed(1) }}</span>
            </div>
          </template>
          <template #cell-level="{ row }">
            <BaseBadge :tone="RISK_TONE[row.level]">{{ RISK_LABEL[row.level] }}</BaseBadge>
          </template>
          <template #cell-topDeviations="{ row }">
            <span
              v-for="d in row.topDeviations"
              :key="d.name"
              class="devtag"
              :class="`tone-${DIR_TONE[d.direction]}`"
            >
              {{ d.name }}
              <i class="devtag__v num">{{ d.deviation }}</i>
            </span>
          </template>
          <template #cell-actions="{ row }">
            <span class="abn__link" @click.stop="onRowClick(row)">查看归因</span>
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

    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.abn {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.abn__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.abn__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.abn__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.abn__tip {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  align-self: flex-end;
  padding-bottom: 7px;
}
.abn__actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.abn__actions .btn {
  height: 32px;
}

/* ---------- 图区 ---------- */
.abn__row {
  display: grid;
  grid-template-columns: 1fr 330px;
  gap: var(--space-4);
  height: 452px;
}
.abn__chart :deep(.panel-card__body) {
  overflow: hidden;
}
.abn__dev :deep(.panel-card__body) {
  padding: var(--space-3);
  overflow: hidden;
}

.dv__idle {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 var(--space-4);
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  line-height: 1.7;
}
.dv__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-left: 3px solid var(--tone-main);
  padding-left: 10px;
  margin-bottom: 10px;
}
.dv__name {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dv__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.dv__top {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.dv__k {
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dv__z {
  font-size: var(--fs-micro);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
  flex: none;
}
/* 分位轴:整条 = 同业 0–100 分位,中点为中位数 */
.dv__axis {
  position: relative;
  height: 6px;
  margin: 5px 0 3px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.dv__mid {
  position: absolute;
  left: 50%;
  top: -2px;
  width: 1px;
  height: 10px;
  background: var(--color-neutral-500);
}
.dv__dot {
  position: absolute;
  top: -2px;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border-radius: 50%;
  background: var(--tone-main);
  border: 2px solid var(--color-panel);
}
.dv__vals {
  font-size: var(--fs-micro);
  color: var(--color-neutral-700);
}
.dv__med {
  color: var(--color-neutral-500);
  margin-left: var(--space-2);
}
.dv__pct {
  color: var(--color-neutral-500);
  margin-left: var(--space-2);
}
.dv__note {
  font-size: var(--fs-micro);
  color: var(--tone-text);
  margin-top: 2px;
  line-height: 1.5;
}
.dv__foot {
  flex: none;
  margin-top: 10px;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-neutral-200);
}
.dv__sum,
.dv__sug,
.dv__warn {
  margin: 0;
  font-size: var(--fs-micro);
  line-height: 1.6;
}
.dv__sum {
  color: var(--color-neutral-800);
}
.dv__sug {
  color: var(--color-neutral-600);
  margin-top: 3px;
}
.dv__warn {
  color: var(--color-risk-high-text);
  margin-top: 5px;
}
.dv__btn {
  width: 100%;
  height: 30px;
  margin-top: var(--space-2);
}

/* ---------- 表区 ---------- */
.abn__list {
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
}
.abn__toolbar {
  height: 46px;
  flex: none;
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: var(--space-3);
}
.abn__toolbar-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.abn__toolbar-total {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.abn__toolbar-tip {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.abn__rank {
  color: var(--color-neutral-600);
}
.abn__link {
  color: var(--color-primary);
  cursor: pointer;
}
.abn__link:hover {
  text-decoration: underline;
}

.sc {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.sc__track {
  flex: 1;
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  min-width: 0;
}
.sc__fill {
  height: 8px;
  border-radius: 1px;
  background: var(--tone-main);
}
.sc__num {
  width: 40px;
  flex: none;
  text-align: right;
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}

.devtag {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: var(--fs-micro);
  color: var(--tone-text);
  background: var(--tone-tint);
  border-radius: var(--radius-control);
  padding: 1px 7px;
  margin-right: 5px;
  white-space: nowrap;
}
.devtag__v {
  font-style: normal;
  color: var(--color-neutral-600);
}
</style>
