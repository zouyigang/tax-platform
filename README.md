# 智慧综合治税与税收风险智能分析平台 · 静态演示工程

面向地市级税务局的政务内网系统前端演示工程。
技术栈 **Vue 3 + Vite + Vue Router + ECharts**，**不引入任何 UI 组件库**，全部组件自绘。

视觉与布局 1:1 复刻 Claude Design 设计稿，设计令牌以 `src/styles/tokens.css` 为唯一来源。
基调：专业、克制、可信 —— 不做互联网产品的活泼感，不做大屏炫光效果。

---

## 一、快速开始

### 1. 环境要求

| 项 | 要求 | 当前验证环境 |
|---|---|---|
| Node.js | ≥ 18（Vite 5 要求） | v22.20.0 |
| npm | ≥ 9 | 10.9.3 |
| 浏览器 | Chrome / Edge 80+ | — |

### 2. 安装依赖

```bash
npm install
```

> **内网 / 公网源不通时**，改用国内镜像（只对本次安装生效，不改动全局配置）：
>
> ```bash
> npm install --registry=https://registry.npmmirror.com
> ```
>
> 若安装中断过，先清理再装：
> `rm -rf node_modules package-lock.json`（Windows PowerShell：`Remove-Item -Recurse -Force node_modules, package-lock.json`）

### 3. 启动前端服务（开发模式）

```bash
npm run dev
```

启动后终端输出：

```
  VITE v5.4.21  ready in 277 ms

  ➜  Local:   http://localhost:5173/
```

**浏览器访问：<http://localhost:5173/>**
默认自动重定向到领导驾驶舱：`http://localhost:5173/#/dashboard`

> 采用 **hash 路由**（`#/`），因此可直接部署到任意静态服务器，无需后端配置 URL 重写。

常用参数：

```bash
npm run dev -- --port 8080     # 指定端口（默认 5173，被占用时自动顺延）
npm run dev -- --host          # 暴露到局域网，供同网段其他机器访问
npm run dev -- --open          # 启动后自动打开浏览器
```

停止服务：终端按 `Ctrl + C`。

### 4. 生产构建与本地预览

```bash
npm run build      # 类型检查(vue-tsc) + 生产构建，产物输出到 dist/
npm run preview    # 以静态服务器预览 dist/，默认 http://localhost:4173/
```

`dist/` 为纯静态文件，可直接拷贝到 Nginx / IIS 等任意静态服务器的站点目录下部署。

### 5. 常见问题

| 现象 | 处理 |
|---|---|
| 端口 5173 被占用 | Vite 会自动顺延到 5174…；或用 `--port` 指定 |
| 页面空白 | 确认访问的是带 `#/` 的地址；打开 DevTools 控制台查看报错 |
| 图表不显示 | 图表容器高度依赖父级 flex，若自定义了布局需保证容器有实际高度 |
| 接口报错 | 检查 `.env` 的 `VITE_API_MODE`，演示默认为 `mock`，无需后端 |

---

## 二、功能架构

### 1. 总体结构

全局为「固定侧栏 + 内容区」两栏布局，所有业务页共用侧栏：

```
┌──────────┬────────────────────────────────────────────┐
│          │  页面自带标题栏（页名 + 筛选 + 更新时间）      │
│  全局侧栏 │────────────────────────────────────────────│
│  210px   │                                            │
│  深色表面 │            业务页内容区（router-view）        │
│  折叠菜单 │                                            │
│          │                                            │
│ v1.0 页脚 │                                            │
└──────────┴────────────────────────────────────────────┘
```

- 侧栏固定 210px，深色表面色自成一套中性色，不与浅底灰阶混用
- **两级折叠菜单**：9 个一级 + 34 个二级；点击一级分组折叠/展开，默认展开当前所在分组
- 当前页高亮：反白文字 + 16% 浅蓝底纹 + 左侧 `#5FA8D3` 色条；详情页（如 `/clues/:id`）也能点亮所属菜单
- 「风险线索池」带红色待处置数量角标
- 菜单是唯一数据源 `src/config/menu.ts`，路由由它生成；`status='placeholder'` 的项统一落 `PlaceholderView`（展示"本模块建设中" + 功能说明，不像报错页）

