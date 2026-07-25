<script setup lang="ts">
/** 分页栏 · 总数 + 每页条数 + 页码 + 跳转 */
import { computed, ref, watch } from 'vue'
import BaseSelect from './BaseSelect.vue'

const props = withDefaults(
  defineProps<{
    /** 总条数 */
    total: number
    /** 当前页,从 1 开始 */
    page: number
    /** 每页条数 */
    pageSize: number
    /** 可选的每页条数 */
    pageSizeOptions?: number[]
  }>(),
  { pageSizeOptions: () => [20, 50, 100] },
)

const emit = defineEmits<{
  (e: 'update:page', v: number): void
  (e: 'update:pageSize', v: number): void
}>()

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

/** 页码窗口:最多 7 个,当前页居中 */
const pages = computed(() => {
  const count = pageCount.value
  const max = 7
  if (count <= max) return Array.from({ length: count }, (_, i) => i + 1)
  let start = Math.max(1, props.page - 3)
  const end = Math.min(count, start + max - 1)
  start = Math.max(1, end - max + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const sizeOptions = computed(() =>
  props.pageSizeOptions.map((n) => ({ value: String(n), label: String(n) })),
)

function go(p: number) {
  if (p < 1 || p > pageCount.value || p === props.page) return
  emit('update:page', p)
}

/** 「前往」输入框 */
const jump = ref(String(props.page))
watch(
  () => props.page,
  (p) => {
    jump.value = String(p)
  },
)
function onJump() {
  const n = parseInt(jump.value, 10)
  if (!isNaN(n)) go(n)
  else jump.value = String(props.page)
}
</script>

<template>
  <div class="pager">
    <span class="pager__total num">
      共 {{ total }} 条 · 每页
      <BaseSelect
        class="pager__size"
        :model-value="String(pageSize)"
        :options="sizeOptions"
        width="72px"
        @update:model-value="emit('update:pageSize', Number($event))"
      />
    </span>

    <div class="pager__nav">
      <span
        class="pager__btn"
        :class="{ 'pager__btn--disabled': page <= 1 }"
        @click="go(page - 1)"
        >‹</span
      >
      <span
        v-for="p in pages"
        :key="p"
        class="pager__btn pager__btn--page num"
        :class="{ 'pager__btn--on': p === page }"
        @click="go(p)"
        >{{ p }}</span
      >
      <span
        class="pager__btn"
        :class="{ 'pager__btn--disabled': page >= pageCount }"
        @click="go(page + 1)"
        >›</span
      >
      <span class="pager__jump num">
        前往
        <input v-model="jump" class="pager__jump-input num" @keyup.enter="onJump" @blur="onJump" />
        页
      </span>
    </div>
  </div>
</template>

<style scoped>
.pager {
  height: 48px;
  flex: none;
  border-top: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: 14px;
}
.pager__total {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.pager__size {
  height: 26px;
}

.pager__nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}
.pager__btn {
  min-width: 30px;
  height: 30px;
  padding: 0 var(--space-2);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  cursor: pointer;
  transition: border-color var(--motion-fast) ease, background var(--motion-fast) ease;
}
.pager__btn--page {
  font-size: var(--fs-aux);
}
.pager__btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.pager__btn--on,
.pager__btn--on:hover {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-text-inverse);
}
.pager__btn--disabled,
.pager__btn--disabled:hover {
  color: var(--color-neutral-400);
  border-color: var(--color-neutral-300);
  cursor: not-allowed;
}

.pager__jump {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-left: 6px;
}
.pager__jump-input {
  width: 38px;
  height: 24px;
  border: var(--border-line);
  border-radius: var(--radius-control);
  text-align: center;
  font-family: inherit;
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  outline: none;
}
.pager__jump-input:focus {
  border-color: var(--color-primary);
}
</style>
