<script setup lang="ts">
/**
 * 智能应用 · 资料智能处理(《需求文档》5.4)
 * 无设计稿;形态是**左右对照的抽取工作台**,不是对话框:
 *   人在这里做的事是「核对」,核对的前提是能一眼看到某个值从原件哪儿抠出来的,
 *   所以左原件、右字段,靠坐标双向联动,而不是把结果念一遍给你听。
 * 三栏:材料队列 → 原件预览(带高亮框) → 结构化字段表单;底部是税目判定建议。
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { DocMaterialRow, DocProcessQuery, ExtractField } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import Toast from '@/components/common/Toast.vue'
import DocPreview from '@/components/docs/DocPreview.vue'
import { DOC_STATUS_LABEL, DOC_STATUS_TONE, toneClass } from '@/components/common/tone'

const route = useRoute()
const router = useRouter()

/* ---------------- 队列筛选(与 URL query 同步) ---------------- */
const status = ref('all')
const keyword = ref('')
const openId = ref('')

function readQuery() {
  const q = route.query
  status.value = typeof q.status === 'string' ? q.status : 'all'
  keyword.value = typeof q.keyword === 'string' ? q.keyword : ''
  openId.value = typeof q.id === 'string' ? q.id : ''
}
function writeQuery() {
  const q: Record<string, string> = {}
  if (status.value !== 'all') q.status = status.value
  if (keyword.value) q.keyword = keyword.value
  if (openId.value) q.id = openId.value
  router.replace({ query: q })
}

const query = computed<DocProcessQuery>(() => ({ keyword: keyword.value, status: status.value }))

const filters = useResource(() => api.app.getDocProcessFilters())
const materials = useResource(() => api.app.getDocMaterials(query.value), { isEmpty: (d) => d.length === 0 })
const detail = useResource(() => api.app.getDocMaterialDetail(openId.value))

const ft = computed(() => filters.data.value)
const list = computed(() => materials.data.value || [])
const dt = computed(() => detail.data.value)

onMounted(async () => {
  readQuery()
  filters.load()
  await materials.load()
  // 默认打开第一份已出结果的材料,让工作台一进来就有内容可核对
  if (!openId.value) {
    const first = list.value.filter((m) => m.status === 'done' || m.status === 'review')[0]
    if (first) openId.value = first.id
  }
  if (openId.value) detail.load()
  writeQuery()
})

async function reload() {
  writeQuery()
  await materials.load()
  // 当前打开的材料被筛掉时,顺延到列表首项
  if (openId.value && !list.value.some((m) => m.id === openId.value)) {
    openId.value = list.value.length ? list.value[0].id : ''
    if (openId.value) detail.load()
  }
  writeQuery()
}
function filterStatus(v: string) {
  status.value = status.value === v ? 'all' : v
  reload()
}
function search() {
  reload()
}

/* ---------------- 打开材料 ---------------- */
function openMaterial(m: DocMaterialRow) {
  if (m.status === 'pending' || m.status === 'processing') {
    toast(m.status === 'pending' ? '该材料尚未开始识别' : '该材料正在识别中,完成后可查看抽取结果')
    return
  }
  if (openId.value === m.id) return
  openId.value = m.id
  activeKey.value = ''
  confirmed.value = []
  writeQuery()
  detail.load()
}

/* ---------------- 双向联动 ---------------- */
const activeKey = ref('')
/** 已人工确认的低置信字段 */
const confirmed = ref<string[]>([])
const fieldEls = ref<Record<string, HTMLElement | null>>({})

/** 扁平字段列表(供预览高亮与统计使用) */
const allFields = computed<ExtractField[]>(() =>
  dt.value ? dt.value.groups.reduce((s, g) => s.concat(g.fields), [] as ExtractField[]) : [],
)
const lowConfFields = computed(() => allFields.value.filter((f) => f.needConfirm))
const pendingConfirm = computed(() => lowConfFields.value.filter((f) => confirmed.value.indexOf(f.key) < 0).length)

/** 点原件高亮框 → 右侧表单定位 */
async function selectFromDoc(key: string) {
  activeKey.value = key
  await nextTick()
  const el = fieldEls.value[key]
  if (el) el.scrollIntoView({ block: 'nearest' })
}
/** 点右侧字段 → 左侧高亮(DocPreview 内部据 activeKey 自行高亮) */
function selectField(key: string) {
  activeKey.value = activeKey.value === key ? '' : key
}
function setFieldEl(key: string, el: unknown) {
  fieldEls.value[key] = (el as HTMLElement) || null
}

