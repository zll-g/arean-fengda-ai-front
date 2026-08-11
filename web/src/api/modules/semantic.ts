import http from '../http';

const BaseUrl = '/api';
/** 获取语义模型列表 */
export const getSemanticList = (datasourceId?: string, params?: object) => {
  return http.get(`${BaseUrl}/semantic/list/${datasourceId}`, params);
};

/** 创建数据源 */
export const create = (data?: object) => {
  return http.post(`${BaseUrl}/semantic`, data);
};

/** 更新数据源 */
export const update = (data?: object) => {
  return http.put(`${BaseUrl}/datasource`, data);
};

// 删除数据源
export const remove = (id?: string) => {
  return http.delete(`${BaseUrl}/datasource/${id}`);
};

// 重建向量索引
export const rebuildIndex = (datasourceId?: string) => {
  return http.post(`${BaseUrl}/semantic/rebuild-index/${datasourceId}`);
};
export default { getSemanticList, rebuildIndex, create, update, remove };
