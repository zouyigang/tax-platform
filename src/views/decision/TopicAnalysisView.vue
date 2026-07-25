<script setup lang="ts">
/**
 * 决策分析 · 专题分析(《决策分析 handoff》1:1 复刻)
 * 专题 tab(房地产/建筑安装/平台经济)切换替换整个内容区:
 *   房地产 —— 六环节税收链条(点击展开税种明细 + 风险提示)+ 重点房企项目监控表
 *   建筑安装 —— 合规象限散点(风险区底纹)+ 专题概览 + 风险项目清单
 *   平台经济 —— 平台卡(可选中)+ 商户销售额分布双柱 + 未申报商户 TOP
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
import { DECISION } from '@/charts/palette'
import { toneClass, RISK_LABEL, RISK_TONE } from '@/components/common/tone'

const period = ref<DashboardPeriod>('year')
const districtCode = ref('all')

const filters = useResource(() => api.decision.getDecisionFilters())
const query = computed<DecisionQuery>(() => ({ period: period.value, districtCode: districtCode.value }))
const data = useResource(() => api.decision.getTopicAnalysis(query.value))
const ta = computed(() => data.data.value)

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

/** 当前专题 tab */
const topicIdx = ref(0)
function switchTopic(i: number) {
  topicIdx.value = i
  hideTip()
}

/* ─────────── 房地产:环节选中与明细 ─────────── */
const reIdx = ref(2)
const reStage = computed(() => (ta.value ? ta.value.realEstate.stages[reIdx.value] : null))
const reTaxRows = computed(() => {
  const s = reStage.value
  if (!s) return []
  return s.taxRows.map((t) => {
    const gap = t.paid - t.due
    return {
      name: t.name,
      due: fmt(t.due),
      paid: fmt(t.paid),
      gap: `${gap >= 0 ? '+' : ''}${fmt(gap)}`,
      gapPos: gap >= 0,
    }
  })
})

/* ─────────── 建筑安装:象限散点 ─────────── */
const construction = computed(() => {
  const d = ta.value
  if (!d) return null
  const c = d.construction
  const cx = (inv: number) => 52 + (inv / 100) * 658
  const cy = (pre: number) => 300 - (pre / 3) * 290
  const isRisky = (p: { invoiceProgress: number; prepayRate: number }) =>
    p.invoiceProgress > c.riskInvoiceOver && p.prepayRate < c.riskPrepayUnder
  const points = c.projects.map((p) => ({
    x: Math.round(cx(p.invoiceProgress)),
    y: Math.round(cy(p.prepayRate)),
    r: Math.round(7 + Math.sqrt(p.amount) * 5),
    risky: isRisky(p),
    title: p.name,
    rows: [
      { k: '施工企业', v: p.corp },
      { k: '合同金额', v: `${p.amount} 亿元` },
      { k: '开票进度', v: `${p.invoiceProgress}%` },
      { k: '预缴率', v: `${p.prepayRate}%` },
    ] as TipRow[],
  }))
  const xTicks = [0, 25, 50, 75, 100].map((v) => ({ x: Math.round(cx(v)), label: `${v}%` }))
  const yTicks = [0, 1, 2, 3].map((v) => ({ y: Math.round(cy(v)) + 4, label: `${v}%` }))
  const risky = c.projects.filter(isRisky).map((p) => ({
    ...p,
    amt: p.amount.toFixed(1),
    // 预估欠缴 = 合同额 × 开票进度 × (2% - 实际预缴率)
    gap: fmt(Math.round(((p.amount * 10000 * p.invoiceProgress) / 100) * ((2 - p.prepayRate) / 100))),
  }))
  return { points, xTicks, yTicks, risky }
})

/* ─────────── 平台经济 ─────────── */
const platIdx = ref(0)
const platform = computed(() => {
  const d = ta.value
  if (!d) return null
  const sel = d.platform.platforms[platIdx.value]
  if (!sel) return null
  const max = sel.bins.reduce((m, b) => (b.reported > m ? b.reported : m), 1)
  return {
    sel,
    bins: sel.bins.map((b) => ({
      label: b.label,
      h1: Math.round((b.reported / max) * 190),
      h2: Math.round((b.declared / max) * 190),
      rows: [
        { k: '平台报送', v: `${fmt(b.reported)} 户` },
        { k: '已申报', v: `${fmt(b.declared)} 户` },
        { k: '申报缺口', v: `${fmt(b.reported - b.declared)} 户` },
      ] as TipRow[],
      title: `${b.label} · 商户申报`,
    })),
  }
})
/** 申报率取色:≥75% 绿 / ≥60% 橙 / 其余红 */
function rateTone(rate: number) {
  return rate >= 75 ? 'success' : rate >= 60 ? 'gold' : 'danger'
}
</script>

