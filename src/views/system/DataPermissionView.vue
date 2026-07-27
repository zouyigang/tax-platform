<script setup lang="ts">
/**
 * 系统管理 · 数据权限配置(《需求文档》10.1)
 * 数据权限不是一个开关,而是三层叠加,页面据此分三段:
 *   ① 组织维度 —— 能看哪些机构(树形勾选 + 仅本级 / 本级及下级)
 *   ② 行级规则 —— 机构内能看哪些户(条件配置器 + 实时试算可访问户数)
 *   ③ 字段级脱敏 —— 每户能看到哪些字段(隐藏 / 掩码 / 明文,明文须填理由并留痕)
 * 三层缺一不可:只控机构会越权看到同级全部纳税人,只控行级又挡不住敏感字段外泄。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import type {
  FieldMaskRow,
  MaskLevel,
  OrgNode,
  OrgScopeMode,
  RowRuleCondition,
  RowRuleField,
} from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseCheckbox from '@/components/common/BaseCheckbox.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'

/* ---------------- 主体选择 ---------------- */
const subjectId = ref('role-source-manager')
const subjects = useResource(() => api.system.getPermSubjects())
const config = useResource(() => api.system.getDataPermConfig(subjectId.value))
const cfg = computed(() => config.data.value)

const subjectOptions = computed(() =>
  (subjects.data.value || []).map((s) => ({
    value: s.id,
    label: `${s.type === 'role' ? '角色' : '用户'} · ${s.name}`,
  })),
)
const currentSubject = computed(() => (subjects.data.value || []).filter((s) => s.id === subjectId.value)[0])

/* ---------------- 本地可编辑副本 ---------------- */
const orgSelected = ref<string[]>([])
const orgMode = ref<OrgScopeMode>('selfAndBelow')
const rules = ref<RowRuleCondition[]>([])
const fields = ref<FieldMaskRow[]>([])
const dirty = ref(false)

function syncFromConfig() {
  const c = cfg.value
  if (!c) return
  orgSelected.value = c.orgSelected.slice()
  orgMode.value = c.orgMode
  rules.value = c.rowRules.map((r) => ({ ...r, values: r.values.slice() }))
  fields.value = c.fields.map((f) => ({ ...f }))
  dirty.value = false
  estimate()
}

onMounted(async () => {
  subjects.load()
  await config.load()
  syncFromConfig()
})

async function changeSubject() {
  await config.load()
  syncFromConfig()
}

function markDirty() {
  dirty.value = true
}

/* ---------------- ① 组织维度 ---------------- */
/** 树形展开状态 */
const expanded = ref<string[]>(['city'])
function toggleExpand(code: string) {
  const i = expanded.value.indexOf(code)
  if (i >= 0) expanded.value.splice(i, 1)
  else expanded.value.push(code)
}
function isExpanded(code: string) {
  return expanded.value.indexOf(code) >= 0
}
function isChecked(code: string) {
  return orgSelected.value.indexOf(code) >= 0
}
function toggleOrg(code: string) {
  const i = orgSelected.value.indexOf(code)
  if (i >= 0) orgSelected.value.splice(i, 1)
  else orgSelected.value.push(code)
  markDirty()
}
/** 把树拍平成带层级的行,便于用一层 v-for 渲染(避免递归组件) */
interface FlatOrg {
  code: string
  name: string
  depth: number
  hasChild: boolean
  level: string
}
const ORG_LEVEL_LABEL: Record<string, string> = {
  city: '市局',
  district: '区县局',
  branch: '分局',
  office: '税务所',
}
const flatOrg = computed<FlatOrg[]>(() => {
  const out: FlatOrg[] = []
  const walk = (nodes: OrgNode[], depth: number) => {
    nodes.forEach((n) => {
      out.push({ code: n.code, name: n.name, depth, hasChild: n.children.length > 0, level: n.level })
      if (n.children.length && isExpanded(n.code)) walk(n.children, depth + 1)
    })
  }
  if (cfg.value) walk(cfg.value.orgTree, 0)
  return out
})
/** 已勾选机构的名称(顶部摘要) */
const orgSelectedNames = computed(() => {
  const names: string[] = []
  const walk = (nodes: OrgNode[]) => {
    nodes.forEach((n) => {
      if (orgSelected.value.indexOf(n.code) >= 0) names.push(n.name)
      walk(n.children)
    })
  }
  if (cfg.value) walk(cfg.value.orgTree)
  return names
})

