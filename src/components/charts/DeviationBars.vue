<script setup lang="ts">
/**
 * 预测误差回溯柱状图 · 原生 SVG
 * 以 0 为基线上下发散:柱子向上=预测偏高,向下=预测偏低,正负分色。
 * 背景铺一条 ±5% 的可接受带 —— 柱子是否落在带内,比柱子本身多高更重要。
 */
import { computed } from 'vue'
import type { ForecastErrorPoint } from '@/api/types'
import { FORECAST } from '@/charts/palette'
import { useTooltip } from '@/composables/useTooltip'
import ChartTooltip from './ChartTooltip.vue'

const props = withDefaults(
  defineProps<{
    /** 回溯数据 */
    points: ForecastErrorPoint[]
    /** 可接受偏差带(百分数) */
    tolerance?: number
    /** 数值单位(tooltip 用) */
    unit?: string
  }>(),
  { tolerance: 5, unit: '万元' },
)

const { tip, showTip, hideTip } = useTooltip()

const W = 1000
const H = 210
const PAD = { t: 16, r: 20, b: 30, l: 52 }

/** 纵轴对称范围,保证 0 线居中 */
const maxAbs = computed(() => {
  const m = props.points.reduce((s, p) => Math.max(s, Math.abs(p.deviation)), 0)
  return Math.max(props.tolerance * 1.6, Math.ceil(m * 1.25))
})

function y(v: number): number {
  const half = (H - PAD.t - PAD.b) / 2
  return PAD.t + half - (v / maxAbs.value) * half
}
const zeroY = computed(() => y(0))

const band = computed(() => (W - PAD.l - PAD.r) / (props.points.length || 1))
function cx(i: number): number {
  return PAD.l + band.value * (i + 0.5)
}
const barW = computed(() => Math.min(34, band.value * 0.5))

const bars = computed(() =>
  props.points.map((p, i) => {
    const up = p.deviation >= 0
    const yv = y(p.deviation)
    return {
      key: p.label,
      label: p.label,
      x: cx(i) - barW.value / 2,
      w: barW.value,
      y: up ? yv : zeroY.value,
      h: Math.max(1, Math.abs(yv - zeroY.value)),
      fill: up ? FORECAST.devHigh : FORECAST.devLow,
      textY: up ? yv - 5 : yv + 12,
      cx: cx(i),
      point: p,
      within: Math.abs(p.deviation) <= props.tolerance,
    }
  }),
)

const yTicks = computed(() => {
  const step = maxAbs.value / 2
  return [-maxAbs.value, -step, 0, step, maxAbs.value].map((v) => ({ v, y: y(v) }))
})

function fmtMoney(v: number): string {
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function onEnter(e: MouseEvent, p: ForecastErrorPoint) {
  showTip(e, p.label, [
    { k: '预测值', v: `${fmtMoney(p.predicted)} ${props.unit}` },
    { k: '实际值', v: `${fmtMoney(p.actual)} ${props.unit}` },
    { k: '偏差率', v: `${p.deviation >= 0 ? '+' : ''}${p.deviation.toFixed(1)}%` },
    { k: '判定', v: Math.abs(p.deviation) <= props.tolerance ? `在 ±${props.tolerance}% 内` : `超出 ±${props.tolerance}%` },
  ])
}
</script>

<template>
  <div class="dv">
    <svg :viewBox="`0 0 ${W} ${H}`" class="dv__svg">
      <!-- ±tolerance 可接受带 -->
      <rect
        :x="PAD.l"
        :y="y(tolerance)"
        :width="W - PAD.l - PAD.r"
        :height="Math.abs(y(-tolerance) - y(tolerance))"
        :fill="FORECAST.devBand"
        :fill-opacity="FORECAST.devBandOpacity"
      />

      <!-- 网格与刻度 -->
      <g v-for="t in yTicks" :key="`t${t.v}`">
        <line
          :x1="PAD.l"
          :x2="W - PAD.r"
          :y1="t.y"
          :y2="t.y"
          :stroke="t.v === 0 ? FORECAST.axis : FORECAST.grid"
          stroke-width="1"
        />
        <text :x="PAD.l - 8" :y="t.y + 3" text-anchor="end" :fill="FORECAST.axis" font-size="10">
          {{ t.v > 0 ? '+' : '' }}{{ t.v.toFixed(0) }}%
        </text>
      </g>

      <!-- 偏差柱 -->
      <g v-for="b in bars" :key="b.key">
        <rect
          :x="b.x"
          :y="b.y"
          :width="b.w"
          :height="b.h"
          :fill="b.fill"
          :fill-opacity="b.within ? 0.55 : 1"
          class="dv__bar"
          @mouseenter="onEnter($event, b.point)"
          @mouseleave="hideTip()"
        />
        <text :x="b.cx" :y="b.textY" text-anchor="middle" :fill="b.fill" font-size="10" font-weight="600">
          {{ b.point.deviation >= 0 ? '+' : '' }}{{ b.point.deviation.toFixed(1) }}
        </text>
        <text :x="b.cx" :y="H - PAD.b + 16" text-anchor="middle" :fill="FORECAST.axis" font-size="10">
          {{ b.label }}
        </text>
      </g>
    </svg>

    <div class="dv__legend">
      <span class="dv__item"><i class="dv__sw dv__sw--high"></i>预测偏高</span>
      <span class="dv__item"><i class="dv__sw dv__sw--low"></i>预测偏低</span>
      <span class="dv__item"><i class="dv__sw dv__sw--band"></i>±{{ tolerance }}% 可接受带</span>
      <span class="dv__note">柱色变浅表示落在可接受带内</span>
    </div>

    <ChartTooltip :tip="tip" />
  </div>
</template>

<style scoped>
.dv {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.dv__svg {
  flex: 1;
  min-height: 0;
  width: 100%;
}
.dv__bar {
  cursor: pointer;
}
.dv__bar:hover {
  fill-opacity: 1;
}
.dv__legend {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  padding-top: var(--space-1);
}
.dv__item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.dv__sw {
  width: 12px;
  height: 10px;
  display: inline-block;
  border-radius: 1px;
}
.dv__sw--high {
  background: var(--color-risk-high);
}
.dv__sw--low {
  background: var(--color-status-normal);
}
.dv__sw--band {
  background: var(--color-status-normal);
  opacity: 0.16;
}
.dv__note {
  margin-left: auto;
  color: var(--color-neutral-500);
}
</style>
