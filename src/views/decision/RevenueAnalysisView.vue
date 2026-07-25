<script setup lang="ts">
/**
 * 决策分析 · 收入分析(《决策分析 handoff》1:1 复刻)
 * 进度对照卡 + 同比瀑布(SVG)+ 分级次堆叠柱(DOM)+ 全年预测(SVG,含置信区间)+ 分税种明细表(可排序/下钻)。
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
const data = useResource(() => api.decision.getRevenueAnalysis(query.value))
const rev = computed(() => data.data.value)

const { tip, showTip, hideTip } = useTooltip()

onMounted(async () => {
  await filters.load()
  if (filters.data.value) {
    period.value = filters.data.value.defaultPeriod
    districtCode.value = filters.data.value.defaultDistrictCode
  }
  data.load()
})

/* ─────────── 瀑布图几何 ─────────── */
const wf = computed(() => {
  const d = rev.value
  if (!d) return null
  const yv = (v: number) => 250 - ((v - 76) / 8) * 220
  let cum = d.waterfall[0].value
  const bars: Array<Record<string, unknown>> = []
  const conns: Array<{ x1: number; x2: number; y: number }> = []
  d.waterfall.forEach((w, i) => {
    const x = 60 + i * 118
    const cx = x + 36
    let y: number, h: number, fill: string, vlabel: string, vfill: string
    if (w.kind === 'base') {
      y = yv(w.value)
      h = 250 - y
      fill = i === 0 ? DECISION.wfBaseStart : DECISION.wfBaseEnd
      vlabel = w.value.toFixed(1)
      vfill = DECISION.textMain
      cum = w.value
    } else {
      const from = cum
      const to = cum + w.value
      y = yv(Math.max(from, to))
      h = Math.max(3, Math.abs(yv(from) - yv(to)))
      fill = w.value >= 0 ? DECISION.wfPos : DECISION.wfNeg
      vlabel = (w.value >= 0 ? '+' : '') + w.value.toFixed(2)
      vfill = fill
      cum = to
    }
    if (i < d.waterfall.length - 1) conns.push({ x1: x + 72, x2: x + 118, y: yv(cum) })
    const rows: TipRow[] =
      w.kind === 'base'
        ? [{ k: '1–7 月入库', v: `${w.value.toFixed(1)} 亿元` }]
        : [
            { k: '同比贡献', v: `${w.value >= 0 ? '+' : ''}${w.value.toFixed(2)} 亿元` },
            { k: '同比幅度', v: w.pct },
            { k: '占总增量', v: `${Math.round((Math.abs(w.value) / 4.5) * 100)}%` },
          ]
    bars.push({ x, cx, y, h, fill, vlabel, vfill, vy: y - 8, name: w.name, rows })
  })
  const grid = [76, 78, 80, 82, 84].map((v) => ({ y: yv(v), ty: yv(v) + 4, label: v }))
  return { bars, conns, grid }
})

/* ─────────── 分级次堆叠柱 ─────────── */
const levels = computed(() => {
  const d = rev.value
  if (!d) return null
  const ld = d.levelData
  const cols = ld.months.map((label, m) => {
    const vals = ld.shares[m].map((s) => ld.monthTotals[m] * s)
    return {
      label,
      total: ld.monthTotals[m],
      segs: vals.map((v, i) => ({ h: Math.round((v / 13.2) * 158), hex: DECISION.levels[i] })),
      rows: vals.map((v, i) => ({ k: ld.levelNames[i], v: `${v.toFixed(2)} 亿` })) as TipRow[],
    }
  })
  const legend = ld.levelNames.map((name, i) => ({ name, hex: DECISION.levels[i] }))
  return { cols, legend }
})

