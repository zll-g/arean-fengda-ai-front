import http from '../http';

const BaseUrl = '/api';
export function toggleFavorite(id: number) {
  return http.post(`${BaseUrl}/template/${id}/favorite`);
}

export function getTemplateList(params?: { category?: string; keyword?: string }) {
  return http.get(`${BaseUrl}/template/list`, { params });
}

export function togglePin(id: number) {
  return http.post(`${BaseUrl}/template/${id}/pin`);
}

export function getVersionList(id: number) {
  return http.get(`${BaseUrl}/template/${id}/versions`);
}

export function deleteTemplate(id: number) {
  return http.delete(`${BaseUrl}/template/${id}`);
}

export function toggleTemplateStatus(id: number, status?: number) {
  return http.put(`${BaseUrl}/template/${id}/status?status=${status}`);
}

// 表单详情
export function getFormDetail(id: number) {
  return http.get(`${BaseUrl}/form-data/${id}`);
}

// 提交表单
export function submitForm(id: number) {
  return http.post(`${BaseUrl}/form-data/${id}/submit`);
}

// 确认表单
export function confirmForm(id: number) {
  return http.post(`${BaseUrl}/form-data/${id}/confirm`);
}

export function getRecommendedValues(templateId: number, fieldCode: string) {
  return http.get(`${BaseUrl}/preference/recommend`, { templateId, fieldCode });
}

export function getTemplateDetail(id: number) {
  return http.get(`${BaseUrl}/template/${id}`);
}

// 创建表单
export function createForm(data: { templateId: number; formValues?: any; source?: string }) {
  return http.post(`${BaseUrl}/form-data`, data);
}

// 获取表单类型
export function getFormType() {
  return http.get(`${BaseUrl}/dict/form-types`);
}

// 更新表单
export function updateForm(
  id: number,
  data: { formValues?: any; title?: string; remark?: string },
) {
  return http.put(`${BaseUrl}/form-data/${id}`, data);
}

// 撤销
export function undoForm(id: number) {
  return http.post(`${BaseUrl}/form-data/${id}/undo`);
}

// 重做
export function redoForm(id: number) {
  return http.post(`${BaseUrl}/form-data/${id}/redo`);
}

// 文本模拟语音填单
export function processText(data: {
  text: string;
  templateId: number;
  formDataId?: number;
  sessionId?: string;
  mode?: string;
  wizardStep?: number;
  currentValues?: any;
  needTts?: boolean;
}) {
  return http.post(`${BaseUrl}/voice/process-text`, data);
}

// 上传音频进行语音填单
export function processAudio(formData: FormData) {
  return http.post(`${BaseUrl}/voice/process`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
}

// 智能校验
export function validateForm(templateId: number, formValues: any) {
  return http.post(`${BaseUrl}/voice/validate?templateId=${templateId}`, formValues);
}

// TTS 表单回读
export function readbackForm(templateId: number, formValues: any) {
  return http.post(`${BaseUrl}/voice/readback?templateId=${templateId}`, formValues);
}
export default {
  getFormDetail,
  validateForm,
  readbackForm,
  processText,
  processAudio,
  submitForm,
  createForm,
  undoForm,
  redoForm,
  confirmForm,
  updateForm,
  getRecommendedValues,
  getTemplateList,
  toggleFavorite,
  togglePin,
  getVersionList,
  deleteTemplate,
  toggleTemplateStatus,
  getTemplateDetail,
  getFormType,
};
