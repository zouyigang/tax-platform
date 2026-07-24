<script setup lang="ts">
/**
 * 数据区块四态容器 · 依据《交互说明》第 2 节
 * 容器尺寸在四态间保持不变,避免布局跳动。
 * ready 时渲染默认插槽;其余状态渲染统一的加载/空/错误呈现。
 */
import type { ResourceStatus } from '@/composables/useResource'

withDefaults(
  defineProps<{
    /** 区块状态 */
    status: ResourceStatus
    /** 空态主文案 */
    emptyText?: string
    /** 空态辅助说明 */
    emptyHint?: string
    /** 错误原因(面向业务人员) */
    error?: string
  }>(),
  {
    emptyText: '所选周期暂无数据',
    emptyHint: '',
    error: '',
  },
)

defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <slot v-if="status === 'ready'" />

  <div v-else class="state">
    <!-- 加载态:居中浅灰占位文案,不使用旋转 spinner -->
    <template v-if="status === 'loading' || status === 'idle'">
      <span class="state__loading">加载中…</span>
    </template>

    <!-- 空态 -->
    <template v-else-if="status === 'empty'">
      <span class="state__icon" aria-hidden="true"></span>
      <span class="state__title">{{ emptyText }}</span>
      <span v-if="emptyHint" class="state__desc">{{ emptyHint }}</span>
    </template>

    <!-- 错误态 -->
    <template v-else>
      <span class="state__icon state__icon--error" aria-hidden="true">!</span>
      <span class="state__title">数据加载失败</span>
      <span v-if="error" class="state__desc">{{ error }}</span>
      <button type="button" class="btn state__retry" @click="$emit('retry')">重试</button>
    </template>
  </div>
</template>

<style scoped>
.state {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  animation: state-fade var(--motion-fast) ease;
}
@keyframes state-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.state__loading {
  font-size: var(--fs-aux);
  color: var(--color-neutral-500);
}

/* 空态:48px 细描边线性图标 */
.state__icon {
  width: 48px;
  height: 48px;
  border: 1px solid var(--color-neutral-400);
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-400);
  font-size: 22px;
  line-height: 1;
}
.state__icon--error {
  border-color: var(--color-danger);
  border-radius: 50%;
  color: var(--color-danger);
  font-weight: 600;
}

.state__title {
  font-size: var(--fs-body);
  color: var(--color-neutral-700);
}
.state__desc {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
}
.state__retry {
  margin-top: 2px;
}
</style>
