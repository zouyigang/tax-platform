<script setup lang="ts">
/**
 * 平行坐标图(异常申报检测)· 原生 SVG
 * 每条纵轴是一个检测维度,每条折线是一户企业:
 *   - 同行业背景样本用半透明细线铺底,形成「同业分布带」;
 *   - 其他离群样本用金色略深;
 *   - 当前选中企业加粗高亮并标出数据点,一眼看出它在哪些维度冲出分布带;
 *   - 行业中位数用虚线贯穿,作为偏离的参照。
 * 颜色取 charts/palette(SVG 的 stroke/fill 不能消费 CSS 变量)。
 */
import { computed } from 'vue'
import type { ParallelDimension, ParallelSample } from '@/api/types'
import { PARALLEL } from '@/charts/palette'
import { useTooltip } from '@/composables/useTooltip'
import ChartTooltip from './ChartTooltip.vue'

const props = withDefaults(
  defineProps<{
    /** 维度(纵轴,自左向右) */
    dimensions: ParallelDimension[]
    /** 样本线 */
    samples: ParallelSample[]
    /** 当前高亮的纳税人识别号 */
    highlightId?: string
  }>(),
  { highlightId: '' },
)

const emit = defineEmits<{ (e: 'select', taxId: string): void }>()

const { tip, showTip, hideTip } = useTooltip()

/* 画布几何 */
const W = 960
const H = 340
const PAD = { t: 26, r: 40, b: 46, l: 52 }

function axisX(i: number): number {
  const n = props.dimensions.length
  if (n <= 1) return PAD.l
  return PAD.l + (i * (W - PAD.l - PAD.r)) / (n - 1)
}
/** 维度取值 → 纵坐标(上端为 max) */
function valueY(dim: ParallelDimension, v: number): number {
  const span = dim.max - dim.min || 1
  const t = Math.max(0, Math.min(1, (v - dim.min) / span))
  return H - PAD.b - t * (H - PAD.t - PAD.b)
}

function linePath(s: ParallelSample): string {
  return props.dimensions
    .map((d, i) => `${i ? 'L' : 'M'}${axisX(i).toFixed(1)} ${valueY(d, s.values[d.key]).toFixed(1)}`)
    .join(' ')
}

/** 背景样本(含其他离群样本),高亮样本单独最后绘制以压在最上层 */
const backSamples = computed(() =>
  props.samples
    .filter((s) => s.taxId !== props.highlightId)
    .map((s) => ({
      id: s.taxId,
      name: s.name,
      score: s.score,
      outlier: s.outlier,
      d: linePath(s),
      stroke: s.outlier ? PARALLEL.outlier : PARALLEL.sample,
      opacity: s.outlier ? PARALLEL.outlierOpacity : PARALLEL.sampleOpacity,
      w: s.outlier ? 1.4 : 1,
    })),
)

const active = computed(() => props.samples.filter((s) => s.taxId === props.highlightId)[0])
const activePath = computed(() => (active.value ? linePath(active.value) : ''))
const activeDots = computed(() => {
  const a = active.value
  if (!a) return []
  return props.dimensions.map((d, i) => ({ key: d.key, x: axisX(i), y: valueY(d, a.values[d.key]) }))
})

/** 行业中位数连线 */
const medianPath = computed(() =>
  props.dimensions
    .map((d, i) => `${i ? 'L' : 'M'}${axisX(i).toFixed(1)} ${valueY(d, d.median).toFixed(1)}`)
    .join(' '),
)

/** 纵轴与刻度(仅标 max / 中位 / min 三档,避免密集) */
const axes = computed(() =>
  props.dimensions.map((d, i) => ({
    key: d.key,
    x: axisX(i),
    name: d.name,
    unit: d.unit,
    top: d.max.toFixed(d.decimals),
    mid: d.median.toFixed(d.decimals),
    bottom: d.min.toFixed(d.decimals),
    midY: valueY(d, d.median),
  })),
)

