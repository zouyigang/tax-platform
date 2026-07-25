<script setup lang="ts">
/**
 * 标签徽章 · 三种形态(对应设计系统「标签徽章」)
 *   outline 底纹 + 文字色 + 1px 主色描边   —— 风险等级、评价标签
 *   dot     圆点 + 文字,无底纹              —— 列表内处置状态
 *   soft    底纹 + 文字,无描边              —— 登记状态等轻提示
 * 颜色一律由 tone 决定,组件内不出现具体色值。
 */
import { toneClass, type ToneName } from './tone'

withDefaults(
  defineProps<{
    /** 语气(决定取色) */
    tone: ToneName
    /** 形态 */
    variant?: 'outline' | 'dot' | 'soft'
  }>(),
  { variant: 'outline' },
)
</script>

<template>
  <span class="badge" :class="[`badge--${variant}`, toneClass(tone)]">
    <span v-if="variant === 'dot'" class="badge__dot"></span>
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  font-size: var(--fs-label);
  line-height: 1.4;
  border-radius: var(--radius-control);
  border: 1px solid transparent;
}

/* 描边型:风险等级 */
.badge--outline {
  padding: 2px 8px;
  font-weight: var(--fw-semibold);
  background: var(--tone-tint);
  color: var(--tone-text);
  border-color: var(--tone-main);
}

/* 圆点型:列表内状态,不占额外底纹面积 */
.badge--dot {
  gap: 5px;
  color: var(--tone-text);
}
.badge__dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: var(--tone-main);
}

/* 轻底纹型 */
.badge--soft {
  padding: 2px 10px;
  background: var(--tone-tint);
  color: var(--tone-text);
}
</style>