<template>
  <div class="topic">
    <PageHeader title="专题分析" breadcrumb="首页 / 决策分析 / 专题分析">
      <template #actions>
        <span class="topic__upd num">数据更新 2026-07-24 08:00</span>
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

    <!-- ── 专题 tab 条 ── -->
    <div v-if="ta" class="tabbar">
      <div
        v-for="(t, i) in ta.tabs"
        :key="t.key"
        class="tabbar__item"
        :class="{ 'tabbar__item--on': topicIdx === i }"
        @click="switchTopic(i)"
      >
        {{ t.name }}<span class="num tabbar__risk">{{ t.risk }}</span>
      </div>
      <span class="tabbar__note">{{ ta.scopeNote }}</span>
    </div>

    <div class="topic__body">
      <StateBlock :status="data.status.value" :error="data.error.value" @retry="data.load()">
        <template v-if="ta && reStage && construction && platform">
          <!-- ════ 房地产 ════ -->
          <template v-if="topicIdx === 0">
            <section class="card">
              <div class="card__head card__head--gap">
                <h2 class="card__h2">房地产全环节税收链条</h2>
                <span class="card__sub">点击环节节点展开税种明细与风险提示</span>
                <span class="card__hl num">{{ ta.realEstate.headline }}</span>
              </div>

              <div class="chain">
                <template v-for="(n, i) in ta.realEstate.stages" :key="n.name">
                  <div class="node" :class="{ 'node--on': reIdx === i }" @click="reIdx = i">
                    <span v-if="n.riskCount" class="num node__badge">{{ n.riskCount }}</span>
                    <div class="node__head">
                      <span class="node__name">{{ n.name }}</span>
                      <span class="node__chev">{{ reIdx === i ? '▾ 已展开' : '▸' }}</span>
                    </div>
                    <div class="num node__amt">{{ n.amount }}<span class="node__unit">亿元</span></div>
                    <div class="node__taxes">
                      <span v-for="tx in n.taxes" :key="tx" class="chip">{{ tx }}</span>
                    </div>
                  </div>
                  <div v-if="i < ta.realEstate.stages.length - 1" class="arrow">→</div>
                </template>
              </div>

              <div class="detail">
                <div>
                  <div class="detail__head">
                    <span class="detail__bar detail__bar--blue"></span>
                    <span class="detail__title">{{ reStage.name }} · 税种明细</span>
                  </div>
                  <table class="tbl">
                    <thead>
                      <tr>
                        <th class="tbl__th">税种</th>
                        <th class="tbl__th tbl__th--r">应征(万元)</th>
                        <th class="tbl__th tbl__th--r">已入库(万元)</th>
                        <th class="tbl__th tbl__th--r">差异</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="r in reTaxRows" :key="r.name" class="tbl__row">
                        <td class="tbl__td tbl__link">{{ r.name }}</td>
                        <td class="num tbl__td tbl__td--r">{{ r.due }}</td>
                        <td class="num tbl__td tbl__td--r">{{ r.paid }}</td>
                        <td class="num tbl__td tbl__td--r tbl__td--b" :class="r.gapPos ? 'val-pos' : 'val-neg'">{{ r.gap }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div class="detail__head">
                    <span class="detail__bar detail__bar--red"></span>
                    <span class="detail__title">风险提示({{ reStage.riskCount }} 项)</span>
                  </div>
                  <div class="risks">
                    <div v-for="(r, i) in reStage.risks" :key="i" class="risk">
                      <span class="risk__lv" :class="toneClass(RISK_TONE[r.level])">{{ RISK_LABEL[r.level].charAt(0) }}</span>
                      <div class="risk__main">
                        <div class="risk__title">{{ r.title }}</div>
                        <div class="risk__note">{{ r.note }}</div>
                      </div>
                      <span class="num risk__n">{{ r.count }} 户</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="card">
              <div class="card__head">
                <h2 class="card__h2">重点房企项目监控</h2>
                <span class="card__sub">按清算风险排序 · 行可点击查看一户式档案</span>
              </div>
              <table class="tbl">
                <thead>
                  <tr>
                    <th class="tbl__th">项目名称</th>
                    <th class="tbl__th">开发企业</th>
                    <th class="tbl__th">当前环节</th>
                    <th class="tbl__th tbl__th--r">累计网签(亿)</th>
                    <th class="tbl__th tbl__th--r">土增清算进度</th>
                    <th class="tbl__th tbl__th--r">累计纳税(万元)</th>
                    <th class="tbl__th tbl__th--c">清算风险</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in ta.realEstate.projects" :key="p.name" class="tbl__row">
                    <td class="tbl__td tbl__link">{{ p.name }}</td>
                    <td class="tbl__td">{{ p.developer }}</td>
                    <td class="tbl__td">{{ p.stage }}</td>
                    <td class="num tbl__td tbl__td--r">{{ p.sale }}</td>
                    <td class="tbl__td tbl__td--r">
                      <div class="prog">
                        <div class="prog__track"><div class="prog__fill" :style="{ width: p.progress + '%' }"></div></div>
                        <span class="num prog__pct">{{ p.progress }}%</span>
                      </div>
                    </td>
                    <td class="num tbl__td tbl__td--r tbl__td--b">{{ p.tax }}</td>
                    <td class="tbl__td tbl__td--c">
                      <span class="tag" :class="toneClass(RISK_TONE[p.risk])">{{ RISK_LABEL[p.risk].charAt(0) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </template>

          <!-- ════ 建筑安装 ════ -->
          <template v-else-if="topicIdx === 1">
            <div class="row-16-1">
              <section class="card">
                <div class="card__head card__head--gap">
                  <h2 class="card__h2">在建项目合规象限 · 预缴率 × 开票进度</h2>
                  <span class="card__sub">气泡:合同金额 · 右下阴影为风险区(开票快、预缴低)</span>
                </div>
                <svg viewBox="0 0 760 340" class="svg">
                  <rect x="404" y="150" width="306" height="150" :fill="DECISION.wfNeg" fill-opacity="0.06" />
                  <text x="700" y="292" text-anchor="end" font-size="11" :fill="DECISION.wfNeg">风险区</text>
                  <line x1="52" y1="10" x2="52" y2="300" :stroke="DECISION.axisLine" stroke-width="1" />
                  <line x1="52" y1="300" x2="710" y2="300" :stroke="DECISION.axisLine" stroke-width="1" />
                  <line x1="404" y1="10" x2="404" y2="300" :stroke="DECISION.meanLine" stroke-width="1" stroke-dasharray="4 3" />
                  <line x1="52" y1="150" x2="710" y2="150" :stroke="DECISION.meanLine" stroke-width="1" stroke-dasharray="4 3" />
                  <text v-for="(t, i) in construction.xTicks" :key="`cx${i}`" :x="t.x" y="316" text-anchor="middle" font-size="11" :fill="DECISION.axis" class="num">{{ t.label }}</text>
                  <text v-for="(t, i) in construction.yTicks" :key="`cy${i}`" x="46" :y="t.y" text-anchor="end" font-size="11" :fill="DECISION.axis" class="num">{{ t.label }}</text>
                  <text x="710" y="334" text-anchor="end" font-size="11" :fill="DECISION.axisText">开票进度 →</text>
                  <text x="20" y="20" font-size="11" :fill="DECISION.axisText">预缴率 ↑</text>
                  <circle
                    v-for="(p, i) in construction.points"
                    :key="`cp${i}`"
                    :cx="p.x" :cy="p.y" :r="p.r"
                    :fill="p.risky ? DECISION.wfNeg : DECISION.actual" fill-opacity="0.4"
                    :stroke="p.risky ? DECISION.wfNeg : DECISION.actual" stroke-width="1.5"
                    style="cursor: pointer"
                    @mouseenter="showTip($event, p.title, p.rows)"
                    @mouseleave="hideTip"
                  />
                </svg>
              </section>
              <section class="card overview">
                <h2 class="card__h2">专题概览</h2>
                <div v-for="k in ta.construction.stats" :key="k.label" class="ov">
                  <span class="ov__label">{{ k.label }}</span>
                  <span>
                    <span class="num ov__value" :class="toneClass(k.tone)">{{ k.value }}</span>
                    <span class="ov__unit">{{ k.unit }}</span>
                  </span>
                </div>
                <div class="ov__note">{{ ta.construction.note }}</div>
              </section>
            </div>

            <section class="card">
              <div class="card__head">
                <h2 class="card__h2">风险项目清单</h2>
                <span class="card__sub">仅显示落入风险区的项目 · 行可点击发起核查</span>
              </div>
              <table class="tbl">
                <thead>
                  <tr>
                    <th class="tbl__th">项目名称</th>
                    <th class="tbl__th">施工企业</th>
                    <th class="tbl__th">属地</th>
                    <th class="tbl__th tbl__th--r">合同金额(亿)</th>
                    <th class="tbl__th tbl__th--r">开票进度</th>
                    <th class="tbl__th tbl__th--r">预缴率</th>
                    <th class="tbl__th tbl__th--r">预估欠缴(万元)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in construction.risky" :key="r.name" class="tbl__row">
                    <td class="tbl__td tbl__link">{{ r.name }}</td>
                    <td class="tbl__td">{{ r.corp }}</td>
                    <td class="tbl__td">{{ r.district }}</td>
                    <td class="num tbl__td tbl__td--r">{{ r.amt }}</td>
                    <td class="num tbl__td tbl__td--r">{{ r.invoiceProgress }}%</td>
                    <td class="num tbl__td tbl__td--r tbl__td--b val-neg">{{ r.prepayRate }}%</td>
                    <td class="num tbl__td tbl__td--r tbl__td--b val-neg">{{ r.gap }}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </template>

          <!-- ════ 平台经济 ════ -->
          <template v-else>
            <section class="card">
              <div class="card__head card__head--gap">
                <h2 class="card__h2">重点平台监测 · 涉税数据报送与商户申报</h2>
                <span class="card__sub">点击平台卡片查看商户申报分布</span>
                <span class="card__hl num">{{ ta.platform.headline }}</span>
              </div>
              <div class="plat-grid">
                <div
                  v-for="(p, i) in ta.platform.platforms"
                  :key="p.name"
                  class="plat"
                  :class="{ 'plat--on': platIdx === i }"
                  @click="platIdx = i"
                >
                  <div class="plat__head">
                    <span class="plat__name">{{ p.name }}</span>
                    <span class="chip">{{ p.type }}</span>
                  </div>
                  <div class="plat__nums">
                    <div>
                      <div class="plat__k">入驻商户</div>
                      <div class="num plat__v">{{ fmt(p.merchants) }}</div>
                    </div>
                    <div>
                      <div class="plat__k">风险商户</div>
                      <div class="num plat__v plat__v--risk">{{ fmt(p.riskCount) }}</div>
                    </div>
                  </div>
                  <div class="plat__rate">
                    <div class="plat__rate-row">
                      <span>商户申报率</span>
                      <span class="num plat__rate-val" :class="toneClass(rateTone(p.rate))">{{ p.rate }}%</span>
                    </div>
                    <div class="plat__track">
                      <div class="plat__fill" :class="toneClass(rateTone(p.rate))" :style="{ width: p.rate + '%' }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div class="row-115-1">
              <section class="card">
                <div class="card__head">
                  <h2 class="card__h2">{{ platform.sel.name }} · 商户年销售额分布与申报缺口</h2>
                  <span class="card__sub">灰:平台报送商户数 蓝:已申报商户数</span>
                </div>
                <div class="hist">
                  <div
                    v-for="b in platform.bins"
                    :key="b.label"
                    class="hist__group"
                    @mouseenter="showTip($event, b.title, b.rows)"
                    @mouseleave="hideTip"
                  >
                    <div class="hist__bar hist__bar--reported" :style="{ height: b.h1 + 'px' }"></div>
                    <div class="hist__bar hist__bar--declared" :style="{ height: b.h2 + 'px' }"></div>
                  </div>
                </div>
                <div class="hist__labels">
                  <div v-for="b in platform.bins" :key="b.label" class="hist__label">{{ b.label }}</div>
                </div>
                <div class="note">
                  申报缺口集中在年销售额 10–50 万区间;达到起征点未申报商户
                  <b class="num val-neg">{{ fmt(platform.sel.gapCount) }}</b> 户,预估税款
                  <b class="num val-neg">{{ fmt(platform.sel.gapTax) }}</b> 万元
                </div>
              </section>

              <section class="card">
                <div class="card__head">
                  <h2 class="card__h2">未申报商户 TOP</h2>
                  <span class="card__sub">按平台报送销售额排序</span>
                </div>
                <div class="mlist">
                  <div v-for="(m, i) in ta.platform.topMerchants" :key="m.name" class="mrow">
                    <span class="num mrow__rank">{{ i + 1 }}</span>
                    <div class="mrow__main">
                      <div class="mrow__name">{{ m.name }}</div>
                      <div class="mrow__cat">{{ m.category }}</div>
                    </div>
                    <span class="num mrow__sale">{{ m.sale }} 万</span>
                    <span class="tag" :class="toneClass(RISK_TONE[m.level])">{{ RISK_LABEL[m.level].charAt(0) }}</span>
                  </div>
                </div>
                <div class="mlist__foot">
                  <RouterLink to="/risk-pool" class="mlist__link">转入风险线索工作台 ›</RouterLink>
                </div>
              </section>
            </div>
          </template>
        </template>
      </StateBlock>
    </div>

    <ChartTooltip :tip="tip" />
  </div>
</template>

<style scoped>
.topic {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-body);
}
.topic__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.topic__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: 20px 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── 专题 tab 条 ── */
.tabbar {
  flex: none;
  background: var(--color-panel);
  border-bottom: var(--border-line);
  padding: 0 24px;
  display: flex;
  gap: 4px;
}
.tabbar__item {
  padding: 13px 22px 11px;
  font-size: 15px;
  cursor: pointer;
  color: var(--color-text-sub);
  font-weight: var(--fw-regular);
  border-bottom: 3px solid transparent;
  transition: color var(--motion-fast) ease;
}
.tabbar__item:hover {
  color: var(--color-primary);
}
.tabbar__item--on,
.tabbar__item--on:hover {
  color: var(--color-primary);
  font-weight: var(--fw-semibold);
  border-bottom-color: var(--color-primary);
}
.tabbar__risk {
  font-size: var(--fs-label);
  color: var(--color-risk-high);
  margin-left: 6px;
  font-weight: var(--fw-regular);
}
.tabbar__note {
  margin-left: auto;
  align-self: center;
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}

/* ── 卡片通用 ── */
.card {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 18px 22px;
}
.card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: 14px;
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
  color: var(--color-neutral-900);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
}
.svg {
  width: 100%;
  display: block;
}
.note {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 8px;
}
.chip {
  font-size: var(--fs-micro);
  color: var(--color-primary-deep);
  background: var(--color-primary-tint);
  border-radius: var(--radius-control);
  padding: 0 6px;
  white-space: nowrap;
}
.tag {
  font-size: var(--fs-label);
  color: var(--color-text-inverse);
  background: var(--tone-main);
  border-radius: var(--radius-control);
  padding: 1px 8px;
}

/* ── 房地产链条 ── */
.chain {
  display: flex;
  align-items: stretch;
}
.node {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--color-neutral-300);
  background: var(--color-panel);
  border-radius: var(--radius-control);
  padding: 12px 14px;
  cursor: pointer;
  position: relative;
  transition: border-color var(--motion-fast) ease;
}
.node:hover {
  border-color: var(--color-primary);
}
.node--on {
  border: 1.5px solid var(--color-primary);
  background: var(--color-row-hover);
}
.node__badge {
  position: absolute;
  top: -9px;
  right: -7px;
  background: var(--color-risk-high);
  color: var(--color-text-inverse);
  font-size: var(--fs-micro);
  border-radius: 9px;
  padding: 0 7px;
  border: 2px solid var(--color-panel);
}
.node__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.node__name {
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
}
.node__chev {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.node__amt {
  font-size: 22px;
  font-weight: var(--fw-semibold);
  color: var(--color-primary);
  line-height: 1.5;
}
.node__unit {
  font-size: var(--fs-label);
  font-weight: var(--fw-regular);
  color: var(--color-neutral-600);
  margin-left: 3px;
}
.node__taxes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.arrow {
  width: 34px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-400);
  font-size: 18px;
}

