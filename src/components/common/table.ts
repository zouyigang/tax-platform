/** 表格列定义(与 DataTable.vue 配套) */
export interface TableColumn {
  /** 字段键;同时用作单元格插槽名 cell-<key> */
  key: string
  /** 表头文案 */
  label: string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 列宽,如 '132px';不传则自适应 */
  width?: string
  /** 数值列:启用等宽数字 */
  numeric?: boolean
  /** 内容超宽时省略号截断 */
  ellipsis?: boolean
  /**
   * 该列是否可排序。仅在表格开启 sortable 时生效;
   * 不传 = 可排序,显式 false = 该列不可排序(如操作列)。
   */
  sortable?: boolean
}

/** 排序方向:1 升序 / -1 降序 */
export type SortDir = 1 | -1
