<script setup lang="ts">
/**
 * 决策分析 · 治税成效分析(《决策分析 handoff》1:1 复刻)
 * 闭环全流程(5 环节卡 + 转化/流失连接器,可选中下钻)+ 下钻明细(3 列迷你条)
 * + 分数据源增收贡献(横条)+ 规则引擎 vs 智能模型(3 tab 分组柱)
 * + 分局排行表(可排序 + 分页)。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { DashboardPeriod, DecisionQuery } from '@/api/types'
import { useResource } from '@/composables/useResource'
import { useTooltip, type TipRow } from '@/composables/useTooltip'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ChartTooltip from '@/components/charts/ChartTooltip.vue'
import { DECISION, FUNNEL_COLORS } from '@/charts/palette'

const period = ref<DashboardPeriod>('year')
const districtCode = ref('all')

const filters = useResource(() => api.decision.getDecisionFilters())
const query = computed<DecisionQuery>(() => ({ period: period.value, districtCode: districtCode.value }))
const data = useResource(() => api.decision.getEffectivenessAnalysis(query.value))
const ef = computed(() => data.data.value)

const { tip, showTip, hideTip } = useTooltip()

onMounted(async () => {
  await filters.load()
  if (filters.data.value) {
    period.value = filters.data.value.defaultPeriod
    districtCode.value = filters.data.value.defaultDistrictCode
  }
  data.load()
})

const fmt = (n: number) => n.toLocaleString('en-US')

/* ─────────── 闭环环节 ─────────── */
const stageIdx = ref(0)
/** 环节色带:自浅至深(复用漏斗 5 阶配色) */
const stageColor = (i: number) => FUNNEL_COLORS[i % FUNNEL_COLORS.length]

const stages = computed(() => {
  const d = ef.value
  if (!d) return []
  const max = d.stages.length ? d.stages[0].count : 1
  return d.stages.map((s, i) => ({
    ...s,
    idx: i,
    step: `0${i + 1}`,
    countFmt: fmt(s.count),
    color: stageColor(i),
    w: `${Math.max(8, Math.round((s.count / max) * 100))}%`,
    selected: stageIdx.value === i,
    rows: s.tips.map((t) => ({ k: t.key, v: t.value })) as TipRow[],
    tipTitle: `${s.name} · ${fmt(s.count)} ${s.unit}`,
  }))
})

const drill = computed(() => {
  const d = ef.value
  if (!d) return null
  const sel = d.drills[stageIdx.value]
  if (!sel) return null
  return {
    note: sel.note,
    title: d.stages[stageIdx.value].name,
    color: stageColor(stageIdx.value),
    columns: sel.columns.map((c) => {
      const max = c.rows.reduce((m, r) => (r.value > m ? r.value : m), 1)
      return {
        title: c.title,
        rows: c.rows.map((r) => ({ name: r.name, val: fmt(r.value), w: `${Math.round((r.value / max) * 100)}%` })),
      }
    }),
  }
})

/* ─────────── 数据源贡献 ─────────── */
const srcBars = computed(() => {
  const d = ef.value
  if (!d) return []
  const max = d.sources.reduce((m, s) => (s.value > m ? s.value : m), 1)
  return d.sources.map((s, i) => ({
    name: s.name,
    valFmt: fmt(s.value),
    w: `${Math.round((s.value / max) * 100)}%`,
    op: 1 - i * 0.09,
    rows: [
      { k: '入库税款', v: `${fmt(s.value)} 万元` },
      { k: '有效线索', v: `${fmt(s.clues)} 条` },
      { k: '查实率', v: `${s.rate}%` },
    ] as TipRow[],
  }))
})

