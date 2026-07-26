<script setup lang="ts">
/**
 * 原始材料预览 · 抽取字段高亮
 * 演示环境不接真实扫描件,原件由接口下发的版式块(DocBlock)按页面百分比绘制;
 * 字段的 box 与版式块同一坐标系,所以高亮框能精确套在取值所在的位置上。
 * 点击高亮框向父级抛出字段 key,由父级完成与右侧表单的双向定位。
 */
import type { DocBlock, ExtractField } from '@/api/types'

withDefaults(
  defineProps<{
    /** 原件版式 */
    layout: DocBlock[]
    /** 抽取字段(取其 box 画高亮) */
    fields: ExtractField[]
    /** 当前选中的字段 key */
    activeKey?: string
    /** 已人工确认的字段 key */
    confirmedKeys?: string[]
  }>(),
  { activeKey: '', confirmedKeys: () => [] },
)

const emit = defineEmits<{ (e: 'select', key: string): void }>()
</script>

<template>
  <div class="page-wrap">
    <!-- A4 比例纸张:用 padding-top 撑高宽比,不使用 aspect-ratio(兼容 chrome80) -->
    <div class="page">
      <div class="page__inner">
        <!-- 版式文本 -->
        <div
          v-for="(b, i) in layout"
          :key="`b${i}`"
          class="blk"
          :class="[`blk--${b.size}`, { 'blk--bold': b.bold }]"
          :style="{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, textAlign: b.align }"
        >{{ b.text }}</div>

        <!-- 抽取字段高亮框 -->
        <div
          v-for="f in fields"
          :key="f.key"
          class="hl"
          :class="{
            'hl--on': f.key === activeKey,
            'hl--warn': f.needConfirm && confirmedKeys.indexOf(f.key) < 0,
            'hl--ok': confirmedKeys.indexOf(f.key) >= 0,
          }"
          :style="{ left: `${f.box.x}%`, top: `${f.box.y}%`, width: `${f.box.w}%`, height: `${f.box.h}%` }"
          :title="`${f.label}:${f.value}`"
          @click="emit('select', f.key)"
        >
          <span v-if="f.key === activeKey" class="hl__tag">{{ f.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-wrap {
  /* 组件级令牌:纸张字号不在全局字阶内(要模拟打印件的相对大小) */
  --doc-title: 17px;
  --doc-sub: 13px;
  --doc-body: 12px;
  --doc-small: 11px;

  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--color-neutral-200);
  padding: var(--space-4);
}
.page {
  position: relative;
  width: 100%;
  /* A4 高宽比 1:1.414 */
  padding-top: 141.4%;
  background: var(--color-panel);
  box-shadow: var(--shadow-md);
}
.page__inner {
  position: absolute;
  inset: 0;
}

.blk {
  position: absolute;
  color: var(--color-neutral-900);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
.blk--title {
  font-size: var(--doc-title);
  letter-spacing: 0.1em;
}
.blk--sub {
  font-size: var(--doc-sub);
}
.blk--body {
  font-size: var(--doc-body);
}
.blk--small {
  font-size: var(--doc-small);
  color: var(--color-neutral-700);
}
.blk--bold {
  font-weight: var(--fw-semibold);
}

/* 高亮框:常态描边,选中填充,低置信标黄,已确认转绿 */
.hl {
  position: absolute;
  border: 1px solid var(--color-primary);
  background-color: transparent;
  border-radius: 1px;
  cursor: pointer;
  transition: background-color var(--motion-fast) ease, border-color var(--motion-fast) ease;
}
.hl:hover {
  background-color: var(--color-primary-tint);
}
.hl--on {
  border-width: 2px;
  border-color: var(--color-primary-deep);
  background-color: var(--color-primary-tint);
  box-shadow: var(--shadow-selected);
}
.hl--warn {
  border-color: var(--color-risk-mid);
}
.hl--warn:hover,
.hl--warn.hl--on {
  background-color: var(--color-risk-mid-tint);
  border-color: var(--color-risk-mid);
}
.hl--ok {
  border-color: var(--color-status-normal);
}
.hl--ok:hover,
.hl--ok.hl--on {
  background-color: var(--color-status-normal-tint);
  border-color: var(--color-status-normal);
}
.hl__tag {
  position: absolute;
  left: 0;
  top: -16px;
  font-size: var(--fs-micro);
  line-height: 1.3;
  white-space: nowrap;
  color: var(--color-text-inverse);
  background: var(--color-primary-deep);
  border-radius: var(--radius-control);
  padding: 0 5px;
}
</style>
