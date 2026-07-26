<script setup lang="ts">
/**
 * 新办企业四象限散点图 · 原生 SVG
 * 横轴空壳风险分、纵轴税源潜力分,以阈值线切成四格:
 *   左上 重点培育 / 右上 观察 / 左下 正常 / 右下 疑似空壳。
 * 气泡半径映射注册资本(按面积开方,避免大额户视觉过分夸张)。
 * 点击象限区域过滤,点击气泡选中该户;仅「疑似空壳」格铺底纹,其余留白避免画面花。
 */
import { computed } from 'vue'
import type { NewEntPoint, NewEntQuadrant } from '@/api/types'
import { QUADRANT } from '@/charts/palette'
import { useTooltip } from '@/composables/useTooltip'
import ChartTooltip from './ChartTooltip.vue'

const props = withDefaults(
  defineProps<{
    /** 散点 */
    points: NewEntPoint[]
    /** 象限分界阈值(两轴共用) */
    threshold?: number
    /** 当前过滤的象限;'all' 不过滤 */
    activeQuadrant?: string
    /** 当前选中的纳税人识别号 */
    selectedId?: string
  }>(),
  { threshold: 50, activeQuadrant: 'all', selectedId: '' },
)

const emit = defineEmits<{
  (e: 'select-quadrant', q: NewEntQuadrant): void
  (e: 'select-point', taxId: string): void
}>()

const { tip, showTip, hideTip } = useTooltip()

const W = 1000
const H = 400
// 顶部留白要容得下纵轴名(画在绘图区上方,避免与 100 刻度挤在一起)
const PAD = { t: 36, r: 24, b: 40, l: 58 }

function x(v: number): number {
  return PAD.l + (v / 100) * (W - PAD.l - PAD.r)
}
function y(v: number): number {
  return H - PAD.b - (v / 100) * (H - PAD.t - PAD.b)
}

const tx = computed(() => x(props.threshold))
const ty = computed(() => y(props.threshold))

/** 气泡半径:按面积开方映射注册资本,范围 5–20 */
const maxCapital = computed(() => props.points.reduce((m, p) => Math.max(m, p.capital), 0) || 1)
function radius(capital: number): number {
  return 5 + Math.sqrt(capital / maxCapital.value) * 15
}

/** 四个象限区块(含名称水印与命中区) */
const zones = computed(() => [
  { key: 'cultivate' as NewEntQuadrant, label: '重点培育', x: PAD.l, y: PAD.t, w: tx.value - PAD.l, h: ty.value - PAD.t, lx: PAD.l + 14, ly: PAD.t + 22 },
  { key: 'watch' as NewEntQuadrant, label: '观察', x: tx.value, y: PAD.t, w: W - PAD.r - tx.value, h: ty.value - PAD.t, lx: W - PAD.r - 14, ly: PAD.t + 22, anchor: 'end' },
  { key: 'normal' as NewEntQuadrant, label: '正常', x: PAD.l, y: ty.value, w: tx.value - PAD.l, h: H - PAD.b - ty.value, lx: PAD.l + 14, ly: H - PAD.b - 14 },
  { key: 'shell' as NewEntQuadrant, label: '疑似空壳', x: tx.value, y: ty.value, w: W - PAD.r - tx.value, h: H - PAD.b - ty.value, lx: W - PAD.r - 14, ly: H - PAD.b - 14, anchor: 'end' },
])

const dots = computed(() =>
  props.points.map((p) => ({
    id: p.taxId,
    name: p.name,
    cx: x(p.shellRisk),
    cy: y(p.potential),
    r: radius(p.capital),
    fill: QUADRANT[p.quadrant],
    // 有象限过滤时,非该象限的点淡出但不隐藏,保留整体分布感
    dim: props.activeQuadrant !== 'all' && props.activeQuadrant !== p.quadrant,
    on: props.selectedId === p.taxId,
    point: p,
  })),
)

const ticks = [0, 25, 50, 75, 100]

