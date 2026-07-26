<script setup lang="ts">
/**
 * 收入预测主图 · 原生 SVG
 * 历史段与预测段共用同一条时间轴,但视觉权重刻意不对等:
 *   - 历史实际值:细实线 + 弱化的灰蓝,只作参照;
 *   - 历史段模型回算值:更淡的细虚线,用来看"模型当初拟合得准不准";
 *   - 预测段:粗虚线 + 主色深调 + 置信区间带 + 区域底纹,视觉重心落在这里。
 * 分界处有一条竖线标出"当前",右侧即未来。
 */
import { computed } from 'vue'
import type { ForecastPoint } from '@/api/types'
import { FORECAST } from '@/charts/palette'
import { useTooltip } from '@/composables/useTooltip'
import ChartTooltip from './ChartTooltip.vue'

const props = withDefaults(
  defineProps<{
    /** 曲线数据(历史段在前,预测段在后) */
    points: ForecastPoint[]
    /** 数值单位 */
    unit?: string
  }>(),
  { unit: '万元' },
)

const { tip, showTip, hideTip } = useTooltip()

const W = 1000
const H = 330
const PAD = { t: 20, r: 22, b: 34, l: 66 }

/** 纵轴范围:覆盖实际值、预测值与置信上下限 */
const range = computed(() => {
  let lo = Infinity
  let hi = -Infinity
  props.points.forEach((p) => {
    const vs = [p.predicted, p.lower, p.upper]
    if (p.actual !== null) vs.push(p.actual)
    vs.forEach((v) => {
      lo = Math.min(lo, v)
      hi = Math.max(hi, v)
    })
  })
  if (!isFinite(lo)) return { lo: 0, hi: 1 }
  const pad = (hi - lo) * 0.14 || 1
  return { lo: Math.max(0, lo - pad), hi: hi + pad }
})

