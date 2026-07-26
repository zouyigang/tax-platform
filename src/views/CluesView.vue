<script setup lang="ts">
/**
 * 核查处置工作台(《需求文档》7.3 / 7.4)
 * 由设计稿「风险线索工作台」的详情抽屉拆分升格为独立整页:
 *   左:风险点明细(放大)+ 比对数据对照 + 核查过程时间线
 *   右:结果回填表单(7.4)+ 证据材料上传
 * 无 id 时展示引导空态,提示前往「风险线索池」选取线索。
 * 取数经 @/api/client;提交/退回走二次确认(《交互说明》4.3),成功以 toast 反馈。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'
import DisposalForm from '@/components/clues/DisposalForm.vue'
import { CLUE_STATUS_LABEL, CLUE_STATUS_TONE, RISK_LABEL, RISK_TONE, toneClass } from '@/components/common/tone'

const route = useRoute()
const router = useRouter()

const clueId = computed(() => (route.params.id as string) || '')

const detail = useResource(() => api.clues.getClueDetail(clueId.value))
const options = useResource(() => api.clues.getClueDisposalOptions())

function loadAll() {
  if (!clueId.value) return
  detail.load()
  options.load()
}

onMounted(loadAll)
watch(clueId, loadAll)

/** 概览卡 → 该户一户式档案 */
function openArchive() {
  const d = detail.data.value
  if (d) router.push(`/archive?taxpayerId=${encodeURIComponent(d.taxId)}`)
}

/* ---------------- 二次确认 + toast ---------------- */
const toastVisible = ref(false)
const toastText = ref('')
const toastTone = ref<'success' | 'primary'>('success')
function toast(text: string, tone: 'success' | 'primary' = 'success') {
  toastText.value = text
  toastTone.value = tone
  toastVisible.value = true
}

const submitOpen = ref(false)
function onFormSubmit() {
  // DisposalForm 已在内部完成整表校验,校验通过才会触发本事件
  submitOpen.value = true
}
function confirmSubmit() {
  submitOpen.value = false
  toast('处置结果已提交,线索状态已更新为「已办结」')
}
function onSaveDraft() {
  toast('草稿已保存', 'primary')
}

const returnOpen = ref(false)
function confirmReturn(reason: string) {
  returnOpen.value = false
  toast(`线索已退回:${reason}`)
}

function backToPool() {
  router.push('/risk-pool')
}
</script>

