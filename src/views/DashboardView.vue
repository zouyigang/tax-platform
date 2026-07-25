<script setup lang="ts">
/**
 * 领导驾驶舱 · 税收运行监测
 * 1:1 复刻设计稿;外层由固定 1920×1080 改为填满右侧内容区(布局结构不变)。
 * 取数一律经 @/api/client,不直接引用任何 adapter。
 * 每个数据区块独立四态(《交互说明》第 2 节)。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { DashboardPeriod, DashboardQuery } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import { DELTA_TONE } from '@/components/common/tone'
import { districtColor, FUNNEL_COLORS, SOURCE_COLORS } from '@/charts/palette'

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
})

/* ---------------- 顶部筛选交互 ---------------- */
function selectPeriod(value: string) {
  if (value === period.value) return
  period.value = value as DashboardPeriod
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
        <BaseSelect
          v-if="filters.status.value === 'ready'"
          v-model="districtCode"
          :options="filters.data.value!.districts"
          width="var(--dash-select-w)"
          height="var(--dash-control-h)"
          @update:model-value="reloadRegions"
        />
        <span v-else class="skeleton dash__select-skeleton"></span>
      </div>
    </header>

    <div class="dash__body">
      <!-- ══ 指标区(5 卡) ══ -->
      <div class="kpis">
        <template v-if="kpis.status.value === 'ready'">
          <MetricCard
            v-for="k in kpis.data.value"
            :key="k.key"
            :label="k.label"
            :value="k.value"
            :unit="k.unit"
            :accent="k.accent"
            :delta="k.delta"
            :delta-tone="DELTA_TONE[k.deltaTone]"
            :delta-note="k.deltaNote"
            :clickable="!!k.linkTo"
            size="lg"
            variant="card"
            @click="onKpiClick(k.linkTo)"
          />
        </template>

        <!-- 指标卡加载态:数值位置显示等宽灰条 -->
        <template v-else-if="kpis.status.value === 'loading' || kpis.status.value === 'idle'">
          <div v-for="n in 5" :key="n" class="kpi-skeleton">
            <div class="skeleton kpi-skeleton__value"></div>
            <div class="skeleton kpi-skeleton__delta"></div>
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
  /* 视口不足时不再压缩内容,交由内容区滚动 */
  min-height: var(--dash-min-h);
  background: var(--color-bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ══════════════════════════════════════════════════════════════
 * 页面级令牌 · 仅领导驾驶舱使用
 * 这些数值来自设计稿,但不在《设计系统》的字阶与 4px 间距刻度
 * (4/8/12/16/24/32/48)之内,属本页专有度量,故就近定义在页面根节点,
 * 不写入 tokens.css —— tokens.css 只承载全局设计系统。
 * CSS 自定义属性沿 DOM 继承,页内子组件可直接引用。
 * ══════════════════════════════════════════════════════════════ */
.dash {
  /* 字号 */
  --dash-fs-kpi-value: 38px;    /* 指标卡主数值 */
  --dash-fs-kpi-unit: 15px;     /* 指标卡单位 */
  --dash-fs-emphasis: 15px;     /* 整体转化率等强调数字 */
  --dash-fs-funnel-value: 24px; /* 漏斗环节数值 */

  /* 间距 */
  --dash-pad-x: 28px;           /* 页面左右外边距 */
  --dash-gap: 20px;             /* 卡片 / 面板栅格间距 */
  --dash-panel-pad: 18px 22px;  /* 面板内边距 */
  --dash-funnel-pad: 16px 22px; /* 漏斗面板内边距 */
  --dash-title-gap: 14px;       /* 主标题与副标题间距 */
  --dash-bar-gap: 14px;         /* 条形行内元素间距 */
  --dash-head-mb: 6px;          /* 面板标题下间距 */
  --dash-inline-gap: 6px;       /* 图例项内 / 数值与单位间距 */
  --dash-series-gap: 18px;      /* 图例与柱状列间距 */
  --dash-seg-pad: 7px 18px;     /* 分段控件内边距 */
  --dash-option-pad: 7px 12px;  /* 下拉选项内边距 */

  /* 尺寸 */
  --dash-header-h: 68px;        /* 顶部标题栏高 */
  --dash-kpi-row-h: 148px;      /* 指标行高 */
  --dash-kpi-accent-h: 3px;     /* 指标卡顶部色条 */
  --dash-funnel-h: 196px;       /* 漏斗面板高 */
  --dash-control-h: 34px;       /* 筛选控件高 */
  --dash-select-w: 128px;       /* 区县下拉宽 */
  --dash-menu-max-h: 280px;     /* 下拉面板最大高 */
  --dash-accent-w: 4px;         /* 标题栏色条宽 */
  --dash-accent-h: 30px;        /* 标题栏色条高 */
  --dash-bar-name-w: 64px;      /* 区县名列宽 */
  --dash-bar-pct-w: 48px;       /* 完成率列宽 */
  --dash-track-h: 16px;         /* 条形轨道高 */
  --dash-col-max-w: 56px;       /* 柱体最大宽 */
  --dash-legend-mark-w: 16px;   /* 图例色标宽 */
  --dash-legend-mark-h: 2px;    /* 图例色标线高 */
  --dash-bar-radius: 1px;       /* 条形 / 柱体圆角 */

  /* 看板最小高度:低于此值各行会被压穿(环形图/条形列表有固有最小高度),
     此时改为整体滚动,而非让内容溢出互相覆盖。
     = 68 顶栏 + 48 内边距 + 148 指标 + 216 中部 + 192 下部 + 196 漏斗 + 60 间距 */
  --dash-min-h: 940px;

  /* 骨架屏占位尺寸 */
  --dash-skel-updated-w: 168px;
  --dash-skel-seg-w: 176px;
  --dash-skel-kpi-w: 92px;
  --dash-skel-delta-w: 120px;
  --dash-skel-line-h: 14px;
  --dash-skel-delta-h: 13px;
}

/* ══ 顶部标题栏 ══ */
.dash__header {
  height: var(--dash-header-h);
  flex: none;
  background: var(--color-panel);
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 var(--dash-pad-x);
  gap: var(--dash-gap);
}
.dash__accent {
  width: var(--dash-accent-w);
  height: var(--dash-accent-h);
  background: var(--color-primary);
  flex: none;
}
.dash__titles {
  display: flex;
  align-items: baseline;
  gap: var(--dash-title-gap);
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
  width: var(--dash-skel-updated-w);
  height: var(--dash-skel-line-h);
}
.dash__seg-skeleton {
  width: var(--dash-skel-seg-w);
  height: var(--dash-control-h);
}
.dash__select-skeleton {
  width: var(--dash-select-w);
  height: var(--dash-control-h);
}

/* 分段筛选 */
.seg {
  display: inline-flex;
  border: var(--border-line);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.seg__item {
  padding: var(--dash-seg-pad);
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

/* ══ 主体 ══ */
.dash__body {
  flex: 1;
  padding: var(--space-6) var(--dash-pad-x);
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
  min-height: 0;
}

/* ══ 指标区 ══ */
.kpis {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--dash-gap);
  height: var(--dash-kpi-row-h);
  flex: none;
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
/* 指标卡加载态占位(与 MetricCard 卡片外形一致) */
.kpi-skeleton {
  background: var(--color-panel);
  border: var(--border-line);
  border-top: var(--dash-kpi-accent-h) solid var(--color-neutral-300);
  border-radius: var(--radius-control);
  padding: var(--dash-panel-pad);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-3);
}
.kpi-skeleton__value {
  width: var(--dash-skel-kpi-w);
  height: var(--dash-control-h);
}
.kpi-skeleton__delta {
  width: var(--dash-skel-delta-w);
  height: var(--dash-skel-delta-h);
}

/* ══ 面板通用 ══ */
.row {
  display: grid;
  gap: var(--dash-gap);
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
  padding: var(--dash-panel-pad);
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* 兜底:内容仍超出时在面板内裁剪,不越界覆盖相邻区块 */
  overflow: hidden;
}
.panel--funnel {
  height: var(--dash-funnel-h);
  flex: none;
  padding: var(--dash-funnel-pad);
}
.panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--dash-head-mb);
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
  margin: 0 0 var(--dash-head-mb);
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
  font-size: var(--dash-fs-emphasis);
}

/* 趋势图例 */
.legend {
  display: flex;
  gap: var(--dash-series-gap);
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.legend__item {
  display: inline-flex;
  align-items: center;
  gap: var(--dash-inline-gap);
}
.legend__line {
  width: var(--dash-legend-mark-w);
  height: var(--dash-legend-mark-h);
  background: var(--color-primary);
}
.legend__dash {
  width: var(--dash-legend-mark-w);
  height: 0;
  border-top: var(--dash-legend-mark-h) dashed var(--color-neutral-500);
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
  overflow: hidden;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: var(--dash-bar-gap);
}
.bar-row__name {
  width: var(--dash-bar-name-w);
  font-size: var(--fs-aux);
  color: var(--color-neutral-700);
  flex: none;
  text-align: right;
  white-space: nowrap;
}
.bar-row__track {
  flex: 1;
  height: var(--dash-track-h);
  background: var(--color-neutral-200);
  position: relative;
  border-radius: var(--dash-bar-radius);
}
.bar-row__fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: var(--dash-bar-radius);
}
.bar-row__pct {
  width: var(--dash-bar-pct-w);
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  flex: none;
}

/* ══ 数据源柱状 ══ */
.cols {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: var(--dash-series-gap);
  padding: 0 var(--space-1);
  min-height: 0;
  overflow: hidden;
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
  max-width: var(--dash-col-max-w);
  border-radius: var(--dash-bar-radius) var(--dash-bar-radius) 0 0;
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
  font-size: var(--dash-fs-funnel-value);
  font-weight: var(--fw-semibold);
  fill: var(--color-text-inverse);
}
.funnel__stage {
  font-size: var(--fs-aux);
  fill: var(--color-primary-tint);
}
</style>
