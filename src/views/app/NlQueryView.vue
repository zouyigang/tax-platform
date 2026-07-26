<script setup lang="ts">
/**
 * 智能应用 · 自然语言取数(《需求文档》5.5)
 * 无设计稿;三页里只有这页是对话形态,但与「政策智能问答」的差别是本质的:
 *   问答的载体是文字与法条依据,取数的载体是**图表与表格**;
 *   问答的侧栏是引用来源,取数的侧栏是**指标字典**(可浏览、可插入提问);
 *   并且取数必须回答两个问答页没有的问题 ——
 *     「你把我的话理解成了什么」(答案上方的语义层映射)
 *     「你到底查了什么」(答案下方可折叠的 SQL)。
 * 不给这两样,数出得再快也不敢用。
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { NlAnswer, NlMessage, NlMetricDictItem } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import Toast from '@/components/common/Toast.vue'
import BarChart from '@/components/charts/BarChart.vue'
import LineChart from '@/components/charts/LineChart.vue'

const session = useResource(() => api.app.getNlSession())
const se = computed(() => session.data.value)

/** 对话消息(初始取自会话预置的一轮示例) */
const messages = ref<NlMessage[]>([])
const question = ref('')
const asking = ref(false)
/** 展开了 SQL 的消息下标 */
const sqlOpen = ref<number[]>([])
const streamEl = ref<HTMLElement | null>(null)

onMounted(async () => {
  await session.load()
  if (se.value) messages.value = se.value.history.slice()
  scrollBottom()
})

async function scrollBottom() {
  await nextTick()
  const el = streamEl.value
  if (el) el.scrollTop = el.scrollHeight
}

/* ---------------- 提问 ---------------- */
async function ask(text?: string) {
  const q = (text !== undefined ? text : question.value).trim()
  if (!q || asking.value) return
  question.value = ''
  messages.value.push({ role: 'user', text: q, answer: null, time: nowTime() })
  asking.value = true
  scrollBottom()
  try {
    const answer = await api.app.askNlQuery(q)
    messages.value.push({ role: 'system', text: '', answer, time: nowTime() })
  } catch (e) {
    messages.value.push({
      role: 'system',
      text: e instanceof Error ? e.message : '查询失败,请稍后重试',
      answer: null,
      time: nowTime(),
    })
  } finally {
    asking.value = false
    scrollBottom()
  }
}

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toggleSql(i: number) {
  const k = sqlOpen.value.indexOf(i)
  if (k >= 0) sqlOpen.value.splice(k, 1)
  else sqlOpen.value.push(i)
}

/* ---------------- 指标字典 ---------------- */
const dictCategory = ref('all')
const dictOptions = computed(() => {
  const cats: string[] = []
  ;(se.value ? se.value.dict : []).forEach((d) => {
    if (cats.indexOf(d.category) < 0) cats.push(d.category)
  })
  return [{ value: 'all', label: '全部分类' }].concat(cats.map((c) => ({ value: c, label: c })))
})
const dictList = computed(() => {
  const list = se.value ? se.value.dict : []
  return dictCategory.value === 'all' ? list : list.filter((d) => d.category === dictCategory.value)
})
/** 点击指标名插入到提问框(而不是直接发问,留给用户补全语境) */
function insertMetric(d: NlMetricDictItem) {
  question.value = question.value ? `${question.value}${d.name}` : `${d.name}`
  toast(`已插入指标「${d.name}」,可继续补充维度与时间范围`)
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}

/* ---------------- 展示辅助 ---------------- */
const KIND_LABEL: Record<string, string> = { table: '明细表', bar: '柱状图', line: '趋势线', metric: '单指标' }
function cellValue(row: Record<string, string | number>, key: string): string | number {
  return row[key]
}
function answerOf(m: NlMessage): NlAnswer {
  return m.answer as NlAnswer
}
</script>

