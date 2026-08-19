import http from '../http';
import { aiPrefix } from '../http';

/** 获取对话历史列表 */
export const getChatHistory = (params?: object) => {
  return http.get(`${aiPrefix}/chat/sessions`, params);
};

/** 获取对话消息 */
export const getChatMessages = (sessionId?: string) => {
  return http.get(`${aiPrefix}/chat/sessions/${sessionId}/messages`);
};

/** 删除对话消息 */
export const romoveChatMessages = (sessionId?: string) => {
  return http.delete(`${aiPrefix}/chat/sessions/${sessionId}`);
};

/** 语音识别 */
export const process = (data?: object) => {
  return http.post(`${aiPrefix}/voice/processAudio`, data);
};

/** 上传文档 */
export const upload = (data?: object) => {
  return http.post(`${aiPrefix}/doc-analysis/uploadDocument`, data);
};

/** 删除文档 */
export const deleteFile = (file?: string, fileName?: string) => {
  return http.delete(
    `${aiPrefix}/doc-analysis/deleteDocument?docSessionId=${file}&fileName=${fileName}`,
  );
};

/** 获取会话文档状态 */
export const getDocSessionStatus = (docSessionId?: string) => {
  return http.get(`${aiPrefix}/chat/getDocSessionStatus?docSessionId=${docSessionId}`);
};

/** 刷新会话文档状态 */
export const refreshDocSessionStatus = (docSessionId?: string) => {
  return http.get(`${aiPrefix}/chat/refreshDocSessionStatus?docSessionId=${docSessionId}`);
};

/** 更新对话标题 */
export const updateTitle = (id?: string, title?: string) => {
  return http.put(`${aiPrefix}/chat/updateTitle?sessionId=${id}&title=${title}`);
};

/**
 * 查看同一问题的全部回答变体（重新生成产生的历史版本，按变体序号正序）。
 * 入参为该问题对应的用户消息ID（assistant 消息的 userMessageId 字段）。
 */
export const listMessageVariants = (userMessageId: string) => {
  return http.get(`${aiPrefix}/chat/messages/${userMessageId}/variants`);
};

/**
 * 切换生效变体（版本回溯）：指定回答变体置为生效，同组其余变体下线。
 */
export const activateMessageVariant = (messageId: string) => {
  return http.post(`${aiPrefix}/chat/messages/${messageId}/activate`);
};

export default {
  getChatHistory,
  getChatMessages,
  listMessageVariants,
  activateMessageVariant,
  romoveChatMessages,
  updateTitle,
  process,
  upload,
  deleteFile,
  getDocSessionStatus,
  refreshDocSessionStatus,
};