function x(i: number): number {
  const n = props.points.length
  if (n <= 1) return PAD.l
  return PAD.l + (i * (W - PAD.l - PAD.r)) / (n - 1)
}
function y(v: number): number {
  const { lo, hi } = range.value
  return H - PAD.b - ((v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b)
}

/** 历史段最后一个索引(分界点) */
const splitIndex = computed(() => {
  let k = props.points.length - 1
  for (let i = 0; i < props.points.length; i++) {
    if (props.points[i].isForecast) {
      k = i - 1
      break
    }
  }
  return Math.max(0, k)
})

/** 历史实际值折线 */
const actualPath = computed(() =>
  props.points
    .filter((p) => p.actual !== null)
    .map((p, i) => `${i ? 'L' : 'M'}${x(props.points.indexOf(p)).toFixed(1)} ${y(p.actual as number).toFixed(1)}`)
    .join(' '),
)

/** 历史段模型回算值(拟合线) */
const fittedPath = computed(() =>
  props.points
    .slice(0, splitIndex.value + 1)
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.predicted).toFixed(1)}`)
    .join(' '),
)

/** 预测段折线:自分界点起笔,与历史段接上 */
const predictPath = computed(() =>
  props.points
    .slice(splitIndex.value)
    .map((p, i) => {
      const idx = splitIndex.value + i
      const v = i === 0 && p.actual !== null ? (p.actual as number) : p.predicted
      return `${i ? 'L' : 'M'}${x(idx).toFixed(1)} ${y(v).toFixed(1)}`
    })
    .join(' '),
)

/** 置信区间带:上界正序 + 下界逆序闭合 */
const bandPath = computed(() => {
  const seg = props.points.slice(splitIndex.value)
  if (seg.length < 2) return ''
  const up = seg.map((p, i) => {
    const idx = splitIndex.value + i
    const v = i === 0 && p.actual !== null ? (p.actual as number) : p.upper
    return `${i ? 'L' : 'M'}${x(idx).toFixed(1)} ${y(v).toFixed(1)}`
  })
  const down = seg
    .slice()
    .reverse()
    .map((p, i) => {
      const idx = splitIndex.value + (seg.length - 1 - i)
      const v = idx === splitIndex.value && p.actual !== null ? (p.actual as number) : p.lower
      return `L${x(idx).toFixed(1)} ${y(v).toFixed(1)}`
    })
  return `${up.join(' ')} ${down.join(' ')} Z`
})

/** 预测段数据点 */
const predictDots = computed(() =>
  props.points
    .map((p, i) => ({ p, i }))
    .filter((d) => d.p.isForecast)
    .map((d) => ({ key: d.p.label, x: x(d.i), y: y(d.p.predicted) })),
)

/** 预测区底纹 */
const futureRect = computed(() => {
  const x0 = x(splitIndex.value)
  return { x: x0, w: Math.max(0, W - PAD.r - x0) }
})
const dividerX = computed(() => x(splitIndex.value))

/** 纵轴刻度 5 档 */
const yTicks = computed(() => {
  const { lo, hi } = range.value
  const ticks: Array<{ v: number; y: number }> = []
  for (let k = 0; k <= 4; k++) {
    const v = lo + ((hi - lo) * k) / 4
    ticks.push({ v, y: y(v) })
  }
  return ticks
})

/** 横轴标签:期次多时隔点显示 */
const xLabels = computed(() => {
  const step = props.points.length > 12 ? 2 : 1
  return props.points.map((p, i) => ({
    label: p.label,
    x: x(i),
    show: i % step === 0 || i === props.points.length - 1 || i === splitIndex.value,
    forecast: p.isForecast,
  }))
})

function fmt(v: number): string {
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function onEnter(e: MouseEvent, p: ForecastPoint) {
  const rows = p.isForecast
    ? [
        { k: '预测值', v: `${fmt(p.predicted)} ${props.unit}` },
        { k: '置信区间', v: `${fmt(p.lower)} ~ ${fmt(p.upper)}` },
      ]
    : [
        { k: '实际入库', v: `${fmt(p.actual as number)} ${props.unit}` },
        { k: '模型回算', v: `${fmt(p.predicted)} ${props.unit}` },
        {
          k: '偏差',
          v: `${(((p.predicted - (p.actual as number)) / (p.actual as number)) * 100).toFixed(1)}%`,
        },
      ]
  showTip(e, `${p.label}${p.isForecast ? ' · 预测' : ' · 实际'}`, rows)
}
</script>

<template>
  <div class="fc">
    <svg :viewBox="`0 0 ${W} ${H}`" class="fc__svg">
      <!-- 预测区底纹:把视觉重心压到右半边 -->
      <rect
        :x="futureRect.x"
        :y="PAD.t"
        :width="futureRect.w"
        :height="H - PAD.t - PAD.b"
        :fill="FORECAST.futureBg"
        :fill-opacity="FORECAST.futureBgOpacity"
      />

      <!-- 网格 -->
      <g v-for="t in yTicks" :key="`g${t.v}`">
        <line :x1="PAD.l" :x2="W - PAD.r" :y1="t.y" :y2="t.y" :stroke="FORECAST.grid" stroke-width="1" />
        <text :x="PAD.l - 8" :y="t.y + 3" text-anchor="end" :fill="FORECAST.axis" font-size="10">{{ fmt(t.v) }}</text>
      </g>
      <text :x="PAD.l - 8" :y="PAD.t - 6" text-anchor="end" :fill="FORECAST.axis" font-size="10">{{ unit }}</text>

      <!-- 置信区间带 -->
      <path :d="bandPath" :fill="FORECAST.band" :fill-opacity="FORECAST.bandOpacity" />

      <!-- 历史段:模型回算(更淡) + 实际值(弱化实线) -->
      <path :d="fittedPath" fill="none" :stroke="FORECAST.fitted" stroke-width="1.2" stroke-dasharray="3 3" />
      <path :d="actualPath" fill="none" :stroke="FORECAST.history" stroke-width="1.6" stroke-linejoin="round" />

      <!-- 预测段:粗虚线,主体 -->
      <path
        :d="predictPath"
        fill="none"
        :stroke="FORECAST.predict"
        stroke-width="3"
        stroke-dasharray="8 5"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <circle
        v-for="d in predictDots"
        :key="d.key"
        :cx="d.x"
        :cy="d.y"
        r="4"
        :fill="FORECAST.symbolFill"
        :stroke="FORECAST.predict"
        stroke-width="2.4"
      />

      <!-- 当前分界 -->
      <line
        :x1="dividerX"
        :x2="dividerX"
        :y1="PAD.t"
        :y2="H - PAD.b"
        :stroke="FORECAST.divider"
        stroke-width="1"
        stroke-dasharray="4 3"
      />
      <text :x="dividerX + 6" :y="PAD.t + 10" :fill="FORECAST.divider" font-size="10">当前</text>

      <!-- 悬停命中区 -->
      <rect
        v-for="(p, i) in points"
        :key="`h${p.label}`"
        :x="x(i) - (W - PAD.l - PAD.r) / (points.length * 2)"
        :y="PAD.t"
        :width="(W - PAD.l - PAD.r) / points.length"
        :height="H - PAD.t - PAD.b"
        fill="transparent"
        class="fc__hit"
        @mouseenter="onEnter($event, p)"
        @mouseleave="hideTip()"
      />

      <!-- 横轴 -->
      <g v-for="l in xLabels" :key="`x${l.label}`">
        <text
          v-if="l.show"
          :x="l.x"
          :y="H - PAD.b + 16"
          text-anchor="middle"
          :fill="l.forecast ? FORECAST.axisText : FORECAST.axis"
          font-size="10"
          :font-weight="l.forecast ? 600 : 400"
        >{{ l.label }}</text>
      </g>
    </svg>

    <div class="fc__legend">
      <span class="fc__item"><i class="fc__sw fc__sw--history"></i>历史实际</span>
      <span class="fc__item"><i class="fc__sw fc__sw--fitted"></i>模型回算</span>
      <span class="fc__item"><i class="fc__sw fc__sw--predict"></i>预测值</span>
      <span class="fc__item"><i class="fc__sw fc__sw--band"></i>90% 置信区间</span>
      <span class="fc__note">竖线右侧为预测区间,越远置信区间越宽</span>
    </div>

    <ChartTooltip :tip="tip" />
  </div>
</template>

<style scoped>
.fc {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.fc__svg {
  flex: 1;
  min-height: 0;
  width: 100%;
}
.fc__hit {
  cursor: pointer;
}
.fc__legend {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  padding-top: var(--space-1);
  flex-wrap: wrap;
}
.fc__item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.fc__sw {
  width: 18px;
  height: 2px;
  display: inline-block;
}
.fc__sw--history {
  background: var(--color-secondary-steel);
  opacity: 0.7;
}
.fc__sw--fitted {
  background: var(--color-neutral-400);
}
.fc__sw--predict {
  background: var(--color-primary-deep);
  height: 3px;
}
.fc__sw--band {
  background: var(--color-primary);
  opacity: 0.18;
  height: 10px;
}
.fc__note {
  margin-left: auto;
  color: var(--color-neutral-500);
}
</style>
