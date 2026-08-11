import http from '../http';

const BaseUrl = '/api';

/** 获取数据源列表 */
export const getDatasourceList = (params?: object) => {
  return http.get(`${BaseUrl}/datasource/list`, params);
};

/** 创建数据源 */
export const create = (data?: object) => {
  return http.post(`${BaseUrl}/datasource`, data);
};

/** 更新数据源 */
export const update = (data?: object) => {
  return http.put(`${BaseUrl}/datasource`, data);
};

// 删除数据源
export const removeDatasource = (id?: string) => {
  return http.delete(`${BaseUrl}/datasource/${id}`);
};

// 测试连接
export const testConnection = (data?: object) => {
  return http.post(`${BaseUrl}/datasource/test`, data);
};

export const refreshDataSource = (id?: string) => {
  return http.put(`${BaseUrl}/datasource/refresh/${id}`);
};

// 构建索引
export const rebuildIndex = (datasourceId?: string) => {
  return http.post(`${BaseUrl}/index/rebuild/${datasourceId}`);
};

// 获取构建状态
export const getrebuildStatus = (datasourceId?: string) => {
  return http.get(`${BaseUrl}/index/status?datasourceId=${datasourceId}`);
};
export default {
  getDatasourceList,
  removeDatasource,
  testConnection,
  create,
  update,
  refreshDataSource,
  rebuildIndex,
  getrebuildStatus,
};