<template>
  <div class="nl">
    <PageHeader title="自然语言取数" breadcrumb="首页 / 智能应用 / 自然语言取数">
      <template #actions>
        <span class="nl__mode">语义层 v2.3 · 只读分析视图</span>
        <button type="button" class="btn" @click="toast('演示环境:结果导出需连接报表服务')">导出结果</button>
      </template>
    </PageHeader>

    <div class="nl__body">
      <!-- ══════════ 中:对话区 ══════════ -->
      <section class="chat">
        <div ref="streamEl" class="stream">
          <StateBlock :status="session.status.value" :error="session.error.value" @retry="session.load()">
            <template v-if="se">
              <div class="hello">
                <div class="hello__title">自然语言取数</div>
                <p class="hello__text">{{ se.greeting }}</p>
                <div class="hello__samples">
                  <button
                    v-for="s in se.samples"
                    :key="s"
                    type="button"
                    class="sample"
                    :disabled="asking"
                    @click="ask(s)"
                  >{{ s }}</button>
                </div>
              </div>

              <div v-for="(m, i) in messages" :key="i" class="msg" :class="`msg--${m.role}`">
                <!-- 用户提问 -->
                <div v-if="m.role === 'user'" class="ask">
                  <span class="ask__text">{{ m.text }}</span>
                  <span class="ask__time num">{{ m.time }}</span>
                </div>

                <!-- 系统回答:载体是图表与表格 -->
                <div v-else class="ans">
                  <template v-if="m.answer">
                    <!-- ① 语义层映射:先说清把话理解成了什么 -->
                    <div class="sem">
                      <span class="sem__title">语义解析</span>
                      <span class="sem__grp">
                        <i>指标</i>
                        <b v-for="x in answerOf(m).semantic.metrics" :key="x" class="sem__tag sem__tag--metric">{{ x }}</b>
                      </span>
                      <span v-if="answerOf(m).semantic.dimensions.length" class="sem__grp">
                        <i>维度</i>
                        <b v-for="x in answerOf(m).semantic.dimensions" :key="x" class="sem__tag sem__tag--dim">{{ x }}</b>
                      </span>
                      <span class="sem__grp">
                        <i>时间范围</i>
                        <b class="sem__tag sem__tag--time num">{{ answerOf(m).semantic.timeRange }}</b>
                      </span>
                      <span v-if="answerOf(m).semantic.filters.length" class="sem__grp">
                        <i>过滤</i>
                        <b v-for="x in answerOf(m).semantic.filters" :key="x" class="sem__tag">{{ x }}</b>
                      </span>
                      <span v-if="answerOf(m).semantic.unresolved.length" class="sem__grp sem__grp--warn">
                        <i>未识别</i>
                        <b v-for="x in answerOf(m).semantic.unresolved" :key="x" class="sem__tag sem__tag--warn">{{ x }}</b>
                        <em>语义层中暂无对应指标,已忽略</em>
                      </span>
                    </div>

                    <!-- ② 结果本体 -->
                    <div class="res">
                      <div class="res__head">
                        <span class="res__kind">{{ KIND_LABEL[answerOf(m).kind] }}</span>
                        <span class="res__summary">{{ answerOf(m).summary }}</span>
                        <span class="res__stat num">
                          {{ answerOf(m).rowCount }} 行 · {{ answerOf(m).elapsedMs }} ms
                        </span>
                      </div>

                      <!-- 表格 -->
                      <div v-if="answerOf(m).kind === 'table'" class="rtable-wrap">
                        <table class="rtable">
                          <thead>
                            <tr>
                              <th
                                v-for="c in answerOf(m).columns"
                                :key="c.key"
                                :style="{ textAlign: c.numeric ? 'right' : 'left' }"
                              >{{ c.label }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="(r, ri) in answerOf(m).rows" :key="ri">
                              <td
                                v-for="c in answerOf(m).columns"
                                :key="c.key"
                                :class="{ num: c.numeric }"
                                :style="{ textAlign: c.numeric ? 'right' : 'left' }"
                              >{{ cellValue(r, c.key) }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <!-- 柱状 -->
                      <div v-else-if="answerOf(m).kind === 'bar'" class="rchart">
                        <BarChart :items="answerOf(m).bars" :unit="answerOf(m).unit" />
                      </div>

                      <!-- 折线 -->
                      <div v-else-if="answerOf(m).kind === 'line'" class="rchart">
                        <LineChart :points="answerOf(m).points" />
                      </div>

                      <!-- 单指标 -->
                      <div v-else-if="answerOf(m).metric" class="rmetric">
                        <div class="rmetric__label">{{ answerOf(m).metric!.label }}</div>
                        <div class="rmetric__value num">
                          {{ answerOf(m).metric!.value }}<span>{{ answerOf(m).metric!.unit }}</span>
                        </div>
                        <div class="rmetric__note">{{ answerOf(m).metric!.note }}</div>
                      </div>
                    </div>

                    <!-- ③ 生成的 SQL:默认折叠 -->
                    <div class="sql">
                      <div class="sql__bar" @click="toggleSql(i)">
                        <span class="sql__toggle">{{ sqlOpen.indexOf(i) >= 0 ? '▾' : '▸' }}</span>
                        查看生成的 SQL
                        <span class="sql__hint">实际执行语句,可复核口径与过滤条件</span>
                        <span class="ask__time num">{{ m.time }}</span>
                      </div>
                      <pre v-if="sqlOpen.indexOf(i) >= 0" class="sql__code">{{ answerOf(m).sql }}</pre>
                    </div>
                  </template>

                  <!-- 出错时只给一句话,不伪造结果 -->
                  <div v-else class="ans__error">{{ m.text }}</div>
                </div>
              </div>

              <div v-if="asking" class="thinking">正在解析语义并查询只读视图…</div>
            </template>
          </StateBlock>
        </div>

        <!-- 提问框 -->
        <div class="composer">
          <textarea
            v-model="question"
            class="composer__input"
            rows="2"
            placeholder="例如:各区县今年以来的入库税额排名"
            :disabled="asking"
            @keydown.enter.exact.prevent="ask()"
          ></textarea>
          <button type="button" class="btn btn--primary composer__btn" :disabled="asking || !question.trim()" @click="ask()">
            {{ asking ? '查询中…' : '取数' }}
          </button>
        </div>

        <!-- 底部权限提示 -->
        <div v-if="se" class="scope">
          <span class="scope__icon">ⓘ</span>{{ se.scopeNote }}
        </div>
      </section>

      <!-- ══════════ 右:指标字典 ══════════ -->
      <aside class="dict">
        <div class="dict__head">
          <span class="dict__title">指标字典</span>
          <span v-if="se" class="dict__count num">{{ dictList.length }} 项</span>
        </div>
        <div class="dict__filter">
          <BaseSelect v-model="dictCategory" :options="dictOptions" width="100%" />
        </div>
        <div class="dict__list">
          <div v-for="d in dictList" :key="d.key" class="dict__item">
            <div class="dict__top">
              <span class="dict__name" @click="insertMetric(d)">{{ d.name }}</span>
              <span class="dict__unit num">{{ d.unit }}</span>
            </div>
            <div class="dict__caliber">口径:{{ d.caliber }}</div>
            <div class="dict__source num">来源:{{ d.source }}</div>
          </div>
        </div>
        <div class="dict__foot">点击指标名可插入提问框,再补充维度与时间范围</div>
      </aside>
    </div>

    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.nl {
  /* 页面级令牌:侧栏宽度与单指标大数字 */
  --nl-dict: 300px;
  --nl-metric-fs: 34px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.nl__mode {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.nl__body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) 20px;
}

/* ---------- 对话区 ---------- */
.chat {
  flex: 1;
  min-width: 0;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.stream {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-4) var(--space-4) var(--space-2);
}

.hello {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  background: var(--color-neutral-100);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
}
.hello__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.hello__text {
  margin: 4px 0 10px;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  line-height: 1.6;
}
.hello__samples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sample {
  font-family: inherit;
  font-size: var(--fs-label);
  color: var(--color-primary);
  background: var(--color-panel);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-control);
  padding: 4px 12px;
  cursor: pointer;
}
.sample:hover {
  background: var(--color-primary-tint);
}
.sample:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.msg {
  margin-bottom: var(--space-4);
}
/* 用户提问:右侧气泡 */
.ask {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: var(--space-2);
}
.ask__text {
  max-width: 70%;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-control);
  padding: 7px 14px;
  line-height: 1.6;
}
.ask__time {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  flex: none;
}

