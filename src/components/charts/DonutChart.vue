<script setup lang="ts">
/**
 * 分税种收入结构 · ECharts 环形 + DOM 图例
 * 视觉对齐设计稿:环宽比例、12 点起始顺时针、无描边间隙、环心双行文案;
 * 图例在右侧以 DOM 渲染(名称省略号 + 右对齐百分比)。
 */
import type { TaxTypeShare } from '@/api/types'
import { useChart } from '@/charts/useChart'
import { DONUT_COLORS } from '@/charts/palette'

const props = defineProps<{
  /** 各税种占比 */
  segments: TaxTypeShare[]
  /** 环心文案(税收总额) */
  totalLabel: string
}>()

function colorAt(i: number) {
  return DONUT_COLORS[i % DONUT_COLORS.length]
}

function buildOption() {
  return {
    animationDuration: 160,
    series: [
      {
        type: 'pie',
        // 对应设计稿 r=70 / stroke-width=26 的环带(内外沿 57%–83%)
        radius: ['57%', '83%'],
        center: ['50%', '50%'],
        startAngle: 90,
        clockwise: true,
        avoidLabelOverlap: false,
        silent: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderWidth: 0 },
        emphasis: { scale: false },
        data: props.segments.map((s, i) => ({
          name: s.name,
          value: s.pct,
          itemStyle: { color: colorAt(i) },
        })),
      },
    ],
  }
}

const { el } = useChart(buildOption, () => props.segments)
</script>

<template>
  <div class="donut">
    <!-- 环形本体 + 环心文案 -->
    <div class="donut__chart-wrap">
      <div ref="el" class="donut__chart"></div>
      <div class="donut__center">
        <div class="donut__center-label">税收总额</div>
        <div class="donut__center-value num">{{ totalLabel }}</div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="donut__legend">
      <div v-for="(s, i) in segments" :key="s.name" class="donut__legend-row">
        <span class="donut__swatch" :style="{ background: colorAt(i) }"></span>
        <span class="donut__name">{{ s.name }}</span>
        <span class="donut__pct num">{{ s.pct }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 组件级令牌 · 设计稿中环形图的专有度量(不在全局字阶/间距刻度内) */
.donut {
  --donut-size: 190px;        /* 环形直径 */
  --donut-gap: 20px;          /* 环形与图例间距 */
  --donut-legend-gap: 9px;    /* 图例行间距 / 行内间距 */
  --donut-swatch: 11px;       /* 图例色块边长 */
  --donut-swatch-radius: 1px; /* 图例色块圆角 */
  --donut-fs-total: 22px;     /* 环心总额字号 */

  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--donut-gap);
  min-height: 0;
  /* 容器被压缩时裁剪而非向上溢出覆盖标题 */
  overflow: hidden;
}

/* 环形随容器高度收缩:高度不足时自动变小,不再固定 190px 撑破面板。
   ECharts 饼图半径按 min(宽,高) 计算,容器非正方形也仍是正圆。 */
.donut__chart-wrap {
  position: relative;
  flex: none;
  width: var(--donut-size);
  max-width: 100%;
  height: 100%;
  max-height: var(--donut-size);
  min-height: 0;
}
.donut__chart {
  width: 100%;
  height: 100%;
}
/* 环心文案:覆盖在环形中央 */
.donut__center {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  text-align: center;
  pointer-events: none;
}
.donut__center-label {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
  line-height: 1.4;
}
.donut__center-value {
  font-size: var(--donut-fs-total);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-900);
  line-height: 1.3;
}

.donut__legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--donut-legend-gap);
  min-width: 0;
}
.donut__legend-row {
  display: flex;
  align-items: center;
  gap: var(--donut-legend-gap);
  font-size: var(--fs-aux);
}
.donut__swatch {
  width: var(--donut-swatch);
  height: var(--donut-swatch);
  flex: none;
  border-radius: var(--donut-swatch-radius);
}
.donut__name {
  flex: 1;
  color: var(--color-neutral-700);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.donut__pct {
  font-weight: var(--fw-semibold);
}
</style>
