<script setup lang="ts">
/**
 * 可切换筛选芯片 · 用于风险等级 / 任务状态的多选过滤
 * 选中态:主色描边 + 主色浅底;未选中:常规描边 + 白底
 */
import { toneClass, type ToneName } from './tone'

withDefaults(
  defineProps<{
    /** 是否选中 */
    active: boolean
    /** 左侧圆点的语气;不传则不显示圆点 */
    dotTone?: ToneName | ''
    /** 右侧计数;不传则不显示 */
    count?: number | null
  }>(),
  { dotTone: '', count: null },
)

defineEmits<{ (e: 'toggle'): void }>()
</script>

<template>
  <span class="chip" :class="{ 'chip--active': active }" @click="$emit('toggle')">
    <span v-if="dotTone" class="chip__dot" :class="toneClass(dotTone)"></span>
    <slot />
    <span v-if="count !== null" class="chip__count num">({{ count }})</span>
  </span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  white-space: nowrap;
  font-size: var(--fs-label);
  line-height: 1.4;
  padding: 4px 12px;
  border-radius: var(--radius-control);
  cursor: pointer;
  border: var(--border-line);
  background: var(--color-panel);
  color: var(--color-neutral-600);
  transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease,
    color var(--motion-fast) ease;
}
.chip:hover {
  border-color: var(--color-neutral-400);
}
.chip--active,
.chip--active:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
  color: var(--color-primary-deep);
}
.chip__dot {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 50%;
  background: var(--tone-main);
}
.chip__count {
  opacity: 0.7;
}
</style>
