import http from '../http';
import { aiPrefix } from '../http';

/** 获取gms组织信息列表 */
export const getGmsList = (params?: object) => {
  return http.get(`${aiPrefix}/gms/org/listPage`, params);
};

/** 获取gms树组织信息列表 */
export const getGmsTreeList = (params?: object) => {
  return http.get(`${aiPrefix}/gms/org/tree`, params);
};

/** 获取gmsorgs树组织信息列表 */
export const getGmsorgsTreeList = (params?: object) => {
  return http.get(`${aiPrefix}/gms/org/orgsTree`, params);
};

/** 同步gms组织信息 */
export const syncGmsInfo = (params?: object) => {
  return http.put(`${aiPrefix}/gms/org/sync`, params);
};

export default {
  getGmsList,
  syncGmsInfo,
  getGmsTreeList,
  getGmsorgsTreeList,
};
