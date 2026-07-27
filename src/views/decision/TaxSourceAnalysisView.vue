<script setup lang="ts">
/**
 * 决策分析 · 税源分析(《决策分析 handoff》1:1 复刻)
 * 指标横条 + 帕累托(SVG 柱+累计线)+ 集中度侧卡 + 税源流动双向柱(SVG)
 * + 行业结构 100% 堆叠面积(SVG)+ 区域气泡矩阵(SVG)与区县排行。
 * 图形几何在组件内计算;颜色取 charts/palette;取数经 @/api/client。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { DashboardPeriod, DecisionQuery } from '@/api/types'
import { useResource } from '@/composables/useResource'
import { useTooltip, type TipRow } from '@/composables/useTooltip'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ChartTooltip from '@/components/charts/ChartTooltip.vue'
import { DECISION } from '@/charts/palette'
import { toneClass } from '@/components/common/tone'

const period = ref<DashboardPeriod>('year')
const districtCode = ref('all')

const filters = useResource(() => api.decision.getDecisionFilters())
const query = computed<DecisionQuery>(() => ({ period: period.value, districtCode: districtCode.value }))
const data = useResource(() => api.decision.getTaxSourceAnalysis(query.value))
const ts = computed(() => data.data.value)

const { tip, showTip, hideTip } = useTooltip()

onMounted(async () => {
  await filters.load()
  if (filters.data.value) {
    period.value = filters.data.value.defaultPeriod
    districtCode.value = filters.data.value.defaultDistrictCode
  }
  data.load()
})

const fmt = (n: number) => n.toLocaleString('en-US')

/* ─────────── 帕累托 ─────────── */
const pareto = computed(() => {
  const d = ts.value
  if (!d) return null
  const py = (v: number) => 258 - (v / 30000) * 240
  const pyPct = (p: number) => 258 - (p / 100) * 240
  let acc = 0
  const bars: Array<Record<string, unknown>> = []
  const pts: Array<{ x: number; y: number }> = []
  d.pareto.forEach((e, i) => {
    acc += e.value
    const x = 68 + i * 58
    const cx = x + 20
    const cum = (acc / d.paretoTotal) * 100
    bars.push({
      x, cx, y: py(e.value), h: 258 - py(e.value), op: 1 - i * 0.045, label: `No.${i + 1}`,
      title: e.name,
      rows: [
        { k: '本年入库', v: `${fmt(e.value)} 万元` },
        { k: '占全市', v: `${((e.value / d.paretoTotal) * 100).toFixed(1)}%` },
        { k: '累计占比', v: `${cum.toFixed(1)}%` },
      ] as TipRow[],
    })
    pts.push({ x: cx, y: pyPct(cum) })
  })
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')
  const grid = [0, 10000, 20000, 30000].map((v) => ({ y: py(v), ty: py(v) + 4, label: `${v / 10000}亿` }))
  const right = [0, 50, 100].map((p) => ({ ty: pyPct(p) + 4, label: `${p}%` }))
  return { bars, pts, line, grid, right, y80: pyPct(80), ty80: pyPct(80) - 6 }
})

/* ─────────── 规模梯队(对数宽度) ─────────── */
const tiers = computed(() => {
  const d = ts.value
  if (!d) return []
  const max = Math.log10(d.scaleTiers.reduce((m, t) => (t.count > m ? t.count : m), 1))
  return d.scaleTiers.map((t) => ({
    name: t.name,
    n: fmt(t.count),
    w: `${Math.round((Math.log10(t.count) / max) * 100)}%`,
  }))
})

/* ─────────── 税源流动双向柱 ─────────── */
const flow = computed(() => {
  const d = ts.value
  if (!d) return []
  const fs = (v: number) => (v / 550) * 110
  return d.flow.map((f, i) => {
    const x = 90 + i * 136
    const net = f.add + f.moveIn - f.cancel - f.moveOut
    const hNew = fs(f.add)
    const hIn = fs(f.moveIn)
    const hOut1 = fs(f.cancel)
    const hOut2 = fs(f.moveOut)
    return {
      x, x2: x + 38, cx: x + 36, label: f.month,
      hNew, yNew: 129 - hNew, hIn, yIn: 129 - hNew - hIn,
      hOut1, hOut2, yOut2: 131 + hOut1,
      net: `${net >= 0 ? '+' : ''}${net}`,
      netPos: net >= 0,
      netY: 129 - hNew - hIn - 8,
      rows: [
        { k: '新办', v: `+${f.add} 户` },
        { k: '迁入', v: `+${f.moveIn} 户` },
        { k: '注销', v: `-${f.cancel} 户` },
        { k: '迁出', v: `-${f.moveOut} 户` },
      ] as TipRow[],
    }
  })
})

