<script setup lang="ts">
/**
 * 税源监控 · 收入预测分析(《需求文档》6.2)
 * 无设计稿;图表驱动页,视觉重心刻意压在「未来」:
 *   主图占满首屏,历史段弱化为参照,预测段粗虚线 + 置信带 + 区域底纹;
 *   右侧摘要卡把"本期预测多少、区间多宽、谁在推动"三件事一次说清。
 * 误差回溯是本页的必要组成 —— 不给出模型历史准确度,预测值就无从取信。
 * 与「重点税源监控」的区分:那页是盯人的清单,这页没有名录、没有 KPI 条,主体就是图。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { ForecastDetailRow, ForecastPeriod, ForecastQuery } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterField from '@/components/common/FilterField.vue'
import FilterChip from '@/components/common/FilterChip.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import DataTable from '@/components/common/DataTable.vue'
import Toast from '@/components/common/Toast.vue'
import ForecastChart from '@/components/charts/ForecastChart.vue'
import DeviationBars from '@/components/charts/DeviationBars.vue'
import type { SortDir, TableColumn } from '@/components/common/table'
import { DELTA_TONE, toneClass } from '@/components/common/tone'

const route = useRoute()
const router = useRouter()

/* ---------------- 筛选(与 URL query 同步) ---------------- */
const period = ref<ForecastPeriod>('month')
const taxType = ref('all')
const districtCode = ref('all')

function readQuery() {
  const q = route.query
  if (typeof q.period === 'string' && q.period) period.value = q.period as ForecastPeriod
  taxType.value = typeof q.tax === 'string' ? q.tax : 'all'
  districtCode.value = typeof q.district === 'string' ? q.district : 'all'
}
function writeQuery() {
  const q: Record<string, string> = {}
  if (period.value !== 'month') q.period = period.value
  if (taxType.value !== 'all') q.tax = taxType.value
  if (districtCode.value !== 'all') q.district = districtCode.value
  router.replace({ query: q })
}

const query = computed<ForecastQuery>(() => ({
  period: period.value,
  taxType: taxType.value,
  districtCode: districtCode.value,
}))

const filters = useResource(() => api.taxsource.getForecastFilters())
const forecast = useResource(() => api.taxsource.getRevenueForecast(query.value))

const ft = computed(() => filters.data.value)
const fc = computed(() => forecast.data.value)

onMounted(() => {
  readQuery()
  filters.load()
  forecast.load()
})

function reload() {
  writeQuery()
  forecast.load()
}
function changePeriod(p: ForecastPeriod) {
  if (period.value === p) return
  period.value = p
  reload()
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}

/* ---------------- 明细表(数据量小,前端排序) ---------------- */
const sortKey = ref('predicted')
const sortDir = ref<SortDir>(-1)
function sortBy(key: string) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 1 ? -1 : 1
  else {
    sortKey.value = key
    sortDir.value = -1
  }
}
const details = computed(() => {
  if (!fc.value) return []
  const rows = fc.value.details.slice()
  const k = sortKey.value
  const dir = sortDir.value
  rows.sort((a, b) => {
    if (k === 'taxType' || k === 'district') {
      return String(a[k as keyof ForecastDetailRow]).localeCompare(String(b[k as keyof ForecastDetailRow]), 'zh') * dir
    }
    if (k === 'growth') return (parseFloat(a.growth) - parseFloat(b.growth)) * dir
    return ((a[k as keyof ForecastDetailRow] as number) - (b[k as keyof ForecastDetailRow] as number)) * dir
  })
  return rows
})

const columns: TableColumn[] = [
  { key: 'taxType', label: '税种', width: '124px' },
  { key: 'district', label: '区县', width: '108px' },
  { key: 'predicted', label: '本期预测(万元)', width: '146px', align: 'right', numeric: true },
  { key: 'lastActual', label: '上期实际(万元)', width: '146px', align: 'right', numeric: true },
  { key: 'growth', label: '增幅预期', width: '108px', align: 'right', numeric: true },
  { key: 'alert', label: '偏差预警', width: '96px', sortable: false },
  { key: 'alertNote', label: '说明', ellipsis: true, sortable: false },
]
const rowKey = (r: ForecastDetailRow) => r.key

const ALERT_TONE: Record<string, 'danger' | 'warn' | 'success'> = {
  alert: 'danger',
  watch: 'warn',
  none: 'success',
}
const ALERT_LABEL: Record<string, string> = { alert: '需复核', watch: '关注', none: '正常' }

const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })
/** 置信区间宽度占预测值的比例,用于说明不确定性 */
const bandWidth = computed(() => {
  if (!fc.value) return '0'
  const s = fc.value.summary
  return (((s.upper - s.lower) / s.predicted) * 100).toFixed(1)
})
</script>

