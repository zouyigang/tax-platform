<script setup lang="ts">
/**
 * 箱线图(行业税负基准)· 原生 SVG
 * 横轴为行业中类,每个行业一个箱体:
 *   箱体 = Q1–Q3,箱内横线 = 中位数,上下须 = 1.5 倍 IQR 内的实际极值,
 *   须端之外的样本以离群点单独绘出。
 * 点击箱体选中该行业(联动下方散点分布与基准值表)。
 */
import { computed } from 'vue'
import type { BoxStat } from '@/api/types'
import { BENCH } from '@/charts/palette'
import { useTooltip } from '@/composables/useTooltip'
import ChartTooltip from './ChartTooltip.vue'

const props = withDefaults(
  defineProps<{
    /** 各行业中类的箱线统计 */
    items: BoxStat[]
    /** 数值单位(轴标注) */
    unit?: string
    /** 展示小数位 */
    decimals?: number
    /** 当前选中的行业中类编码 */
    selectedCode?: string
  }>(),
  { unit: '', decimals: 2, selectedCode: '' },
)

const emit = defineEmits<{ (e: 'select', code: string): void }>()

const { tip, showTip, hideTip } = useTooltip()

/* 画布几何 */
const W = 1000
const H = 330
const PAD = { t: 16, r: 16, b: 52, l: 52 }

/** 纵轴范围:覆盖所有须端与离群点,并上下各留 8% 余量 */
const range = computed(() => {
  let lo = Infinity
  let hi = -Infinity
  props.items.forEach((i) => {
    lo = Math.min(lo, i.lower, ...i.outliers)
    hi = Math.max(hi, i.upper, ...i.outliers)
  })
  if (!isFinite(lo)) return { lo: 0, hi: 1 }
  const pad = (hi - lo) * 0.08 || 1
  return { lo: Math.max(0, lo - pad), hi: hi + pad }
})

function y(v: number): number {
  const { lo, hi } = range.value
  const t = (v - lo) / (hi - lo || 1)
  return H - PAD.b - t * (H - PAD.t - PAD.b)
}

/** 每个行业占一个等宽带,箱体居中 */
const band = computed(() => (W - PAD.l - PAD.r) / (props.items.length || 1))
function cx(i: number): number {
  return PAD.l + band.value * (i + 0.5)
}
const boxW = computed(() => Math.min(46, band.value * 0.56))

const boxes = computed(() =>
  props.items.map((it, i) => {
    const on = it.industryCode === props.selectedCode
    return {
      code: it.industryCode,
      name: it.industryName,
      x: cx(i),
      left: cx(i) - boxW.value / 2,
      w: boxW.value,
      yQ3: y(it.q3),
      hBox: Math.max(2, y(it.q1) - y(it.q3)),
      yMed: y(it.median),
      yUp: y(it.upper),
      yLo: y(it.lower),
      fill: on ? BENCH.boxActive : BENCH.box,
      opacity: on ? 0.4 : 0.22,
      stroke: on ? BENCH.boxActive : BENCH.boxStroke,
      sw: on ? 2 : 1.2,
      outliers: it.outliers.map((v) => ({ v, cy: y(v) })),
      stat: it,
    }
  }),
)

/** 纵轴刻度:5 档 */
const yTicks = computed(() => {
  const { lo, hi } = range.value
  const ticks: Array<{ v: number; y: number }> = []
  for (let k = 0; k <= 4; k++) {
    const v = lo + ((hi - lo) * k) / 4
    ticks.push({ v, y: y(v) })
  }
  return ticks
})

function fmt(v: number): string {
  return v.toFixed(props.decimals)
}

function onEnter(e: MouseEvent, it: BoxStat) {
  showTip(e, `${it.industryName} · ${it.categoryName}`, [
    { k: '中位数', v: `${fmt(it.median)}${props.unit}` },
    { k: 'Q1 / Q3', v: `${fmt(it.q1)} / ${fmt(it.q3)}${props.unit}` },
    { k: 'IQR', v: `${fmt(it.iqr)}${props.unit}` },
    { k: '样本量', v: `${it.sampleCount} 户` },
    { k: '离群点', v: `${it.outliers.length} 户` },
  ])
}
</script>

