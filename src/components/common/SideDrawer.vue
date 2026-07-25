<script setup lang="ts">
/**
 * 右侧详情抽屉(《交互说明》4.1)
 * - 从右侧滑入 200ms,覆盖于列表之上,列表不重排
 * - 关闭:✕ / Esc / 点击抽屉以外区域(由父级遮罩层负责)
 * - 打开时点击另一行,内容原地刷新(不关闭再开)
 */
import { onBeforeUnmount, onMounted } from 'vue'

withDefaults(defineProps<{ open: boolean; width?: string }>(), { width: '508px' })

const emit = defineEmits<{ (e: 'close'): void }>()

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onEsc))
onBeforeUnmount(() => document.removeEventListener('keydown', onEsc))
</script>

<template>
  <Transition name="drawer">
    <aside v-if="open" class="drawer" :style="{ width }">
      <div class="drawer__header">
        <slot name="header" />
      </div>
      <div class="drawer__body">
        <slot />
      </div>
      <div v-if="$slots.footer" class="drawer__footer">
        <slot name="footer" />
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  background: var(--color-panel);
  border-left: var(--border-line);
  box-shadow: var(--shadow-drawer);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.drawer__header {
  flex: none;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-neutral-200);
}
.drawer__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: 18px 20px;
  background: var(--color-neutral-100);
}
.drawer__footer {
  flex: none;
  padding: var(--space-3) 20px;
  border-top: 1px solid var(--color-neutral-200);
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* 滑入 200ms */
.drawer-enter-active,
.drawer-leave-active {
  transition: transform var(--motion-drawer) ease;
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
