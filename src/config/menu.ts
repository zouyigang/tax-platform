/* ============================================================
 * 全局菜单配置 · 侧栏与路由共用的唯一数据源
 * 依据《需求文档》完整功能架构组织:9 个一级、34 个二级。
 * ------------------------------------------------------------
 * 结构约定:
 *   - 一级节点分两类:
 *       · 单页型(leaf,如「首页驾驶舱」)—— 直接可点、无子菜单;
 *       · 分组型(group)—— 仅作折叠容器,点击展开/收起,不跳路由。
 *   - 二级节点均为 leaf。
 *   - status='done'   已实现,走真实路由;
 *     status='placeholder' 未实现,统一落占位页,页面展示 desc 功能说明。
 *   - desc(功能说明)集中写在本配置里,占位页据此渲染,避免散落各处。
 * ============================================================ */

/** 菜单叶子节点(可点击、对应一个路由) */
export interface MenuLeaf {
  /** 唯一标识(同时作为路由 name 与高亮匹配键) */
  key: string
  /** 显示名称 */
  title: string
  /** 图标字符(一级 leaf 用;二级默认无图标,靠缩进层级区分) */
  icon?: string
  /** 路由路径 */
  path: string
  /** 实现状态:done 走真实页面,placeholder 落占位页 */
  status: 'done' | 'placeholder'
  /** 功能说明(占位页展示,可多条) */
  desc?: string[]
  /** 红色角标(如待处置数量),可空 */
  badge?: string
}

/** 菜单分组节点(一级容器,仅折叠展开,不承载路由) */
export interface MenuGroup {
  /** 唯一标识 */
  key: string
  /** 分组名称 */
  title: string
  /** 一级图标字符 */
  icon: string
  /** 子菜单 */
  children: MenuLeaf[]
}

/** 一级节点:分组 或 单页 */
export type MenuEntry = MenuGroup | MenuLeaf

/** 类型守卫:是否为分组节点 */
export function isGroup(e: MenuEntry): e is MenuGroup {
  return (e as MenuGroup).children !== undefined
}