/* ─────────── 全年预测 ─────────── */
const fc = computed(() => {
  const d = rev.value
  if (!d) return null
  const f = d.forecast
  const fx = (i: number) => 60 + i * (980 / 11)
  const fy = (v: number) => 214 - ((v - 8) / 8) * 190
  const grid = [8, 10, 12, 14, 16].map((v) => ({ y: fy(v), ty: fy(v) + 4, label: v }))
  const actualPath = f.actual.map((v, i) => `${i ? 'L' : 'M'}${fx(i)} ${fy(v)}`).join(' ')
  const predAll = [f.actual[6], ...f.predicted]
  const predPath = predAll.map((v, i) => `${i ? 'L' : 'M'}${fx(6 + i)} ${fy(v)}`).join(' ')
  const upper = predAll.map((v, i) => `${fx(6 + i)},${fy(v + (i ? f.bandWidth[i - 1] : 0))}`)
  const lower = predAll.map((v, i) => `${fx(6 + i)},${fy(v - (i ? f.bandWidth[i - 1] : 0))}`).reverse()
  const band = upper.concat(lower).join(' ')
  const allVals = [...f.actual, ...f.predicted]
  const pts = allVals.map((v, i) => ({
    x: fx(i),
    y: fy(v),
    label: f.months[i],
    color: i < 7 ? DECISION.actual : DECISION.pred,
    rows: (i < 7
      ? [{ k: '实际入库', v: `${v.toFixed(1)} 亿元` }]
      : [
          { k: '预测入库', v: `${v.toFixed(1)} 亿元` },
          { k: '90% 区间', v: `${(v - f.bandWidth[i - 7]).toFixed(1)} – ${(v + f.bandWidth[i - 7]).toFixed(1)}` },
        ]) as TipRow[],
  }))
  return { grid, actualPath, predPath, band, pts, nowX: fx(6) }
})

/* ─────────── 明细表(排序 + 下钻) ─────────── */
const HEADS: Array<{ label: string; key: string; align: 'left' | 'right' }> = [
  { label: '税种', key: 'name', align: 'left' },
  { label: '年度预算(亿)', key: 'budget', align: 'right' },
  { label: '累计入库(亿)', key: 'actual', align: 'right' },
  { label: '完成率', key: 'rate', align: 'right' },
  { label: '同比', key: 'yoy', align: 'right' },
  { label: '较序时进度', key: 'gap', align: 'right' },
]
const sortKey = ref('actual')
const sortDir = ref(-1)
const expanded = ref<string | null>(null)

const heads = computed(() =>
  HEADS.map((h) => ({
    ...h,
    icon: sortKey.value === h.key ? (sortDir.value === 1 ? '▲' : '▼') : '⇅',
    active: sortKey.value === h.key,
  })),
)
function sortBy(key: string) {
  if (sortKey.value === key) sortDir.value = -sortDir.value
  else {
    sortKey.value = key
    sortDir.value = key === 'name' ? 1 : -1
  }
  expanded.value = null
}
function toggleRow(name: string) {
  expanded.value = expanded.value === name ? null : name
}

interface MainRow {
  type: 'main'; name: string; chev: string; budget: string; actual: string
  rate: string; rateW: string; yoy: string; gap: string; yoyPos: boolean; gapPos: boolean; open: boolean
}
interface SubRow { type: 'sub'; name: string; actual: string; rate: string; yoy: string; yoyPos: boolean }

