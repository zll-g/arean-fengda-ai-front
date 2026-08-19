import http from '../http';
import { aiPrefix } from '../http';

/** 获取列表 */
export const getFormPage = (params?: object) => {
  return http.get(`${aiPrefix}/form-data/page`, params);
};

/** 删除表单 */
export const deleteForm = (id?: number) => {
  return http.delete(`${aiPrefix}/form-data/${id}`);
};

// 操作记录
export const getFormRecords = (id: number) => {
  return http.get(`${aiPrefix}/form-data/${id}/records`);
};

// 模板继承创建
export function inheritForm(parentId: number, targetTemplateId: number) {
  return http.post(`/form-data/${parentId}/inherit/${targetTemplateId}`);
}
export default {
  deleteForm,
  getFormPage,
  getFormRecords,
  inheritForm,
};
