import http from '../http';

const BaseUrl = '/api';
/** 获取对话历史列表 */
export const getChatHistory = (params?: object) => {
  return http.get(`${BaseUrl}/data-chat/sessions/page`, params);
};

/** 获取对话消息 */
export const getChatMessages = (sessionId?: string) => {
  return http.get(`${BaseUrl}/data-chat/history/${sessionId}`);
};

/** 删除对话消息 */
export const romoveChatMessages = (sessionId?: string) => {
  return http.delete(`${BaseUrl}/data-chat/sessions/${sessionId}`);
};

export default { getChatHistory, getChatMessages, romoveChatMessages };
