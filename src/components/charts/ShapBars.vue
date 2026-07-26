<script setup lang="ts">
/**
 * SHAP 归因·横向发散条形(DOM 绘制,非 ECharts)
 * 以 0 为中轴向两侧发散:向右=推高风险分,向左=压低风险分,长度按绝对值归一。
 * 每行同时给出该户的特征取值与同行业中位数,便于人工复核模型判断是否合理。
 * 取色走 tone 类(.tone-danger / .tone-success),组件内不出现具体色值。
 */
import { computed } from 'vue'
import type { ShapItem } from '@/api/types'

const props = defineProps<{
  /** 贡献明细(建议按绝对值降序传入) */
  items: ShapItem[]
}>()

/** 归一化基准:绝对值最大的一项占满半幅 */
const max = computed(() => props.items.reduce((m, it) => (Math.abs(it.contribution) > m ? Math.abs(it.contribution) : m), 0) || 1)

function barWidth(v: number): string {
  return `${((Math.abs(v) / max.value) * 100).toFixed(1)}%`
}
function signed(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}`
}
</script>

<template>
  <div class="shap">
    <div class="shap__legend">
      <span class="shap__lg"><i class="shap__sw tone-danger"></i>推高风险分</span>
      <span class="shap__lg"><i class="shap__sw tone-success"></i>压低风险分</span>
      <span class="shap__lg shap__lg--note">条长 = 该因子对分值的贡献绝对值</span>
    </div>

    <div v-for="it in items" :key="it.feature" class="shap__row">
      <div class="shap__label">
        <span class="shap__name">{{ it.feature }}</span>
        <span class="shap__meta num">
          {{ it.value }}<span class="shap__bench">中位 {{ it.benchmark }}</span>
        </span>
      </div>

      <div class="shap__track">
        <div class="shap__half shap__half--neg">
          <div
            v-if="it.contribution < 0"
            class="shap__bar tone-success"
            :style="{ width: barWidth(it.contribution) }"
          ></div>
        </div>
        <div class="shap__axis"></div>
        <div class="shap__half shap__half--pos">
          <div
            v-if="it.contribution > 0"
            class="shap__bar tone-danger"
            :style="{ width: barWidth(it.contribution) }"
          ></div>
        </div>
      </div>

      <span class="shap__num num" :class="it.contribution > 0 ? 'tone-danger' : 'tone-success'">
        {{ signed(it.contribution) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.shap {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.shap__legend {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  margin-bottom: 3px;
}
.shap__lg {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.shap__lg--note {
  margin-left: auto;
  color: var(--color-neutral-500);
}
.shap__sw {
  width: 10px;
  height: 10px;
  border-radius: 1px;
  background: var(--tone-main);
  display: inline-block;
}

.shap__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shap__label {
  width: 152px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.shap__name {
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.shap__meta {
  font-size: var(--fs-micro);
  color: var(--color-neutral-700);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.shap__bench {
  color: var(--color-neutral-500);
  margin-left: var(--space-2);
}

.shap__track {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}
.shap__half {
  flex: 1;
  min-width: 0;
  display: flex;
  height: 13px;
}
/* 负向自中轴向左生长,故靠右对齐 */
.shap__half--neg {
  justify-content: flex-end;
}
.shap__axis {
  width: 1px;
  height: 19px;
  flex: none;
  background: var(--color-neutral-300);
}
.shap__bar {
  height: 13px;
  border-radius: 1px;
  background: var(--tone-main);
}

.shap__num {
  width: 44px;
  flex: none;
  text-align: right;
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
</style>
