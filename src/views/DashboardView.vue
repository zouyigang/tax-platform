<script setup lang="ts">
/**
 * 领导驾驶舱 · 税收运行监测
 * 1:1 复刻设计稿;外层由固定 1920×1080 改为填满右侧内容区(布局结构不变)。
 * 取数一律经 @/api/client,不直接引用任何 adapter。
 * 每个数据区块独立四态(《交互说明》第 2 节)。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { DashboardPeriod, DashboardQuery } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import { DELTA_TONE, districtColor, FUNNEL_COLORS, KPI_ACCENT, SOURCE_COLORS } from '@/charts/palette'

const router = useRouter()

/* ---------------- 筛选状态 ---------------- */
// 初始值与设计稿一致(本季 / 全市);筛选项加载完成后以后端默认值为准
const period = ref<DashboardPeriod>('quarter')
const districtCode = ref('all')
const query = computed<DashboardQuery>(() => ({
  period: period.value,
  districtCode: districtCode.value,
}))

/* ---------------- 各区块资源(独立四态) ---------------- */
const filters = useResource(() => api.dashboard.getDashboardFilters())
const kpis = useResource(() => api.dashboard.getRevenueKpis(query.value), {
  isEmpty: (d) => d.length === 0,
})
const trend = useResource(() => api.dashboard.getRevenueTrend(query.value), {
  isEmpty: (d) => d.points.length === 0,
})
const structure = useResource(() => api.dashboard.getTaxTypeStructure(query.value), {
  isEmpty: (d) => d.segments.length === 0,
})
const districts = useResource(() => api.dashboard.getDistrictCompletion(query.value), {
  isEmpty: (d) => d.length === 0,
})
const sources = useResource(() => api.dashboard.getSourceContribution(query.value), {
  isEmpty: (d) => d.length === 0,
})
const funnel = useResource(() => api.dashboard.getRiskTaskFunnel(query.value), {
  isEmpty: (d) => d.stages.length === 0,
})

/** 时间/区县筛选变化时刷新全部图表(当前页刷新,不跳转) */
function reloadRegions() {
  kpis.load()
  trend.load()
  structure.load()
  districts.load()
  sources.load()
  funnel.load()
}

onMounted(async () => {
  await filters.load()
  const f = filters.data.value
  if (f) {
    period.value = f.defaultPeriod
    districtCode.value = f.defaultDistrictCode
  }
  reloadRegions()
  document.addEventListener('click', closeDistrictMenu)
  document.addEventListener('keydown', onEsc)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDistrictMenu)
  document.removeEventListener('keydown', onEsc)
})

/* ---------------- 顶部筛选交互 ---------------- */
function selectPeriod(value: string) {
  if (value === period.value) return
  period.value = value as DashboardPeriod
  reloadRegions()
}

const districtOpen = ref(false)
const districtLabel = computed(() => {
  const list = filters.data.value ? filters.data.value.districts : []
  const hit = list.filter((d) => d.value === districtCode.value)[0]
  return hit ? hit.label : ''
})
function toggleDistrictMenu(e: MouseEvent) {
  e.stopPropagation()
  districtOpen.value = !districtOpen.value
}
function closeDistrictMenu() {
  districtOpen.value = false
}
function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') districtOpen.value = false
}
function selectDistrict(value: string) {
  districtOpen.value = false
  if (value === districtCode.value) return
  districtCode.value = value
  reloadRegions()
}

/* ---------------- 指标卡跳转(《交互说明》1.2) ---------------- */
function onKpiClick(linkTo: string) {
  if (linkTo) router.push(linkTo)
}

/* ---------------- 展示格式化 ---------------- */
const fmtInt = (n: number) => n.toLocaleString('en-US')

/** 数据源柱状:以最大值为基准换算柱高 */
const sourceMax = computed(() => {
  const list = sources.data.value || []
  return list.reduce((m, s) => (s.value > m ? s.value : m), 0) || 1
})

/** 漏斗几何:与设计稿同一套算法(viewBox 1300×118) */
const FUNNEL_W = 1300
const FUNNEL_MID_Y = 59
const FUNNEL_MAX_H = 94

