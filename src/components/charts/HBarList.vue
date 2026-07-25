<script setup lang="ts">
/**
 * 横向排名条(DOM 绘制,非 ECharts)
 * 用于分区县 / 分数据源等排名展示。宽度按最大值归一;可选按排名着色。
 */
import { computed } from 'vue'
import type { NamedValue } from '@/api/types'
import { districtColor } from '@/charts/palette'

const props = withDefaults(
  defineProps<{
    items: NamedValue[]
    /** 数值单位(如「万元」/「户」) */
    unit?: string
    /** 是否按排名着色(第1名最深,前3主色,其余浅蓝) */
    rankColor?: boolean
  }>(),
  { unit: '', rankColor: true },
)

const max = computed(() => props.items.reduce((m, i) => (i.value > m ? i.value : m), 0) || 1)

function width(v: number) {
  return `${((v / max.value) * 100).toFixed(0)}%`
}
function color(rank: number) {
  return props.rankColor ? districtColor(rank) : districtColor(1)
}
function fmt(v: number) {
  return v.toLocaleString('en-US', { maximumFractionDigits: 1 })
}
</script>

<template>
  <div class="hbar">
    <div v-for="(item, i) in items" :key="item.name" class="hbar__row">
      <span class="hbar__name">{{ item.name }}</span>
      <div class="hbar__track">
        <div class="hbar__fill" :style="{ width: width(item.value), background: color(i) }"></div>
      </div>
      <span class="hbar__value num">{{ fmt(item.value) }}<span v-if="unit" class="hbar__unit">{{ unit }}</span></span>
    </div>
  </div>
</template>

<style scoped>
.hbar {
  display: flex;
  flex-direction: column;
  gap: 11px;
  justify-content: center;
  flex: 1;
  min-height: 0;
}
.hbar__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.hbar__name {
  width: 72px;
  flex: none;
  text-align: right;
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hbar__track {
  flex: 1;
  height: 14px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  min-width: 0;
}
.hbar__fill {
  height: 14px;
  border-radius: 1px;
  transition: width var(--motion-mid) ease;
}
.hbar__value {
  width: 66px;
  flex: none;
  text-align: right;
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-800);
}
.hbar__unit {
  font-weight: var(--fw-regular);
  color: var(--color-neutral-500);
  margin-left: 2px;
}
</style>