<template>
  <div class="box">
    <svg :viewBox="`0 0 ${W} ${H}`" class="box__svg">
      <!-- 网格与纵轴刻度 -->
      <g v-for="t in yTicks" :key="`t${t.v}`">
        <line :x1="PAD.l" :x2="W - PAD.r" :y1="t.y" :y2="t.y" :stroke="BENCH.grid" stroke-width="1" />
        <text :x="PAD.l - 8" :y="t.y + 3" text-anchor="end" :fill="BENCH.axis" font-size="10">{{ fmt(t.v) }}</text>
      </g>
      <text :x="PAD.l - 8" :y="PAD.t - 4" text-anchor="end" :fill="BENCH.axis" font-size="10">{{ unit }}</text>

      <!-- 箱体 -->
      <g
        v-for="b in boxes"
        :key="b.code"
        class="box__g"
        @click="emit('select', b.code)"
        @mouseenter="onEnter($event, b.stat)"
        @mouseleave="hideTip()"
      >
        <!-- 命中区:整条带都可点,避免只能点中细小的箱体 -->
        <rect :x="b.x - band / 2" :y="PAD.t" :width="band" :height="H - PAD.t - PAD.b" fill="transparent" />
        <!-- 须 -->
        <line :x1="b.x" :x2="b.x" :y1="b.yUp" :y2="b.yLo" :stroke="BENCH.whisker" stroke-width="1" />
        <line :x1="b.x - b.w / 4" :x2="b.x + b.w / 4" :y1="b.yUp" :y2="b.yUp" :stroke="BENCH.whisker" stroke-width="1.4" />
        <line :x1="b.x - b.w / 4" :x2="b.x + b.w / 4" :y1="b.yLo" :y2="b.yLo" :stroke="BENCH.whisker" stroke-width="1.4" />
        <!-- 箱体 Q1–Q3 -->
        <rect
          :x="b.left"
          :y="b.yQ3"
          :width="b.w"
          :height="b.hBox"
          :fill="b.fill"
          :fill-opacity="b.opacity"
          :stroke="b.stroke"
          :stroke-width="b.sw"
        />
        <!-- 中位数 -->
        <line :x1="b.left" :x2="b.left + b.w" :y1="b.yMed" :y2="b.yMed" :stroke="BENCH.median" stroke-width="2.2" />
        <!-- 离群点 -->
        <circle
          v-for="(o, oi) in b.outliers"
          :key="`o${oi}`"
          :cx="b.x"
          :cy="o.cy"
          r="2.6"
          fill="none"
          :stroke="BENCH.outlier"
          stroke-width="1.3"
        />
        <!-- 行业名(选中加粗) -->
        <text
          :x="b.x"
          :y="H - PAD.b + 18"
          text-anchor="middle"
          :fill="BENCH.axisText"
          font-size="11"
          :font-weight="b.code === selectedCode ? 600 : 400"
        >{{ b.name }}</text>
      </g>
    </svg>

    <div class="box__legend">
      <span class="box__item"><i class="box__sw box__sw--box"></i>Q1–Q3 箱体</span>
      <span class="box__item"><i class="box__sw box__sw--med"></i>中位数</span>
      <span class="box__item"><i class="box__sw box__sw--whisker"></i>1.5×IQR 须端</span>
      <span class="box__item"><i class="box__sw box__sw--out"></i>离群点</span>
      <span class="box__note">点击任一行业中类查看其企业分布</span>
    </div>

    <ChartTooltip :tip="tip" />
  </div>
</template>

<style scoped>
.box {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.box__svg {
  flex: 1;
  min-height: 0;
  width: 100%;
}
.box__g {
  cursor: pointer;
}
.box__legend {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  padding-top: var(--space-1);
  flex-wrap: wrap;
}
.box__item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.box__sw {
  display: inline-block;
}
.box__sw--box {
  width: 14px;
  height: 10px;
  background: var(--color-surface-accent);
  opacity: 0.5;
  border: 1px solid var(--color-primary);
}
.box__sw--med {
  width: 14px;
  height: 2px;
  background: var(--color-primary-deep);
}
.box__sw--whisker {
  width: 14px;
  height: 1px;
  background: var(--color-neutral-600);
}
.box__sw--out {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid var(--color-risk-high);
}
.box__note {
  margin-left: auto;
  color: var(--color-neutral-500);
}
</style>
