<script setup lang="ts">
/**
 * 智能模型 · 行业税负基准(《需求文档》3.5.2)
 * 无设计稿;这是**图表驱动页**,不是列表页:主体是分布本身,不是某一户。
 * 三段自上而下:箱线图总览 → 选中行业的企业散点分布 → 基准值表。
 * 本页产出的是「参照系」,供异常申报检测、风险评分与规则阈值取用,
 * 因此归因说明的是基准怎么算出来的(样本口径 / 剔除规则 / 计算方法 / 调整记录)。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { BoxStat } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ModelNotice from '@/components/common/ModelNotice.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import DataTable from '@/components/common/DataTable.vue'
import SideDrawer from '@/components/common/SideDrawer.vue'
import TabNav from '@/components/common/TabNav.vue'
import Toast from '@/components/common/Toast.vue'
import BoxPlot from '@/components/charts/BoxPlot.vue'
import ScatterDist from '@/components/charts/ScatterDist.vue'
import HBarList from '@/components/charts/HBarList.vue'
import type { TableColumn } from '@/components/common/table'

const route = useRoute()
const router = useRouter()

/* ---------------- 指标与选中行业(与 URL query 同步) ---------------- */
const metricKey = ref('vat')
const industryCode = ref('')

function writeQuery() {
  const q: Record<string, string> = { metric: metricKey.value }
  if (industryCode.value) q.industry = industryCode.value
  if (locateKeyword.value) q.locate = locateKeyword.value
  router.replace({ query: q })
}

const board = useResource(() => api.model.getBenchmarkBoard(metricKey.value))
const scatter = useResource(() => api.model.getBenchmarkScatter(industryCode.value, metricKey.value))
const attribution = useResource(() => api.model.getBenchmarkAttribution(attrCode.value, metricKey.value))

const bd = computed(() => board.data.value)
const sc = computed(() => scatter.data.value)
const attr = computed(() => attribution.data.value)

onMounted(async () => {
  const q = route.query
  if (typeof q.metric === 'string' && q.metric) metricKey.value = q.metric
  if (typeof q.industry === 'string' && q.industry) industryCode.value = q.industry
  if (typeof q.locate === 'string') locateKeyword.value = q.locate
  await board.load()
  // 默认选中第一个行业中类,让散点区一进来就有内容
  if (!industryCode.value && bd.value && bd.value.items.length) industryCode.value = bd.value.items[0].industryCode
  scatter.load()
  writeQuery()
})

/** 切换指标:箱线与散点整体换一套基准 */
async function changeMetric(key: string) {
  metricKey.value = key
  await board.load()
  if (bd.value && !bd.value.items.some((i) => i.industryCode === industryCode.value)) {
    industryCode.value = bd.value.items[0].industryCode
  }
  scatter.load()
  writeQuery()
}

function selectIndustry(code: string) {
  if (industryCode.value === code) return
  industryCode.value = code
  scatter.load()
  writeQuery()
}

/* ---------------- 企业定位 ---------------- */
const locateKeyword = ref('')
/** 名称包含关键字的散点(可多命中) */
const foundIds = computed(() => {
  const kw = locateKeyword.value.trim()
  if (!kw || !sc.value) return []
  return sc.value.points.filter((p) => p.name.indexOf(kw) >= 0).map((p) => p.taxId)
})
const foundPoints = computed(() => {
  if (!sc.value) return []
  return sc.value.points.filter((p) => foundIds.value.indexOf(p.taxId) >= 0)
})
function onLocate() {
  writeQuery()
}
function clearLocate() {
  locateKeyword.value = ''
  writeQuery()
}

/* ---------------- 基准测算归因抽屉 ---------------- */
const attrCode = ref('')
function openAttribution(code: string) {
  attrCode.value = code
  attribution.load()
}
function closeAttribution() {
  attrCode.value = ''
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}

