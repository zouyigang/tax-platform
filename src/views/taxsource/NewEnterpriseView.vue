<script setup lang="ts">
/**
 * 税源监控 · 新办企业评估(《需求文档》6.3)
 * 无设计稿;分类驱动页,与同模块另两页刻意区分:
 *   重点税源监控 = 盯人的清单(表格 + 详情态);
 *   收入预测分析 = 看数的图表(主图占首屏);
 *   本页 = 筛户的分类 —— 先用四象限定性,再按成立日期以「时间流」逐户看。
 * 列表不用 DataTable:时间流要的是日期轴上的先后关系,不是可排序的行列。
 * 点击行就地展开评估详情(手风琴),不跳页也不开抽屉,保持时间流的连续感。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { NewEntQuadrant, NewEntQuery, NewEntRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import Pagination from '@/components/common/Pagination.vue'
import Toast from '@/components/common/Toast.vue'
import QuadrantScatter from '@/components/charts/QuadrantScatter.vue'

const route = useRoute()
const router = useRouter()

/* ---------------- 筛选(与 URL query 同步) ---------------- */
const keyword = ref('')
const quadrant = ref('all')
const industryCode = ref('all')
const page = ref(1)
const pageSize = ref(10)
/** 就地展开的企业(手风琴,同时只展开一户) */
const openId = ref('')

function readQuery() {
  const q = route.query
  keyword.value = typeof q.keyword === 'string' ? q.keyword : ''
  quadrant.value = typeof q.quadrant === 'string' ? q.quadrant : 'all'
  industryCode.value = typeof q.industry === 'string' ? q.industry : 'all'
  page.value = typeof q.page === 'string' ? Math.max(1, parseInt(q.page, 10) || 1) : 1
  openId.value = typeof q.taxId === 'string' ? q.taxId : ''
}
function writeQuery() {
  const q: Record<string, string> = {}
  if (keyword.value) q.keyword = keyword.value
  if (quadrant.value !== 'all') q.quadrant = quadrant.value
  if (industryCode.value !== 'all') q.industry = industryCode.value
  if (page.value > 1) q.page = String(page.value)
  if (openId.value) q.taxId = openId.value
  router.replace({ query: q })
}

const query = computed<NewEntQuery>(() => ({
  keyword: keyword.value,
  quadrant: quadrant.value,
  industryCode: industryCode.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const filters = useResource(() => api.taxsource.getNewEntFilters())
const scatter = useResource(() => api.taxsource.getNewEntScatter())
const list = useResource(() => api.taxsource.getNewEnts(query.value), { isEmpty: (d) => d.items.length === 0 })
const detail = useResource(() => api.taxsource.getNewEntDetail(openId.value))

const ft = computed(() => filters.data.value)
const dt = computed(() => detail.data.value)

onMounted(() => {
  readQuery()
  filters.load()
  scatter.load()
  list.load()
  if (openId.value) detail.load()
})

function reload() {
  writeQuery()
  list.load()
}
function search() {
  page.value = 1
  reload()
}
function reset() {
  keyword.value = ''
  quadrant.value = 'all'
  industryCode.value = 'all'
  page.value = 1
  reload()
}
/** 点击象限过滤;再点同一象限取消 */
function selectQuadrant(q: NewEntQuadrant) {
  quadrant.value = quadrant.value === q ? 'all' : q
  page.value = 1
  reload()
}
function onPageChange(p: number) {
  page.value = p
  openId.value = ''
  reload()
}
function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  reload()
}

/** 展开 / 收起评估详情 */
function toggleRow(row: NewEntRow) {
  if (openId.value === row.taxId) {
    openId.value = ''
    writeQuery()
    return
  }
  openId.value = row.taxId
  writeQuery()
  detail.load()
}
/** 图上点气泡:若该户在当前页则直接展开,否则提示 */
function selectPoint(taxId: string) {
  const hit = rows.value.filter((r) => r.taxId === taxId)[0]
  if (hit) {
    openId.value = taxId
    writeQuery()
    detail.load()
  } else {
    toast('该企业不在当前页,可清除筛选或翻页后查看')
  }
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}

/* ---------------- 时间流分组 ---------------- */
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))

/** 按成立日期聚合成时间流分组(接口已按日期倒序返回) */
const groups = computed(() => {
  const out: Array<{ date: string; items: NewEntRow[] }> = []
  rows.value.forEach((r) => {
    const last = out[out.length - 1]
    if (last && last.date === r.registerDate) last.items.push(r)
    else out.push({ date: r.registerDate, items: [r] })
  })
  return out
})

