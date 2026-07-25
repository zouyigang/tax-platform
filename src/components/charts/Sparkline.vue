<script setup lang="ts">
/**
 * 迷你趋势线(表格单元格内联)· 原生 SVG
 * 无坐标轴与刻度,仅呈现走势;末点加实心圆点标示当前值。
 */
import { computed } from 'vue'
import { DECISION } from '@/charts/palette'

const props = withDefaults(
  defineProps<{
    /** 数值序列(按时间升序) */
    values: number[]
    /** 线色;默认政务蓝 */
    color?: string
    /** 视图宽高(px) */
    width?: number
    height?: number
  }>(),
  { color: '', width: 72, height: 22 },
)

const stroke = computed(() => props.color || DECISION.actual)

const geo = computed(() => {
  const v = props.values
  if (!v || v.length < 2) return { path: '', lastX: 0, lastY: 0 }
  const max = Math.max(...v)
  const min = Math.min(...v)
  const span = max - min || 1
  const pad = 3
  const w = props.width
  const h = props.height
  const x = (i: number) => (i / (v.length - 1)) * (w - pad * 2) + pad
  const y = (n: number) => h - pad - ((n - min) / span) * (h - pad * 2)
  const path = v.map((n, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(n).toFixed(1)}`).join(' ')
  return { path, lastX: x(v.length - 1), lastY: y(v[v.length - 1]) }
})
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" :width="width" :height="height" class="spark">
    <path :d="geo.path" fill="none" :stroke="stroke" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
    <circle :cx="geo.lastX" :cy="geo.lastY" r="2" :fill="stroke" />
  </svg>
</template>

<style scoped>
.spark {
  display: block;
  overflow: visible;
}
</style>
