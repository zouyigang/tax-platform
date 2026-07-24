/* ============================================================
 * ECharts 实例封装:挂载、随容器尺寸自适应、卸载销毁
 * ============================================================ */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import echarts from './echarts'

type ChartInstance = ReturnType<typeof echarts.init>

/**
 * @param getOption   返回 ECharts option(每次重绘时调用)
 * @param watchSource 依赖源,变化时重绘
 */
export function useChart(getOption: () => unknown, watchSource: () => unknown) {
  const el = ref<HTMLElement | null>(null)
  let chart: ChartInstance | null = null
  let ro: ResizeObserver | null = null

  function render() {
    if (!chart) return
    // 第二个参数 true:整体替换 option,避免残留旧系列
    chart.setOption(getOption() as never, true)
  }

  onMounted(() => {
    if (!el.value) return
    chart = echarts.init(el.value)
    render()
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (chart) chart.resize()
      })
      ro.observe(el.value)
    }
  })

  watch(watchSource, () => render(), { deep: true })

  onBeforeUnmount(() => {
    if (ro) ro.disconnect()
    if (chart) chart.dispose()
    ro = null
    chart = null
  })

  return { el }
}