export const MENU: MenuEntry[] = [
  {
    key: 'dashboard',
    title: '首页驾驶舱',
    icon: '▤',
    path: '/dashboard',
    status: 'done',
  },
  {
    key: 'data',
    title: '数据治理',
    icon: '▦',
    children: [
      {
        key: 'data-source-monitor',
        title: '数据源接入监控',
        path: '/data/source-monitor',
        status: 'done',
      },
      {
        key: 'data-quality',
        title: '数据质量看板',
        path: '/data/quality',
        status: 'done',
      },
      {
        key: 'data-entity-match',
        title: '主体识别与匹配',
        path: '/data/entity-match',
        status: 'done',
      },
      {
        key: 'archive',
        title: '一户式主档查询',
        path: '/archive',
        status: 'done',
      },
    ],
  },
  {
    key: 'risk',
    title: '风险管理',
    icon: '⚠',
    children: [
      {
        key: 'risk-pool',
        title: '风险线索池',
        path: '/risk-pool',
        status: 'done',
        // 全局待处置线索数,本轮沿用设计稿静态值 137
        badge: '137',
      },
      {
        key: 'risk-dispatch',
        title: '任务派发',
        path: '/risk/dispatch',
        status: 'done',
      },
      {
        key: 'clues',
        title: '核查处置工作台',
        path: '/clues',
        status: 'done',
      },
      {
        key: 'risk-result',
        title: '结果回填',
        path: '/risk/result',
        status: 'done',
      },
      {
        key: 'risk-performance',
        title: '处置绩效统计',
        path: '/risk/performance',
        status: 'done',
      },
    ],
  },
  {
    key: 'rules',
    title: '规则库管理',
    icon: '▧',
    children: [
      {
        key: 'rules-config',
        title: '规则配置',
        path: '/rules/config',
        status: 'done',
      },
      {
        key: 'rules-trial',
        title: '规则试跑与灰度',
        path: '/rules/trial',
        status: 'done',
      },
      {
        key: 'rules-threshold',
        title: '阈值参数管理',
        path: '/rules/threshold',
        status: 'done',
      },
      {
        key: 'rules-monitor',
        title: '规则效果监测',
        path: '/rules/monitor',
        status: 'done',
      },
    ],
  },
  {
    key: 'model',
    title: '智能模型',
    icon: '◈',
    children: [
      {
        key: 'model-score',
        title: '风险评分模型',
        path: '/model/score',
        status: 'done',
      },
      {
        key: 'model-graph',
        title: '关联图谱分析',
        path: '/model/graph',
        status: 'done',
      },
      {
        key: 'model-fraud-gang',
        title: '虚开团伙识别',
        path: '/model/fraud-gang',
        status: 'placeholder',
        desc: [
          '结合图谱与行为特征识别虚开发票团伙及其组织结构。',
          '输出团伙成员、资金/发票流向与风险传导链路。',
          '对应需求 3.7 / 4.3.2 虚开识别。',
        ],
      },
      {
        key: 'model-abnormal-declare',
        title: '异常申报检测',
        path: '/model/abnormal-declare',
        status: 'placeholder',
        desc: [
          '检测申报数据中的逻辑异常、突变与同行业偏离。',
          '对零申报、长期亏损、税负异常等模式自动预警。',
          '对应需求 4.3.3 异常申报识别。',
        ],
      },
      {
        key: 'model-industry-benchmark',
        title: '行业税负基准',
        path: '/model/industry-benchmark',
        status: 'placeholder',
        desc: [
          '按行业、规模、地区测算税负、毛利、投入产出等基准区间。',
          '为异常识别与评分模型提供参照系。',
          '对应需求 3.5.2 行业基准分析。',
        ],
      },
    ],
  },
  {
    key: 'tax-source',
    title: '税源监控',
    icon: '▥',
    children: [
      {
        key: 'tax-source-key',
        title: '重点税源监控',
        path: '/tax-source/key',
        status: 'placeholder',
        desc: [
          '对重点税源企业进行入库进度、税负变动与经营指标动态监控。',
          '支持名录管理、异动预警与走访台账。',
          '对应需求 6.1 重点税源监控。',
        ],
      },
      {
        key: 'tax-source-forecast',
        title: '收入预测分析',
        path: '/tax-source/forecast',
        status: 'placeholder',
        desc: [
          '基于历史入库与经济指标预测税收收入走势。',
          '支持分税种、分行业、分期次的预测与偏差回溯。',
          '对应需求 6.2 收入预测。',
        ],
      },
      {
        key: 'tax-source-new-enterprise',
        title: '新办企业评估',
        path: '/tax-source/new-enterprise',
        status: 'placeholder',
        desc: [
          '对新设立纳税人进行开业风险画像与经营真实性评估。',
          '识别空壳、走逃、注册地异常等早期风险。',
          '对应需求 6.3 新办企业评估。',
        ],
      },
    ],
  },
  {
    key: 'app',
    title: '智能应用',
    icon: '✦',
    children: [
      {
        key: 'app-qa',
        title: '政策智能问答',
        path: '/app/qa',
        status: 'done',
      },
      {
        key: 'app-doc-gen',
        title: '文书辅助生成',
        path: '/app/doc-gen',
        status: 'placeholder',
        desc: [
          '按模板与案情要素辅助生成核查通知、认定说明等税务文书。',
          '支持要素回填、合规校验与一键成文。',
          '对应需求 5.3 文书辅助生成。',
        ],
      },
      {
        key: 'app-doc-process',
        title: '资料智能处理',
        path: '/app/doc-process',
        status: 'placeholder',
        desc: [
          '对上传的合同、账册、发票等资料进行 OCR 识别与要素抽取。',
          '结构化归档并关联到对应纳税主体档案。',
          '对应需求 5.4 智能资料处理。',
        ],
      },
      {
        key: 'app-nl-query',
        title: '自然语言取数',
        path: '/app/nl-query',
        status: 'placeholder',
        desc: [
          '用自然语言描述即可查询平台数据并生成图表。',
          '降低数据分析门槛,支持追问与结果导出。',
          '对应需求 5.5 自然语言取数。',
        ],
      },
    ],
  },
  {
    key: 'decision',
    title: '决策分析',
    icon: '▨',
    children: [
      {
        key: 'decision-revenue',
        title: '收入分析',
        path: '/decision/revenue',
        status: 'done',
      },
      {
        key: 'decision-tax-source',
        title: '税源分析',
        path: '/decision/tax-source',
        status: 'done',
      },
      {
        key: 'decision-effectiveness',
        title: '治税成效分析',
        path: '/decision/effectiveness',
        status: 'done',
      },
      {
        key: 'decision-topic',
        title: '专题分析',
        path: '/decision/topic',
        status: 'done',
      },
    ],
  },
  {
    key: 'system',
    title: '系统管理',
    icon: '⚙',
    children: [
      {
        key: 'system-user',
        title: '用户与权限',
        path: '/system/user',
        status: 'placeholder',
        desc: [
          '管理用户、角色、菜单与功能权限。',
          '支持组织机构映射与账号生命周期管理。',
          '对应需求 10.2 权限管理。',
        ],
      },
      {
        key: 'system-data-permission',
        title: '数据权限配置',
        path: '/system/data-permission',
        status: 'placeholder',
        desc: [
          '按辖区、行业、税种等维度配置数据行级/列级访问范围。',
          '实现分级授权与最小可见原则。',
          '对应需求 10.2 数据权限。',
        ],
      },
      {
        key: 'system-audit-log',
        title: '操作日志审计',
        path: '/system/audit-log',
        status: 'placeholder',
        desc: [
          '记录并检索用户的登录、查询、导出、处置等关键操作。',
          '支持敏感行为审计与合规追溯。',
          '对应需求 10.2 日志审计。',
        ],
      },
      {
        key: 'system-params',
        title: '系统参数',
        path: '/system/params',
        status: 'placeholder',
        desc: [
          '维护平台级全局参数、字典与运行配置。',
          '支持参数分组、变更记录与热更新。',
        ],
      },
    ],
  },
]

/** 扁平化所有叶子节点(供路由生成与查找) */
export const MENU_LEAVES: MenuLeaf[] = MENU.flatMap((e) =>
  isGroup(e) ? e.children : [e],
)

/** 按路径查找叶子节点 */
export function findLeafByPath(path: string): MenuLeaf | undefined {
  return MENU_LEAVES.find((l) => l.path === path)
}

/** 查找某个叶子 key 所属的一级分组标题(单页型返回自身标题) */
export function findGroupTitle(leafKey: string): string {
  for (const e of MENU) {
    if (isGroup(e)) {
      if (e.children.some((c) => c.key === leafKey)) return e.title
    } else if (e.key === leafKey) {
      return e.title
    }
  }
  return ''
}
