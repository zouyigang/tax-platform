<script setup lang="ts">
/**
 * 核查结果回填表单(《需求文档》7.4 + 《交互说明》3.2)
 * 字段:核查结论(三选一)· 问题类型(多选)· 分税种查补税款 · 滞纳金/罚款 ·
 *       误报原因(七类,结论为「误报」时必填)· 处理意见 · 证据材料上传。
 * 校验:提交时整表校验,错误显示在字段下方;顶部汇总条;误报分支互斥。
 * 本组件只负责表单与校验,提交/保存后的二次确认与 toast 由父页处理。
 */
import { computed, ref, watch } from 'vue'
import type { ClueDisposalOptions } from '@/api/types'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseCheckbox from '@/components/common/BaseCheckbox.vue'
import BaseRadioGroup from '@/components/common/BaseRadioGroup.vue'

/** 回填提交载荷 */
export interface DisposalPayload {
  conclusion: string
  problemTypes: string[]
  taxAmounts: Record<string, string>
  lateFee: string
  penalty: string
  falseReason: string
  opinion: string
  evidence: string[]
}

const props = defineProps<{ options: ClueDisposalOptions }>()

const emit = defineEmits<{
  (e: 'submit', payload: DisposalPayload): void
  (e: 'save-draft', payload: DisposalPayload): void
}>()

/* ---------------- 表单状态 ---------------- */
const conclusion = ref('')
const problemTypes = ref<string[]>([])
const taxAmounts = ref<Record<string, string>>({})
const lateFee = ref('')
const penalty = ref('')
const falseReason = ref('')
const opinion = ref('')
const evidence = ref<string[]>([])

// 税种金额行初始化(每个税种一个空值)
watch(
  () => props.options,
  (o) => {
    const next: Record<string, string> = {}
    o.taxKinds.forEach((t) => (next[t.value] = taxAmounts.value[t.value] ?? ''))
    taxAmounts.value = next
  },
  { immediate: true },
)

/** 结论为「误报」——切到误报分支 */
const isFalse = computed(() => conclusion.value === props.options.falseConclusionValue)
/** 结论为「需补缴 / 移送」——实质性问题分支 */
const isSubstantive = computed(() => conclusion.value !== '' && !isFalse.value)

/** 切换分支时清空另一分支已填内容,避免脏数据 */
watch(isFalse, (v) => {
  if (v) {
    problemTypes.value = []
    lateFee.value = ''
    penalty.value = ''
    Object.keys(taxAmounts.value).forEach((k) => (taxAmounts.value[k] = ''))
    evidence.value = []
  } else {
    falseReason.value = ''
  }
})

function toggleProblem(v: string) {
  const i = problemTypes.value.indexOf(v)
  if (i >= 0) problemTypes.value.splice(i, 1)
  else problemTypes.value.push(v)
}

/* ---------------- 证据材料(演示:模拟选取) ---------------- */
let seq = 0
function addEvidence() {
  seq += 1
  evidence.value.push(`核查佐证材料_${seq}.pdf`)
}
function removeEvidence(i: number) {
  evidence.value.splice(i, 1)
}

/* ---------------- 校验 ---------------- */
const errors = ref<Record<string, string>>({})
const showSummary = ref(false)
const errorCount = computed(() => Object.keys(errors.value).length)

/** 金额格式:空 或 非负数字、最多两位小数 */
const numOk = (v: string) => v === '' || /^\d+(\.\d{1,2})?$/.test(v)
const sumTax = computed(() =>
  Object.values(taxAmounts.value).reduce((s, v) => s + (numOk(v) && v ? Number(v) : 0), 0),
)

function collect(): DisposalPayload {
  return {
    conclusion: conclusion.value,
    problemTypes: problemTypes.value.slice(),
    taxAmounts: { ...taxAmounts.value },
    lateFee: lateFee.value,
    penalty: penalty.value,
    falseReason: falseReason.value,
    opinion: opinion.value,
    evidence: evidence.value.slice(),
  }
}

/** full=true 整表校验(提交);false 仅格式校验(存草稿) */
function validate(full: boolean): Record<string, string> {
  const e: Record<string, string> = {}
  Object.keys(taxAmounts.value).forEach((k) => {
    if (!numOk(taxAmounts.value[k])) e.taxAmounts = '金额格式不正确(数字,最多两位小数)'
  })
  if (!numOk(lateFee.value)) e.lateFee = '金额格式不正确'
  if (!numOk(penalty.value)) e.penalty = '金额格式不正确'

  if (full) {
    if (!conclusion.value) e.conclusion = '请选择核查结论'
    if (isFalse.value) {
      if (!falseReason.value) e.falseReason = '请选择误报原因'
    } else if (conclusion.value) {
      if (problemTypes.value.length === 0) e.problemTypes = '请至少选择一项问题类型'
      if (!(sumTax.value > 0)) e.taxAmounts = e.taxAmounts || '请至少填写一个税种的查补金额'
      if (evidence.value.length === 0) e.evidence = '请上传核查佐证材料'
    }
    if (opinion.value.trim().length < 10) e.opinion = '请填写处理意见(不少于 10 字)'
  }
  return e
}

function onSubmit() {
  errors.value = validate(true)
  showSummary.value = errorCount.value > 0
  if (errorCount.value === 0) emit('submit', collect())
}
function onSaveDraft() {
  errors.value = validate(false)
  showSummary.value = errorCount.value > 0
  if (errorCount.value === 0) emit('save-draft', collect())
}
</script>

