<script setup lang="ts">
/**
 * 系统管理 · 操作日志审计(《需求文档》10.2)
 * 重点是**异常行为检测**,不是流水账:
 *   上 概览指标(告警数不为零时标红)
 *   中 异常告警区,按类型分组并给出判定口径,点击过滤下方日志
 *   下 日志列表 —— 敏感操作(查看明文 / 批量导出 / 权限变更)整行标红并置顶
 * 排序由接口负责(敏感置顶 + 时间倒序),前端不再另排,避免两套口径。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { AuditAlertType, AuditLogRow, AuditQuery, AuditResult } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterField from '@/components/common/FilterField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseCheckbox from '@/components/common/BaseCheckbox.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import Toast from '@/components/common/Toast.vue'
import type { TableColumn } from '@/components/common/table'
import { RISK_TONE, toneClass } from '@/components/common/tone'

/* ---------------- 筛选 ---------------- */
const keyword = ref('')
const opType = ref('all')
const alertType = ref('all')
const sensitiveOnly = ref(false)
const dateFrom = ref('')
const dateTo = ref('')
const page = ref(1)
const pageSize = ref(20)

const query = computed<AuditQuery>(() => ({
  keyword: keyword.value,
  opType: opType.value,
  alertType: alertType.value,
  sensitiveOnly: sensitiveOnly.value,
  dateFrom: dateFrom.value,
  dateTo: dateTo.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const overview = useResource(() => api.system.getAuditOverview())
const logs = useResource(() => api.system.getAuditLogs(query.value), { isEmpty: (d) => d.items.length === 0 })
const ov = computed(() => overview.data.value)

onMounted(async () => {
  await overview.load()
  if (ov.value) {
    dateFrom.value = ov.value.defaultFrom
    dateTo.value = ov.value.defaultTo
  }
  logs.load()
})

function search() {
  page.value = 1
  logs.load()
}
function reset() {
  keyword.value = ''
  opType.value = 'all'
  alertType.value = 'all'
  sensitiveOnly.value = false
  if (ov.value) {
    dateFrom.value = ov.value.defaultFrom
    dateTo.value = ov.value.defaultTo
  }
  page.value = 1
  logs.load()
}
/** 点击告警卡过滤日志;再点一次取消 */
function pickAlert(t: AuditAlertType) {
  alertType.value = alertType.value === t ? 'all' : t
  page.value = 1
  logs.load()
}
function toggleSensitive() {
  sensitiveOnly.value = !sensitiveOnly.value
  page.value = 1
  logs.load()
}
function onPageChange(p: number) {
  page.value = p
  logs.load()
}
function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  logs.load()
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}

/* ---------------- 展示辅助 ---------------- */
const RESULT_LABEL: Record<AuditResult, string> = { success: '成功', fail: '失败', denied: '已拒绝' }
const RESULT_TONE: Record<AuditResult, 'success' | 'warn' | 'danger'> = {
  success: 'success',
  fail: 'warn',
  denied: 'danger',
}
const ALERT_LABEL: Record<string, string> = {
  highFreq: '高频查询',
  offHours: '非工作时间',
  outOfScope: '超范围',
  bulkExport: '大批量导出',
}
/** 当前生效的告警过滤对应的分组 */
const activeAlert = computed(() => (ov.value ? ov.value.alerts.filter((a) => a.type === alertType.value)[0] : undefined))
/** 告警总数,用于总览条的提示语气 */
const totalAlerts = computed(() => (ov.value ? ov.value.alerts.reduce((s, a) => s + a.count, 0) : 0))

const columns: TableColumn[] = [
  { key: 'time', label: '时间', width: '138px', numeric: true },
  { key: 'operator', label: '操作人', width: '92px' },
  { key: 'dept', label: '所属单位', width: '132px' },
  { key: 'opTypeLabel', label: '操作类型', width: '132px' },
  { key: 'target', label: '操作对象', ellipsis: true },
  { key: 'ip', label: 'IP 地址', width: '124px', numeric: true },
  { key: 'result', label: '结果', width: '84px' },
]
const rowKey = (r: AuditLogRow) => r.id
const rows = computed(() => (logs.data.value ? logs.data.value.items : []))
const total = computed(() => (logs.data.value ? logs.data.value.total : 0))
</script>

<template>
  <div class="audit">
    <PageHeader title="操作日志审计" breadcrumb="首页 / 系统管理 / 操作日志审计">
      <template #actions>
        <span v-if="ov" class="audit__upd num">数据更新 {{ ov.updatedAt }}</span>
        <button type="button" class="btn" @click="toast('演示环境:审计报告导出需连接报表服务')">导出审计报告</button>
      </template>
    </PageHeader>

    <div class="audit__body">
      <!-- ══════════ 上:审计概览 ══════════ -->
      <div v-if="ov" class="audit__kpis">
        <MetricCard
          v-for="k in ov.kpis"
          :key="k.label"
          :label="k.label"
          :value="k.value"
          :unit="k.unit"
          :accent="k.accent"
          :tone="k.label === '异常行为告警' && totalAlerts > 0 ? 'danger' : 'default'"
          variant="card"
        />
      </div>

      <!-- ══════════ 中:异常告警 ══════════ -->
      <PanelCard
        title="异常行为告警"
        :subtitle="totalAlerts > 0 ? `当前 ${totalAlerts} 条待核查 · 点击卡片过滤下方日志` : '当前无异常告警'"
      >
        <template #actions>
          <span v-if="alertType !== 'all'" class="audit__clear" @click="pickAlert(alertType as AuditAlertType)">
            清除过滤 ✕
          </span>
        </template>

        <StateBlock :status="overview.status.value" :error="overview.error.value" @retry="overview.load()">
          <div v-if="ov" class="alerts">
            <div
              v-for="a in ov.alerts"
              :key="a.type"
              class="alert"
              :class="[toneClass(RISK_TONE[a.level]), { 'alert--on': alertType === a.type, 'alert--zero': a.count === 0 }]"
              @click="pickAlert(a.type)"
            >
              <div class="alert__top">
                <span class="alert__dot"></span>
                <span class="alert__label">{{ a.label }}</span>
              </div>
              <div class="alert__count num">{{ a.count }}<i>次</i></div>
              <div class="alert__desc">判定口径:{{ a.desc }}</div>
              <div class="alert__users">
                <template v-if="a.users.length">
                  涉及 {{ a.users.length }} 人:
                  <span v-for="u in a.users.slice(0, 3)" :key="u" class="alert__user">{{ u }}</span>
                  <span v-if="a.users.length > 3" class="alert__more num">等 {{ a.users.length }} 人</span>
                </template>
                <span v-else class="alert__none">本期未触发</span>
              </div>
            </div>
          </div>
        </StateBlock>
      </PanelCard>

      <!-- ══════════ 下:日志列表 ══════════ -->
      <FilterBar>
        <FilterField label="时间范围">
          <BaseInput v-model="dateFrom" placeholder="起始 2026-07-23" numeric width="130px" @enter="search" />
          <span class="audit__sep">—</span>
          <BaseInput v-model="dateTo" placeholder="截止 2026-07-24" numeric width="130px" @enter="search" />
        </FilterField>
        <FilterField label="操作人 / 对象 / IP">
          <BaseInput v-model="keyword" placeholder="请输入关键字" width="200px" @enter="search" />
        </FilterField>
        <FilterField label="操作类型">
          <BaseSelect v-model="opType" :options="ov ? ov.opTypes : []" width="150px" @update:model-value="search" />
        </FilterField>
        <FilterField label="敏感操作">
          <div class="audit__check" @click="toggleSensitive">
            <BaseCheckbox :model-value="sensitiveOnly" @update:model-value="toggleSensitive" />
            <span>仅看敏感操作</span>
          </div>
        </FilterField>
        <div class="audit__actions">
          <button type="button" class="btn btn--primary" @click="search">查询</button>
          <button type="button" class="btn" @click="reset">重置</button>
        </div>
      </FilterBar>

      <div class="audit__list">
        <div class="audit__toolbar">
          <span class="audit__toolbar-title">操作日志</span>
          <span class="audit__toolbar-total num">共 {{ total }} 条</span>
          <span v-if="activeAlert" class="audit__tag">
            已按「{{ activeAlert.label }}」过滤
            <i @click="pickAlert(activeAlert.type)">✕</i>
          </span>
          <span v-if="sensitiveOnly" class="audit__tag">
            仅敏感操作
            <i @click="toggleSensitive">✕</i>
          </span>
          <span class="audit__hint">敏感操作(查看明文 / 批量导出 / 权限变更)整行标红并置顶</span>
        </div>

        <StateBlock
          v-if="logs.status.value === 'empty' || logs.status.value === 'error'"
          :status="logs.status.value"
          :error="logs.error.value"
          empty-text="所选条件下没有日志记录"
          empty-hint="可放宽时间范围或清除告警过滤"
          @retry="logs.load()"
        />
        <DataTable
          v-else
          :columns="columns"
          :rows="rows"
          :row-key="rowKey"
          density="compact"
          :loading="logs.status.value === 'loading' || logs.status.value === 'idle'"
          :skeleton-rows="12"
        >
          <template #cell-time="{ row }">
            <span :class="{ 'log--s': row.sensitive }">{{ row.time }}</span>
          </template>
          <template #cell-operator="{ row }">
            <span :class="{ 'log--s': row.sensitive }">{{ row.operator }}</span>
          </template>
          <template #cell-opTypeLabel="{ row }">
            <span class="op" :class="{ 'op--s': row.sensitive }">{{ row.opTypeLabel }}</span>
            <span v-if="row.alertType" class="op__alert">{{ ALERT_LABEL[row.alertType] }}</span>
          </template>
          <template #cell-target="{ row }">
            <span :class="{ 'log--s': row.sensitive }">{{ row.target }}</span>
            <span v-if="row.sensitive" class="op__note" :title="row.sensitiveNote">·{{ row.sensitiveNote }}</span>
          </template>
          <template #cell-result="{ row }">
            <BaseBadge :tone="RESULT_TONE[row.result as AuditResult]" variant="dot">
              {{ RESULT_LABEL[row.result as AuditResult] }}
            </BaseBadge>
          </template>
        </DataTable>

        <Pagination
          :total="total"
          :page="page"
          :page-size="pageSize"
          @update:page="onPageChange"
          @update:page-size="onPageSizeChange"
        />
      </div>
    </div>

    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.audit {
  /* 页面级令牌:告警卡的大数字不在全局字阶内 */
  --audit-alert-fs: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.audit__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.audit__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.audit__body > * {
  flex: none;
}
.audit__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

/* ---------- 异常告警 ---------- */
.audit__clear {
  font-size: var(--fs-label);
  color: var(--color-primary);
  cursor: pointer;
}
.alerts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}
.alert {
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--tone-main);
  border-radius: var(--radius-control);
  padding: 10px 14px;
  cursor: pointer;
  transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease;
}
.alert:hover {
  background: var(--color-row-hover);
}
.alert--on {
  background: var(--color-primary-tint);
  border-color: var(--color-primary);
  border-left-color: var(--tone-main);
}
/* 次数为 0 的告警类型弱化,但仍列出:让人知道这类检测在跑 */
.alert--zero {
  opacity: 0.6;
}
.alert__top {
  display: flex;
  align-items: center;
  gap: 6px;
}
.alert__dot {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 50%;
  background: var(--tone-main);
}
.alert__label {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-800);
}
.alert__count {
  font-size: var(--audit-alert-fs);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
  line-height: 1.3;
}
.alert__count i {
  font-style: normal;
  font-size: var(--fs-label);
  font-weight: var(--fw-regular);
  color: var(--color-neutral-600);
  margin-left: 3px;
}
.alert__desc {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  line-height: 1.5;
}
.alert__users {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--color-neutral-200);
}
.alert__user {
  color: var(--color-neutral-800);
  margin-right: 5px;
}
.alert__more {
  color: var(--color-neutral-500);
}
.alert__none {
  color: var(--color-neutral-500);
}