const tableRows = computed<Array<MainRow | SubRow>>(() => {
  const d = rev.value
  if (!d) return []
  const seed = d.taxRows.map((t) => ({
    name: t.name,
    budget: t.budget,
    actual: t.actual,
    yoy: t.yoy,
    rate: Math.round((t.actual / t.budget) * 1000) / 10,
    gap: Math.round((t.actual / t.budget) * 100 * 10 - d.progress.timeProgress * 10) / 10,
    districts: t.districts,
  }))
  const key = sortKey.value
  const dir = sortDir.value
  seed.sort((a, b) => {
    if (key === 'name') return a.name.localeCompare(b.name, 'zh') * dir
    if (key === 'yoy') return (parseFloat(a.yoy) - parseFloat(b.yoy)) * dir
    return ((a as unknown as Record<string, number>)[key] - (b as unknown as Record<string, number>)[key]) * dir
  })
  const out: Array<MainRow | SubRow> = []
  seed.forEach((r) => {
    const open = expanded.value === r.name
    out.push({
      type: 'main', name: r.name, chev: open ? '▾' : '▸',
      budget: r.budget.toFixed(1), actual: r.actual.toFixed(1), rate: r.rate.toFixed(1),
      rateW: `${Math.min(100, r.rate)}%`, yoy: r.yoy,
      gap: `${r.gap >= 0 ? '+' : ''}${r.gap.toFixed(1)} pct`,
      yoyPos: r.yoy.startsWith('+'), gapPos: r.gap >= 0, open,
    })
    if (open)
      r.districts.forEach((dd) => {
        out.push({
          type: 'sub', name: dd.name,
          actual: (r.actual * dd.share).toFixed(2),
          rate: (r.rate + (dd.share - 0.2) * 20).toFixed(1),
          yoy: dd.yoy, yoyPos: dd.yoy.startsWith('+'),
        })
      })
  })
  return out
})
</script>