/* ---------------- 基准值表 ---------------- */
const columns: TableColumn[] = [
  { key: 'industryName', label: '行业中类', width: '128px' },
  { key: 'categoryName', label: '所属门类', width: '104px' },
  { key: 'sampleCount', label: '样本量', width: '92px', align: 'right', numeric: true },
  { key: 'median', label: '中位数', width: '104px', align: 'right', numeric: true },
  { key: 'q1', label: 'Q1', width: '96px', align: 'right', numeric: true },
  { key: 'q3', label: 'Q3', width: '96px', align: 'right', numeric: true },
  { key: 'iqr', label: 'IQR', width: '96px', align: 'right', numeric: true },
  { key: 'outliers', label: '离群户', width: '86px', align: 'right', numeric: true },
  { key: 'updatedAt', label: '基准更新时间', width: '118px', numeric: true },
  { key: 'actions', label: '操作', width: '96px' },
]
const rowKey = (r: BoxStat) => r.industryCode
const items = computed(() => (bd.value ? bd.value.items : []))
const unit = computed(() => (bd.value ? bd.value.metric.unit : ''))
const decimals = computed(() => (bd.value ? bd.value.metric.decimals : 2))
function fmt(v: number): string {
  return v.toFixed(decimals.value)
}
/** 当前选中行业的统计(散点区标题用) */
const currentStat = computed(() => items.value.filter((i) => i.industryCode === industryCode.value)[0])
</script>

