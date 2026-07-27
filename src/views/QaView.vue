<script setup lang="ts">
/**
 * 政策智能问答(《需求文档》5.2 / 《交互说明》1.7)
 * 左:对话区(用户/助手气泡,助手答案下方带文号溯源芯片);右:引用来源栏。
 * 溯源联动:点击答案下方的文号芯片 → 高亮并滚动定位右侧对应来源卡。
 * 建议问题「填入并发送」;新会话二次确认后清空对话。取数经 @/api/client。
 */
import { nextTick, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { QaMessage } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'
import { toneClass } from '@/components/common/tone'

const session = useResource(() => api.qa.getQaSession())

/** 本地对话副本(支持发送追加 / 新会话清空) */
const messages = ref<QaMessage[]>([])
const activeCite = ref(-1)
const input = ref('')

const chatBody = ref<HTMLElement | null>(null)

onMounted(async () => {
  await session.load()
  if (session.data.value) messages.value = session.data.value.messages.slice()
})

function scrollChatToBottom() {
  nextTick(() => {
    if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight
  })
}

/** 点击溯源芯片:高亮并滚动定位右侧来源卡 */
function focusSource(idx: number) {
  activeCite.value = idx
  nextTick(() => {
    const el = document.getElementById(`qa-src-${idx}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

/** 发送:追加用户提问 + 演示环境说明(不虚构政策答案) */
function send() {
  const t = input.value.trim()
  if (!t) return
  messages.value.push({ role: 'user', text: t, paras: [], citeIndexes: [] })
  messages.value.push({
    role: 'assistant',
    text: '',
    paras: [
      '本演示环境未接入在线政策检索,以上为知识库中的示例问答;正式部署后将返回实时检索生成的答案,并附文号与条款溯源。',
    ],
    citeIndexes: [],
  })
  input.value = ''
  scrollChatToBottom()
}

/** 建议问题:填入并发送(《交互说明》1.7) */
function pickSuggestion(q: string) {
  input.value = q
  send()
}

/* 新会话:二次确认后清空 */
const newChatOpen = ref(false)
function confirmNewChat() {
  newChatOpen.value = false
  messages.value = []
  activeCite.value = -1
  input.value = ''
}

/* 轻量反馈 */
const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}
</script>

<template>
  <div class="qa">
    <PageHeader title="政策智能问答" breadcrumb="首页 / 智能应用 / 政策智能问答">
      <template #actions>
        <div v-if="session.data.value" class="qa__scope">
          知识库范围:{{ session.data.value.knowledgeScope }}
          <span class="qa__scope-caret">▾</span>
        </div>
        <button type="button" class="btn" @click="newChatOpen = true">新会话</button>
      </template>
    </PageHeader>

    <div class="qa__body">
      <StateBlock :status="session.status.value" :error="session.error.value" @retry="session.load()">
        <template v-if="session.data.value">
          <div class="qa__layout">
            <!-- ══ 对话区 ══ -->
            <div class="chat">
              <div ref="chatBody" class="chat__scroll">
                <div v-if="messages.length" class="chat__inner">
                  <template v-for="(m, mi) in messages" :key="mi">
                    <!-- 用户 -->
                    <div v-if="m.role === 'user'" class="msg msg--user">
                      <div class="msg__bubble">{{ m.text }}</div>
                      <div class="msg__avatar msg__avatar--user">李</div>
                    </div>

                    <!-- 助手 -->
                    <div v-else class="msg msg--bot">
                      <div class="msg__avatar msg__avatar--bot">✦</div>
                      <div class="msg__card">
                        <p v-for="(p, pi) in m.paras" :key="pi" class="msg__para">{{ p }}</p>

                        <div v-if="m.citeIndexes.length" class="cites">
                          <div class="cites__label">政策依据溯源</div>
                          <div class="cites__row">
                            <span
                              v-for="ci in m.citeIndexes"
                              :key="ci"
                              class="cite"
                              :class="{ 'cite--on': activeCite === ci }"
                              @click="focusSource(ci)"
                            >
                              <span class="cite__no num">[{{ session.data.value.sources[ci].no }}]</span>
                              {{ session.data.value.sources[ci].docNo }}
                            </span>
                          </div>
                        </div>

                        <div class="msg__acts">
                          <span @click="toast('已复制到剪贴板')">⧉ 复制</span>
                          <span @click="toast('感谢反馈')">👍 有帮助</span>
                          <span @click="toast('已记录你的反馈')">⚑ 反馈</span>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- 空态:新会话后 -->
                <div v-else class="chat__empty">
                  <div class="chat__empty-icon">✦</div>
                  <div class="chat__empty-title">开始新的政策问答</div>
                  <div class="chat__empty-hint">输入涉税政策问题,或从下方建议问题开始。</div>
                </div>
              </div>

              <!-- 输入区 -->
              <div class="composer">
                <div class="composer__inner">
                  <div class="composer__suggests">
                    <span
                      v-for="q in session.data.value.suggestions"
                      :key="q"
                      class="suggest"
                      @click="pickSuggestion(q)"
                    >
                      {{ q }}
                    </span>
                  </div>
                  <div class="composer__box">
                    <textarea
                      v-model="input"
                      class="composer__input"
                      rows="1"
                      placeholder="请输入涉税政策问题,例如“小微企业所得税优惠的适用条件”……"
                      @keydown.enter.exact.prevent="send"
                    ></textarea>
                    <button type="button" class="btn btn--primary composer__send" @click="send">发送</button>
                  </div>
                  <div class="composer__hint">
                    回答由平台知识库检索生成,文号与条款均可溯源;涉及具体征管口径请以主管税务机关意见为准。
                  </div>
                </div>
              </div>
            </div>

            <!-- ══ 引用来源 ══ -->
            <aside class="sources">
              <div class="sources__head">
                <span class="sources__title">引用来源</span>
                <span class="sources__count num">共 {{ session.data.value.sources.length }} 篇</span>
              </div>
              <div class="sources__body">
                <div
                  v-for="(s, i) in session.data.value.sources"
                  :id="`qa-src-${i}`"
                  :key="s.no"
                  class="src"
                  :class="{ 'src--on': activeCite === i }"
                >
                  <div class="src__head">
                    <span class="src__no num">{{ s.no }}</span>
                    <div class="src__titles">
                      <div class="src__title">{{ s.title }}</div>
                      <div class="src__docno num">{{ s.docNo }}</div>
                    </div>
                  </div>
                  <div class="src__body">
                    <div class="src__clause">引用条款:{{ s.clause }}</div>
                    <div class="src__snippet">{{ s.snippet }}</div>
                  </div>
                  <div class="src__foot">
                    <span class="src__effect" :class="toneClass(s.effectTone)">{{ s.effect }}</span>
                    <span class="src__date num">生效 {{ s.date }}</span>
                    <span class="src__more" @click="toast('演示环境:政策原文库未接入')">查看原文 ›</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </template>
      </StateBlock>
    </div>

    <ConfirmModal
      :open="newChatOpen"
      title="清空当前对话?"
      message="新会话将清空当前所有问答记录,该操作不可撤销。"
      confirm-text="确认"
      @confirm="confirmNewChat"
      @cancel="newChatOpen = false"
    />
    <Toast :visible="toastVisible" :text="toastText" tone="primary" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.qa {
  /* 会话头像字号 */
  --qa-avatar: 15px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}

/* 顶部知识库范围 */
.qa__scope {
  height: 32px;
  padding: 0 12px;
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fs-aux);
  background: var(--color-panel);
  white-space: nowrap;
}
.qa__scope-caret {
  color: var(--color-neutral-500);
}

.qa__body {
  flex: 1;
  min-height: 0;
  display: flex;
}
/* ready 时 StateBlock 直接渲染插槽,qa__layout 即为 qa__body 的直接弹性子项 */
.qa__layout {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
}

/* ══ 对话区 ══ */
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.chat__scroll {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: 22px 28px;
}
.chat__inner {
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.chat__empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}
.chat__empty-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-surface-dark);
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-h2);
}
.chat__empty-title {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-700);
  margin-top: var(--space-2);
}
.chat__empty-hint {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
}

/* 消息 */
.msg {
  display: flex;
  gap: var(--space-3);
}
.msg--user {
  justify-content: flex-end;
}
.msg__bubble {
  max-width: 70%;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-control);
  padding: 11px 16px;
  font-size: var(--fs-body);
  line-height: 1.6;
}
.msg__avatar {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--fw-semibold);
}
.msg__avatar--user {
  background: var(--color-primary-tint);
  color: var(--color-primary);
}
.msg__avatar--bot {
  background: var(--color-surface-dark);
  color: var(--color-text-inverse);
  font-size: var(--qa-avatar);
  font-weight: var(--fw-regular);
}
.msg__card {
  max-width: 88%;
  background: var(--color-panel);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 16px 18px;
}
.msg__para {
  margin: 0 0 10px;
  font-size: var(--fs-body);
  line-height: 1.75;
  color: var(--color-neutral-900);
}
.msg__para:last-child {
  margin-bottom: 0;
}

/* 溯源芯片 */
.cites {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--color-neutral-200);
}
.cites__label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-bottom: var(--space-2);
}
.cites__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.cite {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--fs-label);
  padding: 5px 11px;
  border-radius: var(--radius-control);
  cursor: pointer;
  border: 1px solid var(--color-neutral-300);
  background: var(--color-neutral-100);
  color: var(--color-neutral-700);
  transition: border-color var(--motion-fast) ease, background var(--motion-fast) ease;
}
.cite:hover {
  border-color: var(--color-primary);
}
.cite--on {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
  color: var(--color-primary-deep);
}
.cite__no {
  font-weight: var(--fw-semibold);
}

.msg__acts {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-3);
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.msg__acts span {
  cursor: pointer;
}
.msg__acts span:hover {
  color: var(--color-primary);
}

/* 输入区 */
.composer {
  flex: none;
  border-top: var(--border-line);
  background: var(--color-panel);
  padding: 14px 28px 18px;
}
.composer__inner {
  max-width: 820px;
  margin: 0 auto;
}
.composer__suggests {
  display: flex;
  gap: var(--space-2);
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.suggest {
  font-size: var(--fs-label);
  padding: 5px 12px;
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-control);
  color: var(--color-neutral-700);
  cursor: pointer;
  background: var(--color-neutral-100);
  transition: border-color var(--motion-fast) ease, color var(--motion-fast) ease;
}
.suggest:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.composer__box {
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 12px 14px;
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
}
.composer__box:focus-within {
  border-color: var(--color-primary);
}
.composer__input {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: var(--fs-body);
  line-height: 1.6;
  color: var(--color-text);
  background: transparent;
  min-height: 24px;
  max-height: 120px;
}
.composer__input::placeholder {
  color: var(--color-neutral-500);
}
.composer__send {
  height: 36px;
  padding: 0 22px;
  flex: none;
}
.composer__hint {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-top: var(--space-2);
}

/* ══ 引用来源 ══ */
.sources {
  --sources-w: 380px;
  width: var(--sources-w);
  flex: none;
  background: var(--color-panel);
  border-left: var(--border-line);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.sources__head {
  flex: none;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-neutral-200);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.sources__title {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
}
.sources__count {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.sources__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.src {
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--color-surface-accent);
  border-radius: var(--radius-control);
  background: var(--color-panel);
  transition: border-color var(--motion-fast) ease, background var(--motion-fast) ease;
}
.src--on {
  border-color: var(--color-primary);
  border-left-color: var(--color-primary);
  background: var(--color-primary-tint);
}
.src__head {
  padding: 12px 14px 10px;
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}
.src__no {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-surface-accent);
  color: var(--color-text-inverse);
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  display: flex;
  align-items: center;
  justify-content: center;
}
.src--on .src__no {
  background: var(--color-primary);
}
.src__titles {
  min-width: 0;
}
.src__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  line-height: 1.4;
}
.src__docno {
  font-size: var(--fs-label);
  color: var(--color-primary);
  margin-top: 4px;
}
.src__body {
  padding: 0 14px 10px 42px;
  font-size: var(--fs-label);
  color: var(--color-text-sub);
  line-height: 1.7;
}
.src__clause {
  color: var(--color-neutral-600);
  margin-bottom: 3px;
}
.src__snippet {
  background: var(--color-neutral-100);
  border-left: 2px solid var(--color-neutral-400);
  padding: 8px 10px;
  margin-top: 6px;
  color: var(--color-neutral-700);
}
.src__foot {
  padding: 8px 14px 10px 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--fs-micro);
  border-top: 1px solid var(--color-neutral-200);
}
.src__effect {
  padding: 1px 8px;
  border-radius: var(--radius-control);
  background: var(--tone-tint);
  color: var(--tone-text);
}
.src__date {
  color: var(--color-neutral-500);
}
.src__more {
  margin-left: auto;
  color: var(--color-primary);
  cursor: pointer;
}
</style>