### 2. 业务模块（9 一级 / 34 二级）

已实现 **7 个业务页面**（源自 6 张设计稿，其中「风险线索工作台」按需求拆为「列表」与「核查处置」两页）：

| 一级菜单 | 二级（已实现） | 路由 |
|---|---|---|
| 首页驾驶舱 | 首页驾驶舱 | `/#/dashboard` |
| 数据治理 | 一户式主档查询 | `/#/archive` |
| 风险管理 | 风险线索池 | `/#/risk-pool` |
| 风险管理 | 核查处置工作台 | `/#/clues`、`/#/clues/:id` |
| 规则库管理 | 规则配置 | `/#/rules/config` |
| 智能模型 | 关联图谱分析 | `/#/model/graph` |
| 智能应用 | 政策智能问答 | `/#/app/qa` |

其余 **27 个二级**（数据治理 / 风险管理 / 规则库管理 / 智能模型 / 税源监控 / 智能应用 / 决策分析 / 系统管理下的未建项）无对应设计稿，统一落 `PlaceholderView`。

### 3. 领导驾驶舱页面结构

页面自上而下 5 个区域，每个区域独立取数、独立四态：

| 区域 | 内容 | 接口 | 实现方式 |
|---|---|---|---|
| 顶部标题栏 | 页名、数据更新时间、周期分段（本月/本季/本年）、区县下拉 | `getDashboardFilters` | 自绘控件 |
| 指标区 | 5 张指标卡：税收收入累计、同比增幅、预算完成进度、综合治税增收、风险任务处置率 | `getRevenueKpis` | DOM |
| 中部左 | 税收收入趋势 · 近 12 个月（实际入库实线 + 预测值虚线） | `getRevenueTrend` | **ECharts 折线** |
| 中部右 | 分税种收入结构（环形 + 图例） | `getTaxTypeStructure` | **ECharts 环形** |
| 下部左 | 分区县收入完成情况（按预算完成率排序的条形） | `getDistrictCompletion` | DOM 条形 |
| 下部右 | 综合治税成效 · 分数据源增收贡献 | `getSourceContribution` | DOM 柱状 |
| 底部 | 风险任务闭环漏斗（推送→派发→处置→命中→入库 + 环节转化率） | `getRiskTaskFunnel` | SVG 漏斗 |

> 图表策略：趋势与环形用 ECharts；区县条形、数据源柱状、漏斗为设计稿中的定制图形，
> 按原样以 DOM/SVG 复刻以保证像素级还原。

### 4. 页面跳转关系

已实现（依据《交互说明》1.2）：

| 交互 | 目标 |
|---|---|
| 侧栏菜单项 | 对应业务页 |
| 「综合治税增收」指标卡 | `/#/rules/config` |
| 「风险任务处置率」指标卡 | `/#/risk-pool?status=pending` |
| 周期 / 区县筛选 | 当前页刷新全部图表，不跳转 |
| 风险线索池 · 行 / 「核查」 | `/#/clues/:id`（核查处置整页） |
| 图谱节点 · 「查看档案」 | `/#/archive` |
| 政策问答 · 答案文号溯源芯片 | 高亮右侧引用来源并滚动定位（同页） |

设计稿中定义、**待后续轮次接入**：区县条形点击 → `?district=`；漏斗环节点击 → `?stage=`。

---

## 三、技术架构

### 1. 分层

```
   页面 / 组件层        views/ components/        ← 只消费数据，不关心数据来源
        │
        ▼
   取数出口             api/client.ts             ← 唯一入口，按环境变量选择实现
        │
        ├── api/adapters/mock.ts                  ← 内置假数据（演示用）
        └── api/adapters/http.ts                  ← 真实后端 fetch
        │
        ▼
   接口契约             api/types.ts              ← 双适配器共同实现，编译期约束
```

