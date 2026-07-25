<script setup lang="ts">
/**
 * 确认类弹窗(《交互说明》4.3)
 * - 居中,约 440px,4px 圆角,半透明遮罩;遮罩点击不关闭(防误触)。
 * - Esc / ✕ / 取消 关闭;确认按钮语义色(政务蓝 / 高风险红)。
 * - 可选「理由必填」:用于「退回」——理由为空时确认禁用。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    /** 正文说明 */
    message?: string
    /** 确认按钮文案 */
    confirmText?: string
    /** 取消按钮文案 */
    cancelText?: string
    /** 确认按钮语气:primary 政务蓝 / danger 高风险红 */
    tone?: 'primary' | 'danger'
    /** 是否需要填写理由(如退回) */
    requireReason?: boolean
    /** 理由输入框占位符 */
    reasonPlaceholder?: string
  }>(),
  {
    message: '',
    confirmText: '确认',
    cancelText: '取消',
    tone: 'primary',
    requireReason: false,
    reasonPlaceholder: '请填写理由',
  },
)

const emit = defineEmits<{
  (e: 'confirm', reason: string): void
  (e: 'cancel'): void
}>()

const reason = ref('')

// 每次打开清空理由
watch(
  () => props.open,
  (v) => {
    if (v) reason.value = ''
  },
)

const confirmDisabled = computed(() => props.requireReason && reason.value.trim().length === 0)

function onConfirm() {
  if (confirmDisabled.value) return
  emit('confirm', reason.value.trim())
}
function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('cancel')
}
onMounted(() => document.addEventListener('keydown', onEsc))
onBeforeUnmount(() => document.removeEventListener('keydown', onEsc))
</script>

<template>
  <Transition name="modal">
    <div v-if="open" class="modal-mask" @click.self="$emit('cancel')">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal__head">
          <span class="modal__title">{{ title }}</span>
          <span class="modal__close" @click="$emit('cancel')">✕</span>
        </div>
        <div class="modal__body">
          <p v-if="message" class="modal__message">{{ message }}</p>
          <textarea
            v-if="requireReason"
            v-model="reason"
            class="modal__reason"
            :placeholder="reasonPlaceholder"
          ></textarea>
        </div>
        <div class="modal__foot">
          <button type="button" class="btn" @click="$emit('cancel')">{{ cancelText }}</button>
          <button
            type="button"
            class="btn"
            :class="tone === 'danger' ? 'btn--danger' : 'btn--primary'"
            :disabled="confirmDisabled"
            @click="onConfirm"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: var(--overlay-mask);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  width: 440px;
  max-width: calc(100vw - 32px);
  background: var(--color-panel);
  border-radius: var(--radius-modal);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
}
.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) 20px;
  border-bottom: 1px solid var(--color-neutral-200);
}
.modal__title {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
}
.modal__close {
  cursor: pointer;
  color: var(--color-neutral-500);
  font-size: var(--fs-h3);
}
.modal__close:hover {
  color: var(--color-primary);
}
.modal__body {
  padding: 20px;
}
.modal__message {
  margin: 0;
  font-size: var(--fs-body);
  color: var(--color-neutral-700);
  line-height: 1.6;
}
.modal__reason {
  margin-top: var(--space-3);
  width: 100%;
  min-height: 76px;
  padding: var(--space-2) var(--space-3);
  border: var(--border-line);
  border-radius: var(--radius-control);
  font-family: inherit;
  font-size: var(--fs-aux);
  color: var(--color-text);
  resize: vertical;
  outline: none;
}
.modal__reason:focus {
  border-color: var(--color-primary);
}
.modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: var(--space-3) 20px var(--space-4);
}
.btn--danger {
  background: var(--color-risk-high);
  border-color: var(--color-risk-high);
  color: var(--color-text-inverse);
}
.btn--danger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--motion-fast) ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