/* ─────────── 规则 vs 模型 ─────────── */
const tabIdx = ref(0)
const compare = computed(() => {
  const d = ef.value
  if (!d) return null
  const t = d.compareTabs[tabIdx.value]
  if (!t) return null
  const max = Math.max(...t.rule, ...t.model) || 1
  const groups = t.categories.map((cat, i) => {
    const diff = Math.round((t.model[i] - t.rule[i]) * 10) / 10
    return {
      cat,
      h1: Math.round((t.rule[i] / max) * 180),
      h2: Math.round((t.model[i] / max) * 180),
      rows: [
        { k: '规则引擎', v: `${fmt(t.rule[i])} ${t.unit}` },
        { k: '智能模型', v: `${fmt(t.model[i])} ${t.unit}` },
        { k: '差值', v: `${diff > 0 ? '+' : ''}${diff} ${t.unit}` },
      ] as TipRow[],
      title: `${cat} · ${t.name}`,
    }
  })
  return { groups, summary: t.summary }
})

/* ─────────── 分局排行表 ─────────── */
const HEADS: Array<{ label: string; key: string | null; align: 'left' | 'right' | 'center' }> = [
  { label: '排名', key: null, align: 'center' },
  { label: '分局', key: 'name', align: 'left' },
  { label: '有效线索', key: 'clues', align: 'right' },
  { label: '已核查(户)', key: 'checked', align: 'right' },
  { label: '查实率', key: 'rate', align: 'right' },
  { label: '入库税款(万元)', key: 'tax', align: 'right' },
  { label: '户均耗时(天)', key: 'days', align: 'right' },
  { label: '环比', key: 'mom', align: 'right' },
]
const PAGE_SIZE = 6
const sortKey = ref('tax')
const sortDir = ref(-1)
const page = ref(0)

const heads = computed(() =>
  HEADS.map((h) => ({
    ...h,
    icon: h.key ? (sortKey.value === h.key ? (sortDir.value === 1 ? '▲' : '▼') : '⇅') : '',
    active: sortKey.value === h.key,
  })),
)
function sortBy(key: string | null) {
  if (!key) return
  if (sortKey.value === key) sortDir.value = -sortDir.value
  else {
    sortKey.value = key
    sortDir.value = key === 'name' ? 1 : -1
  }
  page.value = 0
}

const table = computed(() => {
  const d = ef.value
  if (!d) return { rows: [], pages: 0, page: 0, total: 0 }
  const rows = [...d.bureaus]
  // 排名固定按入库税款计(与排序无关)
  const taxRank = [...d.bureaus].sort((a, b) => b.tax - a.tax).map((r) => r.name)
  const key = sortKey.value
  const dir = sortDir.value
  rows.sort((a, b) => {
    if (key === 'name') return a.name.localeCompare(b.name, 'zh') * dir
    if (key === 'mom') return (parseFloat(a.mom) - parseFloat(b.mom)) * dir
    return ((a as unknown as Record<string, number>)[key] - (b as unknown as Record<string, number>)[key]) * dir
  })
  const pages = Math.ceil(rows.length / PAGE_SIZE)
  const cur = Math.min(page.value, pages - 1)
  return {
    total: rows.length,
    pages,
    page: cur,
    rows: rows.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE).map((r) => {
      const rank = taxRank.indexOf(r.name) + 1
      return {
        ...r,
        cluesFmt: fmt(r.clues),
        checkedFmt: fmt(r.checked),
        taxFmt: fmt(r.tax),
        rank,
        top: rank <= 3,
        momPos: r.mom.startsWith('+'),
      }
    }),
  }
})
function goPage(p: number) {
  page.value = Math.max(0, Math.min(table.value.pages - 1, p))
}
</script>

