import http from '../http';

const BaseUrl = '/api';
/** 获取对话历史列表 */
export const getChatHistory = (params?: object) => {
  return http.get(`${BaseUrl}/chat/sessions`, params);
};

/** 获取对话消息 */
export const getChatMessages = (sessionId?: string) => {
  return http.get(`${BaseUrl}/chat/sessions/${sessionId}/messages`);
};

/** 删除对话消息 */
export const romoveChatMessages = (sessionId?: string) => {
  return http.delete(`${BaseUrl}/chat/sessions/${sessionId}`);
};

/** 语音识别 */
export const process = (data?: object) => {
  return http.post(`${BaseUrl}/voice/processAudio`, data);
};

/** 上传文档 */
export const upload = (data?: object) => {
  return http.post(`${BaseUrl}/doc-analysis/uploadDocument`, data);
};

/** 删除文档 */
export const deleteFile = (file?: string, fileName?: string) => {
  return http.delete(
    `${BaseUrl}/doc-analysis/deleteDocument?docSessionId=${file}&fileName=${fileName}`,
  );
};

/** 获取会话文档状态 */
export const getDocSessionStatus = (docSessionId?: string) => {
  return http.get(`${BaseUrl}/chat/getDocSessionStatus?docSessionId=${docSessionId}`);
};

/** 刷新会话文档状态 */
export const refreshDocSessionStatus = (docSessionId?: string) => {
  return http.get(`${BaseUrl}/chat/refreshDocSessionStatus?docSessionId=${docSessionId}`);
};

/** 更新对话标题 */
export const updateTitle = (id?: string, title?: string) => {
  return http.put(`${BaseUrl}/chat/updateTitle?sessionId=${id}&title=${title}`);
};
export default {
  getChatHistory,
  getChatMessages,
  romoveChatMessages,
  updateTitle,
  process,
  upload,
  deleteFile,
  getDocSessionStatus,
  refreshDocSessionStatus,
};
