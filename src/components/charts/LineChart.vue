<script setup lang="ts">
/**
 * 通用折线图 · ECharts
 * 静态呈现;可选面积填充;颜色取 palette(设计令牌)。
 */
import type { SeriesPoint } from '@/api/types'
import { useChart } from '@/charts/useChart'
import { CHART_SERIES, TREND } from '@/charts/palette'

const props = withDefaults(
  defineProps<{
    points: SeriesPoint[]
    /** 线色(默认政务蓝) */
    color?: string
    /** 是否面积填充 */
    area?: boolean
  }>(),
  { color: '', area: true },
)

function buildOption() {
  const color = props.color || CHART_SERIES[0]
  return {
    animationDuration: 160,
    grid: { left: 46, right: 16, top: 22, bottom: 30 },
    xAxis: {
      type: 'category',
      data: props.points.map((p) => p.label),
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: TREND.monthLabel, fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: TREND.splitLine, width: 1 } },
      axisLabel: { color: TREND.axisLabel, fontSize: 12 },
    },
    series: [
      {
        type: 'line',
        data: props.points.map((p) => p.value),
        lineStyle: { color, width: 2.5, cap: 'round', join: 'round' },
        itemStyle: { color: TREND.symbolFill, borderColor: color, borderWidth: 2 },
        symbol: 'circle',
        symbolSize: 7,
        areaStyle: props.area ? { color, opacity: TREND.areaOpacity } : undefined,
      },
    ],
  }
}

const { el } = useChart(buildOption, () => props.points)
</script>

<template>
  <div ref="el" class="line-chart"></div>
</template>

<style scoped>
.line-chart {
  flex: 1;
  min-height: 200px;
  width: 100%;
}
</style>
