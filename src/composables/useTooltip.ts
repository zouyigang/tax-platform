/* ============================================================
 * 图表悬停 Tooltip 状态(《决策分析 handoff》全站统一 tooltip)
 * 定位于触发元素下方居中(+10px),视口边缘钳位,超出下缘翻转到上方。
 * ============================================================ */
import { ref } from 'vue'

/** tooltip 行 */
export interface TipRow {
  /** 键(浅蓝) */
  k: string
  /** 值(白色加粗) */
  v: string
}

export interface TipState {
  show: boolean
  x: number
  y: number
  title: string
  rows: TipRow[]
}

export function useTooltip() {
  const tip = ref<TipState>({ show: false, x: 0, y: 0, title: '', rows: [] })

  function showTip(e: MouseEvent, title: string, rows: TipRow[]) {
    const el = e.currentTarget as Element | null
    if (!el) return
    const r = el.getBoundingClientRect()
    let x = r.left + r.width / 2 - 100
    let y = r.bottom + 10
    x = Math.max(12, Math.min(x, window.innerWidth - 240))
    if (y > window.innerHeight - 170) y = r.top - 150
    tip.value = { show: true, x, y, title, rows }
  }

  function hideTip() {
    tip.value = { ...tip.value, show: false }
  }

  return { tip, showTip, hideTip }
}
