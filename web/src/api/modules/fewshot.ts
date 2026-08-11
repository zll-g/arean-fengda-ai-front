import http from '../http';

const BaseUrl = '/api';
/** 获取预设问答列表 */
export const getFewshotList = (datasourceId?: string, params?: object) => {
  return http.get(`${BaseUrl}/fewshot/list/${datasourceId}`, params);
};

/** 创建预设问答*/
export const create = (data?: object) => {
  return http.post(`${BaseUrl}/fewshot`, data);
};

/** 更新预设问答 */
export const update = (data?: object) => {
  return http.put(`${BaseUrl}/fewshot`, data);
};

// 删除预设问答
export const remove = (id?: string) => {
  return http.delete(`${BaseUrl}/fewshot/${id}`);
};

// 重建向量索引
export const rebuildIndex = (datasourceId?: string) => {
  return http.post(`${BaseUrl}/fewshot/rebuild-index/${datasourceId}`);
};
export default { getFewshotList, rebuildIndex, create, update, remove };
