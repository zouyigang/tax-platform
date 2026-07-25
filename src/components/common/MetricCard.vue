<script setup lang="ts">
/**
 * 指标卡(对应设计系统「指标卡片」)
 * 覆盖驾驶舱 KPI、档案申报指标、发票统计、抽屉概览等多处形态:
 *   - align=left   标签在上、数值在下
 *   - align=center 数值在上、标签在下
 *   - accent 传入时,卡片顶部显示语义色条
 *   - delta 传入时,底部显示变化文案
 */
import { toneClass, type ToneName } from './tone'
import type { KpiAccent } from '@/api/types'

withDefaults(
  defineProps<{
    /** 指标名称 */
    label: string
    /** 指标值(已格式化) */
    value: string
    /** 单位,可空 */
    unit?: string
    /** 顶部色条语义;空串表示不显示 */
    accent?: KpiAccent | ''
    /** 数值取色语气 */
    tone?: ToneName
    /** 排布方向 */
    align?: 'left' | 'center'
    /** 数值字号档位 */
    size?: 'sm' | 'md' | 'lg'
    /** 边框:card 常规描边 / inset 面板内浅描边 / none 无边框 */
    variant?: 'card' | 'inset' | 'none'
    /** 变化文案(如 "▲ 6.4%") */
    delta?: string
    /** 变化文案语气 */
    deltaTone?: ToneName
    /** 变化说明(如 "同比") */
    deltaNote?: string
    /** 是否可点击 */
    clickable?: boolean
  }>(),
  {
    unit: '',
    accent: '',
    tone: 'default',
    align: 'left',
    size: 'md',
    variant: 'inset',
    delta: '',
    deltaTone: 'default',
    deltaNote: '',
    clickable: false,
  },
)
</script>

<template>
  <div
    class="metric"
    :class="[
      `metric--${align}`,
      `metric--${size}`,
      `metric--${variant}`,
      { 'metric--accent': !!accent, 'metric--link': clickable },
    ]"
    :style="accent ? { borderTopColor: `var(--kpi-accent-${accent})` } : undefined"
  >
    <div class="metric__label">{{ label }}</div>
    <div class="metric__value num" :class="toneClass(tone)">
      {{ value }}<span v-if="unit" class="metric__unit">{{ unit }}</span>
    </div>
    <div v-if="delta" class="metric__delta">
      <span class="metric__delta-value" :class="toneClass(deltaTone)">{{ delta }}</span>
      <span v-if="deltaNote" class="metric__delta-note">{{ deltaNote }}</span>
    </div>
  </div>
</template>

<style scoped>
.metric {
  /* 指标卡专有度量(不在全局字阶内) */
  --metric-fs-lg: 38px;
  --metric-fs-md: 24px;
  --metric-fs-sm: 17px;
  --metric-unit-lg: 15px;
  --metric-unit-md: 13px;

  display: flex;
  flex-direction: column;
  border-radius: var(--radius-control);
  background: var(--color-panel);
}

/* 边框形态 */
.metric--card {
  border: var(--border-line);
  padding: 18px 22px;
  height: 100%;
  justify-content: space-between;
}
.metric--inset {
  border: 1px solid var(--color-neutral-200);
  padding: 14px 16px;
}
.metric--none {
  padding: 0;
  background: transparent;
}

/* 顶部语义色条 */
.metric--accent {
  border-top: 3px solid var(--color-primary);
}

.metric--link {
  cursor: pointer;
  transition: box-shadow var(--motion-fast) ease, border-color var(--motion-fast) ease;
}
.metric--link:hover {
  box-shadow: var(--shadow-sm);
}

/* 居中形态:数值在上、标签在下 */
.metric--center {
  align-items: center;
  text-align: center;
}
.metric--center .metric__label {
  order: 2;
  margin-top: var(--space-1);
}
.metric--center .metric__value {
  order: 1;
}

.metric__label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.metric--lg .metric__label {
  font-size: var(--fs-body);
  color: var(--color-text-sub);
}

.metric__value {
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
  line-height: 1.15;
}
.metric--lg .metric__value {
  font-size: var(--metric-fs-lg);
  line-height: 1;
}
.metric--md .metric__value {
  font-size: var(--metric-fs-md);
  margin-top: var(--space-1);
}
.metric--sm .metric__value {
  font-size: var(--metric-fs-sm);
  margin-top: 3px;
}

.metric__unit {
  font-weight: var(--fw-regular);
  color: var(--color-neutral-600);
  margin-left: 3px;
  font-size: var(--metric-unit-md);
}
.metric--lg .metric__unit {
  font-size: var(--metric-unit-lg);
  margin-left: 6px;
}

.metric__delta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fs-aux);
}
.metric__delta-value {
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.metric__delta-note {
  color: var(--color-neutral-600);
}
</style>
