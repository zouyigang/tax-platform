<script setup lang="ts">
/**
 * 税收收入趋势(近 12 个月) · ECharts 折线
 * 视觉对齐设计稿:实际入库=政务蓝实线 + 6% 面积填充;预测值=灰色虚线;
 * 数据点为白底描边圆点;水平网格线 5 条,值域 5.5–9.5。
 */
import type { RevenueTrendPoint } from '@/api/types'
import { useChart } from '@/charts/useChart'
import { TREND } from '@/charts/palette'

const props = defineProps<{ points: RevenueTrendPoint[] }>()

function buildOption() {
  const points = props.points
  const months = points.map((p) => p.month)
  // 衔接点:最后一个实际值的索引(预测线自此点起画)
  let splitIdx = points.length - 1
  for (let i = 0; i < points.length; i++) {
    if (points[i].isForecast) {
      splitIdx = i - 1
      break
    }
  }

  const actual = points.map((p, i) => (i <= splitIdx ? p.value : null))
  const forecast = points.map((p, i) => {
    if (i < splitIdx) return null
    // 衔接点已由实际值系列画出圆点,此处隐藏以免重叠
    if (i === splitIdx) return { value: p.value, symbolSize: 0 }
    return p.value
  })

  const symbol = (color: string) => ({
    color: TREND.symbolFill,
    borderColor: color,
    borderWidth: 2,
  })

  return {
    animationDuration: 160,
    grid: { left: 46, right: 16, top: 22, bottom: 30 },
    xAxis: {
      type: 'category',
      data: months,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: TREND.monthLabel, fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      min: 5.5,
      max: 9.5,
      interval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: TREND.splitLine, width: 1 } },
      axisLabel: {
        color: TREND.axisLabel,
        fontSize: 12,
        formatter: (v: number) => (v === 9.5 ? `${v}亿` : String(v)),
      },
    },
    series: [
      {
        name: '预测值',
        type: 'line',
        data: forecast,
        z: 2,
        lineStyle: { color: TREND.forecast, width: 2.5, type: [7, 6] },
        itemStyle: symbol(TREND.forecast),
        symbol: 'circle',
        symbolSize: 7,
      },
      {
        name: '实际入库',
        type: 'line',
        data: actual,
        z: 3,
        lineStyle: { color: TREND.actual, width: 2.5, cap: 'round', join: 'round' },
        itemStyle: symbol(TREND.actual),
        symbol: 'circle',
        symbolSize: 7,
        areaStyle: { color: TREND.actual, opacity: TREND.areaOpacity },
      },
    ],
  }
}

const { el } = useChart(buildOption, () => props.points)
</script>

<template>
  <div ref="el" class="trend-chart"></div>
</template>

<style scoped>
.trend-chart {
  flex: 1;
  min-height: 0;
  width: 100%;
}
</style>