<template>
  <div class="rev">
    <PageHeader title="收入分析" breadcrumb="首页 / 决策分析 / 收入分析">
      <template #actions>
        <span class="rev__upd num">数据更新 2026-07-24 08:00</span>
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

    <div class="rev__body">
      <StateBlock :status="data.status.value" :error="data.error.value" @retry="data.load()">
        <template v-if="rev && wf && levels && fc">
          <!-- ── 进度对照 ── -->
          <section class="card progress">
            <div class="progress__left">
              <div class="progress__head">
                <h2 class="card__h2">预算执行进度 · {{ rev.progress.periodLabel }}</h2>
                <span class="progress__lag">{{ rev.progress.laggingNote }}</span>
              </div>
              <div class="bars">
                <div class="bar">
                  <div class="bar__label"><span>时间进度({{ rev.progress.timeNote }})</span><span class="num bar__pct">{{ rev.progress.timeProgress }}%</span></div>
                  <div class="bar__track"><div class="bar__fill bar__fill--time" :style="{ width: rev.progress.timeProgress + '%' }"></div></div>
                </div>
                <div class="bar">
                  <div class="bar__label"><span>收入进度({{ rev.progress.revenueNote }})</span><span class="num bar__pct bar__pct--rev">{{ rev.progress.revenueProgress }}%</span></div>
                  <div class="bar__track">
                    <div class="bar__fill bar__fill--rev" :style="{ width: rev.progress.revenueProgress + '%' }"></div>
                    <div class="bar__marker" :style="{ left: rev.progress.timeProgress + '%' }"></div>
                    <span class="bar__marker-label" :style="{ left: rev.progress.timeProgress + '%' }">序时线</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="progress__stats">
              <div v-for="k in rev.headStats" :key="k.label" class="stat">
                <div class="stat__label">{{ k.label }}</div>
                <div class="stat__value num" :class="toneClass(k.tone)">{{ k.value }}<span class="stat__unit">{{ k.unit }}</span></div>
                <div class="stat__note">{{ k.note }}</div>
              </div>
            </div>
          </section>

          <!-- ── 瀑布 + 分级次 ── -->
          <div class="row2">
            <section class="card">
              <div class="card__head"><h2 class="card__h2">同比增幅归因 · 分税种瀑布</h2><span class="card__sub">单位:亿元 · 悬停查看贡献率</span></div>
              <svg viewBox="0 0 1000 300" class="svg">
                <line v-for="(g, i) in wf.grid" :key="`wg${i}`" x1="52" :y1="g.y" x2="990" :y2="g.y" :stroke="DECISION.grid" stroke-width="1" />
                <text v-for="(g, i) in wf.grid" :key="`wt${i}`" x="44" :y="g.ty" text-anchor="end" font-size="12" :fill="DECISION.axis">{{ g.label }}</text>
                <line v-for="(c, i) in wf.conns" :key="`wc${i}`" :x1="c.x1" :y1="c.y" :x2="c.x2" :y2="c.y" :stroke="DECISION.connector" stroke-width="1" stroke-dasharray="4 3" />
                <g v-for="(b, i) in wf.bars" :key="`wb${i}`" style="cursor: pointer" @mouseenter="showTip($event, b.name as string, b.rows as TipRow[])" @mouseleave="hideTip">
                  <rect :x="b.x as number" :y="b.y as number" width="72" :height="b.h as number" :fill="b.fill as string" />
                  <text :x="b.cx as number" :y="b.vy as number" text-anchor="middle" font-size="13" font-weight="600" :fill="b.vfill as string" class="num">{{ b.vlabel }}</text>
                  <text :x="b.cx as number" y="288" text-anchor="middle" font-size="12" :fill="DECISION.nameText">{{ b.name }}</text>
                </g>
              </svg>
            </section>

            <section class="card levels">
              <div class="card__head"><h2 class="card__h2">分级次收入 · 月度</h2><span class="card__sub">亿元</span></div>
              <div class="levels__legend">
                <span v-for="l in levels.legend" :key="l.name" class="lg"><span class="lg__dot" :style="{ background: l.hex }"></span>{{ l.name }}</span>
              </div>
              <div class="levels__plot">
                <div v-for="(c, i) in levels.cols" :key="i" class="levels__col" @mouseenter="showTip($event, `${c.label} · 合计 ${c.total.toFixed(1)} 亿元`, c.rows)" @mouseleave="hideTip">
                  <div v-for="(s, si) in c.segs" :key="si" class="levels__seg" :style="{ height: s.h + 'px', background: s.hex }"></div>
                </div>
              </div>
              <div class="levels__labels">
                <div v-for="(c, i) in levels.cols" :key="i" class="levels__lb">{{ c.label }}</div>
              </div>
            </section>
          </div>

          <!-- ── 预测 ── -->
          <section class="card">
            <div class="card__head">
              <h2 class="card__h2">全年收入预测 · 月度入库与置信区间</h2>
              <div class="fc-legend">
                <span class="fl"><span class="fl__line fl__line--act"></span>实际入库</span>
                <span class="fl"><span class="fl__line fl__line--pred"></span>模型预测</span>
                <span class="fl"><span class="fl__band"></span>90% 置信区间</span>
                <span class="card__sub">单位:亿元</span>
              </div>
            </div>
            <svg viewBox="0 0 1060 250" class="svg">
              <line v-for="(g, i) in fc.grid" :key="`fg${i}`" x1="52" :y1="g.y" x2="1048" :y2="g.y" :stroke="DECISION.grid" stroke-width="1" />
              <text v-for="(g, i) in fc.grid" :key="`ft${i}`" x="44" :y="g.ty" text-anchor="end" font-size="12" :fill="DECISION.axis">{{ g.label }}</text>
              <polygon :points="fc.band" :fill="DECISION.band" fill-opacity="0.09" />
              <path :d="fc.actualPath" fill="none" :stroke="DECISION.actual" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
              <path :d="fc.predPath" fill="none" :stroke="DECISION.pred" stroke-width="2.5" stroke-dasharray="7 6" stroke-linecap="round" />
              <circle v-for="(p, i) in fc.pts" :key="`fp${i}`" :cx="p.x" :cy="p.y" r="5" :fill="DECISION.symbolFill" :stroke="p.color" stroke-width="2" style="cursor: pointer" @mouseenter="showTip($event, `${p.label}${i < 7 ? ' · 实际' : ' · 预测'}`, p.rows)" @mouseleave="hideTip" />
              <text v-for="(p, i) in fc.pts" :key="`fpl${i}`" :x="p.x" y="242" text-anchor="middle" font-size="12" :fill="DECISION.axis">{{ p.label }}</text>
              <line :x1="fc.nowX" y1="14" :x2="fc.nowX" y2="218" :stroke="DECISION.nowLine" stroke-width="1" stroke-dasharray="4 3" />
              <text :x="fc.nowX" y="10" text-anchor="middle" font-size="11" :fill="DECISION.nowLine">当前</text>
            </svg>
            <div class="fc-note">
              模型口径:近 36 个月入库序列 + 重点税源申报预告;全年预测
              <b class="num">{{ rev.forecast.yearForecast }}</b>(区间 {{ rev.forecast.range }}),预算达成概率
              <b class="num fc-note__warn">{{ rev.forecast.achieveProb }}</b>
            </div>
          </section>

          <!-- ── 明细表 ── -->
          <section class="card">
            <div class="card__head"><h2 class="card__h2">分税种执行明细</h2><span class="card__sub">点击列头排序 · 点击行下钻区县</span></div>
            <table class="tbl">
              <thead>
                <tr>
                  <th v-for="h in heads" :key="h.key" :style="{ textAlign: h.align }" class="tbl__th" @click="sortBy(h.key)">
                    {{ h.label }} <span class="num tbl__icon" :class="{ 'tbl__icon--on': h.active }">{{ h.icon }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(r, i) in tableRows" :key="i">
                  <tr v-if="r.type === 'sub'" class="tbl__sub">
                    <td class="tbl__sub-name">↳ {{ r.name }}</td>
                    <td></td>
                    <td class="num tbl__sub-td">{{ r.actual }}</td>
                    <td class="num tbl__sub-td">{{ r.rate }}%</td>
                    <td class="num tbl__sub-td" :class="r.yoyPos ? 'val-pos' : 'val-neg'">{{ r.yoy }}</td>
                    <td></td>
                  </tr>
                  <tr v-else class="tbl__row" :class="{ 'tbl__row--open': r.open }" @click="toggleRow(r.name)">
                    <td class="tbl__name"><span class="tbl__chev">{{ r.chev }}</span>{{ r.name }}</td>
                    <td class="num tbl__td tbl__td--r">{{ r.budget }}</td>
                    <td class="num tbl__td tbl__td--r tbl__td--b">{{ r.actual }}</td>
                    <td class="tbl__td tbl__td--r">
                      <div class="rate">
                        <div class="rate__track"><div class="rate__fill" :style="{ width: r.rateW }"></div></div>
                        <span class="num rate__pct">{{ r.rate }}%</span>
                      </div>
                    </td>
                    <td class="num tbl__td tbl__td--r tbl__td--b" :class="r.yoyPos ? 'val-pos' : 'val-neg'">{{ r.yoy }}</td>
                    <td class="num tbl__td tbl__td--r" :class="r.gapPos ? 'val-pos' : 'val-neg'">{{ r.gap }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </section>
        </template>
      </StateBlock>
    </div>

    <ChartTooltip :tip="tip" />
  </div>
</template>

<style scoped>
.rev {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-body);
}
.rev__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.rev__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: 20px 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 卡片通用 */
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
.card__h2 {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  margin: 0;
}
.card__sub {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.svg {
  width: 100%;
  display: block;
}

/* 进度对照 */
.progress {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 32px;
}
.progress__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: 14px;
}
.progress__lag {
  font-size: var(--fs-label);
  color: var(--color-danger);
  font-weight: var(--fw-semibold);
}
.bars {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.bar__label {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-aux);
  margin-bottom: 5px;
  color: var(--color-text-sub);
}
.bar__pct {
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-900);
}
.bar__pct--rev {
  color: var(--color-primary);
}
.bar__track {
  height: 16px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  position: relative;
}
.bar__fill {
  height: 16px;
  border-radius: 1px;
}
.bar__fill--time {
  background: var(--color-neutral-500);
}
.bar__fill--rev {
  background: var(--color-primary);
}
.bar__marker {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 0;
  border-left: 2px dashed var(--color-danger);
}
.bar__marker-label {
  position: absolute;
  top: -22px;
  transform: translateX(-50%);
  font-size: var(--fs-micro);
  color: var(--color-danger);
  white-space: nowrap;
}
.progress__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  border-left: 1px solid var(--color-neutral-200);
  padding-left: 32px;
  align-content: center;
}
.stat__label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.stat__value {
  font-size: 26px;
  font-weight: var(--fw-semibold);
  line-height: 1.4;
  color: var(--tone-text);
}
.stat__unit {
  font-size: var(--fs-aux);
  font-weight: var(--fw-regular);
  color: var(--color-neutral-600);
  margin-left: 3px;
}
.stat__note {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}