<template>
  <div class="wb">
    <PageHeader title="核查处置工作台" breadcrumb="首页 / 风险管理 / 核查处置工作台">
      <template #actions>
        <button type="button" class="btn" @click="backToPool">返回列表</button>
        <button v-if="clueId" type="button" class="btn" @click="returnOpen = true">退回</button>
      </template>
    </PageHeader>

    <!-- 无 id:引导空态 -->
    <div v-if="!clueId" class="wb__empty">
      <div class="wb__empty-icon">▤</div>
      <div class="wb__empty-title">请选择一条风险线索进行核查处置</div>
      <div class="wb__empty-hint">核查处置工作台按线索逐条办理,请先从风险线索池选取。</div>
      <button type="button" class="btn btn--primary" @click="backToPool">前往风险线索池</button>
    </div>

    <div v-else class="wb__body">
      <!-- 概览条 -->
      <StateBlock :status="detail.status.value" :error="detail.error.value" @retry="detail.load()">
        <template v-if="detail.data.value">
          <div class="wb__overview">
            <div class="wb__ov-main">
              <div class="wb__ov-line">
                <span class="wb__ov-id num">{{ detail.data.value.id }}</span>
                <BaseBadge :tone="RISK_TONE[detail.data.value.riskLevel]">
                  {{ RISK_LABEL[detail.data.value.riskLevel] }}
                </BaseBadge>
              </div>
              <div class="wb__ov-name">
                {{ detail.data.value.taxpayerName }}
                <button type="button" class="btn wb__ov-archive" @click="openArchive">查看完整档案</button>
              </div>
              <div class="wb__ov-meta num">识别号 {{ detail.data.value.taxId }}</div>
            </div>
            <div class="wb__ov-metrics">
              <div class="wb__ov-metric">
                <div class="wb__ov-metric-label">命中规则</div>
                <div class="wb__ov-metric-value num">{{ detail.data.value.hitRuleCount }} 条</div>
              </div>
              <div class="wb__ov-metric">
                <div class="wb__ov-metric-label">预估税款</div>
                <div class="wb__ov-metric-value num">{{ detail.data.value.estimatedTax.toFixed(2) }} 万</div>
              </div>
            </div>
          </div>

          <!-- 两栏 -->
          <div class="wb__cols">
            <!-- 左:风险点 + 时间线 -->
            <div class="wb__col wb__col--left">
              <section class="card">
                <div class="card__title">风险点明细 · 比对数据对照</div>
                <div class="card__body stack">
                  <div
                    v-for="r in detail.data.value.rules"
                    :key="r.no"
                    class="rule"
                    :class="toneClass(RISK_TONE[detail.data.value.riskLevel])"
                  >
                    <div class="rule__head">
                      <div class="rule__title-line">
                        <span class="rule__no num">规则 {{ r.no }}</span>
                        <span class="rule__name">{{ r.name }}</span>
                      </div>
                      <div class="rule__basis"><span class="rule__basis-label">判定依据:</span>{{ r.basis }}</div>
                    </div>
                    <div class="rule__compare">
                      <div class="rule__cell">
                        <div class="rule__cell-label">{{ r.leftLabel }}</div>
                        <div class="rule__cell-value num">{{ r.leftValue }}</div>
                      </div>
                      <div class="rule__cell rule__cell--alert">
                        <div class="rule__cell-label">{{ r.rightLabel }}</div>
                        <div class="rule__cell-value rule__cell-value--alert num">{{ r.rightValue }}</div>
                      </div>
                    </div>
                    <div class="rule__diff">⚠ 差异 {{ r.diff }}</div>
                  </div>
                </div>
              </section>

              <section class="card">
                <div class="card__title">核查过程</div>
                <div class="card__body">
                  <div class="timeline">
                    <div
                      v-for="(e, i) in detail.data.value.timeline"
                      :key="i"
                      class="tl__item"
                      :class="`tl__item--${e.state}`"
                    >
                      <div class="tl__rail">
                        <span class="tl__dot"></span>
                        <span v-if="i < detail.data.value.timeline.length - 1" class="tl__line"></span>
                      </div>
                      <div class="tl__content">
                        <div class="tl__title">{{ e.title }}</div>
                        <div class="tl__meta num">{{ e.time }} · {{ e.operator }}</div>
                        <div class="tl__note">{{ e.note }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <!-- 右:结果回填 -->
            <div class="wb__col wb__col--right">
              <section class="card">
                <div class="card__title">
                  结果回填
                  <BaseBadge
                    :tone="CLUE_STATUS_TONE[detail.data.value.status]"
                    variant="dot"
                    class="card__title-badge"
                  >
                    {{ CLUE_STATUS_LABEL[detail.data.value.status] }}
                  </BaseBadge>
                </div>
                <div class="card__body">
                  <StateBlock
                    :status="options.status.value"
                    :error="options.error.value"
                    @retry="options.load()"
                  >
                    <DisposalForm
                      v-if="options.data.value"
                      :options="options.data.value"
                      @submit="onFormSubmit"
                      @save-draft="onSaveDraft"
                    />
                  </StateBlock>
                </div>
              </section>
            </div>
          </div>
        </template>
      </StateBlock>
    </div>

    <!-- 二次确认 -->
    <ConfirmModal
      :open="submitOpen"
      title="确认提交处置结果?"
      message="提交后线索状态将更新为「已办结」,处置记录不可再修改。"
      confirm-text="确认提交"
      @confirm="confirmSubmit"
      @cancel="submitOpen = false"
    />
    <ConfirmModal
      :open="returnOpen"
      title="确认退回该线索?"
      message="退回后线索将返回风险线索池,请填写退回理由。"
      confirm-text="确认退回"
      tone="danger"
      require-reason
      reason-placeholder="请填写退回理由(必填)"
      @confirm="confirmReturn"
      @cancel="returnOpen = false"
    />
    <Toast :visible="toastVisible" :text="toastText" :tone="toastTone" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.wb {
  --wb-min-h: 940px;
  height: 100%;
  min-height: var(--wb-min-h);
  display: flex;
  flex-direction: column;
  font-size: var(--fs-aux);
  line-height: 1.55;
}

/* 空态 */
.wb__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}
.wb__empty-icon {
  font-size: 44px;
  color: var(--color-neutral-400);
  line-height: 1;
}
.wb__empty-title {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-700);
}
.wb__empty-hint {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
  margin-bottom: var(--space-2);
}

