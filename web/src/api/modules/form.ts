import http from '../http';

const BaseUrl = '/api';

/** 创建表单模板 */
export const createTemplate = (data?: object) => {
  return http.post(`${BaseUrl}/template`, data);
};

/** 删除表单模板 */
export const removeTemplate = (id?: number | string) => {
  return http.delete(`${BaseUrl}/template/${id}`);
};
/** 获取表单模板列表 */
export const getFormList = (params?: object) => {
  return http.get(`${BaseUrl}/template/list`, params);
};

/** 修改表单模板 */
export const updateTemplate = (id?: number, data?: object) => {
  return http.put(`${BaseUrl}/template/${id}`, data);
};

/** 获取表单模板详情 */
export const getTemplateDetail = (id?: number) => {
  return http.get(`${BaseUrl}/template/${id}`);
};

// 智能校验
export const validateFormData = (data?: object) => {
  return http.post(`${BaseUrl}/voice/validate`, data);
};

/**
 * 表单回读 - 生成回读文本 + TTS 音频
 */
export function generateReadback(data?: object) {
  return http.post(`${BaseUrl}/voice/readback`, data);
}
export default {
  createTemplate,
  getFormList,
  getTemplateDetail,
  updateTemplate,
  removeTemplate,
  validateFormData,
  generateReadback,
};