/* ---------------- 展示辅助 ---------------- */
const Q_LABEL: Record<NewEntQuadrant, string> = {
  cultivate: '重点培育',
  watch: '观察',
  normal: '正常',
  shell: '疑似空壳',
}
/** 象限 → 语气(疑似空壳危险、观察警示、培育成功、正常中性) */
const Q_TONE: Record<NewEntQuadrant, string> = {
  cultivate: 'success',
  watch: 'warn',
  normal: 'neutral',
  shell: 'danger',
}
const activeQuadrantLabel = computed(() =>
  quadrant.value === 'all' ? '' : Q_LABEL[quadrant.value as NewEntQuadrant],
)
const money = (n: number) => n.toLocaleString('en-US')
/** 日期 → 「今年以来第几天」不必要,这里只取月日做时间轴主标 */
function dateMain(d: string) {
  return d.slice(5)
}
function dateYear(d: string) {
  return d.slice(0, 4)
}
</script>

<template>
  <div class="ne">
    <PageHeader title="新办企业评估" breadcrumb="首页 / 税源监控 / 新办企业评估">
      <template #actions>
        <span v-if="ft" class="ne__upd num">评估批次 {{ ft.updatedAt }}</span>
        <button type="button" class="btn" @click="toast('演示环境:名单导出功能待接入')">导出名单</button>
        <button type="button" class="btn btn--primary" @click="toast('演示环境:开业辅导任务需连接征管系统')">
          派发开业辅导
        </button>
      </template>
    </PageHeader>

    <div class="ne__body">
      <!-- ══════════ 四象限散点 ══════════ -->
      <PanelCard
        title="空壳风险 × 税源潜力 四象限"
        :subtitle="ft ? ft.method : ''"
        class="ne__chart"
      >
        <template #actions>
          <span
            v-for="q in ft ? ft.quadrants : []"
            :key="q.key"
            class="qchip"
            :class="[`tone-${Q_TONE[q.key]}`, { 'qchip--on': quadrant === q.key }]"
            @click="selectQuadrant(q.key)"
          >
            <i class="qchip__dot"></i>{{ q.label }}
            <b class="num">{{ q.count }}</b>
          </span>
        </template>

        <StateBlock :status="scatter.status.value" :error="scatter.error.value" @retry="scatter.load()">
          <QuadrantScatter
            v-if="scatter.data.value && ft"
            :points="scatter.data.value"
            :threshold="ft.threshold"
            :active-quadrant="quadrant"
            :selected-id="openId"
            @select-quadrant="selectQuadrant"
            @select-point="selectPoint"
          />
        </StateBlock>
      </PanelCard>

      <!-- ══════════ 时间流列表 ══════════ -->
      <PanelCard title="新办企业时间流" :subtitle="`按成立日期倒序 · 共 ${total} 户`" class="ne__list">
        <template #actions>
          <BaseInput v-model="keyword" placeholder="企业名称 / 识别号" width="180px" @enter="search" />
          <BaseSelect
            v-model="industryCode"
            :options="ft ? ft.industries : []"
            width="130px"
            @update:model-value="search"
          />
          <button type="button" class="btn btn--primary" @click="search">查询</button>
          <button type="button" class="btn" @click="reset">重置</button>
        </template>

        <div v-if="activeQuadrantLabel" class="ne__filter">
          已按象限「{{ activeQuadrantLabel }}」过滤
          <i @click="selectQuadrant(quadrant as NewEntQuadrant)">✕</i>
        </div>

        <StateBlock
          v-if="list.status.value !== 'ready'"
          :status="list.status.value"
          :error="list.error.value"
          empty-text="未查询到符合条件的新办企业"
          empty-hint="可清除象限过滤或放宽筛选条件"
          @retry="list.load()"
        />
        <div v-else class="tl">
          <div v-for="g in groups" :key="g.date" class="tl__group">
            <div class="tl__date">
              <span class="tl__day num">{{ dateMain(g.date) }}</span>
              <span class="tl__year num">{{ dateYear(g.date) }}</span>
              <span class="tl__cnt num">{{ g.items.length }} 户</span>
            </div>

            <div class="tl__items">
              <div v-for="r in g.items" :key="r.taxId" class="tl__entry">
                <span class="tl__dot" :class="`tone-${Q_TONE[r.quadrant]}`"></span>
                <div class="row" :class="{ 'row--on': openId === r.taxId }" @click="toggleRow(r)">
                  <div class="row__main">
                    <span class="row__name">{{ r.name }}</span>
                    <span class="row__meta">{{ r.industry }} · {{ r.district }}</span>
                  </div>
                  <div class="row__cap num">
                    <i>注册资本</i>{{ money(r.capital) }} 万
                  </div>
                  <div class="row__score">
                    <span class="row__sk">空壳风险</span>
                    <div class="row__track"><div class="row__fill tone-danger" :style="{ width: r.shellRisk + '%' }"></div></div>
                    <span class="row__sv num">{{ r.shellRisk.toFixed(0) }}</span>
                  </div>
                  <div class="row__score">
                    <span class="row__sk">税源潜力</span>
                    <div class="row__track"><div class="row__fill tone-success" :style="{ width: r.potential + '%' }"></div></div>
                    <span class="row__sv num">{{ r.potential.toFixed(0) }}</span>
                  </div>
                  <span class="row__q" :class="`tone-${Q_TONE[r.quadrant]}`">{{ Q_LABEL[r.quadrant] }}</span>
                  <span class="row__arrow">{{ openId === r.taxId ? '▲' : '▼' }}</span>
                </div>

                <!-- 就地展开的评估详情 -->
                <div v-if="openId === r.taxId" class="det">
                  <StateBlock :status="detail.status.value" :error="detail.error.value" @retry="detail.load()">
                    <div v-if="dt" class="det__grid">
                      <!-- 空壳特征逐项核对 -->
                      <section class="det__col">
                        <div class="det__title">
                          空壳特征核对
                          <span class="det__hit" :class="dt.hitCount >= 3 ? 'tone-danger' : dt.hitCount ? 'tone-warn' : 'tone-success'">
                            命中 {{ dt.hitCount }}/{{ dt.shellFeatures.length }}
                          </span>
                        </div>
                        <div v-for="f in dt.shellFeatures" :key="f.key" class="sf" :class="{ 'sf--hit': f.hit }">
                          <span class="sf__mark">{{ f.hit ? '✕' : '✓' }}</span>
                          <div class="sf__body">
                            <div class="sf__name">{{ f.name }}</div>
                            <div class="sf__detail">{{ f.detail }}</div>
                          </div>
                        </div>
                      </section>

                      <!-- 潜力评估维度 + 结论 -->
                      <section class="det__col">
                        <div class="det__title">潜力评估维度</div>
                        <div v-for="p in dt.potentialDims" :key="p.name" class="pd">
                          <div class="pd__top">
                            <span class="pd__name">{{ p.name }}</span>
                            <span class="pd__score num">{{ p.score }}</span>
                          </div>
                          <div class="pd__track"><div class="pd__fill" :style="{ width: p.score + '%' }"></div></div>
                          <div class="pd__note">{{ p.note }}</div>
                        </div>

                        <div class="det__concl">
                          <p class="det__c1">{{ dt.conclusion }}</p>
                          <p class="det__c2">{{ dt.suggestion }}</p>
                        </div>
                      </section>

                      <!-- 登记档案摘要 -->
                      <section class="det__col det__col--profile">
                        <div class="det__title">登记档案摘要</div>
                        <div v-for="p in dt.profile" :key="p.key" class="pf">
                          <span class="pf__k">{{ p.key }}</span>
                          <span class="pf__v" :class="{ num: p.numeric }">{{ p.value }}</span>
                        </div>
                      </section>
                    </div>
                  </StateBlock>
                </div>
              </div>
            </div>
          </div>

          <Pagination
            :total="total"
            :page="page"
            :page-size="pageSize"
            :page-size-options="[10, 20, 50]"
            @update:page="onPageChange"
            @update:page-size="onPageSizeChange"
          />
        </div>
      </PanelCard>
    </div>

    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.ne {
  /* 页面级令牌:时间流左侧日期轨宽度 */
  --ne-rail: 88px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.ne__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.ne__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
/* 滚动容器的直接子项一律不收缩,避免面板被压扁 */
.ne__body > * {
  flex: none;
}
.ne__chart {
  height: 470px;
}
.ne__chart :deep(.panel-card__body) {
  overflow: hidden;
}

/* 象限图例芯片:兼作过滤入口 */
.qchip {
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
.qchip:hover {
  border-color: var(--color-primary);
}
.qchip--on {
  background: var(--tone-tint);
  border-color: var(--tone-main);
  color: var(--tone-text);
  font-weight: var(--fw-semibold);
}
.qchip__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tone-main);
}
.qchip b {
  font-weight: var(--fw-semibold);
}

