<script setup lang="ts">
/**
 * 纳税人检索框 · 带联想下拉
 * 一户式主档查询的页面级搜索与 MainLayout 顶栏的全局搜索共用本组件,
 * 两处只在尺寸(size)与占位文案上有差别,检索逻辑与联想行为完全一致。
 * 输入 2 字以上才触发联想:1 个字的召回没有意义,还会白跑一次查询。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { TaxpayerBrief, TaxpayerQuery } from '@/api/types'
import BaseBadge from './BaseBadge.vue'
import { REG_STATUS_LABEL, REG_STATUS_TONE } from './tone'

const props = withDefaults(
  defineProps<{
    /** 尺寸:page 页面级(较大) / topbar 顶栏级(紧凑) */
    size?: 'page' | 'topbar'
    /** 占位文案 */
    placeholder?: string
    /** 附加筛选条件(高级筛选面板传入),不传则不限 */
    filters?: Partial<TaxpayerQuery>
    /** 是否自动聚焦 */
    autofocus?: boolean
    /** 联想条数 */
    limit?: number
    /** 关键词双向绑定(页面级检索需要读取当前关键词;顶栏不传即可) */
    modelValue?: string
  }>(),
  {
    modelValue: '',
    size: 'page',
    placeholder: '搜索纳税人名称、纳税人识别号或统一社会信用代码',
    filters: () => ({}),
    autofocus: false,
    limit: 8,
  },
)

const emit = defineEmits<{
  (e: 'select', t: TaxpayerBrief): void
  /** 回车且未选中联想项时抛出,供页面执行完整检索 */
  (e: 'submit', keyword: string): void
  (e: 'update:modelValue', v: string): void
}>()

const keyword = ref(props.modelValue)
// 与父级双向同步:外部改值时回填输入框,内部输入时回抛
watch(
  () => props.modelValue,
  (v) => {
    if (v !== keyword.value) keyword.value = v
  },
)
watch(keyword, (v) => emit('update:modelValue', v))
const open = ref(false)
const loading = ref(false)
const items = ref<TaxpayerBrief[]>([])
const total = ref(0)
const activeIndex = ref(-1)
const root = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

/** 少于 2 个字不触发联想 */
const MIN_LEN = 2
const tooShort = computed(() => keyword.value.trim().length > 0 && keyword.value.trim().length < MIN_LEN)

let timer = 0
/** 防抖:输入停顿 220ms 后才发起查询 */
watch(keyword, () => {
  activeIndex.value = -1
  window.clearTimeout(timer)
  const kw = keyword.value.trim()
  if (kw.length < MIN_LEN) {
    items.value = []
    total.value = 0
    open.value = kw.length > 0
    return
  }
  timer = window.setTimeout(runSearch, 220)
})

async function runSearch() {
  const kw = keyword.value.trim()
  if (kw.length < MIN_LEN) return
  loading.value = true
  open.value = true
  try {
    const f = props.filters
    const res = await api.archive.searchTaxpayers({
      keyword: kw,
      industryCode: f.industryCode || 'all',
      regStatus: f.regStatus || 'all',
      authorityCode: f.authorityCode || 'all',
      riskLevel: f.riskLevel || 'all',
      qualification: f.qualification || 'all',
      page: 1,
      pageSize: props.limit,
    })
    items.value = res.items
    total.value = res.total
  } catch {
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function pick(t: TaxpayerBrief) {
  open.value = false
  keyword.value = ''
  items.value = []
  emit('select', t)
}

function onEnter() {
  if (activeIndex.value >= 0 && items.value[activeIndex.value]) {
    pick(items.value[activeIndex.value])
    return
  }
  emit('submit', keyword.value.trim())
}
function move(step: number) {
  if (!items.value.length) return
  open.value = true
  const n = items.value.length
  activeIndex.value = (activeIndex.value + step + n) % n
}

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

/** 供父组件调用:聚焦输入框(全局快捷键用) */
function focus() {
  if (inputEl.value) inputEl.value.focus()
}
defineExpose({ focus })

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onEsc)
  if (props.autofocus) focus()
})
onBeforeUnmount(() => {
  window.clearTimeout(timer)
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onEsc)
})
</script>

<template>
  <div ref="root" class="tps" :class="`tps--${size}`">
    <span class="tps__icon">⌕</span>
    <input
      ref="inputEl"
      v-model="keyword"
      class="tps__input"
      type="text"
      :placeholder="placeholder"
      @focus="open = keyword.trim().length > 0"
      @keydown.enter.prevent="onEnter"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
    />
    <span v-if="keyword" class="tps__clear" @click="keyword = ''">✕</span>

    <div v-if="open" class="drop">
      <div v-if="tooShort" class="drop__tip">请至少输入 2 个字符</div>
      <div v-else-if="loading" class="drop__tip">检索中…</div>
      <div v-else-if="!items.length" class="drop__tip">未匹配到纳税人,请调整关键词</div>
      <template v-else>
        <div
          v-for="(t, i) in items"
          :key="t.taxpayerId"
          class="opt"
          :class="{ 'opt--on': i === activeIndex }"
          @mouseenter="activeIndex = i"
          @click="pick(t)"
        >
          <div class="opt__line">
            <span class="opt__name">{{ t.name }}</span>
            <BaseBadge :tone="REG_STATUS_TONE[t.regStatus]" variant="dot">
              {{ REG_STATUS_LABEL[t.regStatus] }}
            </BaseBadge>
          </div>
          <div class="opt__meta num">{{ t.taxpayerId }} · {{ t.industry }} · {{ t.district }}</div>
        </div>
        <div v-if="total > items.length" class="drop__more num">共 {{ total }} 户匹配,已显示前 {{ items.length }} 户</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tps {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 0 10px;
}
.tps--page {
  height: 38px;
}
.tps--topbar {
  height: 30px;
  width: 260px;
}
.tps:focus-within {
  border-color: var(--color-primary);
}
.tps__icon {
  flex: none;
  color: var(--color-neutral-500);
}
.tps__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: var(--fs-aux);
  color: var(--color-text);
}
.tps--topbar .tps__input {
  font-size: var(--fs-label);
}
.tps__input::placeholder {
  color: var(--color-neutral-500);
}
.tps__clear {
  flex: none;
  cursor: pointer;
  color: var(--color-neutral-500);
  font-size: var(--fs-label);
}
.tps__clear:hover {
  color: var(--color-neutral-800);
}

/* 联想下拉 */
.drop {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 4px;
  z-index: 20;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-md);
  max-height: 320px;
  overflow: auto;
}
.drop__tip {
  padding: 10px 12px;
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.drop__more {
  padding: 6px 12px;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  border-top: 1px solid var(--color-neutral-200);
}
.opt {
  padding: 7px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-neutral-200);
}
.opt:last-of-type {
  border-bottom: none;
}
.opt--on {
  background: var(--color-primary-tint);
}
.opt__line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.opt__name {
  font-size: var(--fs-aux);
  color: var(--color-neutral-900);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.opt__meta {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-top: 1px;
}
</style>
