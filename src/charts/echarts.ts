/* ============================================================
 * ECharts 按需引入（tree-shaking,减小内网体积）
 * 仅注册领导驾驶舱用到的图表:折线(趋势) + 饼(环形)。
 * 交互克制:不注册 Tooltip/Legend,图表保持与设计稿一致的静态呈现。
 * ============================================================ */
import * as echarts from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, PieChart, GridComponent, CanvasRenderer])

export default echarts