<template>
  <div class="bm">
    <PageHeader title="行业税负基准" breadcrumb="首页 / 智能模型 / 行业税负基准">
      <template #actions>
        <span class="bm__upd num">基准版本 2026Q2</span>
        <button type="button" class="btn" @click="toast('演示环境:基准值导出功能待接入')">导出基准值</button>
        <button type="button" class="btn btn--primary" @click="toast('演示环境:基准重算需连接测算任务调度')">
          发起重算
        </button>
      </template>
    </PageHeader>

    <ModelNotice
      text="基准值为同业统计参照,偏离基准不构成税务定性依据,须经核实后认定。"
      :extra="bd ? bd.method : ''"
    />

    <div class="bm__body">
      <div v-if="bd" class="bm__kpis">
        <MetricCard
          v-for="k in bd.kpis"
          :key="k.label"
          :label="k.label"
          :value="k.value"
          :unit="k.unit"
          :accent="k.accent"
          variant="card"
        />
      </div>

      <!-- ══════════ ① 箱线图总览 ══════════ -->
      <PanelCard title="各行业中类分布" :subtitle="bd ? `${bd.metric.name}(${bd.metric.unit})` : ''" class="bm__box">
        <template #actions>
          <TabNav
            v-if="bd"
            :model-value="metricKey"
            :tabs="bd.metrics"
            size="sm"
            @update:model-value="changeMetric"
          />
        </template>
        <StateBlock :status="board.status.value" :error="board.error.value" @retry="board.load()">
          <BoxPlot
            v-if="bd"
            :items="bd.items"
            :unit="bd.metric.unit"
            :decimals="bd.metric.decimals"
            :selected-code="industryCode"
            @select="selectIndustry"
          />
        </StateBlock>
      </PanelCard>

      <!-- ══════════ ② 选中行业的企业散点分布 ══════════ -->
      <PanelCard
        :title="currentStat ? `${currentStat.industryName} · 企业分布` : '企业分布'"
        :subtitle="sc ? `${sc.points.length} 户 · ${sc.metric.name}` : ''"
        class="bm__scatter"
      >
        <template #actions>
          <span class="bm__locate-label">定位企业</span>
          <BaseInput v-model="locateKeyword" placeholder="输入企业名称关键字" width="220px" @enter="onLocate" />
          <button type="button" class="btn" @click="onLocate">定位</button>
          <button v-if="locateKeyword" type="button" class="btn" @click="clearLocate">清除</button>
        </template>

        <StateBlock :status="scatter.status.value" :error="scatter.error.value" @retry="scatter.load()">
          <template v-if="sc">
            <div class="bm__locate-bar">
              <template v-if="locateKeyword && foundPoints.length">
                <span class="bm__hit">命中 {{ foundPoints.length }} 户:</span>
                <span v-for="p in foundPoints.slice(0, 4)" :key="p.taxId" class="bm__hit-item">
                  {{ p.name }}
                  <b class="num">{{ fmt(p.value) }}{{ unit }}</b>
                  <i
                    class="bm__hit-pos"
                    :class="p.value > sc.q3 ? 'tone-danger' : p.value < sc.q1 ? 'tone-warn' : 'tone-success'"
                  >{{ p.value > sc.q3 ? '高于 Q3' : p.value < sc.q1 ? '低于 Q1' : '基准区间内' }}</i>
                </span>
                <span v-if="foundPoints.length > 4" class="bm__hit-more">等 {{ foundPoints.length }} 户</span>
              </template>
              <span v-else-if="locateKeyword" class="bm__hit-none">未在该行业样本中找到匹配企业</span>
              <span v-else class="bm__hit-tip">
                基准区间(Q1–Q3)已在图上以浅蓝带标出;输入企业名称可定位其在同业中的位置
              </span>
            </div>
            <ScatterDist
              :points="sc.points"
              :lower="sc.lower"
              :q1="sc.q1"
              :median="sc.median"
              :q3="sc.q3"
              :upper="sc.upper"
              :unit="sc.metric.unit"
              :decimals="sc.metric.decimals"
              :found-ids="foundIds"
            />
          </template>
        </StateBlock>
      </PanelCard>

      <!-- ══════════ ③ 基准值表 ══════════ -->
      <PanelCard
        title="基准值表"
        :subtitle="bd ? `${bd.metric.name} · 单位 ${bd.metric.unit}` : ''"
      >
        <StateBlock :status="board.status.value" :error="board.error.value" @retry="board.load()">
          <DataTable
            :columns="columns"
            :rows="items"
            :row-key="rowKey"
            density="compact"
            clickable
            :active-key="industryCode"
            @row-click="(r) => selectIndustry(r.industryCode)"
          >
            <template #cell-industryName="{ row }">
              <span class="bm__ind">{{ row.industryName }}</span>
            </template>
            <template #cell-categoryName="{ row }">
              <span class="bm__cat">{{ row.categoryName }}</span>
            </template>
            <template #cell-sampleCount="{ row }">{{ row.sampleCount }} 户</template>
            <template #cell-median="{ row }">
              <b class="bm__med">{{ fmt(row.median) }}</b>
            </template>
            <template #cell-q1="{ row }">{{ fmt(row.q1) }}</template>
            <template #cell-q3="{ row }">{{ fmt(row.q3) }}</template>
            <template #cell-iqr="{ row }">{{ fmt(row.iqr) }}</template>
            <template #cell-outliers="{ row }">
              <BaseBadge v-if="row.outliers.length" tone="danger" variant="soft">{{ row.outliers.length }}</BaseBadge>
              <span v-else class="bm__zero">0</span>
            </template>
            <template #cell-actions="{ row }">
              <span class="bm__link" @click.stop="openAttribution(row.industryCode)">查看归因</span>
            </template>
          </DataTable>
        </StateBlock>
      </PanelCard>
    </div>

    <!-- ══════════ 基准测算归因 ══════════ -->
    <SideDrawer :open="!!attrCode" width="560px" @close="closeAttribution">
      <template #header>
        <div class="dh">
          <div class="dh__main">
            <span class="dh__title">{{ attr ? `${attr.industryName} · 基准测算说明` : '基准测算说明' }}</span>
            <span v-if="attr" class="dh__sub">{{ attr.metricName }}</span>
          </div>
          <span class="dh__close" @click="closeAttribution">✕</span>
        </div>
      </template>

      <StateBlock :status="attribution.status.value" :error="attribution.error.value" @retry="attribution.load()">
        <template v-if="attr">
          <section class="dsec">
            <div class="dsec__title">样本口径</div>
            <p class="dtext">{{ attr.sampleScope }}</p>
            <div class="cnt">
              <span class="cnt__item"><i>原始样本</i><b class="num">{{ attr.rawCount }} 户</b></span>
              <span class="cnt__arrow">→</span>
              <span class="cnt__item cnt__item--on"><i>有效样本</i><b class="num">{{ attr.validCount }} 户</b></span>
              <span class="cnt__note num">剔除 {{ attr.rawCount - attr.validCount }} 户</span>
            </div>
          </section>

          <section class="dsec">
            <div class="dsec__title">剔除规则</div>
            <ol class="rules">
              <li v-for="(r, i) in attr.excludeRules" :key="i">{{ r }}</li>
            </ol>
          </section>

          <section class="dsec">
            <div class="dsec__title">计算方法</div>
            <p class="dtext">{{ attr.method }}</p>
          </section>

          <section class="dsec">
            <div class="dsec__title">有效样本分布</div>
            <HBarList :items="attr.histogram" unit="户" :rank-color="false" name-width="104px" />
          </section>

          <section class="dsec">
            <div class="dsec__title">基准调整记录</div>
            <div v-for="(u, i) in attr.updates" :key="i" class="upd">
              <div class="upd__line">
                <span class="upd__time num">{{ u.time }}</span>
                <span class="upd__val num">{{ u.from }} → {{ u.to }}</span>
              </div>
              <div class="upd__reason">{{ u.reason }}</div>
            </div>
          </section>

          <p class="dwarn">{{ attr.note }}</p>
        </template>
      </StateBlock>
    </SideDrawer>

    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.bm {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
  /* 抽屉相对整页定位 */
  position: relative;
}
.bm__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.bm__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.bm__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.bm__box {
  flex: none;
  height: 412px;
}
.bm__scatter {
  flex: none;
  height: 372px;
}
.bm__box :deep(.panel-card__body),
.bm__scatter :deep(.panel-card__body) {
  overflow: hidden;
}
/* 指标切换置于面板头部,去掉标签条自带的下边线以免与面板头部边线重叠 */
.bm__box :deep(.tabs) {
  border-bottom: none;
}

