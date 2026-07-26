<script setup lang="ts">
/**
 * 多指标同步时间轴 · 原生 SVG
 * 若干指标共用一条时间轴,各自占一条轨道、各自独立纵向标度:
 *   量纲不同的指标(万元 / 份 / 人 / 万千瓦时)不做归一,避免"看起来一样"的假象;
 *   共用时间轴 + 全轨道贯通的悬停竖线,才能做「税额掉了但用电没掉」这类交叉印证。
 * 悬停时每条轨道右侧显示该期数值,离开后回落到最新一期。
 */
import { computed, ref } from 'vue'
import type { MetricTrack } from '@/api/types'
import { TRACK } from '@/charts/palette'

const props = defineProps<{
  /** 时间刻度 */
  periods: string[]
  /** 指标轨道 */
  tracks: MetricTrack[]
}>()

/* 画布几何:轨道等高纵向排列,底部留一条共用时间轴 */
const W = 1000
const TRACK_H = 78
const AXIS_H = 26
const PAD = { t: 6, l: 128, r: 108 }
const H = computed(() => PAD.t + props.tracks.length * TRACK_H + AXIS_H)

const hoverIndex = ref(-1)
/** 未悬停时展示最新一期 */
const activeIndex = computed(() => (hoverIndex.value >= 0 ? hoverIndex.value : props.periods.length - 1))

function x(i: number): number {
  const n = props.periods.length
  if (n <= 1) return PAD.l
  return PAD.l + (i * (W - PAD.l - PAD.r)) / (n - 1)
}

/** 每条轨道独立标度:上下各留 12% 余量,零值不强制归零以免曲线贴底 */
const rows = computed(() =>
  props.tracks.map((t, ti) => {
    const top = PAD.t + ti * TRACK_H
    const plotTop = top + 20
    const plotBottom = top + TRACK_H - 12
    const lo = Math.min(...t.values)
    const hi = Math.max(...t.values)
    const span = hi - lo || 1
    const y = (v: number) => plotBottom - ((v - lo) / span) * (plotBottom - plotTop)
    const line = t.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
    return {
      key: t.key,
      name: t.name,
      unit: t.unit,
      decimals: t.decimals,
      yoy: t.yoy,
      yoyDown: t.yoyTone === 'negative',
      color: TRACK.series[ti % TRACK.series.length],
      top,
      plotTop,
      plotBottom,
      labelY: top + 26,
      unitY: top + 42,
      line,
      area: `${line} L${x(t.values.length - 1).toFixed(1)} ${plotBottom} L${x(0).toFixed(1)} ${plotBottom} Z`,
      dots: t.values.map((v, i) => ({ x: x(i), y: y(v) })),
      values: t.values,
    }
  }),
)

/** 时间轴刻度:12 期只标 1/4/7/10 与末期,避免拥挤 */
const ticks = computed(() =>
  props.periods.map((p, i) => ({ p, i, x: x(i), show: i % 3 === 0 || i === props.periods.length - 1 })),
)

const cursorX = computed(() => x(activeIndex.value))

function onMove(e: MouseEvent) {
  const el = e.currentTarget as SVGGraphicsElement
  const rect = el.getBoundingClientRect()
  // 视口像素 → viewBox 坐标
  const vx = ((e.clientX - rect.left) / rect.width) * W
  const n = props.periods.length
  const t = (vx - PAD.l) / (W - PAD.l - PAD.r || 1)
  hoverIndex.value = Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))))
}
function onLeave() {
  hoverIndex.value = -1
}
</script>

<template>
  <div class="mt">
    <svg :viewBox="`0 0 ${W} ${H}`" class="mt__svg" @mousemove="onMove" @mouseleave="onLeave">
      <!-- 轨道 -->
      <g v-for="r in rows" :key="r.key">
        <line :x1="PAD.l" :x2="W - PAD.r" :y1="r.plotBottom" :y2="r.plotBottom" :stroke="TRACK.grid" stroke-width="1" />
        <path :d="r.area" :fill="r.color" :fill-opacity="TRACK.areaOpacity" />
        <path :d="r.line" fill="none" :stroke="r.color" stroke-width="1.8" stroke-linejoin="round" />

        <!-- 左侧:指标名 + 单位 + 同比 -->
        <text :x="0" :y="r.labelY" :fill="TRACK.label" font-size="12" font-weight="600">{{ r.name }}</text>
        <text :x="0" :y="r.unitY" :fill="TRACK.tick" font-size="10">
          单位 {{ r.unit }} · 同比 {{ r.yoy }}
        </text>

        <!-- 右侧:当前期数值 -->
        <text :x="W - PAD.r + 12" :y="r.labelY" :fill="r.color" font-size="14" font-weight="600" class="num">
          {{ r.values[activeIndex].toFixed(r.decimals) }}
        </text>
        <text :x="W - PAD.r + 12" :y="r.unitY" :fill="TRACK.tick" font-size="10">{{ r.unit }}</text>

        <!-- 当前期数据点 -->
        <circle
          :cx="r.dots[activeIndex].x"
          :cy="r.dots[activeIndex].y"
          r="3.5"
          :fill="TRACK.symbolFill"
          :stroke="r.color"
          stroke-width="2"
        />
      </g>

      <!-- 贯通全部轨道的悬停竖线:交叉印证靠它对齐 -->
      <line
        :x1="cursorX"
        :x2="cursorX"
        :y1="PAD.t"
        :y2="PAD.t + tracks.length * TRACK_H"
        :stroke="TRACK.cursor"
        stroke-width="1"
        stroke-dasharray="4 3"
      />

      <!-- 共用时间轴 -->
      <g v-for="t in ticks" :key="t.p">
        <text
          v-if="t.show"
          :x="t.x"
          :y="H - 8"
          text-anchor="middle"
          :fill="t.i === activeIndex ? TRACK.label : TRACK.tick"
          font-size="10"
          :font-weight="t.i === activeIndex ? 600 : 400"
        >{{ t.p }}</text>
      </g>
      <text
        v-if="!ticks[activeIndex].show"
        :x="cursorX"
        :y="H - 8"
        text-anchor="middle"
        :fill="TRACK.label"
        font-size="10"
        font-weight="600"
      >{{ periods[activeIndex] }}</text>
    </svg>
  </div>
</template>

<style scoped>
.mt {
  flex: 1;
  min-height: 0;
  display: flex;
}
.mt__svg {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}
</style>
