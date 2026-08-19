import http from '../http';
import { aiPrefix } from '../http';

/** 获取对话历史列表 */
export const getChatHistory = (params?: object) => {
  return http.get(`${aiPrefix}/data-chat/sessions/page`, params);
};

/** 获取对话消息 */
export const getChatMessages = (sessionId?: string) => {
  return http.get(`${aiPrefix}/data-chat/history/${sessionId}`);
};

/** 删除对话消息 */
export const romoveChatMessages = (sessionId?: string) => {
  return http.delete(`${aiPrefix}/data-chat/sessions/${sessionId}`);
};

/**
 * 停止当前会话的在途流式生成（中断聊天）。
 * 返回 Result.data=true 表示已受理；false=当前无在途生成（幂等）。
 */
export const stopChat = (sessionId: string) => {
  return http.post(`${aiPrefix}/data-chat/stop/${sessionId}`);
};

/**
 * 查询同一问题的全部回答变体（重新回答产生的历史版本，按变体序号正序）。
 */
export const listVariants = (historyId: string | number) => {
  return http.get(`${aiPrefix}/data-chat/history/${historyId}/variants`);
};

/**
 * 切换生效变体（版本回溯）：指定变体置为生效，同组其余变体下线。
 */
export const activateVariant = (historyId: string | number) => {
  return http.post(`${aiPrefix}/data-chat/history/${historyId}/activate`);
};

export default {
  getChatHistory,
  getChatMessages,
  romoveChatMessages,
  stopChat,
  listVariants,
  activateVariant,
};
