<script setup lang="ts">
/**
 * 智能应用 · 文书辅助生成(《需求文档》5.3)
 * 无设计稿;形态是**参数表单 + 文档编辑器**,不是对话:
 *   左侧填参数、右侧出成稿,人在稿子上直接改字,而不是跟模型来回聊。
 * 硬约束(5.3):**严禁模型生成任何数值**。
 *   正文按片段区分:data 片段取自征管数据,浅蓝底 + 锁标 + 不可编辑,悬停查来源;
 *   模型生成的叙述段落另作标记,可自由编辑。
 * 谁写的、能不能改,由接口下发,前端不自行猜测。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { DocGenQuery, DocGenSegment, DocGenTaxpayer } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseCheckbox from '@/components/common/BaseCheckbox.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import FilterChip from '@/components/common/FilterChip.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'
import ChartTooltip from '@/components/charts/ChartTooltip.vue'
import { useTooltip } from '@/composables/useTooltip'
import { RISK_LABEL, RISK_TONE } from '@/components/common/tone'

/* ---------------- 参数 ---------------- */
const docType = ref('assessment')
const period = ref('2026H1')
const detail = ref('standard')
const withTable = ref(true)
const withAdvice = ref(true)

const taxKeyword = ref('')
const selectedTaxpayer = ref<DocGenTaxpayer | null>(null)
const taskId = ref('')

const options = useResource(() => api.app.getDocGenOptions())
const taxpayers = useResource(() => api.app.searchDocGenTaxpayers(taxKeyword.value))
const tasks = useResource(() => api.app.getDocGenTasks(selectedTaxpayer.value ? selectedTaxpayer.value.taxId : ''))
const doc = useResource(() => api.app.generateDoc(query.value))

const op = computed(() => options.data.value)
const dc = computed(() => doc.data.value)

const query = computed<DocGenQuery>(() => ({
  docType: docType.value,
  taxId: selectedTaxpayer.value ? selectedTaxpayer.value.taxId : '',
  taskId: taskId.value,
  period: period.value,
  detail: detail.value,
  withTable: withTable.value,
  withAdvice: withAdvice.value,
}))

onMounted(async () => {
  await options.load()
  await taxpayers.load()
  // 默认选中首个纳税人,让演示一进来就能直接生成
  const list = taxpayers.data.value
  if (list && list.length) {
    selectedTaxpayer.value = list[0]
    await tasks.load()
    const t = tasks.data.value
    if (t && t.length) taskId.value = t[0].id
  }
})

/* ---------------- 纳税人搜索 ---------------- */
const pickerOpen = ref(false)
async function searchTaxpayer() {
  pickerOpen.value = true
  await taxpayers.load()
}
async function pickTaxpayer(t: DocGenTaxpayer) {
  selectedTaxpayer.value = t
  pickerOpen.value = false
  taskId.value = ''
  await tasks.load()
}
const taskOptions = computed(() => {
  const list = tasks.data.value || []
  return [{ value: '', label: '不关联风险任务' }].concat(
    list.map((t) => ({ value: t.id, label: `${t.id} · ${t.label}` })),
  )
})
const currentTask = computed(() => (tasks.data.value || []).filter((t) => t.id === taskId.value)[0])

/* ---------------- 生成 ---------------- */
const generating = computed(() => doc.status.value === 'loading')
const canGenerate = computed(() => !!selectedTaxpayer.value && !generating.value)

async function generate() {
  if (!canGenerate.value) return
  await doc.load()
  // 重新生成会覆盖编辑,故生成后清空本地编辑标记
  edited.value = false
}

/** 重新生成前确认:正文可能已被人工修改 */
const regenOpen = ref(false)
function askRegenerate() {
  if (!dc.value) {
    generate()
    return
  }
  if (edited.value) regenOpen.value = true
  else generate()
}
function confirmRegenerate() {
  regenOpen.value = false
  generate()
}

/** 正文是否被人工编辑过 */
const edited = ref(false)
function onEdit() {
  edited.value = true
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}

/* ---------------- 数据字段来源悬停 ---------------- */
const { tip, showTip, hideTip } = useTooltip()
function onFieldHover(e: MouseEvent, seg: DocGenSegment) {
  showTip(e, seg.field || '数据字段', [
    { k: '取值', v: seg.text },
    { k: '数据来源', v: seg.source || '征管数据' },
    { k: '说明', v: '该字段直接取自业务系统,模型不参与数值生成,故锁定不可编辑' },
  ])
}
</script>