/* ---------- 日志 ---------- */
.audit__sep {
  color: var(--color-neutral-500);
}
.audit__check {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  font-size: var(--fs-aux);
  color: var(--color-neutral-800);
  cursor: pointer;
}
.audit__actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.audit__actions .btn {
  height: 32px;
}
.audit__list {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
}
.audit__toolbar {
  height: 46px;
  flex: none;
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: var(--space-3);
}
.audit__toolbar-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.audit__toolbar-total {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.audit__tag {
  font-size: var(--fs-label);
  color: var(--color-primary);
  background: var(--color-primary-tint);
  border-radius: var(--radius-control);
  padding: 2px 8px;
}
.audit__tag i {
  font-style: normal;
  cursor: pointer;
  margin-left: var(--space-1);
}
.audit__hint {
  margin-left: auto;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}

/* 敏感操作:文字转红加粗 */
.log--s {
  color: var(--color-risk-high-text);
  font-weight: var(--fw-semibold);
}
.op--s {
  color: var(--color-risk-high-text);
  font-weight: var(--fw-semibold);
}
.op__alert {
  font-size: var(--fs-micro);
  color: var(--color-text-inverse);
  background: var(--color-risk-mid);
  border-radius: var(--radius-control);
  padding: 0 5px;
  margin-left: 5px;
}
.op__note {
  font-size: var(--fs-micro);
  color: var(--color-risk-high-text);
  margin-left: 5px;
}
</style>
