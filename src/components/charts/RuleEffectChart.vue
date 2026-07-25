<script setup lang="ts">
/**
 * 规则效果监测 · 近 6 个月「命中量 + 命中率」双轴折线
 * 左轴=命中量(政务蓝实线 + 面积);右轴=命中率(金色实线,0–100%)。
 * 交互克制:不注册 Tooltip/Legend,图例以 DOM 呈现,保持全站静态一致风格。
 */
import type { RuleEffectPoint } from '@/api/types'
import { useChart } from '@/charts/useChart'
import { RULE_EFFECT } from '@/charts/palette'

const props = defineProps<{ points: RuleEffectPoint[] }>()

function buildOption() {
  const months = props.points.map((p) => p.month)
  const counts = props.points.map((p) => p.hitCount)
  const rates = props.points.map((p) => p.hitRate)

  const symbol = (color: string) => ({
    color: RULE_EFFECT.symbolFill,
    borderColor: color,
    borderWidth: 2,
  })

  return {
    animationDuration: 160,
    grid: { left: 40, right: 44, top: 22, bottom: 28 },
    xAxis: {
      type: 'category',
      data: months,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: RULE_EFFECT.monthLabel, fontSize: 12 },
    },
    yAxis: [
      {
        // 左轴:命中量(条)
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: RULE_EFFECT.splitLine, width: 1 } },
        axisLabel: { color: RULE_EFFECT.axisLabel, fontSize: 12 },
      },
      {
        // 右轴:命中率(%)
        type: 'value',
        min: 0,
        max: 100,
        interval: 25,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: RULE_EFFECT.axisLabel,
          fontSize: 12,
          formatter: (v: number) => `${v}%`,
        },
      },
    ],
    series: [
      {
        name: '命中量',
        type: 'line',
        yAxisIndex: 0,
        data: counts,
        z: 3,
        lineStyle: { color: RULE_EFFECT.count, width: 2.5, cap: 'round', join: 'round' },
        itemStyle: symbol(RULE_EFFECT.count),
        symbol: 'circle',
        symbolSize: 7,
        areaStyle: { color: RULE_EFFECT.count, opacity: RULE_EFFECT.areaOpacity },
      },
      {
        name: '命中率',
        type: 'line',
        yAxisIndex: 1,
        data: rates,
        z: 2,
        lineStyle: { color: RULE_EFFECT.rate, width: 2.5 },
        itemStyle: symbol(RULE_EFFECT.rate),
        symbol: 'circle',
        symbolSize: 7,
      },
    ],
  }
}

const { el } = useChart(buildOption, () => props.points)
</script>

<template>
  <div class="effect">
    <!-- DOM 图例(与全站静态图表风格一致) -->
    <div class="effect__legend">
      <span class="effect__legend-item">
        <span class="effect__swatch effect__swatch--count"></span>命中量(条)
      </span>
      <span class="effect__legend-item">
        <span class="effect__swatch effect__swatch--rate"></span>命中率(%)
      </span>
    </div>
    <div ref="el" class="effect__canvas"></div>
  </div>
</template>

<style scoped>
.effect {
  --effect-min-h: 220px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.effect__legend {
  flex: none;
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-2);
}
.effect__legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.effect__swatch {
  width: 14px;
  height: 3px;
  border-radius: 2px;
}
.effect__swatch--count {
  background: var(--color-primary);
}
.effect__swatch--rate {
  background: var(--chart-5);
}
.effect__canvas {
  flex: 1;
  min-height: var(--effect-min-h);
  width: 100%;
}
</style>