<template>
  <div class="dg">
    <PageHeader title="文书辅助生成" breadcrumb="首页 / 智能应用 / 文书辅助生成">
      <template #actions>
        <span v-if="op" class="dg__ver">{{ op.modelVersion }}</span>
      </template>
    </PageHeader>

    <div class="dg__body">
      <!-- ══════════ 左:参数面板 ══════════ -->
      <aside class="param">
        <div class="param__head">生成参数</div>
        <div class="param__body">
          <div class="pf">
            <label class="pf__label">文书类型</label>
            <BaseSelect v-model="docType" :options="op ? op.templates : []" width="100%" />
            <p v-if="op" class="pf__desc">
              {{ (op.templates.filter((t) => t.value === docType)[0] || op.templates[0]).desc }}
            </p>
          </div>

          <div class="pf">
            <label class="pf__label">关联纳税人 <i class="pf__req">*</i></label>
            <div class="pick">
              <BaseInput v-model="taxKeyword" placeholder="输入名称 / 识别号搜索" width="100%" @enter="searchTaxpayer" />
              <button type="button" class="btn pick__btn" @click="searchTaxpayer">搜索</button>
            </div>
            <div v-if="selectedTaxpayer" class="tpcard">
              <div class="tpcard__name">{{ selectedTaxpayer.name }}</div>
              <div class="tpcard__meta num">
                {{ selectedTaxpayer.taxId }} · {{ selectedTaxpayer.industry }} · {{ selectedTaxpayer.district }}
              </div>
            </div>
            <div v-if="pickerOpen" class="tplist">
              <StateBlock :status="taxpayers.status.value" :error="taxpayers.error.value" @retry="taxpayers.load()">
                <div
                  v-for="t in taxpayers.data.value || []"
                  :key="t.taxId"
                  class="tplist__item"
                  @click="pickTaxpayer(t)"
                >
                  <span class="tplist__name">{{ t.name }}</span>
                  <span class="tplist__meta num">{{ t.industry }} · {{ t.district }}</span>
                </div>
              </StateBlock>
            </div>
          </div>

          <div class="pf">
            <label class="pf__label">关联风险任务</label>
            <BaseSelect v-model="taskId" :options="taskOptions" width="100%" />
            <div v-if="currentTask" class="taskcard">
              <BaseBadge :tone="RISK_TONE[currentTask.riskLevel]">{{ RISK_LABEL[currentTask.riskLevel] }}</BaseBadge>
              <span class="taskcard__date num">生成于 {{ currentTask.createdAt }}</span>
            </div>
            <p v-else class="pf__desc">未关联任务时,正文不引用线索编号与命中规则</p>
          </div>

          <div class="pf__divider"></div>

          <div class="pf">
            <label class="pf__label">分析期间</label>
            <BaseSelect v-model="period" :options="op ? op.periods : []" width="100%" />
          </div>

          <div class="pf">
            <label class="pf__label">详略程度</label>
            <div class="pf__chips">
              <FilterChip
                v-for="d in op ? op.detailLevels : []"
                :key="d.value"
                :active="detail === d.value"
                @toggle="detail = d.value"
              >
                {{ d.label }}
              </FilterChip>
            </div>
          </div>

          <div class="pf">
            <label class="pf__label">附加内容</label>
            <div class="pf__check" @click="withTable = !withTable">
              <BaseCheckbox :model-value="withTable" @update:model-value="withTable = $event" />
              <span>附主要指标数据对照</span>
            </div>
            <div class="pf__check" @click="withAdvice = !withAdvice">
              <BaseCheckbox :model-value="withAdvice" @update:model-value="withAdvice = $event" />
              <span>包含处理建议段落</span>
            </div>
          </div>
        </div>

        <div class="param__foot">
          <button type="button" class="btn btn--primary param__gen" :disabled="!canGenerate" @click="generate">
            {{ generating ? '正在生成…' : dc ? '重新生成文书' : '生成文书' }}
          </button>
          <p v-if="!selectedTaxpayer" class="param__tip">请先选择关联纳税人</p>
        </div>
      </aside>

      <!-- ══════════ 右:文档区 ══════════ -->
      <section class="editor">
        <div class="editor__bar">
          <button type="button" class="btn" :disabled="!dc || generating" @click="askRegenerate">重新生成</button>
          <button type="button" class="btn" :disabled="!dc" @click="toast('演示环境:导出 Word 需连接文档服务')">
            导出 Word
          </button>
          <button type="button" class="btn" :disabled="!dc" @click="toast('演示环境:草稿箱需连接文书管理服务')">
            保存草稿
          </button>

          <div class="legend">
            <span class="legend__item"><i class="legend__sw legend__sw--data"></i>数据直填(锁定)</span>
            <span class="legend__item"><i class="legend__sw legend__sw--model"></i>模型生成(可编辑)</span>
          </div>

          <span v-if="dc" class="editor__stat num">
            数据字段 {{ dc.dataFieldCount }} 处 · 生成段落 {{ dc.modelBlockCount }} 段
            <b v-if="edited" class="editor__edited">已人工修改</b>
          </span>
        </div>

        <div class="editor__scroll">
          <StateBlock
            v-if="doc.status.value === 'idle'"
            status="empty"
            empty-text="尚未生成文书"
            empty-hint="在左侧选择文书类型与关联纳税人后点击「生成文书」"
          />
          <StateBlock v-else :status="doc.status.value" :error="doc.error.value" @retry="doc.load()">
            <div v-if="dc" class="paper">
              <div class="paper__inner">
                <template v-for="(b, bi) in dc.blocks" :key="bi">
                  <!-- 标题 / 文号 / 落款:不可编辑的固定块 -->
                  <div v-if="b.kind === 'title'" class="doc-title">{{ b.segments[0].text }}</div>
                  <div v-else-if="b.kind === 'meta'" class="doc-meta">
                    <template v-for="(s, si) in b.segments" :key="si">
                      <span
                        v-if="s.type === 'data'"
                        class="seg-data"
                        contenteditable="false"
                        @mouseenter="onFieldHover($event, s)"
                        @mouseleave="hideTip()"
                      >{{ s.text }}<i class="seg-data__lock">🔒</i></span>
                      <span v-else>{{ s.text }}</span>
                    </template>
                  </div>
                  <div v-else-if="b.kind === 'sign'" class="doc-sign">
                    <span
                      class="seg-data"
                      contenteditable="false"
                      @mouseenter="onFieldHover($event, b.segments[0])"
                      @mouseleave="hideTip()"
                    >{{ b.segments[0].text }}<i class="seg-data__lock">🔒</i></span>
                  </div>
                  <div v-else-if="b.kind === 'heading'" class="doc-h">{{ b.segments[0].text }}</div>

                  <!-- 正文段:整段可编辑;data 片段内嵌不可编辑 -->
                  <div
                    v-else
                    class="doc-p"
                    :class="{ 'doc-p--gen': b.generated }"
                    contenteditable="true"
                    spellcheck="false"
                    @input="onEdit"
                  >
                    <span v-if="b.generated" class="doc-p__flag" contenteditable="false">AI 生成</span>
                    <template v-for="(s, si) in b.segments" :key="si">
                      <span
                        v-if="s.type === 'data'"
                        class="seg-data"
                        contenteditable="false"
                        @mouseenter="onFieldHover($event, s)"
                        @mouseleave="hideTip()"
                      >{{ s.text }}<i class="seg-data__lock">🔒</i></span>
                      <span v-else>{{ s.text }}</span>
                    </template>
                  </div>
                </template>
              </div>
            </div>
          </StateBlock>
        </div>

        <!-- 底部固定提示条 -->
        <div class="notice">
          <span class="notice__icon">ⓘ</span>
          <span class="notice__text">AI 辅助生成,须经人工核实后方可用作正式文书;文中数值均直接取自征管数据,模型不参与数值生成。</span>
          <span v-if="dc" class="notice__meta num">
            生成时间 {{ dc.generatedAt }} · {{ dc.modelVersion }}
          </span>
        </div>
      </section>
    </div>

    <ConfirmModal
      :open="regenOpen"
      title="重新生成将覆盖已修改的正文?"
      message="当前文书已被人工编辑,重新生成会丢弃这些修改并按最新参数重出全文。"
      confirm-text="确认重新生成"
      @confirm="confirmRegenerate"
      @cancel="regenOpen = false"
    />
    <ChartTooltip :tip="tip" />
    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.dg {
  /* 页面级令牌:参数面板宽度与纸张字号(打印件相对大小,不在全局字阶内) */
  --dg-param: 320px;
  --dg-paper-title: 20px;
  --dg-paper-h: 14px;
  --dg-paper-body: 14px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.dg__ver {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.dg__body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) 20px;
}