/* 系统回答:不是气泡,是结果块 */
.ans {
  margin-top: var(--space-3);
}
.ans__error {
  color: var(--color-danger);
  background: var(--color-risk-high-tint);
  border: 1px solid var(--color-risk-high);
  border-radius: var(--radius-control);
  padding: 8px 12px;
}

/* ① 语义层映射 */
.sem {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  background: var(--color-neutral-100);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control) var(--radius-control) 0 0;
  border-bottom: none;
  padding: 7px 12px;
}
.sem__title {
  font-size: var(--fs-micro);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-600);
}
.sem__grp {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.sem__grp i {
  font-style: normal;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.sem__tag {
  font-size: var(--fs-micro);
  color: var(--color-neutral-700);
  background: var(--color-panel);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-control);
  padding: 0 6px;
}
.sem__tag--metric {
  color: var(--color-primary-deep);
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}
.sem__tag--dim {
  color: var(--color-secondary-teal);
  border-color: var(--color-secondary-teal);
}
.sem__tag--time {
  color: var(--color-neutral-800);
}
.sem__grp--warn i,
.sem__grp--warn em {
  color: var(--color-risk-mid-text);
  font-style: normal;
  font-size: var(--fs-micro);
}
.sem__tag--warn {
  color: var(--color-risk-mid-text);
  border-color: var(--color-risk-mid);
  background: var(--color-risk-mid-tint);
}

/* ② 结果本体 */
.res {
  border: 1px solid var(--color-neutral-200);
  background: var(--color-panel);
  padding: var(--space-3);
}
.res__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.res__kind {
  font-size: var(--fs-micro);
  color: var(--color-text-inverse);
  background: var(--color-secondary-steel);
  border-radius: var(--radius-control);
  padding: 1px 7px;
  flex: none;
}
.res__summary {
  font-size: var(--fs-aux);
  color: var(--color-neutral-800);
  flex: 1;
  min-width: 0;
}
.res__stat {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  flex: none;
}

.rtable-wrap {
  overflow-x: auto;
}
.rtable {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-aux);
}
.rtable th {
  background: var(--color-neutral-100);
  border-bottom: var(--border-line);
  padding: 7px 12px;
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.rtable td {
  padding: 7px 12px;
  border-bottom: 1px solid var(--color-neutral-200);
}
.rtable tbody tr:hover {
  background: var(--color-row-hover);
}

.rchart {
  height: 240px;
}
.rmetric {
  padding: var(--space-3) 0 var(--space-2);
}
.rmetric__label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.rmetric__value {
  font-size: var(--nl-metric-fs);
  font-weight: var(--fw-semibold);
  color: var(--color-primary-deep);
  line-height: 1.2;
}
.rmetric__value span {
  font-size: var(--fs-body);
  font-weight: var(--fw-regular);
  color: var(--color-neutral-600);
  margin-left: 4px;
}
.rmetric__note {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  margin-top: 3px;
  line-height: 1.5;
}

/* ③ SQL 折叠 */
.sql {
  border: 1px solid var(--color-neutral-200);
  border-top: none;
  border-radius: 0 0 var(--radius-control) var(--radius-control);
  overflow: hidden;
}
.sql__bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 12px;
  background: var(--color-neutral-100);
  cursor: pointer;
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
}
.sql__bar:hover {
  color: var(--color-primary);
}
.sql__toggle {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.sql__hint {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.sql__bar .ask__time {
  margin-left: auto;
}
.sql__code {
  margin: 0;
  padding: 10px 14px;
  background: var(--color-surface-dark);
  color: var(--color-surface-fg);
  font-family: var(--font-sans);
  font-size: var(--fs-micro);
  line-height: 1.75;
  white-space: pre;
  overflow-x: auto;
  font-variant-numeric: tabular-nums;
}

.thinking {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  padding: var(--space-2) 0;
}

/* 提问框 */
.composer {
  flex: none;
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3);
  border-top: var(--border-line);
}
.composer__input {
  flex: 1;
  min-width: 0;
  resize: none;
  font-family: inherit;
  font-size: var(--fs-aux);
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 8px 12px;
  outline: none;
}
.composer__input:focus {
  border-color: var(--color-primary);
}
.composer__input::placeholder {
  color: var(--color-neutral-500);
}
.composer__btn {
  flex: none;
  width: 92px;
}
.composer__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 底部权限提示 */
.scope {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px var(--space-3);
  border-top: 1px solid var(--color-neutral-200);
  background: var(--color-primary-tint);
  font-size: var(--fs-micro);
  color: var(--color-primary-deep);
}
.scope__icon {
  flex: none;
  color: var(--color-primary);
}

/* ---------- 指标字典 ---------- */
.dict {
  width: var(--nl-dict);
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.dict__head {
  flex: none;
  height: 40px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  border-bottom: var(--border-line);
}
.dict__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.dict__count {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.dict__filter {
  flex: none;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-neutral-200);
}
.dict__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-2) var(--space-3);
}
.dict__item {
  border-bottom: 1px solid var(--color-neutral-200);
  padding: 8px 0;
}
.dict__item:last-child {
  border-bottom: none;
}
.dict__top {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.dict__name {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-primary);
  cursor: pointer;
  flex: 1;
  min-width: 0;
}
.dict__name:hover {
  text-decoration: underline;
}
.dict__unit {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.dict__caliber {
  font-size: var(--fs-micro);
  color: var(--color-neutral-700);
  line-height: 1.55;
  margin-top: 2px;
}
.dict__source {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-top: 1px;
}
.dict__foot {
  flex: none;
  padding: 7px var(--space-3);
  border-top: 1px solid var(--color-neutral-200);
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  line-height: 1.5;
}
</style>