function confirmField(key: string) {
  if (confirmed.value.indexOf(key) < 0) confirmed.value.push(key)
}
function confirmAll() {
  lowConfFields.value.forEach((f) => confirmField(f.key))
  toast(`已确认 ${lowConfFields.value.length} 个低置信字段`)
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}

/* ---------------- 展示辅助 ---------------- */
const TYPE_LABEL: Record<string, string> = { contract: '合同', invoice: '发票' }
function confTone(f: ExtractField) {
  if (confirmed.value.indexOf(f.key) >= 0) return 'success'
  return f.needConfirm ? 'warn' : 'success'
}
function confText(f: ExtractField) {
  return `${(f.confidence * 100).toFixed(0)}%`
}
</script>

<template>
  <div class="dp">
    <PageHeader title="资料智能处理" breadcrumb="首页 / 智能应用 / 资料智能处理">
      <template #actions>
        <span v-if="dt" class="dp__engine">{{ dt.engine }}</span>
        <button type="button" class="btn" @click="toast('演示环境:批量重跑需连接识别任务队列')">批量重跑</button>
        <button type="button" class="btn btn--primary" @click="toast('演示环境:归档入库需连接一户式档案服务')">
          确认并归档
        </button>
      </template>
    </PageHeader>

    <!-- ══════════ 批量队列条 ══════════ -->
    <div class="q">
      <span class="q__title">批量队列</span>
      <span
        v-for="s in ft ? ft.statuses : []"
        :key="s.value"
        class="q__chip"
        :class="[toneClass(DOC_STATUS_TONE[s.value as 'pending']), { 'q__chip--on': status === s.value }]"
        @click="filterStatus(s.value)"
      >
        <i class="q__dot"></i>{{ s.label }}<b class="num">{{ s.count }}</b>
      </span>
      <span v-if="status !== 'all'" class="q__clear" @click="filterStatus(status)">清除过滤 ✕</span>
      <div class="q__right">
        <BaseInput v-model="keyword" placeholder="材料名称 / 纳税人" width="200px" @enter="search" />
        <button type="button" class="btn" @click="search">查询</button>
        <span v-if="ft" class="q__upd num">更新 {{ ft.updatedAt }}</span>
      </div>
    </div>

    <div class="dp__body">
      <!-- ══════════ 左:材料队列 ══════════ -->
      <aside class="tray">
        <div class="tray__head">
          待核对材料
          <span class="num">{{ list.length }}</span>
        </div>
        <StateBlock
          v-if="materials.status.value !== 'ready'"
          :status="materials.status.value"
          :error="materials.error.value"
          empty-text="队列中没有材料"
          empty-hint="可清除状态过滤"
          @retry="materials.load()"
        />
        <div v-else class="tray__list">
          <div
            v-for="m in list"
            :key="m.id"
            class="mat"
            :class="{ 'mat--on': m.id === openId, 'mat--idle': m.status === 'pending' || m.status === 'processing' }"
            @click="openMaterial(m)"
          >
            <div class="mat__top">
              <span class="mat__type">{{ TYPE_LABEL[m.type] }}</span>
              <BaseBadge :tone="DOC_STATUS_TONE[m.status]" variant="dot">{{ DOC_STATUS_LABEL[m.status] }}</BaseBadge>
            </div>
            <div class="mat__name">{{ m.name }}</div>
            <div class="mat__meta num">
              {{ m.uploadedAt }}
              <template v-if="m.fieldCount">
                · 抽取 {{ m.fieldCount }} 项
                <span v-if="m.lowConfCount" class="mat__low">{{ m.lowConfCount }} 项待确认</span>
              </template>
            </div>
          </div>
        </div>
      </aside>

      <!-- ══════════ 中:原件预览 ══════════ -->
      <section class="doc">
        <div class="doc__head">
          <span class="doc__title">{{ dt ? dt.name : '原始材料' }}</span>
          <span v-if="dt" class="doc__sub">{{ TYPE_LABEL[dt.type] }} · 演示环境以版式还原代替扫描件影像</span>
          <span class="doc__hint">点击高亮框可定位到右侧字段</span>
        </div>
        <StateBlock
          v-if="!openId"
          status="empty"
          empty-text="请从左侧队列选择一份材料"
          empty-hint="待处理 / 处理中的材料尚无抽取结果"
        />
        <StateBlock v-else :status="detail.status.value" :error="detail.error.value" @retry="detail.load()">
          <DocPreview
            v-if="dt"
            :layout="dt.layout"
            :fields="allFields"
            :active-key="activeKey"
            :confirmed-keys="confirmed"
            @select="selectFromDoc"
          />
        </StateBlock>
      </section>

      <!-- ══════════ 右:结构化字段 ══════════ -->
      <aside class="fields">
        <div class="fields__head">
          <span class="fields__title">抽取结果</span>
          <span v-if="dt" class="fields__stat num">{{ allFields.length }} 项</span>
          <span v-if="pendingConfirm" class="fields__warn num">{{ pendingConfirm }} 项待确认</span>
          <button v-if="pendingConfirm" type="button" class="btn fields__btn" @click="confirmAll">全部确认</button>
        </div>

        <StateBlock v-if="!openId" status="empty" empty-text="尚未选择材料" />
        <StateBlock v-else :status="detail.status.value" :error="detail.error.value" @retry="detail.load()">
          <div v-if="dt" class="fields__body">
            <div class="fields__thr num">置信度阈值 {{ (dt.threshold * 100).toFixed(0) }}%,低于阈值标黄并需人工确认</div>

            <section v-for="g in dt.groups" :key="g.title" class="grp">
              <div class="grp__title">{{ g.title }}</div>
              <div
                v-for="f in g.fields"
                :key="f.key"
                :ref="(el) => setFieldEl(f.key, el)"
                class="fd"
                :class="[
                  toneClass(confTone(f)),
                  {
                    'fd--on': activeKey === f.key,
                    'fd--warn': f.needConfirm && confirmed.indexOf(f.key) < 0,
                    'fd--ok': confirmed.indexOf(f.key) >= 0,
                  },
                ]"
                @click="selectField(f.key)"
              >
                <div class="fd__top">
                  <span class="fd__label">{{ f.label }}</span>
                  <span class="fd__conf num">{{ confText(f) }}</span>
                </div>
                <div class="fd__value">{{ f.value }}</div>
                <div class="fd__bar"><div class="fd__fill" :style="{ width: `${f.confidence * 100}%` }"></div></div>
                <div class="fd__src">来源:{{ f.source }}</div>
                <div v-if="f.needConfirm" class="fd__act">
                  <span v-if="confirmed.indexOf(f.key) >= 0" class="fd__done">✓ 已人工确认</span>
                  <button v-else type="button" class="btn fd__btn" @click.stop="confirmField(f.key)">确认无误</button>
                </div>
              </div>
            </section>
          </div>
        </StateBlock>
      </aside>
    </div>

    <!-- ══════════ 底部:税目判定建议 ══════════ -->
    <div v-if="dt" class="advice">
      <div class="advice__head">
        <span class="advice__title">应税行为与适用税目判定建议</span>
        <span class="advice__ai">AI 建议</span>
        <span class="advice__note">仅供参考,须由主管人员核实后适用;涉税定性以法定程序结论为准</span>
      </div>
      <div class="advice__list">
        <div v-for="(a, i) in dt.taxAdvice" :key="i" class="adv">
          <div class="adv__top">
            <span class="adv__behavior">{{ a.behavior }}</span>
            <span class="adv__conf num">{{ (a.confidence * 100).toFixed(0) }}%</span>
          </div>
          <div class="adv__tax">
            <span class="adv__tag">{{ a.taxType }}</span>
            <span class="adv__item">{{ a.taxItem }}</span>
            <span class="adv__rate num">{{ a.rate }}</span>
          </div>
          <div class="adv__basis">{{ a.basis }}</div>
        </div>
      </div>
    </div>

    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.dp {
  /* 页面级令牌:三栏宽度 */
  --dp-tray: 232px;
  --dp-fields: 344px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.dp__engine {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}

/* ---------- 队列条 ---------- */
.q {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: var(--color-panel);
  border-bottom: var(--border-line);
}
.q__title {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-700);
}
.q__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 3px 10px;
  cursor: pointer;
  white-space: nowrap;
}
.q__chip:hover {
  border-color: var(--color-primary);
}
.q__chip--on {
  background: var(--tone-tint);
  border-color: var(--tone-main);
  color: var(--tone-text);
  font-weight: var(--fw-semibold);
}
.q__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tone-main);
}
.q__chip b {
  font-weight: var(--fw-semibold);
}
.q__clear {
  font-size: var(--fs-label);
  color: var(--color-primary);
  cursor: pointer;
}
.q__right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.q__right .btn {
  height: 32px;
}
.q__upd {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  white-space: nowrap;
}

