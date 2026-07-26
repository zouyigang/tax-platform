<script setup lang="ts">
/**
 * Lift 曲线(模型效果)· 原生 SVG
 * 横轴:按风险分降序的累计覆盖分位;纵轴:提升度(倍数)。
 * 随机基准 lift = 1.0 画虚线,曲线离基准越远说明排序能力越强。
 * 悬浮某个分位时经 useTooltip 显示该点的分位 / 提升度 / 累计查实率。
 */
import { computed } from 'vue'
import type { LiftPoint } from '@/api/types'
import { MODEL } from '@/charts/palette'
import { useTooltip } from '@/composables/useTooltip'
import ChartTooltip from './ChartTooltip.vue'

const props = withDefaults(
  defineProps<{
    /** 曲线数据(按分位升序) */
    points: LiftPoint[]
    /** 需要标注的分位(如 Precision@200 所在分位);0 表示不标注 */
    markPercentile?: number
    /** 标注文案 */
    markLabel?: string
  }>(),
  { markPercentile: 0, markLabel: '' },
)

const { tip, showTip, hideTip } = useTooltip()

/* 画布几何:视口坐标固定,由外层容器缩放 */
const W = 460
const H = 210
const PAD = { t: 12, r: 14, b: 26, l: 34 }

const maxLift = computed(() => {
  const m = props.points.reduce((s, p) => (p.lift > s ? p.lift : s), 0)
  return Math.ceil(m)
})

function x(percentile: number): number {
  return PAD.l + (percentile / 100) * (W - PAD.l - PAD.r)
}
function y(lift: number): number {
  return H - PAD.b - (lift / maxLift.value) * (H - PAD.t - PAD.b)
}

/** 纵轴刻度:0 起步,步长 2 倍 */
const yTicks = computed(() => {
  const ticks: number[] = []
  for (let v = 0; v <= maxLift.value; v += 2) ticks.push(v)
  return ticks
})
const xTicks = [0, 20, 40, 60, 80, 100]

const linePath = computed(() =>
  props.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.percentile).toFixed(1)} ${y(p.lift).toFixed(1)}`).join(' '),
)
const areaPath = computed(() => {
  if (!props.points.length) return ''
  const first = props.points[0]
  const last = props.points[props.points.length - 1]
  return `${linePath.value} L${x(last.percentile).toFixed(1)} ${y(0).toFixed(1)} L${x(first.percentile).toFixed(1)} ${y(0).toFixed(1)} Z`
})

const markPoint = computed(() =>
  props.markPercentile ? props.points.filter((p) => p.percentile === props.markPercentile)[0] : undefined,
)

function onEnter(e: MouseEvent, p: LiftPoint) {
  showTip(e, `按风险分降序 · 前 ${p.percentile}%`, [
    { k: '提升度', v: `${p.lift.toFixed(2)}×` },
    { k: '累计查实率', v: `${p.precision.toFixed(1)}%` },
  ])
}
</script>

<template>
  <div class="lift">
    <svg :viewBox="`0 0 ${W} ${H}`" class="lift__svg">
      <!-- 横向网格 -->
      <line
        v-for="t in yTicks"
        :key="`g${t}`"
        :x1="PAD.l"
        :x2="W - PAD.r"
        :y1="y(t)"
        :y2="y(t)"
        :stroke="MODEL.grid"
        stroke-width="1"
      />
      <!-- 随机基准 lift = 1.0 -->
      <line
        :x1="PAD.l"
        :x2="W - PAD.r"
        :y1="y(1)"
        :y2="y(1)"
        :stroke="MODEL.baseline"
        stroke-width="1"
        stroke-dasharray="4 3"
      />

      <!-- 曲线与面积 -->
      <path :d="areaPath" :fill="MODEL.lift" :fill-opacity="MODEL.areaOpacity" />
      <path :d="linePath" fill="none" :stroke="MODEL.lift" stroke-width="2" stroke-linejoin="round" />

      <!-- 标注点(如 Precision@200 所在分位) -->
      <line
        v-if="markPoint"
        :x1="x(markPoint.percentile)"
        :x2="x(markPoint.percentile)"
        :y1="y(markPoint.lift)"
        :y2="H - PAD.b"
        :stroke="MODEL.mark"
        stroke-width="1"
        stroke-dasharray="3 3"
      />

      <!-- 数据点(hover 命中区) -->
      <g v-for="p in points" :key="p.percentile">
        <circle
          :cx="x(p.percentile)"
          :cy="y(p.lift)"
          r="3"
          :fill="MODEL.symbolFill"
          :stroke="MODEL.lift"
          stroke-width="1.6"
        />
        <circle
          :cx="x(p.percentile)"
          :cy="y(p.lift)"
          r="10"
          fill="transparent"
          class="lift__hit"
          @mouseenter="onEnter($event, p)"
          @mouseleave="hideTip()"
        />
      </g>

      <!-- 坐标轴刻度 -->
      <text
        v-for="t in yTicks"
        :key="`yt${t}`"
        :x="PAD.l - 6"
        :y="y(t) + 3"
        text-anchor="end"
        :fill="MODEL.axis"
        font-size="10"
      >
        {{ t }}
      </text>
      <text
        v-for="t in xTicks"
        :key="`xt${t}`"
        :x="x(t)"
        :y="H - PAD.b + 14"
        text-anchor="middle"
        :fill="MODEL.axis"
        font-size="10"
      >
        {{ t }}%
      </text>
    </svg>

    <div class="lift__legend">
      <span class="lift__item"><i class="lift__line"></i>模型 Lift</span>
      <span class="lift__item"><i class="lift__line lift__line--base"></i>随机基准 1.0×</span>
      <span v-if="markPoint" class="lift__item lift__item--mark">
        <i class="lift__line lift__line--mark"></i>{{ markLabel || `前 ${markPoint.percentile}%` }}
      </span>
    </div>

    <ChartTooltip :tip="tip" />
  </div>
</template>

<style scoped>
.lift {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.lift__svg {
  flex: 1;
  min-height: 0;
  width: 100%;
}
.lift__hit {
  cursor: pointer;
}
.lift__legend {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  padding-top: var(--space-1);
}
.lift__item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.lift__line {
  width: 14px;
  height: 2px;
  background: var(--color-primary);
  display: inline-block;
}
.lift__line--base {
  background: var(--color-neutral-500);
}
.lift__line--mark {
  background: var(--color-risk-high);
}
</style>