<template>
  <div class="fv">
    <PageHeader title="收入预测分析" breadcrumb="首页 / 税源监控 / 收入预测分析">
      <template #actions>
        <span v-if="ft" class="fv__upd num">测算时间 {{ ft.updatedAt }}</span>
        <button type="button" class="btn" @click="toast('演示环境:预测报告导出功能待接入')">导出预测报告</button>
        <button type="button" class="btn btn--primary" @click="toast('演示环境:模型重算需连接预测任务调度')">
          重新测算
        </button>
      </template>
    </PageHeader>

    <div class="fv__body">
      <FilterBar>
        <FilterField label="预测周期">
          <div class="fv__seg">
            <FilterChip
              v-for="p in ft ? ft.periods : []"
              :key="p.value"
              :active="period === p.value"
              @toggle="changePeriod(p.value as ForecastPeriod)"
            >
              {{ p.label }}
            </FilterChip>
          </div>
        </FilterField>
        <FilterField label="税种">
          <BaseSelect v-model="taxType" :options="ft ? ft.taxTypes : []" width="150px" @update:model-value="reload" />
        </FilterField>
        <FilterField label="区县">
          <BaseSelect
            v-model="districtCode"
            :options="ft ? ft.districts : []"
            width="150px"
            @update:model-value="reload"
          />
        </FilterField>
        <span v-if="fc" class="fv__method">{{ fc.method }}</span>
      </FilterBar>

      <!-- ══════════ 主图 + 预测摘要 ══════════ -->
      <div class="fv__row">
        <PanelCard title="收入预测曲线" subtitle="历史段仅作参照 · 竖线右侧为预测区间" class="fv__chart">
          <StateBlock :status="forecast.status.value" :error="forecast.error.value" @retry="forecast.load()">
            <ForecastChart v-if="fc" :points="fc.chart" unit="万元" />
          </StateBlock>
        </PanelCard>

        <PanelCard title="预测摘要" :subtitle="fc ? fc.summary.periodLabel : ''" class="fv__summary">
          <StateBlock :status="forecast.status.value" :error="forecast.error.value" @retry="forecast.load()">
            <template v-if="fc">
              <div class="sm__main">
                <div class="sm__label">本期预测值</div>
                <div class="sm__value num">
                  {{ money(fc.summary.predicted) }}<span class="sm__unit">万元</span>
                </div>
                <div class="sm__range num">
                  {{ fc.summary.confidence }}% 置信区间
                  <b>{{ money(fc.summary.lower) }} ~ {{ money(fc.summary.upper) }}</b>
                  <i>区间宽度 ±{{ (Number(bandWidth) / 2).toFixed(1) }}%</i>
                </div>
              </div>

              <div class="sm__deltas">
                <div class="sm__delta">
                  <span class="sm__dk">同比预期</span>
                  <span class="sm__dv num" :class="toneClass(DELTA_TONE[fc.summary.yoyTone])">{{ fc.summary.yoy }}</span>
                </div>
                <div class="sm__delta">
                  <span class="sm__dk">环比预期</span>
                  <span class="sm__dv num" :class="toneClass(DELTA_TONE[fc.summary.momTone])">{{ fc.summary.mom }}</span>
                </div>
              </div>

              <div class="sm__factors">
                <div class="sm__ftitle">主要影响因素</div>
                <div
                  v-for="f in fc.summary.factors"
                  :key="f.name"
                  class="fac"
                  :class="toneClass(DELTA_TONE[f.tone])"
                >
                  <div class="fac__top">
                    <span class="fac__mark">{{ f.tone === 'positive' ? '▲' : f.tone === 'negative' ? '▼' : '·' }}</span>
                    <span class="fac__name">{{ f.name }}</span>
                    <span class="fac__val num">{{ f.contribution }}</span>
                  </div>
                  <div class="fac__note">{{ f.note }}</div>
                </div>
              </div>
            </template>
          </StateBlock>
        </PanelCard>
      </div>

      <!-- ══════════ 误差回溯 ══════════ -->
      <PanelCard
        title="预测误差回溯"
        subtitle="近 12 期预测值与实际值的偏差率 · 模型可信度的证明"
        class="fv__accuracy"
      >
        <template #actions>
          <template v-if="fc">
            <span class="acc__kpi">
              平均绝对误差 <b class="num">{{ fc.accuracy.mape.toFixed(2) }}%</b>
            </span>
            <span class="acc__kpi">
              ±5% 内 <b class="num">{{ fc.accuracy.within5 }}/{{ fc.accuracy.points.length }}</b> 期
            </span>
            <span class="acc__kpi">
              最大单期偏差 <b class="num">{{ fc.accuracy.maxDeviation }}</b>
            </span>
          </template>
        </template>
        <StateBlock :status="forecast.status.value" :error="forecast.error.value" @retry="forecast.load()">
          <DeviationBars v-if="fc" :points="fc.accuracy.points" :tolerance="5" unit="万元" />
        </StateBlock>
      </PanelCard>

      <!-- ══════════ 分税种分区县明细 ══════════ -->
      <PanelCard
        title="分税种分区县预测明细"
        :subtitle="fc ? `${fc.details.length} 行 · 点击列头排序` : ''"
        class="fv__detail"
      >
        <StateBlock :status="forecast.status.value" :error="forecast.error.value" @retry="forecast.load()">
          <DataTable
            v-if="fc"
            :columns="columns"
            :rows="details"
            :row-key="rowKey"
            density="compact"
            sortable
            :sort-key="sortKey"
            :sort-dir="sortDir"
            @sort="sortBy"
          >
            <template #cell-predicted="{ row }">
              <b class="fv__pred">{{ money(row.predicted) }}</b>
            </template>
            <template #cell-lastActual="{ row }">{{ money(row.lastActual) }}</template>
            <template #cell-growth="{ row }">
              <span :class="toneClass(DELTA_TONE[row.growthTone])" class="fv__growth">{{ row.growth }}</span>
            </template>
            <template #cell-alert="{ row }">
              <BaseBadge :tone="ALERT_TONE[row.alert]" :variant="row.alert === 'none' ? 'dot' : 'outline'">
                {{ ALERT_LABEL[row.alert] }}
              </BaseBadge>
            </template>
          </DataTable>
        </StateBlock>
      </PanelCard>
    </div>

    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.fv {
  /* 页面级令牌:预测数值为本页视觉锚点,不在全局字阶内 */
  --fv-predict-fs: 30px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.fv__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.fv__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
/* 滚动容器的直接子项一律不收缩,避免面板被压扁 */
.fv__body > * {
  flex: none;
}
.fv__seg {
  display: flex;
  gap: 6px;
}
.fv__method {
  margin-left: auto;
  align-self: flex-end;
  padding-bottom: 7px;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}

/* ---------- 主图 + 摘要 ---------- */
.fv__row {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-4);
  height: 430px;
}
.fv__chart :deep(.panel-card__body),
.fv__summary :deep(.panel-card__body) {
  overflow: hidden;
}
.fv__summary :deep(.panel-card__body) {
  padding: var(--space-3) var(--space-4);
}

