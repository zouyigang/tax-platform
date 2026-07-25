<script setup lang="ts">
/** 图表悬停 Tooltip · 全站统一(深底浮层,fixed 定位,由 useTooltip 提供状态) */
import type { TipState } from '@/composables/useTooltip'

defineProps<{ tip: TipState }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="tip.show" class="tip" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">
      <div class="tip__title">{{ tip.title }}</div>
      <div v-for="(r, i) in tip.rows" :key="i" class="tip__row">
        <span class="tip__k">{{ r.k }}</span>
        <span class="tip__v num">{{ r.v }}</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tip {
  position: fixed;
  z-index: 99;
  pointer-events: none;
  min-width: 190px;
  background: var(--color-tooltip-bg);
  color: var(--color-text-inverse);
  border-radius: 3px;
  padding: 10px 14px;
  box-shadow: var(--shadow-tooltip);
}
.tip__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  margin-bottom: 6px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
}
.tip__row {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  font-size: var(--fs-label);
  line-height: 1.9;
}
.tip__k {
  color: var(--color-tooltip-key);
}
.tip__v {
  font-weight: var(--fw-semibold);
}
</style>
