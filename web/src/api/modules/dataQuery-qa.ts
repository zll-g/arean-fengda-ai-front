import http from '../http';

const BaseUrl = '/api';
/** 获取对话历史列表 */
export const getChatHistory = (params?: object) => {
  return http.get(`${BaseUrl}/data-chat/sessions/page`, params);
};

/** 获取对话消息（仅生效变体，存量 active_variant=NULL 视同生效） */
export const getChatMessages = (sessionId?: string) => {
  return http.get(`${BaseUrl}/data-chat/history/${sessionId}`);
};

/** 删除对话消息 */
export const romoveChatMessages = (sessionId?: string) => {
  return http.delete(`${BaseUrl}/data-chat/sessions/${sessionId}`);
};

/**
 * 停止当前会话的在途流式生成（中断聊天）。
 * 后端把已生成的部分回答立即落盘（status=2 中断），并通过该轮 SSE 连接
 * 回推 stopped 事件 {reason, partialLength}；零内容（刚问就停）删占位不留痕。
 * 返回 Result.data=true 表示已受理；false=当前无在途生成（幂等，可忽略）。
 * 注意：仅单数据源链路有效（联邦查询后端无轮次登记，无此接口）。
 */
export const stopChat = (sessionId: string) => {
  return http.post(`${BaseUrl}/data-chat/stop/${sessionId}`);
};

/**
 * 查询同一问题的全部回答变体（重新回答产生的历史版本，按变体序号正序）。
 * 字段同对话历史行：id/variantIndex/activeVariant/aiAnswer/generatedSql/
 * resultColumns/resultData/chartConfig/costMs/status/stopReason/errorMsg/createdTime。
 */
export const listVariants = (historyId: string | number) => {
  return http.get(`${BaseUrl}/data-chat/history/${historyId}/variants`);
};

/**
 * 切换生效变体（版本回溯）：指定变体置为生效，同组其余变体下线。
 * 返回 Result.data=true 切换成功。
 */
export const activateVariant = (historyId: string | number) => {
  return http.post(`${BaseUrl}/data-chat/history/${historyId}/activate`);
};

export default {
  getChatHistory,
  getChatMessages,
  romoveChatMessages,
  stopChat,
  listVariants,
  activateVariant,
};