const funnelShapes = computed(() => {
  const stages = funnel.data.value ? funnel.data.value.stages : []
  if (stages.length === 0) return []
  const segW = FUNNEL_W / stages.length
  const max = stages[0].value || 1
  const hOf = (v: number) => (v / max) * FUNNEL_MAX_H
  return stages.map((s, i) => {
    const x0 = i * segW
    const x1 = (i + 1) * segW
    const hL = hOf(s.value)
    // 末段右侧按 92% 收口,与设计稿一致
    const hR = hOf(i < stages.length - 1 ? stages[i + 1].value : s.value * 0.92)
    return {
      name: s.name,
      value: fmtInt(s.value),
      color: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
      points: [
        `${x0.toFixed(1)},${(FUNNEL_MID_Y - hL / 2).toFixed(1)}`,
        `${x1.toFixed(1)},${(FUNNEL_MID_Y - hR / 2).toFixed(1)}`,
        `${x1.toFixed(1)},${(FUNNEL_MID_Y + hR / 2).toFixed(1)}`,
        `${x0.toFixed(1)},${(FUNNEL_MID_Y + hL / 2).toFixed(1)}`,
      ].join(' '),
      cx: (x0 + segW / 2).toFixed(1),
    }
  })
})

/** 漏斗环节间转化率标注 */
const funnelConversions = computed(() => {
  const stages = funnel.data.value ? funnel.data.value.stages : []
  const segW = FUNNEL_W / (stages.length || 1)
  return stages.slice(0, -1).map((s, i) => ({
    x: ((i + 1) * segW).toFixed(1),
    pct: `${((stages[i + 1].value / s.value) * 100).toFixed(1)}%`,
  }))
})

const trendUnit = computed(() => (trend.data.value ? trend.data.value.unit : ''))
</script>