/* ---------------- ② 行级规则 ---------------- */
const estimateRes = useResource(() => api.system.estimateRowRules(subjectId.value, rules.value))
const est = computed(() => estimateRes.data.value)
function estimate() {
  estimateRes.load()
}
// 规则一变就重新试算:配置者要立刻看到范围放大还是缩小
watch(rules, estimate, { deep: true })

function optionOf(field: RowRuleField) {
  const c = cfg.value
  if (!c) return undefined
  return c.rowRuleOptions.filter((o) => o.field === field)[0]
}
function addRule() {
  const used = rules.value.map((r) => r.field)
  const c = cfg.value
  if (!c) return
  const free = c.rowRuleOptions.filter((o) => used.indexOf(o.field) < 0)[0]
  if (!free) {
    toast('四类条件均已配置,可直接修改现有条件')
    return
  }
  rules.value.push({ id: `r${Date.now()}`, field: free.field, op: 'in', values: [] })
  markDirty()
}
function removeRule(id: string) {
  rules.value = rules.value.filter((r) => r.id !== id)
  markDirty()
}
function toggleValue(r: RowRuleCondition, v: string) {
  const i = r.values.indexOf(v)
  if (i >= 0) r.values.splice(i, 1)
  else r.values.push(v)
  markDirty()
}
function setOp(r: RowRuleCondition, op: 'in' | 'notIn') {
  r.op = op
  markDirty()
}
/** 可访问占比,用于提示范围是否过宽 */
const estRatio = computed(() => (est.value && est.value.total ? (est.value.count / est.value.total) * 100 : 0))
const estTone = computed(() => (estRatio.value >= 50 ? 'danger' : estRatio.value >= 15 ? 'warn' : 'success'))

/* ---------------- ③ 字段级脱敏 ---------------- */
const MASK_LABEL: Record<MaskLevel, string> = { hidden: '完全隐藏', masked: '掩码显示', plain: '明文显示' }
const MASK_TONE: Record<MaskLevel, 'success' | 'primary' | 'danger'> = {
  hidden: 'success',
  masked: 'primary',
  plain: 'danger',
}
function setLevel(f: FieldMaskRow, level: MaskLevel) {
  f.level = level
  // 从明文降级时清掉理由,避免留下与当前档位不符的授权记录
  if (level !== 'plain') f.reason = ''
  markDirty()
}
function sampleOf(f: FieldMaskRow) {
  if (f.level === 'hidden') return '——'
  return f.level === 'plain' ? f.plainSample : f.maskedSample
}
/** 明文档位但未填理由的字段(保存前必须补齐) */
const missingReason = computed(() => fields.value.filter((f) => f.level === 'plain' && !f.reason.trim()))
const plainCount = computed(() => fields.value.filter((f) => f.level === 'plain').length)

/* ---------------- 保存 ---------------- */
const saveOpen = ref(false)
function askSave() {
  if (missingReason.value.length) {
    toast(`还有 ${missingReason.value.length} 个明文字段未填写授权理由,请补齐后再保存`)
    return
  }
  saveOpen.value = true
}
function confirmSave() {
  saveOpen.value = false
  dirty.value = false
  toast('数据权限配置已保存,变更已记入操作日志')
}
function resetAll() {
  syncFromConfig()
  toast('已恢复为当前生效的配置')
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}
const money = (n: number) => n.toLocaleString('en-US')
</script>