/* ---------- 时间流 ---------- */
.ne__filter {
  flex: none;
  align-self: flex-start;
  font-size: var(--fs-label);
  color: var(--color-primary);
  background: var(--color-primary-tint);
  border-radius: var(--radius-control);
  padding: 2px 10px;
  margin-bottom: var(--space-2);
}
.ne__filter i {
  font-style: normal;
  cursor: pointer;
  margin-left: var(--space-1);
}

.tl {
  display: flex;
  flex-direction: column;
}
.tl__group {
  display: flex;
  align-items: flex-start;
}
/* 左侧日期轨:同一日期的多户共用一个日期标 */
.tl__date {
  width: var(--ne-rail);
  flex: none;
  padding: 10px var(--space-3) 0 0;
  text-align: right;
  border-right: 2px solid var(--color-neutral-200);
}
.tl__day {
  display: block;
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-800);
}
.tl__year {
  display: block;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.tl__cnt {
  display: inline-block;
  margin-top: 3px;
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
}
.tl__items {
  flex: 1;
  min-width: 0;
  padding: 0 0 var(--space-3) 0;
}
.tl__entry {
  position: relative;
  padding-left: 18px;
}
/* 轨道上的节点 */
.tl__dot {
  position: absolute;
  left: -6px;
  top: 22px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--tone-main);
  border: 2px solid var(--color-panel);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 10px var(--space-3);
  margin-top: 10px;
  cursor: pointer;
  transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease;
}
.row:hover {
  background: var(--color-row-hover);
}
.row--on {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}
.row__main {
  flex: 1;
  min-width: 0;
}
.row__name {
  display: block;
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row__meta {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
}
.row__cap {
  width: 118px;
  flex: none;
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
  text-align: right;
}
.row__cap i {
  font-style: normal;
  display: block;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.row__score {
  width: 148px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
.row__sk {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  flex: none;
}
.row__track {
  flex: 1;
  height: 6px;
  min-width: 0;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.row__fill {
  height: 6px;
  border-radius: 1px;
  background: var(--tone-main);
}
.row__sv {
  width: 22px;
  flex: none;
  text-align: right;
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-800);
}
.row__q {
  width: 74px;
  flex: none;
  text-align: center;
  font-size: var(--fs-micro);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
  background: var(--tone-tint);
  border: 1px solid var(--tone-main);
  border-radius: var(--radius-control);
  padding: 1px 0;
}
.row__arrow {
  flex: none;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}

/* ---------- 就地展开的评估详情 ---------- */
.det {
  border: 1px solid var(--color-primary);
  border-top: none;
  border-radius: 0 0 var(--radius-control) var(--radius-control);
  background: var(--color-neutral-100);
  padding: var(--space-3) var(--space-4);
}
.det__grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr 0.9fr;
  gap: var(--space-4);
}
.det__col {
  min-width: 0;
}
.det__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-700);
  margin-bottom: var(--space-2);
}
.det__hit {
  font-size: var(--fs-micro);
  color: var(--tone-text);
  background: var(--tone-tint);
  border-radius: var(--radius-control);
  padding: 0 6px;
}

