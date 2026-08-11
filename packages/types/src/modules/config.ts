import type { Component } from 'vue';
// 总配置
export interface IAppConfig {
  // 应用编码
  code: string;
  // 应用名称
  name: string;
  // 应用描述
  desc?: string;
  // 路由前缀
  routerPrefix?: string;
  // logo
  logoUrl?: string;
  // 首页
  home?: string;
  // 版本
  version: string;
  // 版权声明
  copyright?: string;
  // 其它
  [prop: string]: any;
}