<template>
  <div class="dperm">
    <PageHeader title="数据权限配置" breadcrumb="首页 / 系统管理 / 数据权限配置">
      <template #actions>
        <span v-if="cfg" class="dperm__upd num">最后更新 {{ cfg.updatedAt }} · {{ cfg.updatedBy }}</span>
        <button type="button" class="btn" :disabled="!dirty" @click="resetAll">重置</button>
        <button type="button" class="btn btn--primary" :disabled="!dirty" @click="askSave">保存配置</button>
      </template>
    </PageHeader>

    <!-- 最小必要原则说明,常驻不随内容滚动 -->
    <div v-if="cfg" class="principle">
      <span class="principle__icon">⚖</span>
      <span class="principle__text">{{ cfg.principle }}</span>
    </div>

    <div class="dperm__body">
      <!-- 主体选择 -->
      <div class="subject">
        <span class="subject__label">配置主体</span>
        <BaseSelect v-model="subjectId" :options="subjectOptions" width="260px" @update:model-value="changeSubject" />
        <template v-if="currentSubject">
          <BaseBadge :tone="currentSubject.type === 'role' ? 'primary' : 'neutral'">
            {{ currentSubject.type === 'role' ? '角色' : '用户' }}
          </BaseBadge>
          <span class="subject__desc">{{ currentSubject.desc }}</span>
          <span v-if="currentSubject.type === 'role'" class="subject__count num">
            影响 {{ currentSubject.userCount }} 人
          </span>
        </template>
        <span v-if="dirty" class="subject__dirty">有未保存的改动</span>
      </div>

      <StateBlock :status="config.status.value" :error="config.error.value" @retry="config.load()">
        <template v-if="cfg">
          <!-- ══════════ ① 组织维度 ══════════ -->
          <PanelCard title="第一层 · 组织维度" subtitle="能看哪些机构的数据">
            <template #actions>
              <span class="mode">
                <span
                  class="mode__opt"
                  :class="{ 'mode__opt--on': orgMode === 'self' }"
                  @click="((orgMode = 'self'), markDirty())"
                >仅本级</span>
                <span
                  class="mode__opt"
                  :class="{ 'mode__opt--on': orgMode === 'selfAndBelow' }"
                  @click="((orgMode = 'selfAndBelow'), markDirty())"
                >本级及下级</span>
              </span>
            </template>

            <div class="org">
              <div class="org__tree">
                <div
                  v-for="n in flatOrg"
                  :key="n.code"
                  class="org__row"
                  :style="{ paddingLeft: `${n.depth * 22}px` }"
                >
                  <span
                    class="org__caret"
                    :class="{ 'org__caret--hidden': !n.hasChild }"
                    @click="toggleExpand(n.code)"
                  >{{ isExpanded(n.code) ? '▾' : '▸' }}</span>
                  <BaseCheckbox :model-value="isChecked(n.code)" @update:model-value="toggleOrg(n.code)" />
                  <span class="org__name" @click="toggleOrg(n.code)">{{ n.name }}</span>
                  <span class="org__level">{{ ORG_LEVEL_LABEL[n.level] }}</span>
                </div>
              </div>

              <div class="org__side">
                <div class="org__side-title">已授权范围</div>
                <div v-if="!orgSelectedNames.length" class="org__empty">尚未勾选任何机构,该主体将无法访问任何数据。</div>
                <div v-else class="org__tags">
                  <span v-for="n in orgSelectedNames" :key="n" class="org__tag">{{ n }}</span>
                </div>
                <div class="org__mode-note">
                  当前模式:<b>{{ orgMode === 'self' ? '仅本级' : '本级及下级' }}</b>
                  <span>{{
                    orgMode === 'self'
                      ? '只能访问所勾选机构本级的数据,下级机构不可见。'
                      : '可访问所勾选机构及其全部下级机构的数据。'
                  }}</span>
                </div>
              </div>
            </div>
          </PanelCard>

          <!-- ══════════ ② 行级规则 ══════════ -->
          <PanelCard title="第二层 · 行级规则" subtitle="授权机构内,还能看哪些纳税人">
            <template #actions>
              <button type="button" class="btn" @click="addRule">+ 添加条件</button>
            </template>

            <div v-if="!rules.length" class="rule__empty">
              未配置任何行级规则 —— 该主体将可访问授权机构内的<b>全部</b>纳税人,不符合最小必要原则。
            </div>

            <div class="rules">
              <div v-for="(r, i) in rules" :key="r.id" class="rrule">
                <div class="rrule__head">
                  <span class="rrule__join num">{{ i === 0 ? '当' : '且' }}</span>
                  <BaseSelect
                    :model-value="r.field"
                    :options="cfg.rowRuleOptions.map((o) => ({ value: o.field, label: o.label }))"
                    width="140px"
                    @update:model-value="((r.field = $event as RowRuleField), (r.values = []), markDirty())"
                  />
                  <span class="rrule__ops">
                    <span class="rrule__op" :class="{ 'rrule__op--on': r.op === 'in' }" @click="setOp(r, 'in')">属于</span>
                    <span class="rrule__op" :class="{ 'rrule__op--on': r.op === 'notIn' }" @click="setOp(r, 'notIn')">不属于</span>
                  </span>
                  <span class="rrule__del" @click="removeRule(r.id)">移除</span>
                </div>
                <div class="rrule__values">
                  <span
                    v-for="o in optionOf(r.field) ? optionOf(r.field)!.options : []"
                    :key="o.value"
                    class="vchip"
                    :class="{ 'vchip--on': r.values.indexOf(o.value) >= 0 }"
                    @click="toggleValue(r, o.value)"
                  >{{ o.label }}</span>
                </div>
                <div class="rrule__desc">{{ optionOf(r.field) ? optionOf(r.field)!.desc : '' }}</div>
              </div>
            </div>

            <!-- 实时试算 -->
            <div class="est" :class="`tone-${estTone}`">
              <span class="est__label">当前配置可访问</span>
              <span class="est__num num">{{ est ? money(est.count) : '—' }}</span>
              <span class="est__unit">户</span>
              <span v-if="est" class="est__ratio num">占全市 {{ estRatio.toFixed(1) }}%(共 {{ money(est.total) }} 户)</span>
              <span v-if="est" class="est__note">{{ est.note }}</span>
            </div>
          </PanelCard>

          <!-- ══════════ ③ 字段级脱敏 ══════════ -->
          <PanelCard title="第三层 · 字段级脱敏" subtitle="可见的纳税人中,敏感字段以何种形式呈现">
            <template #actions>
              <span v-if="plainCount" class="plain-warn num">{{ plainCount }} 个字段已授权明文</span>
              <span v-else class="plain-ok">无明文授权</span>
            </template>

            <div class="fields">
              <div class="fields__head">
                <span class="fh fh--name">字段</span>
                <span class="fh fh--level">脱敏档位</span>
                <span class="fh fh--sample">该主体看到的效果</span>
                <span class="fh fh--reason">明文授权理由</span>
              </div>
              <div v-for="f in fields" :key="f.key" class="frow" :class="{ 'frow--plain': f.level === 'plain' }">
                <div class="fc fc--name">
                  <span class="frow__name">{{ f.name }}</span>
                  <span class="frow__cat">{{ f.category }}</span>
                  <span class="frow__basis">{{ f.basis }}</span>
                </div>
                <div class="fc fc--level">
                  <span
                    v-for="lv in (['hidden', 'masked', 'plain'] as MaskLevel[])"
                    :key="lv"
                    class="lv"
                    :class="[`tone-${MASK_TONE[lv]}`, { 'lv--on': f.level === lv }]"
                    @click="setLevel(f, lv)"
                  >{{ MASK_LABEL[lv] }}</span>
                </div>
                <div class="fc fc--sample num">{{ sampleOf(f) }}</div>
                <div class="fc fc--reason">
                  <template v-if="f.level === 'plain'">
                    <BaseInput
                      v-model="f.reason"
                      placeholder="必填:说明查看明文的业务依据"
                      width="100%"
                      @update:model-value="markDirty"
                    />
                    <div class="frow__trace">⚠ 该字段的每次明文查看操作将全程留痕,记入操作日志审计</div>
                  </template>
                  <span v-else class="frow__na">—</span>
                </div>
              </div>
            </div>
          </PanelCard>
        </template>
      </StateBlock>
    </div>

    <ConfirmModal
      :open="saveOpen"
      title="确认保存数据权限配置?"
      :message="
        plainCount
          ? `本次配置为该主体授权了 ${plainCount} 个字段的明文查看权限,授权理由将随配置一并留存,后续每次明文查看均会记入审计日志。`
          : '保存后立即对该主体生效;本次变更将记入操作日志审计。'
      "
      confirm-text="确认保存"
      @confirm="confirmSave"
      @cancel="saveOpen = false"
    />
    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.dperm {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.dperm__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 最小必要原则说明条 */
.principle {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 20px;
  background: var(--color-primary-tint);
  border-bottom: 1px solid var(--color-neutral-300);
  font-size: var(--fs-label);
  color: var(--color-primary-deep);
}
.principle__icon {
  flex: none;
  color: var(--color-primary);
}
.principle__text {
  line-height: 1.6;
}

.dperm__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-3) 20px var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.dperm__body > * {
  flex: none;
}

