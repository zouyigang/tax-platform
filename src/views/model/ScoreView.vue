<script setup lang="ts">
/**
 * 智能模型 · 风险评分模型(《需求文档》4.3.1)
 * 无设计稿;布局范式参照「风险线索池」(筛选栏 + 高密度列表 + 分页),
 * 在其之上增加「模型态」区:版本信息 / Lift 曲线 / 特征重要性 TOP20。
 * 页面分两层表达模型可解释性:
 *   模型态 —— 全局视角(整体排序能力、哪些特征重要);
 *   结果态 —— 个体视角(单户 SHAP 归因,列表每行固定提供「查看归因」入口)。
 * 取数经 @/api/client;筛选与排序条件写入 URL query,可分享 / 可回退。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { RiskLevel, ScoreQuery, ScoreRow } from '@/api/types'
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
import SideDrawer from '@/components/common/SideDrawer.vue'
import Toast from '@/components/common/Toast.vue'
import LiftCurve from '@/components/charts/LiftCurve.vue'
import HBarList from '@/components/charts/HBarList.vue'
import ShapBars from '@/components/charts/ShapBars.vue'
import type { SortDir, TableColumn } from '@/components/common/table'
import { DELTA_TONE, RISK_LABEL, RISK_TONE, toneClass } from '@/components/common/tone'

const route = useRoute()
const router = useRouter()

/* ---------------- 模型态 ---------------- */
const modelState = useResource(() => api.model.getScoreModelState())
const ms = computed(() => modelState.data.value)

/** 特征重要性 → 横向条形数据 */
const featureItems = computed(() =>
  ms.value ? ms.value.features.map((f) => ({ name: f.name, value: f.weight })) : [],
)
/** TOP20 合计占比,用于说明尚有多少重要性分散在长尾特征上 */
const featureCovered = computed(() =>
  ms.value ? ms.value.features.reduce((s, f) => s + f.weight, 0) : 0,
)

/* ---------------- 结果态 · 筛选状态(与 URL query 同步) ---------------- */
const keyword = ref('')
const districtCode = ref('all')
const industryCode = ref('all')
const levels = ref<RiskLevel[]>([])
const scoreMin = ref('')
const scoreMax = ref('')
const sortKey = ref('score')
const sortDir = ref<SortDir>(-1)
const page = ref(1)
const pageSize = ref(20)

function readQuery() {
  const q = route.query
  keyword.value = typeof q.keyword === 'string' ? q.keyword : ''
  districtCode.value = typeof q.district === 'string' ? q.district : 'all'
  industryCode.value = typeof q.industry === 'string' ? q.industry : 'all'
  levels.value = typeof q.level === 'string' && q.level ? (q.level.split(',') as RiskLevel[]) : []
  scoreMin.value = typeof q.min === 'string' ? q.min : ''
  scoreMax.value = typeof q.max === 'string' ? q.max : ''
  sortKey.value = typeof q.sort === 'string' ? q.sort : 'score'
  sortDir.value = q.dir === 'asc' ? 1 : -1
  page.value = typeof q.page === 'string' ? Math.max(1, parseInt(q.page, 10) || 1) : 1
}

function writeQuery() {
  const q: Record<string, string> = {}
  if (keyword.value) q.keyword = keyword.value
  if (districtCode.value !== 'all') q.district = districtCode.value
  if (industryCode.value !== 'all') q.industry = industryCode.value
  if (levels.value.length) q.level = levels.value.join(',')
  if (scoreMin.value) q.min = scoreMin.value
  if (scoreMax.value) q.max = scoreMax.value
  if (sortKey.value !== 'score') q.sort = sortKey.value
  if (sortDir.value === 1) q.dir = 'asc'
  if (page.value > 1) q.page = String(page.value)
  router.replace({ query: q })
}

