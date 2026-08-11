export * from './modules/config';
export * from './modules/route';

export { version } from './version';

// 请求配置
export interface IHttpConfig {
  // 服务地址
  serviceUrl: string;
}
