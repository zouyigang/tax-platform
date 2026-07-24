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
.donut {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 0;
}

.donut__chart-wrap {
  position: relative;
  width: 190px;
  height: 190px;
  flex: none;
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
  font-size: 13px;
  color: var(--color-neutral-600);
  line-height: 1.4;
}
.donut__center-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-neutral-900);
  line-height: 1.3;
}

.donut__legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
}
.donut__legend-row {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
}
.donut__swatch {
  width: 11px;
  height: 11px;
  flex: none;
  border-radius: 1px;
}
.donut__name {
  flex: 1;
  color: var(--color-neutral-700);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.donut__pct {
  font-weight: 600;
}
</style>
