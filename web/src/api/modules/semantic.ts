import http from '../http';
import { aiPrefix } from '../http';

/** 获取语义模型列表 */
export const getSemanticList = (datasourceId?: string, params?: object) => {
  return http.get(`${aiPrefix}/semantic/list/${datasourceId}`, params);
};

/** 创建数据源 */
export const create = (data?: object) => {
  return http.post(`${aiPrefix}/semantic`, data);
};

/** 更新数据源 */
export const update = (data?: object) => {
  return http.put(`${aiPrefix}/datasource`, data);
};

// 删除数据源
export const remove = (id?: string) => {
  return http.delete(`${aiPrefix}/datasource/${id}`);
};

// 重建向量索引
export const rebuildIndex = (datasourceId?: string) => {
  return http.post(`${aiPrefix}/semantic/rebuild-index/${datasourceId}`);
};
export default { getSemanticList, rebuildIndex, create, update, remove };