<template>
  <div class="eff">
    <PageHeader title="治税成效分析" breadcrumb="首页 / 决策分析 / 治税成效分析">
      <template #actions>
        <span class="eff__upd num">数据更新 2026-07-24 08:00</span>
        <BaseSelect
          v-model="period"
          :options="filters.data.value ? filters.data.value.periods : []"
          width="100px"
          @update:model-value="data.load()"
        />
        <BaseSelect
          v-model="districtCode"
          :options="filters.data.value ? filters.data.value.districts : []"
          width="120px"
          @update:model-value="data.load()"
        />
        <button type="button" class="btn btn--primary">⤓ 导出</button>
      </template>
    </PageHeader>

    <div class="eff__body">
      <StateBlock :status="data.status.value" :error="data.error.value" @retry="data.load()">
        <template v-if="ef && drill && compare">
          <!-- ── 闭环全流程 ── -->
          <section class="card">
            <div class="card__head card__head--gap">
              <h2 class="card__h2">治税闭环全流程</h2>
              <span class="card__sub">点击任一环节下钻明细,悬停查看提示</span>
              <span class="card__hl num">{{ ef.headline }}</span>
            </div>

            <div class="chain">
              <template v-for="s in stages" :key="s.name">
                <div
                  class="stage"
                  :class="{ 'stage--on': s.selected }"
                  @click="stageIdx = s.idx"
                  @mouseenter="showTip($event, s.tipTitle, s.rows)"
                  @mouseleave="hideTip"
                >
                  <div class="stage__band" :style="{ background: s.color }"></div>
                  <div class="stage__body">
                    <div class="stage__name">
                      {{ s.name }}
                      <span class="num stage__step" :style="{ color: s.selected ? s.color : undefined }">{{ s.step }}</span>
                    </div>
                    <div class="num stage__count">{{ s.countFmt }}<span class="stage__unit">{{ s.unit }}</span></div>
                    <div class="stage__meta"><span>{{ s.sub }}</span><span class="num">平均 {{ s.days }}</span></div>
                    <div class="stage__track"><div class="stage__fill" :style="{ width: s.w, background: s.color }"></div></div>
                  </div>
                </div>
                <div v-if="s.connector" class="conn">
                  <span class="num conn__rate">{{ s.connector.rate }}</span>
                  <span class="conn__arrow">⟶</span>
                  <span class="num conn__loss">流失 {{ s.connector.loss }}</span>
                  <span class="conn__note">{{ s.connector.note }}</span>
                </div>
              </template>
            </div>

            <div class="loop">
              <span class="loop__line"></span>
              <span>⟲ 成效数据回流 · 反哺规则优化与模型迭代</span>
              <span class="loop__line"></span>
            </div>

            <!-- 下钻明细 -->
            <div class="drill">
              <div class="drill__head">
                <span class="drill__bar" :style="{ background: drill.color }"></span>
                <span class="drill__title">{{ drill.title }} · 下钻明细</span>
                <span class="card__sub">{{ drill.note }}</span>
              </div>
              <div class="drill__cols">
                <div v-for="c in drill.columns" :key="c.title">
                  <div class="drill__col-title">{{ c.title }}</div>
                  <div class="drill__rows">
                    <div v-for="r in c.rows" :key="r.name" class="dr">
                      <span class="dr__name">{{ r.name }}</span>
                      <div class="dr__track"><div class="dr__fill" :style="{ width: r.w, background: drill.color }"></div></div>
                      <span class="num dr__val">{{ r.val }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ── 数据源贡献 + 规则/模型对比 ── -->
          <div class="row-1-125">
            <section class="card">
              <div class="card__head">
                <h2 class="card__h2">分数据源增收贡献</h2>
                <span class="card__sub">入库税款 · 万元</span>
              </div>
              <div class="src">
                <div
                  v-for="b in srcBars"
                  :key="b.name"
                  class="src__row"
                  @mouseenter="showTip($event, b.name, b.rows)"
                  @mouseleave="hideTip"
                >
                  <span class="src__name">{{ b.name }}</span>
                  <div class="src__track"><div class="src__fill" :style="{ width: b.w, opacity: b.op }"></div></div>
                  <span class="num src__val">{{ b.valFmt }}</span>
                </div>
              </div>
              <div class="src__foot">
                <span>{{ ef.sourceNote }}</span>
                <span class="num src__total">{{ ef.sourceTotal }}</span>
              </div>
            </section>

            <section class="card cmp">
              <div class="cmp__head">
                <h2 class="card__h2">规则引擎 vs 智能模型 成效对比</h2>
                <div class="seg">
                  <div
                    v-for="(t, i) in ef.compareTabs"
                    :key="t.name"
                    class="seg__item"
                    :class="{ 'seg__item--on': tabIdx === i }"
                    @click="tabIdx = i"
                  >
                    {{ t.name }}
                  </div>
                </div>
              </div>
              <div class="cmp__legend">
                <span class="lg"><span class="lg__dot lg__dot--rule"></span>{{ ef.ruleLegend }}</span>
                <span class="lg"><span class="lg__dot lg__dot--model"></span>{{ ef.modelLegend }}</span>
                <span class="cmp__summary">{{ compare.summary }}</span>
              </div>
              <div class="cmp__plot">
                <div
                  v-for="g in compare.groups"
                  :key="g.cat"
                  class="cmp__group"
                  @mouseenter="showTip($event, g.title, g.rows)"
                  @mouseleave="hideTip"
                >
                  <div class="cmp__bar cmp__bar--rule" :style="{ height: g.h1 + 'px' }"></div>
                  <div class="cmp__bar cmp__bar--model" :style="{ height: g.h2 + 'px' }"></div>
                </div>
              </div>
              <div class="cmp__labels">
                <div v-for="g in compare.groups" :key="g.cat" class="cmp__label">{{ g.cat }}</div>
              </div>
            </section>
          </div>

          <!-- ── 分局排行表 ── -->
          <section class="card">
            <div class="card__head">
              <h2 class="card__h2">分局治税成效排行</h2>
              <span class="card__sub">点击列头排序 · 点击行查看分局详情</span>
            </div>
            <table class="tbl">
              <thead>
                <tr>
                  <th
                    v-for="(h, i) in heads"
                    :key="i"
                    class="tbl__th"
                    :style="{ textAlign: h.align }"
                    @click="sortBy(h.key)"
                  >
                    {{ h.label }} <span v-if="h.icon" class="num tbl__icon" :class="{ 'tbl__icon--on': h.active }">{{ h.icon }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in table.rows" :key="r.name" class="tbl__row">
                  <td class="tbl__td tbl__td--c tbl__rank-cell">
                    <span class="tbl__rank num" :class="{ 'tbl__rank--top': r.top }">{{ r.rank }}</span>
                  </td>
                  <td class="tbl__td tbl__name">{{ r.name }}</td>
                  <td class="num tbl__td tbl__td--r">{{ r.cluesFmt }}</td>
                  <td class="num tbl__td tbl__td--r">{{ r.checkedFmt }}</td>
                  <td class="num tbl__td tbl__td--r tbl__td--b">{{ r.rate }}%</td>
                  <td class="num tbl__td tbl__td--r tbl__td--b">{{ r.taxFmt }}</td>
                  <td class="num tbl__td tbl__td--r">{{ r.days }}</td>
                  <td class="num tbl__td tbl__td--r tbl__td--b" :class="r.momPos ? 'val-pos' : 'val-neg'">{{ r.mom }}</td>
                </tr>
              </tbody>
            </table>
            <div class="pager">
              <span class="pager__total">共 {{ table.total }} 个分局</span>
              <div class="pager__ctrl">
                <button type="button" class="pg" @click="goPage(table.page - 1)">‹</button>
                <button
                  v-for="p in table.pages"
                  :key="p"
                  type="button"
                  class="pg num"
                  :class="{ 'pg--on': p - 1 === table.page }"
                  @click="goPage(p - 1)"
                >
                  {{ p }}
                </button>
                <button type="button" class="pg" @click="goPage(table.page + 1)">›</button>
              </div>
            </div>
          </section>
        </template>
      </StateBlock>
    </div>

    <ChartTooltip :tip="tip" />
  </div>
</template>

<style scoped>
.eff {
  /* 闭环环节数量大字 */
  --eff-stage: 30px;
  /* 表头排序指示器 */
  --eff-sort: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-body);
}
.eff__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.eff__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: 20px 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 18px 22px 16px;
}
.card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: 16px;
}
.card__head--gap {
  justify-content: flex-start;
  gap: 14px;
}
.card__h2 {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  margin: 0;
}
.card__sub {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.card__hl {
  margin-left: auto;
  font-size: var(--fs-aux);
  color: var(--color-status-normal-text);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
}

/* ── 闭环链条 ── */
.chain {
  display: flex;
  align-items: stretch;
}
.stage {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-control);
  padding: 0 0 12px;
  cursor: pointer;
  background: var(--color-panel);
  transition: border-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease;
}
.stage:hover {
  border-color: var(--color-primary);
}
.stage--on {
  border: 1.5px solid var(--color-primary);
  background: var(--color-row-hover);
  box-shadow: var(--shadow-selected);
}
.stage__band {
  height: 5px;
  border-radius: 2px 2px 0 0;
  margin-bottom: 12px;
}
.stage__body {
  padding: 0 16px;
}
.stage__name {
  font-size: var(--fs-aux);
  color: var(--color-text-sub);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stage__step {
  font-size: var(--fs-label);
  color: var(--color-neutral-400);
}
.stage__count {
  font-size: var(--eff-stage);
  font-weight: var(--fw-semibold);
  line-height: 1.3;
  letter-spacing: -0.01em;
}
.stage__unit {
  font-size: var(--fs-aux);
  font-weight: var(--fw-regular);
  color: var(--color-neutral-600);
  margin-left: 4px;
}
.stage__meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 4px;
}
.stage__track {
  height: 6px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  margin-top: 10px;
}
.stage__fill {
  height: 6px;
  border-radius: 1px;
}
.conn {
  width: 96px;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 6px;
}
.conn__rate {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-status-normal-text);
  background: var(--color-status-normal-tint);
  border-radius: var(--radius-control);
  padding: 1px 8px;
  white-space: nowrap;
}
.conn__arrow {
  color: var(--color-neutral-400);
  font-size: var(--fs-h3);
  line-height: 1;
}
.conn__loss {
  font-size: var(--fs-micro);
  color: var(--color-risk-high);
  white-space: nowrap;
}
.conn__note {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  white-space: nowrap;
}
.loop {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  color: var(--color-neutral-500);
  font-size: var(--fs-label);
}
.loop__line {
  flex: 1;
  border-top: 1.5px dashed var(--color-neutral-400);
}