/* 主体选择 */
.subject {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 10px 16px;
  flex-wrap: wrap;
}
.subject__label {
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  font-weight: var(--fw-semibold);
}
.subject__desc {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.subject__count {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.subject__dirty {
  margin-left: auto;
  font-size: var(--fs-label);
  color: var(--color-risk-mid-text);
  background: var(--color-risk-mid-tint);
  border-radius: var(--radius-control);
  padding: 2px 10px;
}

/* ---------- ① 组织维度 ---------- */
.mode {
  display: inline-flex;
  border: var(--border-line);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.mode__opt {
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  padding: 4px 14px;
  cursor: pointer;
  background: var(--color-panel);
}
.mode__opt--on {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-weight: var(--fw-semibold);
}
.org {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-4);
}
.org__tree {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: var(--space-2) 0;
  max-height: 280px;
  overflow: auto;
}
.org__row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
}
.org__row:hover {
  background: var(--color-row-hover);
}
.org__caret {
  width: 14px;
  flex: none;
  text-align: center;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  cursor: pointer;
}
.org__caret--hidden {
  visibility: hidden;
}
.org__name {
  cursor: pointer;
}
.org__level {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  background: var(--color-neutral-100);
  border-radius: var(--radius-control);
  padding: 0 6px;
}
.org__side {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: var(--space-3);
}
.org__side-title {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-700);
  margin-bottom: var(--space-2);
}
.org__empty {
  font-size: var(--fs-label);
  color: var(--color-risk-high-text);
  line-height: 1.6;
}
.org__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.org__tag {
  font-size: var(--fs-micro);
  color: var(--color-primary-deep);
  background: var(--color-primary-tint);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-control);
  padding: 1px 8px;
}
.org__mode-note {
  margin-top: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-neutral-200);
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  line-height: 1.6;
}
.org__mode-note b {
  color: var(--color-primary-deep);
}
.org__mode-note span {
  display: block;
}