<template>
  <div class="dash">
    <!-- ══ 顶部标题栏 ══ -->
    <header class="dash__header">
      <div class="dash__accent"></div>
      <div class="dash__titles">
        <h1 class="dash__h1">领导驾驶舱 · 税收运行监测</h1>
        <span class="dash__sub">智慧综合治税与税收风险智能分析平台</span>
      </div>

      <div class="dash__tools">
        <!-- 数据更新时间 -->
        <span v-if="filters.status.value === 'ready'" class="dash__updated num">
          数据更新 {{ filters.data.value ? filters.data.value.updatedAt : '' }}
        </span>
        <span v-else class="skeleton dash__updated-skeleton"></span>

        <!-- 时间筛选(本月/本季/本年) -->
        <div v-if="filters.status.value === 'ready'" class="seg">
          <div
            v-for="(p, i) in filters.data.value ? filters.data.value.periods : []"
            :key="p.value"
            class="seg__item"
            :class="{ 'seg__item--active': p.value === period, 'seg__item--divided': i > 0 }"
            @click="selectPeriod(p.value)"
          >
            {{ p.label }}
          </div>
        </div>
        <span v-else class="skeleton dash__seg-skeleton"></span>

        <!-- 区县筛选 -->
        <div v-if="filters.status.value === 'ready'" class="select" @click="toggleDistrictMenu">
          <span>{{ districtLabel }}</span>
          <span class="select__caret">▾</span>
          <div v-if="districtOpen" class="select__menu" @click.stop>
            <div
              v-for="d in filters.data.value ? filters.data.value.districts : []"
              :key="d.value"
              class="select__option"
              :class="{ 'select__option--on': d.value === districtCode }"
              @click="selectDistrict(d.value)"
            >
              {{ d.label }}
            </div>
          </div>
        </div>
        <span v-else class="skeleton dash__select-skeleton"></span>
      </div>
    </header>

    <div class="dash__body">
      <!-- ══ 指标区(5 卡) ══ -->
      <div class="kpis">
        <template v-if="kpis.status.value === 'ready'">
          <div
            v-for="k in kpis.data.value"
            :key="k.key"
            class="kpi"
            :class="{ 'kpi--link': !!k.linkTo }"
            :style="{ borderTopColor: KPI_ACCENT[k.accent] }"
            @click="onKpiClick(k.linkTo)"
          >
            <div class="kpi__label">{{ k.label }}</div>
            <div class="kpi__value num">
              {{ k.value }}<span class="kpi__unit">{{ k.unit }}</span>
            </div>
            <div class="kpi__delta">
              <span :style="{ color: DELTA_TONE[k.deltaTone] }" class="kpi__delta-value">{{ k.delta }}</span>
              <span class="kpi__delta-note">{{ k.deltaNote }}</span>
            </div>
          </div>
        </template>

        <!-- 指标卡加载态:数值位置显示等宽灰条 -->
        <template v-else-if="kpis.status.value === 'loading' || kpis.status.value === 'idle'">
          <div v-for="n in 5" :key="n" class="kpi">
            <div class="kpi__label">&nbsp;</div>
            <div class="skeleton kpi__value-skeleton"></div>
            <div class="skeleton kpi__delta-skeleton"></div>
          </div>
        </template>

        <!-- 空态 / 错误态:整行呈现,容器高度不变 -->
        <div v-else class="kpis__state">
          <StateBlock
            :status="kpis.status.value"
            :error="kpis.error.value"
            empty-text="所选周期暂无指标数据"
            @retry="kpis.load()"
          />
        </div>
      </div>

      <!-- ══ 中部:趋势 + 环形 ══ -->
      <div class="row row--mid">
        <!-- 税收收入趋势 -->
        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">税收收入趋势 · 近 12 个月</h2>
            <div class="legend">
              <span class="legend__item"><span class="legend__line"></span>实际入库</span>
              <span class="legend__item"><span class="legend__dash"></span>预测值</span>
              <span v-if="trendUnit" class="legend__unit">单位:{{ trendUnit }}</span>
            </div>
          </div>
          <StateBlock
            :status="trend.status.value"
            :error="trend.error.value"
            empty-text="所选周期暂无数据"
            @retry="trend.load()"
          >
            <TrendChart :points="trend.data.value!.points" />
          </StateBlock>
        </section>

        <!-- 分税种收入结构 -->
        <section class="panel">
          <h2 class="panel__title panel__title--solo">分税种收入结构</h2>
          <StateBlock
            :status="structure.status.value"
            :error="structure.error.value"
            empty-text="所选周期暂无数据"
            @retry="structure.load()"
          >
            <DonutChart
              :segments="structure.data.value!.segments"
              :total-label="structure.data.value!.totalLabel"
            />
          </StateBlock>
        </section>
      </div>

      <!-- ══ 下部:区县条形 + 数据源柱状 ══ -->
      <div class="row row--lower">
        <!-- 分区县收入完成情况 -->
        <section class="panel">
          <div class="panel__head panel__head--gap12">
            <h2 class="panel__title">分区县收入完成情况</h2>
            <span class="panel__note">按预算完成率排序</span>
          </div>
          <StateBlock
            :status="districts.status.value"
            :error="districts.error.value"
            empty-text="所选周期暂无数据"
            @retry="districts.load()"
          >
            <div class="bars">
              <div v-for="(d, i) in districts.data.value" :key="d.name" class="bar-row">
                <span class="bar-row__name">{{ d.name }}</span>
                <div class="bar-row__track">
                  <div
                    class="bar-row__fill"
                    :style="{ width: d.pct + '%', background: districtColor(i) }"
                  ></div>
                </div>
                <span class="bar-row__pct num">{{ d.pct }}%</span>
              </div>
            </div>
          </StateBlock>
        </section>

        <!-- 综合治税成效 · 分数据源增收贡献 -->
        <section class="panel">
          <div class="panel__head panel__head--gap8">
            <h2 class="panel__title">综合治税成效 · 分数据源增收贡献</h2>
            <span class="panel__note">单位:万元</span>
          </div>
          <StateBlock
            :status="sources.status.value"
            :error="sources.error.value"
            empty-text="所选周期暂无数据"
            @retry="sources.load()"
          >
            <div class="cols">
              <div v-for="(s, i) in sources.data.value" :key="s.name" class="col">
                <span class="col__value num">{{ fmtInt(s.value) }}</span>
                <div
                  class="col__bar"
                  :style="{
                    height: ((s.value / sourceMax) * 100).toFixed(1) + '%',
                    background: SOURCE_COLORS[i % SOURCE_COLORS.length],
                  }"
                ></div>
                <span class="col__name">{{ s.name }}</span>
              </div>
            </div>
          </StateBlock>
        </section>
      </div>

      <!-- ══ 底部:风险任务闭环漏斗 ══ -->
      <section class="panel panel--funnel">
        <div class="panel__head">
          <h2 class="panel__title">风险任务闭环</h2>
          <span v-if="funnel.status.value === 'ready'" class="panel__note panel__note--strong num">
            整体入库转化率
            <span class="panel__note-em">{{ funnel.data.value!.overallConversion.toFixed(1) }}%</span>
          </span>
        </div>
        <StateBlock
          :status="funnel.status.value"
          :error="funnel.error.value"
          empty-text="所选周期暂无数据"
          @retry="funnel.load()"
        >
          <div class="funnel">
            <svg viewBox="0 0 1300 118" preserveAspectRatio="none" class="funnel__svg">
              <polygon v-for="f in funnelShapes" :key="f.name" :points="f.points" :fill="f.color" />
              <text
                v-for="(c, i) in funnelConversions"
                :key="'c' + i"
                :x="c.x"
                y="20"
                text-anchor="middle"
                class="funnel__conv"
              >
                ▸ {{ c.pct }}
              </text>
              <text
                v-for="f in funnelShapes"
                :key="'v' + f.name"
                :x="f.cx"
                y="62"
                text-anchor="middle"
                class="funnel__value num"
              >
                {{ f.value }}
              </text>
              <text
                v-for="f in funnelShapes"
                :key="'n' + f.name"
                :x="f.cx"
                y="86"
                text-anchor="middle"
                class="funnel__stage"
              >
                {{ f.name }}
              </text>
            </svg>
          </div>
        </StateBlock>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* ══ 页面骨架 ══ */
