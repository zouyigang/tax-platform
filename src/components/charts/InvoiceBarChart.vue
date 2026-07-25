<script setup lang="ts">
/**
 * 进销项对比(近 6 月) · ECharts 分组柱状
 * 视觉对齐设计稿:销项政务蓝 / 进项浅蓝,细柱、无 Y 轴刻度、仅水平网格线。
 */
import type { InvoiceMonthly } from '@/api/types'
import { useChart } from '@/charts/useChart'
import { INVOICE_IO, TREND } from '@/charts/palette'

const props = defineProps<{ monthly: InvoiceMonthly[] }>()

function buildOption() {
  return {
    animationDuration: 160,
    grid: { left: 8, right: 8, top: 20, bottom: 24 },
    xAxis: {
      type: 'category',
      data: props.monthly.map((m) => m.month),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: TREND.axisLabel, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { lineStyle: { color: TREND.splitLine, width: 1 } },
    },
    series: [
      {
        name: '销项',
        type: 'bar',
        data: props.monthly.map((m) => m.output),
        barWidth: 12,
        barGap: '20%',
        itemStyle: { color: INVOICE_IO.output },
      },
      {
        name: '进项',
        type: 'bar',
        data: props.monthly.map((m) => m.input),
        barWidth: 12,
        itemStyle: { color: INVOICE_IO.input },
      },
    ],
  }
}

const { el } = useChart(buildOption, () => props.monthly)
</script>

<template>
  <div class="io">
    <div ref="el" class="io__chart"></div>
    <div class="io__legend">
      <span class="io__legend-item">
        <span class="io__swatch" :style="{ background: INVOICE_IO.output }"></span>销项
      </span>
      <span class="io__legend-item">
        <span class="io__swatch" :style="{ background: INVOICE_IO.input }"></span>进项
      </span>
    </div>
  </div>
</template>

<style scoped>
.io {
  display: flex;
  flex-direction: column;
}
.io__chart {
  width: 100%;
  height: 180px;
}
.io__legend {
  display: flex;
  gap: 18px;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: var(--space-1);
}
.io__legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
.io__swatch {
  width: 11px;
  height: 11px;
  flex: none;
}
</style>