/* ─────────── 行业结构 100% 堆叠面积 ─────────── */
const industry = computed(() => {
  const d = ts.value
  if (!d) return null
  const n = d.quarters.length
  const ix = (i: number) => 20 + i * (480 / (n - 1))
  const iy = (p: number) => 210 - (p / 100) * 200
  const cumTop: number[][] = d.industries.map(() => [])
  for (let q = 0; q < n; q++) {
    let c = 0
    d.industries.forEach((ind, k) => {
      c += ind.values[q]
      cumTop[k].push(c)
    })
  }
  const areas = d.industries.map((ind, k) => {
    const top = cumTop[k].map((c, q) => `${ix(q)},${iy(c)}`)
    const bot = (k === 0 ? d.quarters.map((_, q) => `${ix(q)},${iy(0)}`) : cumTop[k - 1].map((c, q) => `${ix(q)},${iy(c)}`)).reverse()
    return { hex: DECISION.industry[k % DECISION.industry.length], pts: top.concat(bot).join(' ') }
  })
  const zones = d.quarters.map((l, q) => ({
    x: ix(q) - 34, w: 68, cx: ix(q), label: l,
    rows: d.industries.map((ind) => ({ k: ind.name, v: `${ind.values[q].toFixed(1)}%` })) as TipRow[],
  }))
  const legend = d.industries.map((ind, k) => ({ name: ind.name, hex: DECISION.industry[k % DECISION.industry.length] }))
  return { areas, zones, legend }
})

/* ─────────── 区域气泡矩阵 ─────────── */
const bubbleChart = computed(() => {
  const d = ts.value
  if (!d) return null
  const bx = (h: number) => 48 + (h / 10000) * 390
  const by = (a: number) => 244 - (a / 28) * 226
  const list = d.bubbles.map((b) => {
    const r = 6 + Math.sqrt(b.totalTax) * 5.4
    return {
      name: b.name,
      x: Math.round(bx(b.households)),
      y: Math.round(by(b.avgTax)),
      r: Math.round(r),
      ly: Math.round(by(b.avgTax) - r - 4),
      rows: [
        { k: '税源户数', v: `${fmt(b.households)} 户` },
        { k: '户均税额', v: `${b.avgTax} 万元` },
        { k: '税收总量', v: `${b.totalTax} 亿元` },
      ] as TipRow[],
    }
  })
  const meanH = d.bubbles.reduce((s, b) => s + b.households, 0) / d.bubbles.length
  const meanA = d.bubbles.reduce((s, b) => s + b.avgTax, 0) / d.bubbles.length
  const xTicks = [2000, 4000, 6000, 8000, 10000].map((v) => ({ x: Math.round(bx(v)), label: fmt(v) }))
  const yTicks = [7, 14, 21, 28].map((v) => ({ y: Math.round(by(v)) + 4, label: v }))
  const rank = [...d.bubbles]
    .sort((a, b) => b.totalTax - a.totalTax)
    .map((b, i) => ({ rank: i + 1, name: b.name, val: b.totalTax.toFixed(1), top: i < 3 }))
  return { list, meanX: Math.round(bx(meanH)), meanY: Math.round(by(meanA)), xTicks, yTicks, rank }
})
</script>