.dash {
  height: 100%;
  background: var(--color-bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ══ 顶部标题栏 ══ */
.dash__header {
  height: 68px;
  flex: none;
  background: var(--color-panel);
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 28px;
  gap: 20px;
}
.dash__accent {
  width: 4px;
  height: 30px;
  background: var(--color-primary);
  flex: none;
}
.dash__titles {
  display: flex;
  align-items: baseline;
  gap: 14px;
}
.dash__h1 {
  font-size: var(--fs-h1);
  font-weight: var(--fw-h1);
  margin: 0;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.dash__sub {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.dash__tools {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.dash__updated {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.dash__updated-skeleton {
  width: 168px;
  height: 14px;
}
.dash__seg-skeleton {
  width: 176px;
  height: 34px;
}
.dash__select-skeleton {
  width: 128px;
  height: 34px;
}

/* 分段筛选 */
.seg {
  display: inline-flex;
  border: var(--border-line);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.seg__item {
  padding: 7px 18px;
  font-size: var(--fs-aux);
  cursor: pointer;
  background: var(--color-panel);
  color: var(--color-neutral-700);
  white-space: nowrap;
  transition: background var(--motion-fast) ease, color var(--motion-fast) ease;
}
.seg__item--divided {
  border-left: var(--border-line);
}
.seg__item:hover {
  background: var(--color-neutral-100);
}
.seg__item--active,
.seg__item--active:hover {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

/* 区县下拉 */
.select {
  position: relative;
  min-width: 128px;
  height: 34px;
  padding: 0 12px;
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--fs-aux);
  background: var(--color-panel);
  cursor: pointer;
  user-select: none;
}
.select__caret {
  color: var(--color-neutral-500);
  margin-left: var(--space-2);
}
.select__menu {
  position: absolute;
  top: 36px;
  left: 0;
  right: 0;
  z-index: 20;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-sm);
  padding: var(--space-1) 0;
  max-height: 280px;
  overflow: auto;
}
.select__option {
  padding: 7px 12px;
  font-size: var(--fs-aux);
  color: var(--color-neutral-700);
  white-space: nowrap;
}
.select__option:hover {
  background: var(--color-neutral-100);
}
.select__option--on {
  color: var(--color-primary);
  background: var(--color-primary-tint);
  font-weight: var(--fw-semibold);
}

/* ══ 主体 ══ */
.dash__body {
  flex: 1;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
}

/* ══ 指标区 ══ */
.kpis {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  height: 148px;
  flex: none;
}
.kpi {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  border-top: 3px solid var(--color-primary);
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.kpi--link {
  cursor: pointer;
  transition: border-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease;
}
.kpi--link:hover {
  border-left-color: var(--color-neutral-400);
  border-right-color: var(--color-neutral-400);
  border-bottom-color: var(--color-neutral-400);
  box-shadow: var(--shadow-sm);
}
/* 指标区空态/错误态:横跨整行 */
.kpis__state {
  grid-column: 1 / -1;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
}
.kpi__label {
  font-size: var(--fs-body);
  color: var(--color-text-sub);
}
.kpi__value {
  font-size: 38px;
  font-weight: var(--fw-semibold);
  line-height: 1;
}
.kpi__unit {
  font-size: 15px; /* 设计稿特定字号(令牌无对应值) */
  font-weight: var(--fw-regular);
  color: var(--color-neutral-600);
  margin-left: 6px;
}
.kpi__delta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fs-aux);
}
.kpi__delta-value {
  font-weight: var(--fw-semibold);
}
.kpi__delta-note {
  color: var(--color-neutral-600);
}
.kpi__value-skeleton {
  width: 92px;
  height: 34px;
}
.kpi__delta-skeleton {
  width: 120px;
  height: 13px;
}

/* ══ 面板通用 ══ */
.row {
  display: grid;
  gap: 20px;
  flex: 1;
  min-height: 0;
}
.row--mid {
  grid-template-columns: 1.55fr 1fr;
}
.row--lower {
  grid-template-columns: 1fr 1fr;
}
.panel {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.panel--funnel {
  height: 196px;
  flex: none;
  padding: 16px 22px;
}
.panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}
.panel__head--gap12 {
  margin-bottom: var(--space-3);
}
.panel__head--gap8 {
  margin-bottom: var(--space-2);
}
.panel__title {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  margin: 0;
}
.panel__title--solo {
  margin: 0 0 6px;
}
.panel__note {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.panel__note--strong {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
}
.panel__note-em {
  color: var(--color-primary);
  font-weight: var(--fw-semibold);
  font-size: 15px;
}

/* 趋势图例 */
.legend {
  display: flex;
  gap: 18px;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.legend__line {
  width: 16px;
  height: 2px;
  background: var(--color-primary);
}
.legend__dash {
  width: 16px;
  height: 0;
  border-top: 2px dashed var(--color-neutral-500);
}
.legend__unit {
  color: var(--color-neutral-500);
}

/* ══ 分区县条形 ══ */
.bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 0;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.bar-row__name {
  width: 64px;
  font-size: var(--fs-aux);
  color: var(--color-neutral-700);
  flex: none;
  text-align: right;
  white-space: nowrap;
}
.bar-row__track {
  flex: 1;
  height: 16px;
  background: var(--color-neutral-200);
  position: relative;
  border-radius: 1px;
}
.bar-row__fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 1px;
}
.bar-row__pct {
  width: 48px;
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  flex: none;
}

/* ══ 数据源柱状 ══ */
.cols {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 18px;
  padding: 0 var(--space-1);
  min-height: 0;
}
.col {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}
.col__value {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-900);
}
.col__bar {
  width: 100%;
  max-width: 56px;
  border-radius: 1px 1px 0 0;
}
.col__name {
  font-size: var(--fs-label);
  color: var(--color-text-sub);
  text-align: center;
  line-height: 1.3;
  white-space: nowrap;
}

/* ══ 漏斗 ══ */
.funnel {
  flex: 1;
  display: flex;
  align-items: stretch;
  min-height: 0;
}
.funnel__svg {
  width: 100%;
  height: 100%;
  display: block;
}
/* SVG 文字用 CSS 着色/定字号,避免在表现属性里写死色值 */
.funnel__conv {
  font-size: var(--fs-label);
  fill: var(--color-neutral-600);
}
.funnel__value {
  font-size: 24px; /* 漏斗内数值,设计稿特定字号(令牌无对应值) */
  font-weight: var(--fw-semibold);
  fill: var(--color-text-inverse);
}
.funnel__stage {
  font-size: var(--fs-aux);
  fill: var(--color-primary-tint);
}
</style>