/* ---------- ② 行级规则 ---------- */
.rule__empty {
  font-size: var(--fs-label);
  color: var(--color-risk-high-text);
  background: var(--color-risk-high-tint);
  border: 1px solid var(--color-risk-high);
  border-radius: var(--radius-control);
  padding: 8px 14px;
  margin-bottom: var(--space-3);
}
.rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.rrule {
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-control);
  padding: 9px 14px;
}
.rrule__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.rrule__join {
  width: 26px;
  flex: none;
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-primary);
}
.rrule__ops {
  display: inline-flex;
  border: var(--border-line);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.rrule__op {
  font-size: var(--fs-label);
  padding: 3px 12px;
  cursor: pointer;
  color: var(--color-neutral-700);
  background: var(--color-panel);
}
.rrule__op--on {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}
.rrule__del {
  margin-left: auto;
  font-size: var(--fs-label);
  color: var(--color-danger);
  cursor: pointer;
}
.rrule__values {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  padding-left: 34px;
}
.vchip {
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 2px 12px;
  cursor: pointer;
}
.vchip:hover {
  border-color: var(--color-primary);
}
.vchip--on {
  background: var(--color-primary-tint);
  border-color: var(--color-primary);
  color: var(--color-primary-deep);
  font-weight: var(--fw-semibold);
}
.rrule__desc {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-top: 5px;
  padding-left: 34px;
}

/* 实时试算 */
.est {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-3);
  padding: 10px 14px;
  background: var(--tone-tint);
  border: 1px solid var(--tone-main);
  border-radius: var(--radius-control);
}
.est__label {
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
}
.est__num {
  font-size: var(--fs-metric);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
  line-height: 1.1;
}
.est__unit {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.est__ratio {
  font-size: var(--fs-label);
  color: var(--tone-text);
  font-weight: var(--fw-semibold);
}
.est__note {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  width: 100%;
}

/* ---------- ③ 字段级脱敏 ---------- */
.fields {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
}
.fields__head,
.frow {
  display: grid;
  grid-template-columns: 1.25fr 250px 1fr 1.3fr;
  gap: var(--space-3);
  padding: 9px 14px;
  align-items: start;
}
.fields__head {
  background: var(--color-neutral-100);
  border-bottom: var(--border-line);
}
.fh {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-600);
}
.frow {
  border-bottom: 1px solid var(--color-neutral-200);
}
.frow:last-child {
  border-bottom: none;
}
/* 明文档位整行标出:这是本页最需要被看见的状态 */
.frow--plain {
  background: var(--color-risk-high-tint);
}
.frow__name {
  display: block;
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-900);
}
.frow__cat {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.frow__basis {
  display: block;
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  line-height: 1.5;
  margin-top: 2px;
}
.fc--level {
  display: flex;
  gap: 4px;
}
.lv {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 3px 9px;
  cursor: pointer;
  white-space: nowrap;
}
.lv:hover {
  border-color: var(--tone-main);
}
.lv--on {
  background: var(--tone-tint);
  border-color: var(--tone-main);
  color: var(--tone-text);
  font-weight: var(--fw-semibold);
}
.fc--sample {
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
  word-break: break-all;
}
.frow__trace {
  font-size: var(--fs-micro);
  color: var(--color-risk-high-text);
  margin-top: 4px;
  line-height: 1.5;
}
.frow__na {
  color: var(--color-neutral-500);
}
.plain-warn {
  font-size: var(--fs-label);
  color: var(--color-risk-high-text);
  background: var(--color-risk-high-tint);
  border-radius: var(--radius-control);
  padding: 2px 10px;
}
.plain-ok {
  font-size: var(--fs-label);
  color: var(--color-status-normal-text);
}
</style>
