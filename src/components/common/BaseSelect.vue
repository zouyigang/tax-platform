<script setup lang="ts">
/**
 * 下拉选择 · 自绘(无 UI 库)
 * 依据《交互说明》4.4:点击展开,再次点击或点击外部收起,Esc 收起,单选即时生效。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { FilterOption } from '@/api/types'

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: FilterOption[]
    /** 控件宽度,如 '150px' */
    width?: string
    /** 控件高度,默认 32px(筛选栏);驾驶舱等处可传 34px */
    height?: string
  }>(),
  { width: '', height: '' },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const label = computed(() => {
  const hit = props.options.filter((o) => o.value === props.modelValue)[0]
  return hit ? hit.label : ''
})

function toggle() {
  open.value = !open.value
}
function pick(value: string) {
  open.value = false
  if (value !== props.modelValue) emit('update:modelValue', value)
}
function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onEsc)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onEsc)
})
</script>

<template>
  <div
    ref="root"
    class="select"
    :style="{ width: width || undefined, height: height || undefined }"
    @click="toggle"
  >
    <span class="select__label">{{ label }}</span>
    <span class="select__caret">▾</span>
    <div v-if="open" class="select__menu" @click.stop>
      <div
        v-for="o in options"
        :key="o.value"
        class="select__option"
        :class="{ 'select__option--on': o.value === modelValue }"
        @click="pick(o.value)"
      >
        {{ o.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.select {
  position: relative;
  height: 32px;
  padding: 0 10px;
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--fs-aux);
  background: var(--color-panel);
  cursor: pointer;
  user-select: none;
}
.select__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.select__caret {
  color: var(--color-neutral-500);
  flex: none;
}
.select__menu {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  z-index: 20;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-sm);
  padding: var(--space-1) 0;
  max-height: 280px;
  overflow: auto;
}
.select__option {
  padding: 7px 12px;
  font-size: var(--fs-aux);
  color: var(--color-neutral-700);
  white-space: nowrap;
}
.select__option:hover {
  background: var(--color-neutral-100);
}
.select__option--on {
  color: var(--color-primary);
  background: var(--color-primary-tint);
  font-weight: var(--fw-semibold);
}
</style>