<template>
  <div class="df">
    <!-- 整表错误汇总条 -->
    <div v-if="showSummary && errorCount > 0" class="df__summary">
      共 {{ errorCount }} 项未通过校验,请检查标红项
    </div>

    <!-- 核查结论 -->
    <div class="field">
      <label class="field__label"><i class="req">*</i>核查结论</label>
      <BaseRadioGroup v-model="conclusion" :options="options.conclusions" />
      <div v-if="errors.conclusion" class="field__err">{{ errors.conclusion }}</div>
    </div>

    <!-- 实质性问题分支 -->
    <template v-if="isSubstantive">
      <div class="field">
        <label class="field__label"><i class="req">*</i>问题类型(可多选)</label>
        <div class="checks">
          <span
            v-for="p in options.problemTypes"
            :key="p.value"
            class="check"
            @click="toggleProblem(p.value)"
          >
            <BaseCheckbox
              :model-value="problemTypes.indexOf(p.value) >= 0"
              @update:model-value="toggleProblem(p.value)"
            />
            <span class="check__label">{{ p.label }}</span>
          </span>
        </div>
        <div v-if="errors.problemTypes" class="field__err">{{ errors.problemTypes }}</div>
      </div>

      <div class="field">
        <label class="field__label"><i class="req">*</i>分税种查补税款(元)</label>
        <div class="taxgrid">
          <div v-for="t in options.taxKinds" :key="t.value" class="taxgrid__cell">
            <span class="taxgrid__name">{{ t.label }}</span>
            <BaseInput v-model="taxAmounts[t.value]" numeric placeholder="0.00" width="100%" />
          </div>
        </div>
        <div v-if="errors.taxAmounts" class="field__err">{{ errors.taxAmounts }}</div>
      </div>

      <div class="field field--row">
        <div class="field__col">
          <label class="field__label">滞纳金(元)</label>
          <BaseInput v-model="lateFee" numeric placeholder="0.00" width="100%" />
          <div v-if="errors.lateFee" class="field__err">{{ errors.lateFee }}</div>
        </div>
        <div class="field__col">
          <label class="field__label">罚款(元)</label>
          <BaseInput v-model="penalty" numeric placeholder="0.00" width="100%" />
          <div v-if="errors.penalty" class="field__err">{{ errors.penalty }}</div>
        </div>
      </div>
    </template>

    <!-- 误报分支 -->
    <div v-if="isFalse" class="field">
      <label class="field__label"><i class="req">*</i>误报原因</label>
      <BaseRadioGroup v-model="falseReason" :options="options.falseReasons" direction="column" />
      <div v-if="errors.falseReason" class="field__err">{{ errors.falseReason }}</div>
    </div>

    <!-- 处理意见 -->
    <div class="field">
      <label class="field__label"><i class="req">*</i>处理意见</label>
      <textarea
        v-model="opinion"
        class="df__textarea"
        placeholder="请填写核查结论及处理意见(不少于 10 字)……"
      ></textarea>
      <div v-if="errors.opinion" class="field__err">{{ errors.opinion }}</div>
    </div>

    <!-- 证据材料上传 -->
    <div class="field">
      <label class="field__label">
        <i v-if="isSubstantive" class="req">*</i>证据材料
      </label>
      <div class="upload" @click="addEvidence">
        <span class="upload__plus">＋</span>
        点击上传核查佐证材料(pdf/jpg/png,单文件 ≤20MB)
      </div>
      <ul v-if="evidence.length" class="filelist">
        <li v-for="(f, i) in evidence" :key="i" class="filelist__item">
          <span class="filelist__name num">{{ f }}</span>
          <span class="filelist__del" @click="removeEvidence(i)">✕</span>
        </li>
      </ul>
      <div v-if="errors.evidence" class="field__err">{{ errors.evidence }}</div>
    </div>

    <!-- 操作 -->
    <div class="df__actions">
      <button type="button" class="btn" @click="onSaveDraft">保存草稿</button>
      <button type="button" class="btn btn--primary" @click="onSubmit">提交处置</button>
    </div>
  </div>
</template>

<style scoped>
.df {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.df__summary {
  font-size: var(--fs-aux);
  color: var(--color-risk-high-text);
  background: var(--color-risk-high-tint);
  border-radius: var(--radius-control);
  padding: var(--space-2) var(--space-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.field--row {
  flex-direction: row;
  gap: var(--space-4);
}
.field__col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.field__label {
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  font-weight: var(--fw-medium);
}
.req {
  color: var(--color-danger);
  font-style: normal;
  margin-right: 3px;
}
.field__err {
  font-size: var(--fs-label);
  color: var(--color-danger);
}

.checks {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2) var(--space-4);
}
.check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--fs-aux);
  color: var(--color-neutral-800);
}

.taxgrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}
.taxgrid__cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.taxgrid__name {
  flex: none;
  width: 84px;
  font-size: var(--fs-aux);
  color: var(--color-neutral-700);
}

.df__textarea {
  width: 100%;
  min-height: 84px;
  padding: var(--space-2) var(--space-3);
  border: var(--border-line);
  border-radius: var(--radius-control);
  font-family: inherit;
  font-size: var(--fs-aux);
  color: var(--color-text);
  resize: vertical;
  outline: none;
}
.df__textarea:focus {
  border-color: var(--color-primary);
}

.upload {
  height: 60px;
  border: 1px dashed var(--color-neutral-400);
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  background: var(--color-panel);
  cursor: pointer;
  transition: border-color var(--motion-fast) ease, color var(--motion-fast) ease;
}
.upload:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.upload__plus {
  font-size: var(--fs-h3);
}
.filelist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.filelist__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  font-size: var(--fs-label);
}
.filelist__name {
  color: var(--color-primary);
}
.filelist__del {
  color: var(--color-neutral-500);
  cursor: pointer;
}
.filelist__del:hover {
  color: var(--color-danger);
}

.df__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-neutral-200);
}
</style>