接口按业务分组：`dashboard` / `clues` / `archive` / `rules` / `qa` / `graph`，各组方法签名由 `ApiClient` 统一约束。

### 2. 目录结构

```
src/
├── api/
│   ├── types.ts          # 接口契约（可直接当后端接口文档，每字段带中文注释）
│   ├── client.ts         # 唯一取数出口，按 VITE_API_MODE 选择实现
│   └── adapters/
│       ├── mock.ts       # 内置假数据（取自设计稿）
│       └── http.ts       # 真实后端（fetch，约定 { code, message, data } 包裹）
├── charts/
│   ├── echarts.ts        # ECharts 按需注册（Bar/Line/Pie/Grid/Canvas）
│   ├── useChart.ts       # 实例封装：挂载、容器自适应、卸载销毁
│   └── palette.ts        # 图表 / 关联图谱配色（前端令牌，不由后端下发）
├── components/
│   ├── AppSidebar.vue    # 全局两级折叠侧栏
│   ├── StateBlock.vue    # 四态容器
│   ├── charts/           # TrendChart / DonutChart / InvoiceBarChart / RuleEffectChart
│   ├── common/           # 跨页公共组件（表格/筛选/徽章/指标卡/弹窗/Toast…）
│   ├── clues/            # 核查处置：DisposalForm（7.4 结果回填）
│   └── rules/            # 规则库：RuleCategoryTree / RuleDetailDrawer
├── composables/
│   └── useResource.ts    # 数据区块四态封装（含竞态保护）
├── config/menu.ts        # 唯一菜单数据源（9 一级/34 二级），侧栏与路由共用
├── layouts/MainLayout.vue# 侧栏 + 内容区
├── router/index.ts       # hash 路由，由 menu.ts 生成，业务页为 MainLayout 子路由
├── styles/
│   ├── tokens.css        # 设计令牌唯一来源
│   ├── tone.css          # 语义语气 → 颜色（.tone-* 类）
│   └── global.css        # 重置 + 基础样式 + 骨架屏动画
└── views/                # 7 个业务页 + PlaceholderView
```

### 3. 取数分层（硬约束）

页面组件**只能**通过 `src/api/client.ts` 取数，**禁止**直接引用任何 adapter。

两套 adapter 都实现 `types.ts` 中的 `ApiClient` 接口，
**函数签名由 TypeScript 编译期保证完全一致**，切换实现不需要改任何页面代码。

切换方式（`.env`）：

```bash
VITE_API_MODE=mock          # mock（默认，无需后端） | http
VITE_API_BASE_URL=/api      # http 模式下的后端基地址
```

**颜色不进契约**：后端只返回语义值（如 `accent`、`deltaTone`、`isForecast`），
具体色值由前端在 `src/charts/palette.ts` 中按设计令牌映射，
因此 `types.ts` 中不出现任何 hex 色值。

### 4. 数据区块四态

依据《交互说明》第 2 节，每个数据区域（卡片 / 图表 / 表格）**独立**四态：

```
加载中 → 有数据 / 空 / 错误
```

- 容器尺寸在四态间保持不变，避免布局跳动
- **局部失败不影响其他区块**（如图表失败但指标卡正常）
- 加载态用呼吸式骨架条（1.2s，透明度 100%↔60%），不使用旋转 spinner
- 错误文案面向业务人员，不暴露堆栈与错误码
- 由 `useResource`（含请求竞态保护）+ `StateBlock` 实现

### 5. 设计令牌

**代码中不允许出现字面量颜色、字号、间距**，一律走 CSS 自定义属性。令牌分三层：