const query = computed<ScoreQuery>(() => ({
  keyword: keyword.value,
  districtCode: districtCode.value,
  industryCode: industryCode.value,
  levels: levels.value,
  scoreMin: scoreMin.value === '' ? null : Number(scoreMin.value),
  scoreMax: scoreMax.value === '' ? null : Number(scoreMax.value),
  sortKey: sortKey.value,
  sortDir: sortDir.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const filters = useResource(() => api.model.getScoreFilters())
const list = useResource(() => api.model.getScores(query.value), { isEmpty: (d) => d.items.length === 0 })

function reload() {
  writeQuery()
  list.load()
}

onMounted(() => {
  readQuery()
  modelState.load()
  filters.load()
  list.load()
})

/* ---------------- 筛选 / 排序 / 分页 ---------------- */
function search() {
  page.value = 1
  reload()
}
function reset() {
  keyword.value = ''
  districtCode.value = 'all'
  industryCode.value = 'all'
  levels.value = []
  scoreMin.value = ''
  scoreMax.value = ''
  page.value = 1
  reload()
}
function toggleLevel(lv: RiskLevel) {
  const i = levels.value.indexOf(lv)
  if (i >= 0) levels.value.splice(i, 1)
  else levels.value.push(lv)
  search()
}
/** 点击列头排序:同列切换升降序,换列则取默认降序 */
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

/* ---------------- 归因抽屉 ---------------- */
const openTaxId = ref('')
const attribution = useResource(() => api.model.getScoreAttribution(openTaxId.value))
const attr = computed(() => attribution.data.value)

function openAttribution(row: ScoreRow) {
  openTaxId.value = row.taxId
  attribution.load()
}
function closeAttribution() {
  openTaxId.value = ''
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}
function gotoArchive() {
  if (attr.value) router.push(`/archive?taxId=${encodeURIComponent(attr.value.taxId)}`)
}

/* ---------------- 表格 ---------------- */
const columns: TableColumn[] = [
  { key: 'rank', label: '排名', width: '58px', align: 'center', numeric: true, sortable: false },
  { key: 'taxpayerName', label: '纳税人名称', ellipsis: true, sortable: false },
  { key: 'district', label: '所属区县', width: '86px', sortable: false },
  { key: 'industry', label: '所属行业', width: '92px', sortable: false },
  { key: 'score', label: '风险分', width: '146px' },
  { key: 'level', label: '风险等级', width: '90px', sortable: false },
  { key: 'percentile', label: '所处分位', width: '90px', align: 'right', numeric: true },
  { key: 'delta', label: '较上期', width: '80px', align: 'right', numeric: true },
  { key: 'topFactors', label: '主要驱动因子', ellipsis: true, sortable: false },
  { key: 'actions', label: '操作', width: '92px', sortable: false },
]
const rowKey = (r: ScoreRow) => r.taxId
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))
const fmt = (n: number) => n.toLocaleString('en-US')
</script>

<template>
  <div class="score">
    <PageHeader title="风险评分模型" breadcrumb="首页 / 智能模型 / 风险评分模型">
      <template #actions>
        <span v-if="filters.data.value" class="score__upd num">评分批次 {{ filters.data.value.updatedAt }}</span>
        <button type="button" class="btn" @click="toast('演示环境:评分清单导出功能待接入')">导出评分清单</button>
        <button type="button" class="btn btn--primary" @click="toast('演示环境:模型重训调度待接入')">发起重训</button>
      </template>
    </PageHeader>

    <ModelNotice :extra="ms ? `${ms.info.name} ${ms.info.version}` : ''" />

    <!-- 主区:内容滚动,抽屉相对本区定位(覆盖内容而不重排) -->
    <div class="score__main">
      <div class="score__body">
        <!-- ══════════ 模型态 ══════════ -->
        <div class="score__sec">
          <span class="score__sec-tick"></span>
          <span class="score__sec-title">模型态</span>
          <span class="score__sec-note">整体排序能力与全局特征贡献,用于判断模型本身是否可用</span>
        </div>

        <StateBlock :status="modelState.status.value" :error="modelState.error.value" @retry="modelState.load()">
          <div v-if="ms" class="score__model">
            <PanelCard title="模型版本与训练" :subtitle="ms.info.version">
              <div class="info">
                <div class="info__row"><span class="info__k">算法</span><span class="info__v">{{ ms.info.algorithm }}</span></div>
                <div class="info__row"><span class="info__k">训练完成</span><span class="info__v num">{{ ms.info.trainedAt }}</span></div>
                <div class="info__row"><span class="info__k">上线时间</span><span class="info__v num">{{ ms.info.publishedAt }}</span></div>
                <div class="info__row"><span class="info__k">训练样本</span><span class="info__v num">{{ fmt(ms.info.sampleCount) }} 户(正样本 {{ ms.info.positiveRate }}%)</span></div>
                <div class="info__row"><span class="info__k">入模特征</span><span class="info__v num">{{ ms.info.featureCount }} 个</span></div>
                <div class="info__row"><span class="info__k">基准分</span><span class="info__v num">{{ ms.info.baseScore }} 分</span></div>
                <div class="info__row"><span class="info__k">下次重训</span><span class="info__v num">{{ ms.info.nextTrainAt }}</span></div>
              </div>
              <div class="metrics">
                <MetricCard
                  v-for="m in ms.info.metrics"
                  :key="m.label"
                  :label="m.label"
                  :value="m.value"
                  :unit="m.unit"
                  :accent="m.accent"
                  size="sm"
                />
              </div>
            </PanelCard>

            <PanelCard title="Lift 曲线" subtitle="纵轴:相对随机抽查的提升倍数">
              <LiftCurve :points="ms.lift" :mark-percentile="10" mark-label="Recall@10%" />
              <p class="score__hint">
                前 10% 高分户覆盖了 {{ ms.info.metrics[3].value }}% 的历史查实户,提升度 5.2×,说明按分值排序派单显著优于随机抽查。
              </p>
            </PanelCard>

            <PanelCard title="特征重要性 TOP20" subtitle="归一化贡献 %">
              <div class="score__feat">
                <HBarList :items="featureItems" unit="%" :rank-color="false" name-width="150px" />
              </div>
              <p class="score__hint">
                TOP20 合计 {{ featureCovered.toFixed(1) }}%,其余 {{ ms.info.featureCount - 20 }} 个特征合计 {{ (100 - featureCovered).toFixed(1) }}%。
              </p>
            </PanelCard>
          </div>
        </StateBlock>

        <!-- ══════════ 结果态 ══════════ -->
        <div class="score__sec">
          <span class="score__sec-tick"></span>
          <span class="score__sec-title">结果态</span>
          <span class="score__sec-note">纳税人按风险分降序排列;每行均可查看该户的归因明细</span>
        </div>

        <div v-if="filters.data.value" class="score__kpis">
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
          <FilterField label="纳税人名称 / 识别号">
            <BaseInput v-model="keyword" placeholder="请输入关键字" width="200px" @enter="search" />
          </FilterField>
          <FilterField label="所属区县">
            <BaseSelect
              v-model="districtCode"
              :options="filters.data.value ? filters.data.value.districts : []"
              width="140px"
              @update:model-value="search"
            />
          </FilterField>
          <FilterField label="所属行业">
            <BaseSelect
              v-model="industryCode"
              :options="filters.data.value ? filters.data.value.industries : []"
              width="140px"
              @update:model-value="search"
            />
          </FilterField>
          <FilterField label="风险分">
            <BaseInput v-model="scoreMin" placeholder="最小" numeric width="82px" @enter="search" />
            <span class="score__sep">—</span>
            <BaseInput v-model="scoreMax" placeholder="最大" numeric width="82px" @enter="search" />
          </FilterField>
          <div class="score__actions">
            <button type="button" class="btn btn--primary" @click="search">查询</button>
            <button type="button" class="btn" @click="reset">重置</button>
          </div>

          <template #chips>
            <div class="score__chip-group">
              <span class="score__chip-label">风险等级</span>
              <FilterChip
                v-for="l in filters.data.value ? filters.data.value.levels : []"
                :key="l.value"
                :active="levels.indexOf(l.value as RiskLevel) >= 0"
                :dot-tone="RISK_TONE[l.value as RiskLevel]"
                :count="l.count"
                @toggle="toggleLevel(l.value as RiskLevel)"
              >
                {{ l.label }}
              </FilterChip>
            </div>
          </template>
        </FilterBar>

        <div class="score__list">
          <div class="score__toolbar">
            <span class="score__toolbar-title">评分结果</span>
            <span class="score__toolbar-total num">共 {{ total }} 户</span>
            <span class="score__toolbar-tip">点击列头可切换排序</span>
            <div class="score__toolbar-actions">
              <button type="button" class="btn" @click="toast('演示环境:批量生成线索需连接风险任务服务')">批量生成线索</button>
            </div>
          </div>

          <StateBlock
            v-if="list.status.value === 'empty' || list.status.value === 'error'"
            :status="list.status.value"
            :error="list.error.value"
            empty-text="未查询到符合条件的纳税人"
            empty-hint="可尝试放宽风险分区间或等级筛选"
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
            :active-key="openTaxId"
            :loading="list.status.value === 'loading' || list.status.value === 'idle'"
            :skeleton-rows="12"
            @sort="sortBy"
            @row-click="openAttribution"
          >
            <template #cell-rank="{ row }">
              <span class="score__rank">{{ row.rank }}</span>
            </template>
            <template #cell-taxpayerName="{ row }">
              <span class="score__name">{{ row.taxpayerName }}</span>
              <span v-if="row.hasClue" class="score__flag">已成线索</span>
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
            <template #cell-percentile="{ row }">前 {{ row.percentile.toFixed(1) }}%</template>
            <template #cell-delta="{ row }">
              <span :class="toneClass(DELTA_TONE[row.deltaTone])" class="score__delta">{{ row.delta }}</span>
            </template>
            <template #cell-topFactors="{ row }">
              <span v-for="f in row.topFactors" :key="f" class="score__factor">{{ f }}</span>
            </template>
            <template #cell-actions="{ row }">
              <span class="score__link" @click.stop="openAttribution(row)">查看归因</span>
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

      <!-- ══════════ 归因抽屉 ══════════ -->
      <SideDrawer :open="!!openTaxId" width="560px" @close="closeAttribution">
        <template #header>
          <div class="dh">
            <div class="dh__main">
              <span class="dh__title">{{ attr ? attr.taxpayerName : '归因分析' }}</span>
              <span v-if="attr" class="dh__tax num">{{ attr.taxId }}</span>
            </div>
            <span class="dh__close" @click="closeAttribution">✕</span>
          </div>
        </template>

        <StateBlock :status="attribution.status.value" :error="attribution.error.value" @retry="attribution.load()">
          <template v-if="attr">
            <div class="dsum" :class="toneClass(RISK_TONE[attr.level])">
              <div class="dsum__score num">{{ attr.score.toFixed(1) }}</div>
              <div class="dsum__meta">
                <BaseBadge :tone="RISK_TONE[attr.level]">{{ RISK_LABEL[attr.level] }}</BaseBadge>
                <span class="dsum__pct num">全市前 {{ attr.percentile.toFixed(1) }}%</span>
              </div>
            </div>

            <!-- 基准分 → 本户分的加减分解,让"分数从哪来"一目了然 -->
            <div class="calc">
              <span class="calc__item"><i class="calc__k">基准分</i><b class="calc__v num">{{ attr.baseScore.toFixed(1) }}</b></span>
              <span class="calc__op">＋</span>
              <span class="calc__item tone-danger"><i class="calc__k">推高</i><b class="calc__v num">{{ attr.positiveSum.toFixed(1) }}</b></span>
              <span class="calc__op">－</span>
              <span class="calc__item tone-success"><i class="calc__k">压低</i><b class="calc__v num">{{ Math.abs(attr.negativeSum).toFixed(1) }}</b></span>
              <span class="calc__op">＝</span>
              <span class="calc__item calc__item--total"><i class="calc__k">风险分</i><b class="calc__v num">{{ attr.score.toFixed(1) }}</b></span>
            </div>

            <section class="dsec">
              <div class="dsec__head">
                <span class="dsec__title">贡献最大的 10 项因子</span>
                <span class="dsec__sub">SHAP 值</span>
              </div>
              <ShapBars :items="attr.items" />
            </section>

            <section class="dsec">
              <div class="dsec__head"><span class="dsec__title">归因结论</span></div>
              <p class="dtext">{{ attr.summary }}</p>
              <p class="dtext dtext--sub">{{ attr.suggestion }}</p>
              <p class="dtext dtext--warn">
                以上因子为模型统计相关性,不等同于违法事实;是否存在涉税问题须以核查取证结论为准。
              </p>
            </section>
          </template>
        </StateBlock>

        <template #footer>
          <button type="button" class="btn" @click="gotoArchive">查看一户式档案</button>
          <button type="button" class="btn btn--primary" @click="toast('演示环境:生成核查线索需连接风险任务服务')">
            生成核查线索
          </button>
        </template>
      </SideDrawer>
    </div>

    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.score {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.score__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.score__main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  /* 抽屉相对主区定位,覆盖列表而不重排 */
  position: relative;
}
.score__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* 区段标题:模型态 / 结果态 */
.score__sec {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.score__sec-tick {
  width: 3px;
  height: 13px;
  background: var(--color-primary);
  flex: none;
}
.score__sec-title {
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
}
.score__sec-note {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}

/* ---------- 模型态 ---------- */
.score__model {
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  gap: var(--space-4);
  height: 316px;
}
.info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.info__row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.info__k {
  width: 62px;
  flex: none;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.info__v {
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
}
.metrics {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}
.score__feat {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.score__hint {
  flex: none;
  margin: var(--space-2) 0 0;
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  line-height: 1.5;
}

/* ---------- 结果态 ---------- */
.score__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.score__sep {
  color: var(--color-neutral-500);
}
.score__actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.score__actions .btn {
  height: 32px;
}
.score__chip-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.score__chip-label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  flex: none;
}

.score__list {
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
}
.score__toolbar {
  height: 46px;
  flex: none;
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: var(--space-3);
}
.score__toolbar-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.score__toolbar-total {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.score__toolbar-tip {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.score__toolbar-actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.score__toolbar-actions .btn {
  height: 32px;
  padding: 0 14px;
}

.score__rank {
  color: var(--color-neutral-600);
}
.score__name {
  color: var(--color-neutral-900);
}
.score__flag {
  margin-left: var(--space-2);
  font-size: var(--fs-micro);
  color: var(--color-primary);
  background: var(--color-primary-tint);
  padding: 1px 5px;
  border-radius: var(--radius-control);
}
.score__delta {
  color: var(--tone-text);
  font-weight: var(--fw-semibold);
}
.score__factor {
  font-size: var(--fs-micro);
  color: var(--color-neutral-700);
  background: var(--color-neutral-100);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 1px 6px;
  margin-right: var(--space-1);
  white-space: nowrap;
}
.score__link {
  color: var(--color-primary);
  cursor: pointer;
}
.score__link:hover {
  text-decoration: underline;
}

/* 风险分:条 + 数值 */
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

/* ---------- 归因抽屉 ---------- */
.dh {
  display: flex;
  align-items: flex-start;
}
.dh__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dh__title {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
}
.dh__tax {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.dh__close {
  margin-left: auto;
  cursor: pointer;
  color: var(--color-neutral-500);
  font-size: var(--fs-body);
  padding: 0 var(--space-1);
}
.dh__close:hover {
  color: var(--color-neutral-800);
}

.dsum {
  background: var(--color-panel);
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--tone-main);
  border-radius: var(--radius-control);
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.dsum__score {
  font-size: var(--fs-metric);
  font-weight: var(--fw-semibold);
  line-height: 1;
  color: var(--tone-text);
}
.dsum__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dsum__pct {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}

.calc {
  margin-top: var(--space-3);
  background: var(--color-panel);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 10px var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.calc__item {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}
.calc__k {
  font-style: normal;
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
}
.calc__v {
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.calc__op {
  color: var(--color-neutral-500);
}
.calc__item--total .calc__v {
  color: var(--color-primary-deep);
}

.dsec {
  margin-top: var(--space-4);
  background: var(--color-panel);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: var(--space-3) var(--space-4) var(--space-4);
}
.dsec__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: 10px;
}
.dsec__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.dsec__sub {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.dtext {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
  line-height: 1.65;
}
.dtext--sub {
  margin-top: var(--space-2);
  color: var(--color-neutral-600);
}
.dtext--warn {
  margin-top: 10px;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-neutral-200);
  color: var(--color-risk-high-text);
}
</style>