/* 瀑布 + 分级次 */
.row2 {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 20px;
}
.levels {
  display: flex;
  flex-direction: column;
}
.levels__legend {
  display: flex;
  gap: 14px;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-bottom: 10px;
  flex-wrap: wrap;
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
.levels__plot {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 14px;
  border-bottom: 1px solid var(--color-neutral-300);
  padding: 0 6px;
  min-height: 190px;
}
.levels__col {
  flex: 1;
  display: flex;
  flex-direction: column-reverse;
  cursor: pointer;
  border-radius: 1px;
}
.levels__col:hover {
  opacity: 0.82;
}
.levels__seg {
  border-radius: 1px;
}
.levels__labels {
  display: flex;
  gap: 14px;
  padding: 6px 6px 0;
}
.levels__lb {
  flex: 1;
  text-align: center;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}

/* 预测 */
.fc-legend {
  margin-left: auto;
  display: flex;
  gap: 18px;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  align-items: center;
}
.fl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.fl__line {
  width: 16px;
  height: 2px;
}
.fl__line--act {
  background: var(--color-primary);
}
.fl__line--pred {
  height: 0;
  border-top: 2px dashed var(--color-accent-blue);
}
.fl__band {
  width: 16px;
  height: 10px;
  background: var(--color-primary);
  opacity: 0.1;
}
.fc-note {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 6px;
}
.fc-note b {
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-900);
}
.fc-note__warn {
  color: var(--color-status-pending) !important;
}