/* ---------- 三栏工作台 ---------- */
.dp__body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) 20px;
}

/* 左:材料队列 */
.tray {
  width: var(--dp-tray);
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.tray__head {
  flex: none;
  height: 38px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  border-bottom: var(--border-line);
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-700);
}
.tray__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-2);
}
.mat {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 8px 10px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease;
}
.mat:hover {
  background: var(--color-row-hover);
}
.mat--on {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}
.mat--idle {
  opacity: 0.66;
}
.mat__top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.mat__type {
  font-size: var(--fs-micro);
  color: var(--color-primary);
  background: var(--color-panel);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-control);
  padding: 0 5px;
}
.mat__name {
  font-size: var(--fs-label);
  font-weight: var(--fw-medium);
  color: var(--color-neutral-900);
  margin-top: 3px;
  line-height: 1.45;
}
.mat__meta {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-top: 2px;
  line-height: 1.5;
}
.mat__low {
  color: var(--color-risk-mid-text);
  margin-left: 4px;
}

/* 中:原件 */
.doc {
  flex: 1;
  min-width: 0;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.doc__head {
  flex: none;
  height: 38px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  border-bottom: var(--border-line);
}
.doc__title {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.doc__sub {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.doc__hint {
  margin-left: auto;
  flex: none;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}

/* 右:字段表单 */
.fields {
  width: var(--dp-fields);
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.fields__head {
  flex: none;
  height: 38px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  border-bottom: var(--border-line);
}
.fields__title {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-700);
}
.fields__stat {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.fields__warn {
  font-size: var(--fs-micro);
  color: var(--color-risk-mid-text);
  background: var(--color-risk-mid-tint);
  border-radius: var(--radius-control);
  padding: 1px 6px;
}
.fields__btn {
  margin-left: auto;
  height: 26px;
  padding: 0 10px;
}
.fields__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-2) var(--space-3) var(--space-3);
}
.fields__thr {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  padding: 4px 0 8px;
  line-height: 1.5;
}
.grp {
  margin-bottom: var(--space-3);
}
.grp__title {
  font-size: var(--fs-micro);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-600);
  border-left: 2px solid var(--color-primary);
  padding-left: 6px;
  margin-bottom: 6px;
}
.fd {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 7px 10px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: border-color var(--motion-fast) ease, background var(--motion-fast) ease;
}
.fd:hover {
  background: var(--color-row-hover);
}
.fd--on {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
  box-shadow: var(--shadow-selected);
}
.fd--warn {
  border-color: var(--color-risk-mid);
  background: var(--color-risk-mid-tint);
}
.fd--ok {
  border-color: var(--color-status-normal);
}
.fd__top {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.fd__label {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  flex: 1;
  min-width: 0;
}
.fd__conf {
  font-size: var(--fs-micro);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.fd__value {
  font-size: var(--fs-aux);
  color: var(--color-neutral-900);
  line-height: 1.5;
  margin-top: 1px;
  word-break: break-all;
}
.fd__bar {
  height: 3px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  margin: 5px 0 4px;
}
.fd__fill {
  height: 3px;
  border-radius: 1px;
  background: var(--tone-main);
}
.fd__src {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  line-height: 1.5;
}
.fd__act {
  margin-top: 6px;
}
.fd__btn {
  height: 24px;
  padding: 0 10px;
  font-size: var(--fs-micro);
}
.fd__done {
  font-size: var(--fs-micro);
  color: var(--color-status-normal-text);
  font-weight: var(--fw-semibold);
}

/* ---------- 底部:税目判定建议 ---------- */
.advice {
  flex: none;
  background: var(--color-panel);
  border-top: var(--border-line);
  padding: 10px 20px var(--space-3);
}
.advice__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.advice__title {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-800);
}
.advice__ai {
  font-size: var(--fs-micro);
  color: var(--color-text-inverse);
  background: var(--color-secondary-teal);
  border-radius: var(--radius-control);
  padding: 1px 6px;
}
.advice__note {
  font-size: var(--fs-micro);
  color: var(--color-risk-high-text);
}
.advice__list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
.adv {
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--color-secondary-teal);
  border-radius: var(--radius-control);
  padding: 7px 12px;
}
.adv__top {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.adv__behavior {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-800);
  flex: 1;
  min-width: 0;
}
.adv__conf {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.adv__tax {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 3px 0 2px;
}
.adv__tag {
  font-size: var(--fs-micro);
  color: var(--color-primary);
  background: var(--color-primary-tint);
  border-radius: var(--radius-control);
  padding: 0 6px;
}
.adv__item {
  font-size: var(--fs-micro);
  color: var(--color-neutral-700);
}
.adv__rate {
  font-size: var(--fs-micro);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-800);
}
.adv__basis {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  line-height: 1.5;
}
</style>
