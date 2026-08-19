import http from '../http';
import { aiPrefix } from '../http';

/** 新增主数据 */
export const createMasterData = (data?: object) => {
  return http.post(`${aiPrefix}/master-data`, data);
};

/** 搜索主数据 */
export const searchMasterData = (params?: object) => {
  return http.get(`${aiPrefix}/master-data/search`, params);
};

/** 主数据联动匹配 */
export const matchMasterData = (params?: object) => {
  return http.get(`${aiPrefix}/master-data/match`, params);
};

/** 删除主数据 */
export const removeMasterData = (params?: object) => {
  return http.delete(`${aiPrefix}/master-data`, params);
};

/** 更新主数据 */
export const updateMasterData = (data?: object) => {
  return http.put(`${aiPrefix}/master-data`, data);
};

/** gms主数据检索 */
export const gmsMatchSearch = (params?: object) => {
  return http.get(`${aiPrefix}/master-data/gmsMatchSearch`, params);
};
export default {
  createMasterData,
  searchMasterData,
  matchMasterData,
  removeMasterData,
  updateMasterData,
  gmsMatchSearch,
};
