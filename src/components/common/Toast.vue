<script setup lang="ts">
/**
 * 轻量提示 Toast(《交互说明》3 通用规则:成功以右上角 toast,3s 自动消失)
 * 受控:visible 置真后自动计时关闭;不打断当前操作。
 */
import { watch } from 'vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    text: string
    /** 语气:success 绿 / danger 红 / primary 蓝 */
    tone?: 'success' | 'danger' | 'primary'
    /** 自动消失毫秒 */
    duration?: number
  }>(),
  { tone: 'success', duration: 3000 },
)

const emit = defineEmits<{ (e: 'close'): void }>()

let timer: ReturnType<typeof setTimeout> | null = null
watch(
  () => props.visible,
  (v) => {
    if (timer) clearTimeout(timer)
    if (v) timer = setTimeout(() => emit('close'), props.duration)
  },
)
</script>

<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="`toast--${tone}`">
      <span class="toast__icon">{{ tone === 'success' ? '✓' : tone === 'danger' ? '!' : 'i' }}</span>
      <span class="toast__text">{{ text }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 18px;
  right: 20px;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 360px;
  padding: 10px var(--space-4);
  border-radius: var(--radius-control);
  background: var(--color-panel);
  border: var(--border-line);
  box-shadow: var(--shadow-md);
  font-size: var(--fs-aux);
  color: var(--color-neutral-800);
}
.toast__icon {
  width: 18px;
  height: 18px;
  flex: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-inverse);
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
}
.toast--success {
  border-left: 3px solid var(--color-success);
}
.toast--success .toast__icon {
  background: var(--color-success);
}
.toast--danger {
  border-left: 3px solid var(--color-danger);
}
.toast--danger .toast__icon {
  background: var(--color-danger);
}
.toast--primary {
  border-left: 3px solid var(--color-primary);
}
.toast--primary .toast__icon {
  background: var(--color-primary);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity var(--motion-fast) ease, transform var(--motion-fast) ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
