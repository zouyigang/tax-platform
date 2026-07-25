<script setup lang="ts">
/**
 * 通用柱状图 · ECharts(分类柱)
 * 静态呈现,不注册 Tooltip/Legend;颜色取 palette(设计令牌)。
 */
import type { NamedValue } from '@/api/types'
import { useChart } from '@/charts/useChart'
import { CHART_SERIES, TREND } from '@/charts/palette'

const props = withDefaults(
  defineProps<{
    items: NamedValue[]
    /** 柱色(默认政务蓝) */
    color?: string
    /** 数值后缀单位(轴与标签) */
    unit?: string
  }>(),
  { color: '', unit: '' },
)

function buildOption() {
  const color = props.color || CHART_SERIES[0]
  return {
    animationDuration: 160,
    grid: { left: 44, right: 16, top: 22, bottom: 44 },
    xAxis: {
      type: 'category',
      data: props.items.map((i) => i.name),
      axisLine: { lineStyle: { color: TREND.splitLine } },
      axisTick: { show: false },
      axisLabel: { color: TREND.monthLabel, fontSize: 12, interval: 0, hideOverlap: true },
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
        type: 'bar',
        data: props.items.map((i) => i.value),
        barMaxWidth: 26,
        itemStyle: { color, borderRadius: [2, 2, 0, 0] },
      },
    ],
  }
}

const { el } = useChart(buildOption, () => props.items)
</script>

<template>
  <div ref="el" class="bar-chart"></div>
</template>

<style scoped>
.bar-chart {
  flex: 1;
  min-height: 200px;
  width: 100%;
}
</style>