.detail {
  margin-top: 16px;
  border-top: 1px solid var(--color-neutral-200);
  padding-top: 14px;
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 28px;
}
.detail__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: 10px;
}
.detail__bar {
  width: 3px;
  height: 14px;
}
.detail__bar--blue {
  background: var(--color-primary);
}
.detail__bar--red {
  background: var(--color-risk-high);
}
.detail__title {
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
}
.risks {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.risk {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 8px 12px;
  cursor: pointer;
  transition: border-color var(--motion-fast) ease, background var(--motion-fast) ease;
}
.risk:hover {
  border-color: var(--color-primary);
  background: var(--color-row-hover);
}
.risk__lv {
  font-size: var(--fs-micro);
  color: var(--color-text-inverse);
  background: var(--tone-main);
  border-radius: var(--radius-control);
  padding: 0 6px;
  flex: none;
  margin-top: 3px;
}
.risk__main {
  min-width: 0;
}
.risk__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.risk__note {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.risk__n {
  margin-left: auto;
  flex: none;
  font-size: var(--fs-label);
  color: var(--color-risk-high);
  font-weight: var(--fw-semibold);
}

/* ── 建筑安装 ── */
.row-16-1 {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
}
.overview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ov {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-neutral-200);
  padding-bottom: 10px;
}
.ov__label {
  font-size: var(--fs-aux);
  color: var(--color-text-sub);
}
.ov__value {
  font-size: 22px;
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.ov__unit {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  margin-left: 4px;
}
.ov__note {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  background: var(--color-neutral-100);
  border-radius: var(--radius-control);
  padding: 8px 10px;
  margin-top: auto;
}

/* ── 平台经济 ── */
.plat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.plat {
  border: 1px solid var(--color-neutral-300);
  background: var(--color-panel);
  border-radius: var(--radius-control);
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color var(--motion-fast) ease;
}
.plat:hover {
  border-color: var(--color-primary);
}
.plat--on {
  border: 1.5px solid var(--color-primary);
  background: var(--color-row-hover);
}
.plat__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.plat__name {
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.plat__nums {
  display: flex;
  gap: 18px;
  margin-top: 8px;
}
.plat__k {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.plat__v {
  font-size: 18px;
  font-weight: var(--fw-semibold);
}
.plat__v--risk {
  color: var(--color-risk-high);
}
.plat__rate {
  margin-top: 10px;
}
.plat__rate-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  margin-bottom: 3px;
}
.plat__rate-val {
  font-weight: var(--fw-semibold);
  color: var(--tone-main);
}
.plat__track {
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.plat__fill {
  height: 8px;
  background: var(--tone-main);
  border-radius: 1px;
}

.row-115-1 {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 20px;
}
.hist {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  height: 210px;
  border-bottom: 1px solid var(--color-neutral-300);
  padding: 0 8px;
}
.hist__group {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 5px;
  height: 100%;
  cursor: pointer;
  padding: 0 6px;
}
.hist__group:hover {
  background: var(--color-row-hover);
}
.hist__bar {
  width: 26px;
  border-radius: 1px 1px 0 0;
}
.hist__bar--reported {
  background: var(--color-neutral-400);
}
.hist__bar--declared {
  background: var(--color-primary);
}
.hist__labels {
  display: flex;
  padding: 6px 8px 0;
}
.hist__label {
  flex: 1;
  text-align: center;
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
}

.mlist {
  display: flex;
  flex-direction: column;
}
.mrow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 6px;
  border-bottom: 1px solid var(--color-neutral-200);
  cursor: pointer;
  font-size: var(--fs-aux);
}
.mrow:hover {
  background: var(--color-row-hover);
}
.mrow__rank {
  width: 18px;
  color: var(--color-neutral-500);
  font-weight: var(--fw-semibold);
}
.mrow__main {
  flex: 1;
  min-width: 0;
}
.mrow__name {
  font-weight: var(--fw-semibold);
  color: var(--color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mrow__cat {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.mrow__sale {
  font-weight: var(--fw-semibold);
}
.mlist__foot {
  margin-top: 12px;
  text-align: right;
}
.mlist__link {
  font-size: var(--fs-aux);
  color: var(--color-primary);
  text-decoration: none;
}
.mlist__link:hover {
  text-decoration: underline;
}

/* ── 表格通用 ── */
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-aux);
}
.tbl__th {
  text-align: left;
  padding: 9px 12px;
  background: var(--color-neutral-100);
  border-bottom: 1px solid var(--color-neutral-300);
  color: var(--color-text-sub);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
}
.tbl__th--r {
  text-align: right;
}
.tbl__th--c {
  text-align: center;
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
.tbl__link {
  font-weight: var(--fw-semibold);
  color: var(--color-primary);
}
.prog {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.prog__track {
  width: 80px;
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.prog__fill {
  height: 8px;
  background: var(--color-primary);
  border-radius: 1px;
}
.prog__pct {
  width: 40px;
  text-align: right;
}
.val-pos {
  color: var(--color-status-normal-text);
}
.val-neg {
  color: var(--color-risk-high);
}
</style>