/* ---------- 左:参数面板 ---------- */
.param {
  width: var(--dg-param);
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.param__head {
  flex: none;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  border-bottom: var(--border-line);
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.param__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-3) var(--space-4);
}
.pf {
  margin-bottom: var(--space-3);
}
.pf__label {
  display: block;
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  margin-bottom: 5px;
}
.pf__req {
  font-style: normal;
  color: var(--color-danger);
}
.pf__desc {
  margin: 5px 0 0;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  line-height: 1.5;
}
.pf__divider {
  height: 1px;
  background: var(--color-neutral-200);
  margin: var(--space-4) 0;
}
.pf__chips {
  display: flex;
  gap: 6px;
}
.pf__check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-label);
  color: var(--color-neutral-800);
  cursor: pointer;
  margin-bottom: 6px;
}

.pick {
  display: flex;
  gap: 6px;
}
.pick__btn {
  flex: none;
  height: 32px;
  padding: 0 12px;
}
.tpcard {
  margin-top: 6px;
  border: 1px solid var(--color-primary);
  background: var(--color-primary-tint);
  border-radius: var(--radius-control);
  padding: 6px 10px;
}
.tpcard__name {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-primary-deep);
}
.tpcard__meta {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
}
.tplist {
  margin-top: 6px;
  max-height: 200px;
  overflow: auto;
  border: var(--border-line);
  border-radius: var(--radius-control);
}
.tplist__item {
  padding: 6px 10px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-neutral-200);
}
.tplist__item:last-child {
  border-bottom: none;
}
.tplist__item:hover {
  background: var(--color-row-hover);
}
.tplist__name {
  display: block;
  font-size: var(--fs-label);
  color: var(--color-neutral-900);
}
.tplist__meta {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.taskcard {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.taskcard__date {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}

.param__foot {
  flex: none;
  padding: var(--space-3) var(--space-4);
  border-top: var(--border-line);
}
.param__gen {
  width: 100%;
  height: 36px;
}
.param__gen:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.param__tip {
  margin: 6px 0 0;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  text-align: center;
}

/* ---------- 右:文档区 ---------- */
.editor {
  flex: 1;
  min-width: 0;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.editor__bar {
  flex: none;
  height: 44px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  border-bottom: var(--border-line);
}
.editor__bar .btn {
  height: 30px;
  padding: 0 12px;
}
.editor__bar .btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.legend {
  margin-left: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
}
.legend__sw {
  width: 14px;
  height: 10px;
  border-radius: 1px;
  display: inline-block;
}
.legend__sw--data {
  background: var(--color-primary-tint);
  border: 1px solid var(--color-primary);
}
.legend__sw--model {
  background: var(--color-risk-low-tint);
  border-left: 3px solid var(--color-risk-low);
}
.editor__stat {
  margin-left: auto;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  white-space: nowrap;
}
.editor__edited {
  color: var(--color-risk-mid-text);
  margin-left: 6px;
}

.editor__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--color-neutral-200);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
}

/* Word 样式白纸 */
.paper {
  width: 100%;
  max-width: 794px;
  margin: 0 auto;
  background: var(--color-panel);
  box-shadow: var(--shadow-md);
}
.paper__inner {
  /* 页边距:上下 2.54cm、左右 3.17cm 的近似换算 */
  padding: 62px 76px 72px;
}
.doc-title {
  font-family: var(--font-serif);
  font-size: var(--dg-paper-title);
  font-weight: var(--fw-semibold);
  text-align: center;
  line-height: 1.6;
  margin-bottom: var(--space-3);
}
.doc-meta {
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  text-align: center;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-neutral-300);
  margin-bottom: var(--space-4);
}
.doc-h {
  font-size: var(--dg-paper-h);
  font-weight: var(--fw-semibold);
  margin: var(--space-4) 0 var(--space-2);
}
.doc-p {
  font-size: var(--dg-paper-body);
  line-height: 1.9;
  text-indent: 2em;
  margin-bottom: 10px;
  outline: none;
  border-radius: 1px;
  padding: 2px 4px;
}
.doc-p:focus {
  background: var(--color-neutral-100);
  box-shadow: 0 0 0 1px var(--color-primary);
}
/* 模型生成段:左侧色条 + 极浅底纹 + 角标 */
.doc-p--gen {
  position: relative;
  border-left: 3px solid var(--color-risk-low);
  background: var(--color-risk-low-tint);
  padding-left: 10px;
}
.doc-p__flag {
  position: absolute;
  right: 4px;
  top: -8px;
  text-indent: 0;
  font-size: var(--fs-micro);
  line-height: 1.4;
  color: var(--color-risk-low-text);
  background: var(--color-panel);
  border: 1px solid var(--color-risk-low);
  border-radius: var(--radius-control);
  padding: 0 5px;
  user-select: none;
}
.doc-sign {
  text-align: right;
  font-size: var(--dg-paper-body);
  line-height: 1.9;
  margin-top: var(--space-2);
}

/* 数据直填字段:浅底 + 锁标 + 不可编辑 */
.seg-data {
  background: var(--color-primary-tint);
  border-bottom: 1px solid var(--color-primary);
  border-radius: 1px;
  padding: 0 3px;
  cursor: help;
  user-select: none;
  white-space: nowrap;
}
.seg-data__lock {
  font-style: normal;
  font-size: var(--fs-micro);
  margin-left: 2px;
  opacity: 0.55;
}

/* ---------- 底部提示条 ---------- */
.notice {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px var(--space-3);
  border-top: var(--border-line);
  background: var(--color-primary-tint);
  font-size: var(--fs-label);
  color: var(--color-primary-deep);
}
.notice__icon {
  flex: none;
  color: var(--color-primary);
}
.notice__text {
  font-weight: var(--fw-medium);
}
.notice__meta {
  margin-left: auto;
  flex: none;
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
</style>