/* 明细表 */
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-aux);
}
.tbl__th {
  padding: 9px 12px;
  background: var(--color-neutral-100);
  border-bottom: 1px solid var(--color-neutral-300);
  color: var(--color-text-sub);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}
.tbl__th:hover {
  color: var(--color-primary);
}
.tbl__icon {
  font-size: 10px;
  color: var(--color-neutral-400);
}
.tbl__icon--on {
  color: var(--color-primary);
}
.tbl__row {
  cursor: pointer;
  border-bottom: 1px solid var(--color-neutral-200);
  background: var(--color-panel);
}
.tbl__row:hover {
  background: var(--color-row-hover);
}
.tbl__row--open {
  background: var(--color-row-hover);
}
.tbl__name {
  padding: 9px 12px;
  font-weight: var(--fw-semibold);
  color: var(--color-primary);
}
.tbl__chev {
  color: var(--color-neutral-500);
  font-size: var(--fs-micro);
  margin-right: 6px;
}
.tbl__td {
  padding: 9px 12px;
}
.tbl__td--r {
  text-align: right;
}
.tbl__td--b {
  font-weight: var(--fw-semibold);
}
.rate {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.rate__track {
  width: 90px;
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.rate__fill {
  height: 8px;
  background: var(--color-primary);
  border-radius: 1px;
}
.rate__pct {
  font-weight: var(--fw-semibold);
  width: 44px;
  text-align: right;
}
.tbl__sub {
  background: var(--color-row-hover);
  border-bottom: 1px solid var(--color-neutral-100);
}
.tbl__sub-name {
  padding: 6px 12px 6px 42px;
  color: var(--color-neutral-600);
  font-size: var(--fs-label);
}
.tbl__sub-td {
  padding: 6px 12px;
  text-align: right;
  color: var(--color-neutral-600);
  font-size: var(--fs-label);
}
.val-pos {
  color: var(--color-status-normal-text);
}
.val-neg {
  color: var(--color-risk-high);
}
</style>
