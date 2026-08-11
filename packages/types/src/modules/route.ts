export interface IRoute {
  id: string;
  // 组件名称
  routeName: string;
  // 是否可关闭
  closable?: boolean;
  // 路径
  routeUrl?: string;
  // 完整路径
  component?: string;
  // 元数据
  meta?: RouteMeta;
  // 参数
  params?: object;
  // 查询参数
  query?: object;
  // 扩展字段
  [prop: string]: any;
}

export interface RouteMeta {
  // 标题
  title: string;
  // 模块
  module: string;
  // 图标
  icon: string;
  // 是否需要权限控制（如果为否则任何用户皆访问）
  isControl: boolean;
  // 扩展字段
  [prop: string]: any;
}
