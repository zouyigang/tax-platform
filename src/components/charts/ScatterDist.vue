<script setup lang="ts">
/**
 * 行业内企业散点分布 · 原生 SVG
 * 横轴为按指标升序排列的企业序号,纵轴为指标取值;
 * 叠加 Q1–Q3 参考带、中位数实线与上下须虚线,把「基准区间」直接画在散点上,
 * 于是「某户落在区间内还是区间外」不需要换算就能看出来。
 * 支持按企业名定位:命中的点放大加色并带引导线与名称标签。
 */
import { computed } from 'vue'
import type { BenchmarkPoint } from '@/api/types'
import { BENCH } from '@/charts/palette'
import { useTooltip } from '@/composables/useTooltip'
import ChartTooltip from './ChartTooltip.vue'

const props = withDefaults(
  defineProps<{
    /** 散点(按取值升序) */
    points: BenchmarkPoint[]
    /** 参考线 */
    lower: number
    q1: number
    median: number
    q3: number
    upper: number
    /** 单位与小数位 */
    unit?: string
    decimals?: number
    /** 定位命中的纳税人识别号集合 */
    foundIds?: string[]
  }>(),
  { unit: '', decimals: 2, foundIds: () => [] },
)

const { tip, showTip, hideTip } = useTooltip()

const W = 1000
const H = 260
const PAD = { t: 16, r: 92, b: 30, l: 52 }

const range = computed(() => {
  const vs = props.points.map((p) => p.value)
  if (!vs.length) return { lo: 0, hi: 1 }
  const lo = Math.min(...vs)
  const hi = Math.max(...vs)
  const pad = (hi - lo) * 0.08 || 1
  return { lo: Math.max(0, lo - pad), hi: hi + pad }
})

function y(v: number): number {
  const { lo, hi } = range.value
  return H - PAD.b - ((v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b)
}
function x(i: number): number {
  const n = props.points.length
  if (n <= 1) return PAD.l
  return PAD.l + (i * (W - PAD.l - PAD.r)) / (n - 1)
}

const dots = computed(() =>
  props.points.map((p, i) => {
    const found = props.foundIds.indexOf(p.taxId) >= 0
    return {
      id: p.taxId,
      name: p.name,
      value: p.value,
      outlier: p.outlier,
      found,
      cx: x(i),
      cy: y(p.value),
      r: found ? 5.5 : p.outlier ? 3.4 : 2.8,
      fill: found ? BENCH.dotFound : p.outlier ? BENCH.dotOutlier : BENCH.dot,
      opacity: found ? 1 : p.outlier ? 0.9 : 0.5,
    }
  }),
)

const foundDots = computed(() => dots.value.filter((d) => d.found))

/** 参考线定义(右侧留白处标注) */
const refs = computed(() => [
  { key: 'upper', label: '上须端', v: props.upper, dash: '5 4', w: 1 },
  { key: 'q3', label: 'Q3', v: props.q3, dash: '0', w: 1.2 },
  { key: 'median', label: '中位数', v: props.median, dash: '0', w: 2 },
  { key: 'q1', label: 'Q1', v: props.q1, dash: '0', w: 1.2 },
  { key: 'lower', label: '下须端', v: props.lower, dash: '5 4', w: 1 },
])

function fmt(v: number): string {
  return v.toFixed(props.decimals)
}

function onEnter(e: MouseEvent, name: string, value: number, outlier: boolean) {
  showTip(e, name, [
    { k: '指标值', v: `${fmt(value)}${props.unit}` },
    { k: '相对中位数', v: `${value >= props.median ? '+' : ''}${fmt(value - props.median)}${props.unit}` },
    { k: '位置', v: outlier ? '离群(须端之外)' : value >= props.q1 && value <= props.q3 ? '基准区间内' : '区间外但未离群' },
  ])
}
</script>

<template>
  <div class="sd">
    <svg :viewBox="`0 0 ${W} ${H}`" class="sd__svg">
      <!-- Q1–Q3 基准带 -->
      <rect
        :x="PAD.l"
        :y="y(q3)"
        :width="W - PAD.l - PAD.r"
        :height="Math.max(1, y(q1) - y(q3))"
        :fill="BENCH.band"
        :fill-opacity="BENCH.bandOpacity"
      />

      <!-- 参考线 + 右侧标注 -->
      <g v-for="r in refs" :key="r.key">
        <line
          :x1="PAD.l"
          :x2="W - PAD.r"
          :y1="y(r.v)"
          :y2="y(r.v)"
          :stroke="r.key === 'median' ? BENCH.median : BENCH.whisker"
          :stroke-width="r.w"
          :stroke-dasharray="r.dash"
        />
        <text :x="W - PAD.r + 8" :y="y(r.v) + 3" :fill="BENCH.axisText" font-size="10">
          {{ r.label }} {{ fmt(r.v) }}
        </text>
      </g>

      <!-- 散点 -->
      <circle
        v-for="d in dots"
        :key="d.id"
        :cx="d.cx"
        :cy="d.cy"
        :r="d.r"
        :fill="d.fill"
        :fill-opacity="d.opacity"
        class="sd__dot"
        @mouseenter="onEnter($event, d.name, d.value, d.outlier)"
        @mouseleave="hideTip()"
      />

      <!-- 定位命中:引导线 + 名称 -->
      <g v-for="d in foundDots" :key="`f-${d.id}`">
        <line :x1="d.cx" :x2="d.cx" :y1="d.cy" :y2="H - PAD.b" :stroke="BENCH.dotFound" stroke-width="1" stroke-dasharray="3 3" />
        <text
          :x="d.cx"
          :y="d.cy - 10"
          text-anchor="middle"
          :fill="BENCH.axisText"
          font-size="11"
          font-weight="600"
        >{{ d.name }} {{ fmt(d.value) }}{{ unit }}</text>
      </g>

      <!-- 横轴 -->
      <line :x1="PAD.l" :x2="W - PAD.r" :y1="H - PAD.b" :y2="H - PAD.b" :stroke="BENCH.axis" stroke-width="1" />
      <text :x="PAD.l" :y="H - PAD.b + 16" :fill="BENCH.axis" font-size="10">低 ←</text>
      <text :x="W - PAD.r" :y="H - PAD.b + 16" text-anchor="end" :fill="BENCH.axis" font-size="10">→ 高(按指标升序)</text>
    </svg>

    <ChartTooltip :tip="tip" />
  </div>
</template>

<style scoped>
.sd {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.sd__svg {
  flex: 1;
  min-height: 0;
  width: 100%;
}
.sd__dot {
  cursor: pointer;
}
.sd__dot:hover {
  fill-opacity: 1;
}
</style>