<template>
  <div class="tsa">
    <PageHeader title="税源分析" breadcrumb="首页 / 决策分析 / 税源分析">
      <template #actions>
        <span class="tsa__upd num">数据更新 2026-07-24 08:00</span>
        <BaseSelect
          v-model="period"
          :options="filters.data.value ? filters.data.value.periods : []"
          width="100px"
          @update:model-value="data.load()"
        />
        <BaseSelect
          v-model="districtCode"
          :options="filters.data.value ? filters.data.value.districts : []"
          width="120px"
          @update:model-value="data.load()"
        />
        <button type="button" class="btn btn--primary">⤓ 导出</button>
      </template>
    </PageHeader>

    <div class="tsa__body">
      <StateBlock :status="data.status.value" :error="data.error.value" @retry="data.load()">
        <template v-if="ts && pareto && industry && bubbleChart">
          <!-- ── 指标横条 ── -->
          <div class="card statbar">
            <div v-for="(k, i) in ts.headStats" :key="k.label" class="statbar__item" :class="{ 'statbar__item--div': i > 0 }">
              <span class="statbar__label">{{ k.label }}</span>
              <span class="statbar__value num" :class="toneClass(k.tone)">{{ k.value }}</span>
              <span class="statbar__note">{{ k.note }}</span>
            </div>
          </div>

          <!-- ── 帕累托 + 集中度 ── -->
          <div class="row-2-1">
            <section class="card">
              <div class="card__head card__head--gap">
                <h2 class="card__h2">重点税源集中度 · 帕累托</h2>
                <span class="card__sub">TOP 15 纳税户(脱敏)· 柱:本年入库(万元) 线:累计占比</span>
                <span class="card__hl num">前 10 户贡献全市税收 42.6%</span>
              </div>
              <svg viewBox="0 0 1000 300" class="svg">
                <line v-for="(g, i) in pareto.grid" :key="`pg${i}`" x1="56" :y1="g.y" x2="944" :y2="g.y" :stroke="DECISION.grid" stroke-width="1" />
                <text v-for="(g, i) in pareto.grid" :key="`pt${i}`" x="48" :y="g.ty" text-anchor="end" font-size="11" :fill="DECISION.axis">{{ g.label }}</text>
                <text v-for="(g, i) in pareto.right" :key="`pr${i}`" x="952" :y="g.ty" text-anchor="start" font-size="11" :fill="DECISION.lightBlue">{{ g.label }}</text>
                <g v-for="(b, i) in pareto.bars" :key="`pb${i}`" style="cursor: pointer" @mouseenter="showTip($event, b.title as string, b.rows as TipRow[])" @mouseleave="hideTip">
                  <rect :x="b.x as number" :y="b.y as number" width="40" :height="b.h as number" :fill="DECISION.actual" :opacity="b.op as number" />
                  <text :x="b.cx as number" y="290" text-anchor="middle" font-size="11" :fill="DECISION.axisText">{{ b.label }}</text>
                </g>
                <path :d="pareto.line" fill="none" :stroke="DECISION.lightBlue" stroke-width="2.5" stroke-linejoin="round" />
                <circle v-for="(p, i) in pareto.pts" :key="`pp${i}`" :cx="p.x" :cy="p.y" r="3.5" :fill="DECISION.symbolFill" :stroke="DECISION.lightBlue" stroke-width="2" />
                <line x1="56" :y1="pareto.y80" x2="944" :y2="pareto.y80" :stroke="DECISION.line80" stroke-width="1" stroke-dasharray="5 4" />
                <text x="944" :y="pareto.ty80" text-anchor="end" font-size="11" :fill="DECISION.line80">80% 线</text>
              </svg>
            </section>

            <section class="card conc">
              <h2 class="card__h2">集中度指标</h2>
              <div class="conc__bars">
                <div v-for="c in ts.concentrationBars" :key="c.name">
                  <div class="conc__row">
                    <span class="conc__name">{{ c.name }}</span>
                    <span class="num conc__pct">{{ c.pct }}%<span class="conc__delta">{{ c.delta }}</span></span>
                  </div>
                  <div class="conc__track"><div class="conc__fill" :style="{ width: c.pct + '%' }"></div></div>
                </div>
              </div>
              <div class="conc__tiers">
                <div class="conc__sub">纳税规模梯队 · 户数</div>
                <div class="tier-list">
                  <div v-for="t in tiers" :key="t.name" class="tier">
                    <span class="tier__name">{{ t.name }}</span>
                    <div class="tier__track"><div class="tier__fill" :style="{ width: t.w }"></div></div>
                    <span class="num tier__n">{{ t.n }}</span>
                  </div>
                </div>
              </div>
              <div class="conc__hhi">HHI 指数 <b class="num">{{ ts.hhi }}</b>,{{ ts.hhiNote }}</div>
            </section>
          </div>

          <!-- ── 税源流动 ── -->
          <section class="card">
            <div class="card__head">
              <h2 class="card__h2">税源流动 · 月度新办 / 注销 / 迁入 / 迁出</h2>
              <div class="flow-legend">
                <span class="lg"><span class="lg__dot" :style="{ background: DECISION.actual }"></span>新办</span>
                <span class="lg"><span class="lg__dot" :style="{ background: DECISION.lightBlue }"></span>迁入</span>
                <span class="lg"><span class="lg__dot" :style="{ background: DECISION.wfNeg }"></span>注销</span>
                <span class="lg"><span class="lg__dot" :style="{ background: DECISION.moveOut }"></span>迁出</span>
                <span class="card__sub">单位:户</span>
              </div>
            </div>
            <svg viewBox="0 0 1060 260" class="svg">
              <line x1="52" y1="130" x2="1048" y2="130" :stroke="DECISION.connector" stroke-width="1.5" />
              <g v-for="(c, i) in flow" :key="`fc${i}`" style="cursor: pointer" @mouseenter="showTip($event, `${c.label} 税源流动`, c.rows)" @mouseleave="hideTip">
                <rect :x="c.x" :y="c.yNew" width="34" :height="c.hNew" :fill="DECISION.actual" />
                <rect :x="c.x" :y="c.yIn" width="34" :height="c.hIn" :fill="DECISION.lightBlue" />
                <rect :x="c.x2" y="131" width="34" :height="c.hOut1" :fill="DECISION.wfNeg" />
                <rect :x="c.x2" :y="c.yOut2" width="34" :height="c.hOut2" :fill="DECISION.moveOut" />
                <text :x="c.cx" y="252" text-anchor="middle" font-size="12" :fill="DECISION.axisText">{{ c.label }}</text>
                <text :x="c.cx" :y="c.netY" text-anchor="middle" font-size="12" font-weight="600" :fill="c.netPos ? DECISION.posText : DECISION.wfNeg" class="num">{{ c.net }}</text>
              </g>
            </svg>
            <div class="note">{{ ts.flowNote }}</div>
          </section>

          <!-- ── 行业演变 + 区域气泡 ── -->
          <div class="row-1-115">
            <section class="card">
              <div class="card__head">
                <h2 class="card__h2">行业结构演变 · 近 8 季度</h2>
                <span class="card__sub">税收占比 100% 堆叠</span>
              </div>
              <div class="ind-legend">
                <span v-for="l in industry.legend" :key="l.name" class="lg"><span class="lg__dot" :style="{ background: l.hex }"></span>{{ l.name }}</span>
              </div>
              <svg viewBox="0 0 520 240" class="svg">
                <polygon v-for="(a, i) in industry.areas" :key="`ia${i}`" :points="a.pts" :fill="a.hex" fill-opacity="0.88" />
                <rect v-for="(q, i) in industry.zones" :key="`iz${i}`" :x="q.x" y="10" :width="q.w" height="200" fill="transparent" style="cursor: pointer" @mouseenter="showTip($event, `${q.label} 行业税收占比`, q.rows)" @mouseleave="hideTip" />
                <text v-for="(q, i) in industry.zones" :key="`il${i}`" :x="q.cx" y="232" text-anchor="middle" font-size="11" :fill="DECISION.axisText">{{ q.label }}</text>
              </svg>
              <div class="note">{{ ts.industryNote }}</div>
            </section>

            <section class="card">
              <div class="card__head">
                <h2 class="card__h2">区域税源分布 · 气泡矩阵</h2>
                <span class="card__sub">横轴:税源户数 纵轴:户均税额(万元) 气泡:税收总量</span>
              </div>
              <div class="bubble-wrap">
                <svg viewBox="0 0 460 280" class="bubble-svg">
                  <line x1="48" y1="10" x2="48" y2="244" :stroke="DECISION.axisLine" stroke-width="1" />
                  <line x1="48" y1="244" x2="450" y2="244" :stroke="DECISION.axisLine" stroke-width="1" />
                  <line :x1="bubbleChart.meanX" y1="10" :x2="bubbleChart.meanX" y2="244" :stroke="DECISION.meanLine" stroke-width="1" stroke-dasharray="4 3" />
                  <line x1="48" :y1="bubbleChart.meanY" x2="450" :y2="bubbleChart.meanY" :stroke="DECISION.meanLine" stroke-width="1" stroke-dasharray="4 3" />
                  <text x="446" y="24" text-anchor="end" font-size="10" :fill="DECISION.connector">户多 · 均额高</text>
                  <text x="52" y="24" text-anchor="start" font-size="10" :fill="DECISION.connector">户少 · 均额高</text>
                  <text x="446" y="238" text-anchor="end" font-size="10" :fill="DECISION.connector">户多 · 均额低</text>
                  <g v-for="(b, i) in bubbleChart.list" :key="`bb${i}`" style="cursor: pointer" @mouseenter="showTip($event, b.name, b.rows)" @mouseleave="hideTip">
                    <circle :cx="b.x" :cy="b.y" :r="b.r" :fill="DECISION.actual" fill-opacity="0.35" :stroke="DECISION.actual" stroke-width="1.5" />
                    <text :x="b.x" :y="b.ly" text-anchor="middle" font-size="11" :fill="DECISION.deepBlue" font-weight="600">{{ b.name }}</text>
                  </g>
                  <text v-for="(t, i) in bubbleChart.xTicks" :key="`bx${i}`" :x="t.x" y="260" text-anchor="middle" font-size="10" :fill="DECISION.axis" class="num">{{ t.label }}</text>
                  <text v-for="(t, i) in bubbleChart.yTicks" :key="`by${i}`" x="42" :y="t.y" text-anchor="end" font-size="10" :fill="DECISION.axis" class="num">{{ t.label }}</text>
                </svg>
                <div class="rank">
                  <div class="rank__title">区县税收排行(亿元)</div>
                  <div class="rank__list">
                    <div v-for="d in bubbleChart.rank" :key="d.name" class="rank__row">
                      <span class="num rank__no" :class="{ 'rank__no--top': d.top }">{{ d.rank }}</span>
                      <span class="rank__name">{{ d.name }}</span>
                      <span class="num rank__val">{{ d.val }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </template>
      </StateBlock>
    </div>

    <ChartTooltip :tip="tip" />
  </div>
</template>

<style scoped>
.tsa {
  /* 统计条数值(不在全局字阶内) */
  --ts-stat: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-body);
}
.tsa__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.tsa__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: 20px 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 18px 22px;
}
.card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: 8px;
}
.card__head--gap {
  justify-content: flex-start;
  gap: 14px;
}
.card__h2 {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  margin: 0;
}
.card__sub {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.card__hl {
  margin-left: auto;
  font-size: var(--fs-aux);
  color: var(--color-primary);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
}
.svg {
  width: 100%;
  display: block;
}
.note {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 6px;
}
.lg {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.lg__dot {
  width: 10px;
  height: 10px;
  border-radius: 1px;
}

/* 指标横条 */
.statbar {
  display: flex;
  align-items: center;
  padding: 14px 22px;
}
.statbar__item {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.statbar__item--div {
  border-left: 1px solid var(--color-neutral-200);
  padding-left: 24px;
}
.statbar__label {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.statbar__value {
  font-size: var(--ts-stat);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.statbar__note {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
}

/* 栅格 */
.row-2-1 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}
.row-1-115 {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 20px;
}

/* 集中度侧卡 */
.conc {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.conc__bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.conc__row {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-aux);
  margin-bottom: 4px;
}
.conc__name {
  color: var(--color-text-sub);
}
.conc__pct {
  font-weight: var(--fw-semibold);
}
.conc__delta {
  font-size: var(--fs-micro);
  font-weight: var(--fw-regular);
  color: var(--color-status-pending);
  margin-left: 6px;
}
.conc__track {
  height: 10px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.conc__fill {
  height: 10px;
  background: var(--color-primary);
  border-radius: 1px;
}
.conc__tiers {
  border-top: 1px solid var(--color-neutral-200);
  padding-top: 12px;
}
.conc__sub {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-bottom: 8px;
}
.tier-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.tier {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--fs-aux);
}
.tier__name {
  width: 88px;
  flex: none;
  color: var(--color-neutral-700);
  white-space: nowrap;
}
.tier__track {
  flex: 1;
  height: 9px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.tier__fill {
  height: 9px;
  background: var(--color-surface-accent);
  border-radius: 1px;
}
.tier__n {
  width: 56px;
  text-align: right;
  flex: none;
  font-weight: var(--fw-semibold);
}
.conc__hhi {
  margin-top: auto;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  background: var(--color-neutral-100);
  border-radius: var(--radius-control);
  padding: 8px 10px;
}
.conc__hhi b {
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-900);
}

/* 流动图例 */
.flow-legend {
  margin-left: auto;
  display: flex;
  gap: 16px;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  align-items: center;
}

/* 行业图例 */
.ind-legend {
  display: flex;
  gap: 14px;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-bottom: 8px;
  flex-wrap: wrap;
}

/* 气泡矩阵 */
.bubble-wrap {
  display: flex;
  gap: 18px;
}
.bubble-svg {
  flex: 1;
  display: block;
  min-width: 0;
}
.rank {
  width: 172px;
  flex: none;
  border-left: 1px solid var(--color-neutral-200);
  padding-left: 16px;
}
.rank__title {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-bottom: 8px;
}
.rank__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rank__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fs-label);
  cursor: pointer;
  padding: 1px 2px;
}
.rank__row:hover {
  color: var(--color-primary);
}
.rank__no {
  width: 16px;
  color: var(--color-neutral-500);
  font-weight: var(--fw-semibold);
}
.rank__no--top {
  color: var(--color-primary);
}
.rank__name {
  flex: 1;
  color: var(--color-neutral-700);
}
.rank__val {
  font-weight: var(--fw-semibold);
}
</style>