.wb__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-4) 20px;
}

/* 概览条 */
.wb__overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: var(--space-4) 20px;
  margin-bottom: var(--space-4);
}
.wb__ov-line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wb__ov-id {
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
  color: var(--color-primary);
}
.wb__ov-name {
  font-size: var(--fs-h2);
  font-weight: var(--fw-semibold);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.wb__ov-archive {
  height: 26px;
  padding: 0 10px;
  font-size: var(--fs-label);
  font-weight: var(--fw-regular);
}
.wb__ov-meta {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 2px;
}
.wb__ov-metrics {
  display: flex;
  gap: var(--space-8);
  flex: none;
}
.wb__ov-metric-label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.wb__ov-metric-value {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  margin-top: 3px;
}

/* 两栏 */
.wb__cols {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: var(--space-4);
  align-items: start;
}
.wb__col {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

/* 卡片 */
.card {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.card__title {
  height: 46px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 18px;
  border-bottom: var(--border-line);
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.card__title-badge {
  margin-left: auto;
}
.card__body {
  padding: 16px 18px;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* 风险点(放大版) */
.rule {
  border: 1px solid var(--color-neutral-200);
  background: var(--color-panel);
  border-radius: var(--radius-control);
  border-left: 3px solid var(--tone-main);
}
.rule__head {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-neutral-200);
}
.rule__title-line {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.rule__no {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  flex: none;
}
.rule__name {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
}
.rule__basis {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
  margin-top: 5px;
}
.rule__basis-label {
  color: var(--color-neutral-500);
}
.rule__compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--color-neutral-200);
}
.rule__cell {
  background: var(--color-panel);
  padding: var(--space-3) var(--space-4);
}
.rule__cell--alert {
  background: var(--color-risk-mid-tint);
}
.rule__cell-label {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-bottom: var(--space-1);
}
.rule__cell-value {
  font-size: var(--fs-h2);
  font-weight: var(--fw-semibold);
}
.rule__cell-value--alert {
  color: var(--color-risk-mid-text);
}
.rule__diff {
  padding: var(--space-2) var(--space-4);
  font-size: var(--fs-aux);
  color: var(--color-risk-mid-text);
  background: var(--color-risk-mid-tint);
}

/* 时间线 */
.timeline {
  display: flex;
  flex-direction: column;
}
.tl__item {
  display: flex;
  gap: var(--space-3);
}
.tl__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: none;
}
.tl__dot {
  width: 11px;
  height: 11px;
  flex: none;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid var(--color-primary-tint);
}
.tl__line {
  width: 1px;
  flex: 1;
  min-height: 14px;
  background: var(--color-neutral-300);
}
.tl__content {
  padding-bottom: 14px;
}
.tl__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.tl__meta {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 2px;
}
.tl__note {
  font-size: var(--fs-label);
  color: var(--color-text-sub);
  margin-top: 3px;
}
.tl__item--active .tl__dot {
  background: var(--color-status-pending);
  border-color: var(--color-status-pending-tint);
}
.tl__item--active .tl__line {
  background: var(--color-neutral-200);
}
.tl__item--pending .tl__dot {
  background: var(--color-panel);
  border-color: var(--color-neutral-400);
}
.tl__item--pending .tl__title {
  color: var(--color-neutral-500);
}

.wb__body .btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