/* ── 下钻 ── */
.drill {
  margin-top: 14px;
  border-top: 1px solid var(--color-neutral-200);
  padding-top: 14px;
}
.drill__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.drill__bar {
  width: 3px;
  height: 14px;
}
.drill__title {
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
}
.drill__cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}
.drill__col-title {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-bottom: 8px;
}
.drill__rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.dr {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--fs-aux);
  cursor: pointer;
}
.dr:hover {
  color: var(--color-primary);
}
.dr__name {
  width: 96px;
  flex: none;
  color: var(--color-neutral-700);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dr__track {
  flex: 1;
  height: 10px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.dr__fill {
  height: 10px;
  border-radius: 1px;
  opacity: 0.85;
}
.dr__val {
  width: 62px;
  text-align: right;
  flex: none;
  font-weight: var(--fw-semibold);
}

/* ── 栅格 ── */
.row-1-125 {
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 20px;
}

/* ── 数据源 ── */
.src {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.src__row {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: var(--radius-control);
}
.src__row:hover {
  background: var(--color-row-hover);
}
.src__name {
  width: 110px;
  flex: none;
  font-size: var(--fs-aux);
  color: var(--color-neutral-700);
  text-align: right;
  white-space: nowrap;
}
.src__track {
  flex: 1;
  height: 18px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.src__fill {
  height: 18px;
  background: var(--color-primary);
  border-radius: 1px;
}
.src__val {
  width: 58px;
  flex: none;
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  text-align: right;
}
.src__foot {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-neutral-200);
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  display: flex;
  justify-content: space-between;
}
.src__total {
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-900);
}

/* ── 规则 vs 模型 ── */
.cmp {
  display: flex;
  flex-direction: column;
}
.cmp__head {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: 14px;
}
.seg {
  margin-left: auto;
  display: inline-flex;
  border: var(--border-line);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.seg__item {
  padding: 6px 16px;
  font-size: var(--fs-aux);
  cursor: pointer;
  background: var(--color-panel);
  color: var(--color-text-sub);
  border-left: 1px solid var(--color-neutral-300);
}
.seg__item:first-child {
  border-left: none;
}
.seg__item:hover {
  color: var(--color-primary);
}
.seg__item--on,
.seg__item--on:hover {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}
.cmp__legend {
  display: flex;
  gap: 18px;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-bottom: 8px;
  align-items: center;
}
.lg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lg__dot {
  width: 11px;
  height: 11px;
  border-radius: 1px;
}
.lg__dot--rule {
  background: var(--color-primary);
}
.lg__dot--model {
  background: var(--color-surface-accent);
}
.cmp__summary {
  margin-left: auto;
  color: var(--color-status-normal-text);
  font-weight: var(--fw-semibold);
}
.cmp__plot {
  flex: 1;
  display: flex;
  align-items: flex-end;
  height: 200px;
  border-bottom: 1px solid var(--color-neutral-300);
  padding: 0 8px;
}
.cmp__group {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  height: 100%;
  cursor: pointer;
  padding: 0 10px;
}
.cmp__group:hover {
  background: var(--color-row-hover);
}
.cmp__bar {
  width: 30px;
  border-radius: 1px 1px 0 0;
}
.cmp__bar--rule {
  background: var(--color-primary);
}
.cmp__bar--model {
  background: var(--color-surface-accent);
}
.cmp__labels {
  display: flex;
  padding: 6px 8px 0;
}
.cmp__label {
  flex: 1;
  text-align: center;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}

/* ── 排行表 ── */
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-aux);
}
.tbl__th {
  padding: 9px 12px;
  background: var(--color-neutral-100);
  border-bottom: 1px solid var(--color-neutral-300);
  color: var(--color-text-sub);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}
.tbl__th:hover {
  color: var(--color-primary);
}
.tbl__icon {
  font-size: var(--eff-sort);
  color: var(--color-neutral-400);
}
.tbl__icon--on {
  color: var(--color-primary);
}
.tbl__row {
  cursor: pointer;
  border-bottom: 1px solid var(--color-neutral-200);
}
.tbl__row:hover {
  background: var(--color-row-hover);
}
.tbl__td {
  padding: 9px 12px;
}
.tbl__td--r {
  text-align: right;
}
.tbl__td--c {
  text-align: center;
}
.tbl__td--b {
  font-weight: var(--fw-semibold);
}
.tbl__rank-cell {
  width: 52px;
}
.tbl__rank {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  font-weight: var(--fw-semibold);
  background: var(--color-neutral-200);
  color: var(--color-text-sub);
}
.tbl__rank--top {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}
.tbl__name {
  font-weight: var(--fw-semibold);
  color: var(--color-primary);
}
.val-pos {
  color: var(--color-status-normal-text);
}
.val-neg {
  color: var(--color-risk-high);
}

/* ── 分页 ── */
.pager {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 14px;
  font-size: var(--fs-aux);
}
.pager__total {
  color: var(--color-neutral-600);
}
.pager__ctrl {
  margin-left: auto;
  display: flex;
  gap: 6px;
  align-items: center;
}
.pg {
  height: 28px;
  min-width: 28px;
  border: var(--border-line);
  background: var(--color-panel);
  border-radius: var(--radius-control);
  cursor: pointer;
  color: var(--color-text-sub);
  font-family: inherit;
  font-size: var(--fs-aux);
}
.pg:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.pg--on,
.pg--on:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
}
</style>
