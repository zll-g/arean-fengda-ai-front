import http from '../http';
import { aiPrefix } from '../http';

/** 获取多数据源分组列表 */
export const listGroups = () => {
  return http.get(`${aiPrefix}/datasource-group/list`);
};

/** 查询分组详情 */
export const getGroup = (id?: string) => {
  return http.get(`${aiPrefix}/datasource-group/${id}`);
};

/** 创建多数据源分组*/
export const create = (data?: object) => {
  return http.post(`${aiPrefix}/datasource-group`, data);
};

/** 更新多数据源分组 */
export const update = (id: string, data?: object) => {
  return http.put(`${aiPrefix}/datasource-group/${id}`, data);
};

// 删除多数据源分组
export const remove = (id?: string) => {
  return http.delete(`${aiPrefix}/datasource-group/${id}`);
};

export default { listGroups, getGroup, create, update, remove };
