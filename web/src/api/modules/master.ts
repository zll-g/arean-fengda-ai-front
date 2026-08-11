import http from '../http';

const BaseUrl = '/api';

/** 新增主数据 */
export const createMasterData = (data?: object) => {
  return http.post(`${BaseUrl}/master-data`, data);
};

/** 搜索主数据 */
export const searchMasterData = (params?: object) => {
  return http.get(`${BaseUrl}/master-data/search`, params);
};

/** 主数据联动匹配 */
export const matchMasterData = (params?: object) => {
  return http.get(`${BaseUrl}/master-data/match`, params);
};

/** 删除主数据 */
export const removeMasterData = (params?: object) => {
  return http.delete(`${BaseUrl}/master-data`, params);
};

/** 更新主数据 */
export const updateMasterData = (data?: object) => {
  return http.put(`${BaseUrl}/master-data`, data);
};

export default {
  createMasterData,
  searchMasterData,
  matchMasterData,
  removeMasterData,
  updateMasterData,
};