/* 空壳特征:命中项标红 */
.sf {
  display: flex;
  gap: var(--space-2);
  background: var(--color-panel);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 7px 10px;
  margin-bottom: 6px;
}
.sf--hit {
  border-color: var(--color-risk-high);
  background: var(--color-risk-high-tint);
}
.sf__mark {
  flex: none;
  width: 16px;
  text-align: center;
  font-weight: var(--fw-semibold);
  color: var(--color-status-normal);
}
.sf--hit .sf__mark {
  color: var(--color-risk-high);
}
.sf__name {
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
}
.sf--hit .sf__name {
  color: var(--color-risk-high-text);
  font-weight: var(--fw-semibold);
}
.sf__detail {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  line-height: 1.55;
  margin-top: 1px;
}

/* 潜力维度 */
.pd {
  margin-bottom: 9px;
}
.pd__top {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.pd__name {
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
  flex: 1;
  min-width: 0;
}
.pd__score {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-status-normal-text);
}
.pd__track {
  height: 6px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  margin: 3px 0 2px;
}
.pd__fill {
  height: 6px;
  border-radius: 1px;
  background: var(--color-status-normal);
}
.pd__note {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  line-height: 1.5;
}
.det__concl {
  margin-top: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-neutral-300);
}
.det__c1 {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
  line-height: 1.65;
}
.det__c2 {
  margin: 4px 0 0;
  font-size: var(--fs-micro);
  color: var(--color-primary-deep);
  line-height: 1.6;
}

/* 登记档案 */
.det__col--profile {
  border-left: 1px solid var(--color-neutral-300);
  padding-left: var(--space-4);
}
.pf {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--fs-micro);
  padding: 3px 0;
  border-bottom: 1px solid var(--color-neutral-200);
}
.pf__k {
  width: 72px;
  flex: none;
  color: var(--color-neutral-600);
}
.pf__v {
  color: var(--color-neutral-800);
  min-width: 0;
  line-height: 1.5;
}
</style>