/* 定位条 */
.bm__locate-label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.bm__locate-bar {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  min-height: 22px;
  margin-bottom: var(--space-1);
}
.bm__hit {
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
}
.bm__hit-item {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
}
.bm__hit-item b {
  font-weight: var(--fw-semibold);
}
.bm__hit-pos {
  font-style: normal;
  font-size: var(--fs-micro);
  color: var(--tone-text);
  background: var(--tone-tint);
  border-radius: var(--radius-control);
  padding: 0 6px;
}
.bm__hit-more,
.bm__hit-none,
.bm__hit-tip {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}

/* 基准值表 */
.bm__ind {
  font-weight: var(--fw-medium);
}
.bm__cat {
  color: var(--color-neutral-600);
}
.bm__med {
  font-weight: var(--fw-semibold);
  color: var(--color-primary-deep);
}
.bm__zero {
  color: var(--color-neutral-500);
}
.bm__link {
  color: var(--color-primary);
  cursor: pointer;
}
.bm__link:hover {
  text-decoration: underline;
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
.dh__sub {
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

.dsec {
  background: var(--color-panel);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-3);
}
.dsec__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  margin-bottom: var(--space-2);
}
.dtext {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  line-height: 1.7;
}

.cnt {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: 10px;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-neutral-200);
}
.cnt__item {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}
.cnt__item i {
  font-style: normal;
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
}
.cnt__item b {
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
}
.cnt__item--on b {
  color: var(--color-primary-deep);
}
.cnt__arrow {
  color: var(--color-neutral-500);
}
.cnt__note {
  margin-left: auto;
  font-size: var(--fs-micro);
  color: var(--color-risk-high-text);
}

.rules {
  margin: 0;
  padding-left: 18px;
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  line-height: 1.8;
}

.upd {
  border-left: 2px solid var(--color-neutral-300);
  padding: 0 0 10px 12px;
}
.upd:last-child {
  padding-bottom: 0;
}
.upd__line {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}
.upd__time {
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
  font-weight: var(--fw-medium);
}
.upd__val {
  font-size: var(--fs-label);
  color: var(--color-primary);
}
.upd__reason {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  margin-top: 2px;
}

.dwarn {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--color-risk-high-text);
  line-height: 1.7;
}
</style>