function onEnter(e: MouseEvent, p: NewEntPoint) {
  const label = { cultivate: '重点培育', watch: '观察', normal: '正常', shell: '疑似空壳' }[p.quadrant]
  showTip(e, p.name, [
    { k: '空壳风险分', v: p.shellRisk.toFixed(1) },
    { k: '税源潜力分', v: p.potential.toFixed(1) },
    { k: '注册资本', v: `${p.capital.toLocaleString('en-US')} 万元` },
    { k: '所属象限', v: label },
  ])
}
</script>

<template>
  <div class="qs">
    <svg :viewBox="`0 0 ${W} ${H}`" class="qs__svg">
      <!-- 象限区块:命中区 + 底纹 + 名称水印 -->
      <g v-for="z in zones" :key="z.key">
        <rect
          :x="z.x"
          :y="z.y"
          :width="z.w"
          :height="z.h"
          :fill="activeQuadrant === z.key ? QUADRANT.activeBg : z.key === 'shell' ? QUADRANT.shellBg : 'transparent'"
          :fill-opacity="activeQuadrant === z.key ? QUADRANT.activeBgOpacity : z.key === 'shell' ? QUADRANT.shellBgOpacity : 0"
          class="qs__zone"
          @click="emit('select-quadrant', z.key)"
        />
        <text
          :x="z.lx"
          :y="z.ly"
          :text-anchor="z.anchor || 'start'"
          :fill="QUADRANT.watermark"
          font-size="13"
          :font-weight="activeQuadrant === z.key ? 600 : 400"
          class="qs__wm"
        >{{ z.label }}</text>
      </g>

      <!-- 网格与刻度 -->
      <g v-for="t in ticks" :key="`t${t}`">
        <line :x1="PAD.l" :x2="W - PAD.r" :y1="y(t)" :y2="y(t)" :stroke="QUADRANT.grid" stroke-width="1" />
        <text :x="PAD.l - 8" :y="y(t) + 3" text-anchor="end" :fill="QUADRANT.axis" font-size="10">{{ t }}</text>
        <text :x="x(t)" :y="H - PAD.b + 16" text-anchor="middle" :fill="QUADRANT.axis" font-size="10">{{ t }}</text>
      </g>

      <!-- 阈值分界线 -->
      <line :x1="tx" :x2="tx" :y1="PAD.t" :y2="H - PAD.b" :stroke="QUADRANT.divider" stroke-width="1.4" stroke-dasharray="6 4" />
      <line :x1="PAD.l" :x2="W - PAD.r" :y1="ty" :y2="ty" :stroke="QUADRANT.divider" stroke-width="1.4" stroke-dasharray="6 4" />

      <!-- 气泡 -->
      <circle
        v-for="d in dots"
        :key="d.id"
        :cx="d.cx"
        :cy="d.cy"
        :r="d.r"
        :fill="d.fill"
        :fill-opacity="d.dim ? 0.14 : 0.62"
        :stroke="d.on ? QUADRANT.ring : d.fill"
        :stroke-width="d.on ? 2.4 : 1"
        class="qs__dot"
        @click="emit('select-point', d.id)"
        @mouseenter="onEnter($event, d.point)"
        @mouseleave="hideTip()"
      />

      <!-- 轴名 -->
      <text :x="(PAD.l + W - PAD.r) / 2" :y="H - 6" text-anchor="middle" :fill="QUADRANT.axisText" font-size="11">
        空壳风险分 →
      </text>
      <text :x="14" :y="16" :fill="QUADRANT.axisText" font-size="11">↑ 税源潜力分</text>
    </svg>

    <ChartTooltip :tip="tip" />
  </div>
</template>

<style scoped>
.qs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.qs__svg {
  flex: 1;
  min-height: 0;
  width: 100%;
}
.qs__zone {
  cursor: pointer;
}
.qs__wm {
  pointer-events: none;
  user-select: none;
}
.qs__dot {
  cursor: pointer;
  transition: fill-opacity var(--motion-fast) ease;
}
.qs__dot:hover {
  fill-opacity: 0.85;
}
</style>
