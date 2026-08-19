import http from '../http';
import { aiPrefix } from '../http';

/** 获取预设问答列表 */
export const getFewshotList = (datasourceId?: string, params?: object) => {
  return http.get(`${aiPrefix}/fewshot/list/${datasourceId}`, params);
};

/** 创建预设问答*/
export const create = (data?: object) => {
  return http.post(`${aiPrefix}/fewshot`, data);
};

/** 更新预设问答 */
export const update = (data?: object) => {
  return http.put(`${aiPrefix}/fewshot`, data);
};

// 删除预设问答
export const remove = (id?: string) => {
  return http.delete(`${aiPrefix}/fewshot/${id}`);
};

// 重建向量索引
export const rebuildIndex = (datasourceId?: string) => {
  return http.post(`${aiPrefix}/fewshot/rebuild-index/${datasourceId}`);
};
export default { getFewshotList, rebuildIndex, create, update, remove };