| 层级 | 位置 | 承载内容 |
|---|---|---|
| **全局设计系统** | `src/styles/tokens.css` | 《设计系统》定义的通用值：主色四档、辅色、深色表面 6 色、9 级中性灰阶、风险三级与状态三态（含文字色与底纹色）、8 色图表序列、字号字重行高（含 11px 微型字号 `--fs-micro`）、4px 基数间距刻度、圆角/描边/阴影、动效时长 |
| **页面级** | 页面根选择器，如 `DashboardView.vue` 的 `.dash { --dash-* }` | 来自设计稿但**不在**全局字阶与 4px 刻度内的本页专有度量（如 38px 指标数值、20px 栅格间距、68px 标题栏高） |
| **组件级** | 组件根选择器，如 `DonutChart.vue` 的 `.donut { --donut-* }` | 该组件专有度量（如 190px 环形直径、11px 图例色块） |

页面级/组件级令牌**不写入 `tokens.css`** —— 那里只承载全局设计系统，避免被单页尺寸污染。
CSS 自定义属性沿 DOM 继承，页内子组件可直接引用上层令牌。

> **例外**：`src/charts/palette.ts` 中保留 hex 字面量。ECharts 只接受真实色值，
> 无法解析 CSS 变量；该文件是设计稿指定的"图表配色前端令牌"落点，与 `tokens.css` 一一对应。

### 6. 兼容性

- 构建目标降级：`es2015` / chrome80（见 `vite.config.ts` 的 `build.target` 与 `cssTarget`）
- **不使用** `:has()` 与容器查询（`@container`）
- **仅系统字体栈**，不加载任何 Web 字体，保证内网离线可用、渲染一致
- 数字统一 `tabular-nums` 等宽对齐（`.num`）
- ECharts 按需注册，仅引入实际用到的图表与组件

---

## 四、实现进度

| 页面 | 状态 |
|---|---|
| 首页驾驶舱 · 一户式主档查询 · 风险线索池 · 核查处置工作台 · 规则配置 · 政策智能问答 · 关联图谱分析 | ✅ 已实现（7 页 / 6 张设计稿全部落地） |
| 其余 27 个二级菜单 | ⬜ 占位页（暂无设计稿） |

### 公共组件

`src/components/common/` 下的组件由多个页面共用，新增页面应优先复用而非另起炉灶：

| 组件 | 用途 |
|---|---|
| `DataTable` | 表格：表头吸顶、`density=compact` 高密度、骨架行、勾选列、`#cell-<key>` 插槽 |
| `FilterBar` / `FilterField` / `FilterChip` | 筛选栏容器、字段、可切换芯片 |
| `BaseInput` / `BaseSelect` / `BaseCheckbox` | 自绘表单控件 |
| `BaseBadge` | 标签徽章：`outline` 风险等级 / `dot` 列表状态 / `soft` 轻提示 |
| `MetricCard` | 指标卡：`lg/md/sm` 三档、左对齐或居中、可带顶部色条与变化文案 |
| `PageHeader` / `TabNav` / `Pagination` / `SideDrawer` | 页顶栏、标签页、分页、右侧抽屉 |
| `BaseRadioGroup` | 单选组（核查结论三选一、误报原因七类） |
| `ConfirmModal` / `Toast` | 二次确认弹窗（派发/提交/退回，《交互说明》4.3）、右上角成功提示 |

领域组件另置：`components/clues/`（`DisposalForm`）、`components/rules/`（`RuleCategoryTree` / `RuleDetailDrawer`）。
颜色一律经 `styles/tone.css` 的 `.tone-*` 类映射，组件内不出现具体色值。

> 演示数据说明：mock 适配器忽略周期参数，切换本月/本季/本年会走完整加载流程但返回同一份数据
> （设计稿仅提供本季数据，未自行编造）。「风险线索池」的 137 角标为设计稿静态值，
> 全局待处置数接口待后续定义。演示环境的「发送/生成报告/展开下级」等在线能力以 toast 明确标注未接入，不虚构结果。
