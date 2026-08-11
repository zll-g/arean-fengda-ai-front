import axios, {
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type CancelTokenSource,
} from 'axios';

import { ElMessage } from 'element-plus';
import { getToken } from '@/utils/device';
import { showToast } from 'vant';
import { isMobile } from '@/utils/device';
interface Result<T = any> {
  code: string;
  data: T;
  msg: string;
}

const baseUrl = ''; //http://192.168.1.144:8889';
type TAxiosOption = {
  timeout: number;
  baseURL?: string;
};

const config: TAxiosOption = {
  timeout: 100000,
  baseURL: baseUrl,
};

// 生成请求唯一标识
const generateRequestKey = (config: InternalAxiosRequestConfig, pageKey?: string | null) => {
  const { method, url, params, data } = config;
  const pagePrefix = pageKey ? `${pageKey}-` : '';

  // 简单哈希函数，将参数转换为字符串用于生成唯一键
  const paramsHash = params ? JSON.stringify(params) : '';
  const dataHash = data ? JSON.stringify(data) : '';

  return `${pagePrefix}${method}-${url}-${paramsHash}-${dataHash}`;
};

class Http {
  service;
  private cancelTokenSources: Map<string, CancelTokenSource>; // 存储取消令牌
  private currentPageKey: string | null; // 当前页面标识

  constructor(config: TAxiosOption) {
    this.service = axios.create(config);
    this.cancelTokenSources = new Map();
    this.currentPageKey = null;
    this.setupInterceptors();
  }

  // 设置拦截器
  private setupInterceptors() {
    /* 请求拦截 */
    this.service.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 如果没有提供取消令牌，则创建一个
        if (!config.cancelToken) {
          const source = axios.CancelToken.source();
          config.cancelToken = source.token;

          // 生成请求唯一标识
          const requestKey = generateRequestKey(config, this.currentPageKey);
          if (requestKey) {
            this.cancelTokenSources.set(requestKey, source);
          }
        }

        //如果params中有isToken未false，则不添加token
        const isToken = !(config.params?.isToken === false);
        if (!isToken) {
          delete config.params.isToken;
        } else {
          //默认携带token
          const token = getToken();
          token && (config.headers.Authorization = `Bearer ${token}`);
        }
        // 携带ignore参数，结果默认加密，传ignore='y'为不加密返回
        config.headers.ignore = 'y';
        // config.headers.version = 'huang';
        config.headers.version = 'ai';

        switch (config.method) {
          case 'get':
            config.params = {
              ...config.params,
            };
            break;
          case 'post':
            if (!(config.data instanceof FormData)) {
              // 不是FormData对象
              config.data = {
                ...config.data,
              };
            }
            break;
          default:
            break;
        }

        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      },
    );

    /* 响应拦截 */
    this.service.interceptors.response.use(
      async (response: AxiosResponse): Promise<any> => {
        // 请求完成后移除取消令牌
        const requestKey = generateRequestKey(response.config, this.currentPageKey);
        if (requestKey) {
          this.cancelTokenSources.delete(requestKey);
        }

        //自定义统一结果实体
        const result: Result = response.data;
        if (result.code === '200') {
          //请求成功
          return Promise.resolve(result);
        } else if (result.code === '401' || result.code === '1107') {
          // 退出并取消所有请求
          this.cancelAllRequests();

          return Promise.reject(result);
        } else if (result.code === '403') {
          //权限不足
          ElMessage.error(result?.msg || '接口权限不足，请求失败！');
          if (isMobile()) {
            showToast('报错信息：' + result?.msg);
          }
          return Promise.reject(result);
        } else {
          // 其它错误
          ElMessage.error(result?.msg || '服务异常，接口请求失败！');
          if (isMobile()) {
            showToast('报错信息：' + result?.msg);
          }
          return Promise.reject(result);
        }
      },
      (error: any) => {
        // 请求失败后移除取消令牌
        if (error.config) {
          const requestKey = generateRequestKey(error.config, this.currentPageKey);
          if (requestKey) {
            this.cancelTokenSources.delete(requestKey);
          }
        }

        // 处理取消请求的错误
        if (axios.isCancel(error)) {
          return Promise.reject(new Error(error?.message || '请求已取消！'));
        }

        const statusCode = error.response?.status;
        if (statusCode === 401) {
          // 退出并取消所有请求
          this.cancelAllRequests();
        } else {
          ElMessage.error(error.response?.data?.msg || '服务异常，接口请求失败！');
          if (isMobile()) {
            showToast('报错信息：' + error.response?.data?.msg);
          }
        }
        return Promise.reject(error.response);
      },
    );
  }

  // 设置当前页面标识（供路由拦截器调用）
  setCurrentPageKey(key: string) {
    // 页面切换时，取消上一页的所有请求
    if (this.currentPageKey && this.currentPageKey !== key) {
      this.cancelPageRequests(this.currentPageKey);
    }
    this.currentPageKey = key;
  }

  // 取消指定页面的所有请求
  private cancelPageRequests(pageKey: string) {
    const keysToRemove: string[] = [];

    this.cancelTokenSources.forEach((source, key) => {
      if (key.startsWith(`${pageKey}-`)) {
        source.cancel(`页面${pageKey}已切换，取消请求`);
        keysToRemove.push(key);
      }
    });

    // 从映射中移除已取消的请求
    keysToRemove.forEach((key) => this.cancelTokenSources.delete(key));
  }

  // 取消所有请求
  cancelAllRequests() {
    this.cancelTokenSources.forEach((source) => {
      source.cancel('全局取消所有请求');
    });
    this.cancelTokenSources.clear();
  }

  // 取消单个请求
  cancelRequest(config: InternalAxiosRequestConfig) {
    const requestKey = generateRequestKey(config, this.currentPageKey);
    if (requestKey && this.cancelTokenSources.has(requestKey)) {
      this.cancelTokenSources.get(requestKey)?.cancel('取消单个请求');
      this.cancelTokenSources.delete(requestKey);
    }
  }

  /* GET 方法 */
  get(url: string, params?: object, _object = {}): Promise<any> {
    return this.service.get(url, { params, ..._object });
  }
  /* POST 方法 */
  post(url: string, params?: object, _object = {}): Promise<any> {
    return this.service.post(url, params, _object);
  }
  /* PUT 方法 */
  put(url: string, params?: object, _object = {}): Promise<any> {
    return this.service.put(url, params, _object);
  }
  /* DELETE 方法 */
  delete(url: string, params?: any, _object = {}): Promise<any> {
    return this.service.delete(url, { params, ..._object });
  }
}

export default new Http(config);