.sm__main {
  flex: none;
  border-bottom: 1px solid var(--color-neutral-200);
  padding-bottom: 10px;
}
.sm__label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.sm__value {
  font-size: var(--fv-predict-fs);
  font-weight: var(--fw-semibold);
  color: var(--color-primary-deep);
  line-height: 1.2;
}
.sm__unit {
  font-size: var(--fs-label);
  font-weight: var(--fw-regular);
  color: var(--color-neutral-600);
  margin-left: 4px;
}
.sm__range {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  margin-top: 3px;
}
.sm__range b {
  color: var(--color-neutral-800);
  margin-left: 4px;
}
.sm__range i {
  font-style: normal;
  display: block;
  color: var(--color-neutral-500);
}

.sm__deltas {
  flex: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
  padding: 10px 0;
  border-bottom: 1px solid var(--color-neutral-200);
}
.sm__delta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sm__dk {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
}
.sm__dv {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}

.sm__factors {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-top: 10px;
}
.sm__ftitle {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-700);
  margin-bottom: 6px;
}
.fac {
  border-left: 2px solid var(--tone-main);
  padding: 0 0 8px 8px;
  margin-bottom: 8px;
}
.fac:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
}
.fac__top {
  display: flex;
  align-items: baseline;
  gap: 5px;
}
.fac__mark {
  font-size: var(--fs-micro);
  color: var(--tone-main);
  flex: none;
}
.fac__name {
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
  flex: 1;
  min-width: 0;
}
.fac__val {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
  flex: none;
}
.fac__note {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  line-height: 1.5;
  margin-top: 1px;
}

/* ---------- 误差回溯 ---------- */
.fv__accuracy {
  height: 306px;
}
.fv__accuracy :deep(.panel-card__body) {
  overflow: hidden;
}
.acc__kpi {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.acc__kpi b {
  color: var(--color-primary-deep);
  font-weight: var(--fw-semibold);
  margin-left: 3px;
}

/* ---------- 明细表 ---------- */
.fv__detail {
  height: 360px;
}
.fv__pred {
  font-weight: var(--fw-semibold);
  color: var(--color-primary-deep);
}
.fv__growth {
  color: var(--tone-text);
  font-weight: var(--fw-semibold);
}
</style>