function onEnter(e: MouseEvent, name: string, score: number, outlier: boolean) {
  showTip(e, name, [
    { k: '类型', v: outlier ? '离群企业' : '同业背景样本' },
    { k: '异常度', v: outlier ? score.toFixed(1) : '正常区间' },
  ])
}
</script>

<template>
  <div class="pc">
    <svg :viewBox="`0 0 ${W} ${H}`" class="pc__svg">
      <!-- 纵轴 -->
      <g v-for="a in axes" :key="a.key">
        <line :x1="a.x" :x2="a.x" :y1="PAD.t" :y2="H - PAD.b" :stroke="PARALLEL.axis" stroke-width="1" />
        <text :x="a.x" :y="PAD.t - 12" text-anchor="middle" :fill="PARALLEL.axisText" font-size="12">{{ a.name }}</text>
        <text :x="a.x + 4" :y="PAD.t + 4" text-anchor="start" :fill="PARALLEL.tickText" font-size="10">{{ a.top }}</text>
        <text :x="a.x + 4" :y="H - PAD.b - 3" text-anchor="start" :fill="PARALLEL.tickText" font-size="10">{{ a.bottom }}</text>
        <text :x="a.x" :y="H - PAD.b + 16" text-anchor="middle" :fill="PARALLEL.tickText" font-size="10">{{ a.unit }}</text>
      </g>

      <!-- 背景样本线(同业分布带) -->
      <g>
        <path
          v-for="s in backSamples"
          :key="s.id"
          :d="s.d"
          fill="none"
          :stroke="s.stroke"
          :stroke-opacity="s.opacity"
          :stroke-width="s.w"
          class="pc__line"
          @mouseenter="onEnter($event, s.name, s.score, s.outlier)"
          @mouseleave="hideTip()"
          @click="emit('select', s.id)"
        />
      </g>

      <!-- 行业中位数 -->
      <path :d="medianPath" fill="none" :stroke="PARALLEL.median" stroke-width="1.5" stroke-dasharray="6 4" />

      <!-- 当前选中企业 -->
      <template v-if="active">
        <path :d="activePath" fill="none" :stroke="PARALLEL.highlight" stroke-width="2.6" stroke-linejoin="round" />
        <circle
          v-for="d in activeDots"
          :key="d.key"
          :cx="d.x"
          :cy="d.y"
          r="3.5"
          :fill="PARALLEL.dotFill"
          :stroke="PARALLEL.highlight"
          stroke-width="2"
        />
      </template>
    </svg>

    <div class="pc__legend">
      <span class="pc__item"><i class="pc__sw pc__sw--sample"></i>同业背景样本</span>
      <span class="pc__item"><i class="pc__sw pc__sw--outlier"></i>其他离群企业</span>
      <span class="pc__item"><i class="pc__sw pc__sw--median"></i>行业中位数</span>
      <span class="pc__item"><i class="pc__sw pc__sw--active"></i>当前选中企业</span>
      <span class="pc__note">纵轴上端为同业最大值;线条冲出分布带的位置即为偏离维度</span>
    </div>

    <ChartTooltip :tip="tip" />
  </div>
</template>

<style scoped>
.pc {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.pc__svg {
  flex: 1;
  min-height: 0;
  width: 100%;
}
.pc__line {
  cursor: pointer;
}
.pc__line:hover {
  stroke-opacity: 0.9;
}
.pc__legend {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  padding-top: var(--space-1);
  flex-wrap: wrap;
}
.pc__item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.pc__sw {
  width: 16px;
  height: 2px;
  display: inline-block;
}
.pc__sw--sample {
  background: var(--color-secondary-steel);
  opacity: 0.4;
}
.pc__sw--outlier {
  background: var(--color-risk-low);
}
.pc__sw--median {
  background: var(--color-secondary-steel);
}
.pc__sw--active {
  background: var(--color-risk-high);
  height: 3px;
}
.pc__note {
  margin-left: auto;
  color: var(--color-neutral-500);
}
</style>
