import http from '../http';
import { aiPrefix } from '../http';

// ==================== 类型定义(与后端 UsageStatsVO / UsageEventEntity 逐字段对齐) ====================

/** 总览指标卡(对应 UsageStatsVO.Overview) */
export interface UsageOverview {
  /** 区间事件总数(全部事件类型) */
  totalEvents: number;
  /** 今日事件总数 */
  todayEvents: number;
  /** 区间对话类请求数(KB_CHAT_ASK/KB_CHAT_REGENERATE/DI_CHAT_ASK/DI_CHAT_REGENERATE/DOC_ANALYSIS_ASK) */
  chatRequests: number;
  /** 区间活跃用户(去重 user_id;匿名不计) */
  activeUsers: number;
  /** 今日活跃用户 */
  todayActiveUsers: number;
  /** 区间对话类成功率(0-100,保留1位小数;无对话事件为0) */
  successRate: number;
  /** 区间对话类平均耗时ms */
  avgLatencyMs: number;
  /** 区间token总消耗(输入+输出;问数链路未聚合token不计入) */
  totalTokens: number;
  /** 区间文档上传次数(DOC_UPLOAD) */
  docUploads: number;
  /** 区间新建知识库数(KB_CREATE) */
  kbCreates: number;
}

/** 趋势按天项(对应 UsageStatsVO.TrendItem) */
export interface UsageTrendItem {
  /** yyyy-MM-dd */
  date: string;
  events: number;
  activeUsers: number;
}

/** 功能分布(对应 UsageStatsVO.FeatureDist;feature 码值见 UsageEventType/feature 契约) */
export interface UsageFeatureDist {
  feature: string;
  events: number;
}

/** 对话类状态分布(对应 UsageStatsVO.StatusDist;SUCCESS/ERROR/INTERRUPTED) */
export interface UsageStatusDist {
  status: string;
  events: number;
}

/** 用户活跃排行(对应 UsageStatsVO.UserRank) */
export interface UsageUserRank {
  userId: string;
  account?: string | null;
  workno?: string | null;
  orgId?: string | null;
  events: number;
  chatRequests: number;
  tokens: number;
  /** yyyy-MM-dd HH:mm:ss */
  lastActiveTime?: string | null;
}

/** 使用事件明细行(对应 UsageEventEntity;question 受后端 capture-question 开关控制) */
export interface UsageEventItem {
  id: number;
  eventType: string;
  feature?: string | null;
  userId?: string | null;
  account?: string | null;
  workno?: string | null;
  orgId?: string | null;
  sessionId?: string | null;
  refId?: string | null;
  status: string;
  latencyMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  question?: string | null;
  detail?: string | null;
  errorMsg?: string | null;
  createdTime: string;
}

/** 明细分页响应(对应 UsageStatsVO.EventPage) */
export interface UsageEventPage {
  total: number;
  page: number;
  size: number;
  list: UsageEventItem[];
}

/** 区间日期参数(yyyy-MM-dd;缺省后端按近7天) */
export interface UsageRangeParams {
  startDate?: string;
  endDate?: string;
}

/** 明细筛选参数 */
export interface UsageEventsParams extends UsageRangeParams {
  eventType?: string;
  feature?: string;
  status?: string;
  /** 模糊匹配 账号/工号/用户ID */
  userKw?: string;
  page: number;
  size: number;
}

// ==================== 接口(http 响应拦截已按 code==='200' 解包为 Result,取 .data) ====================

/** 访问探针(任意登录用户可调):{ access: boolean } — true=超管,前端据此显隐菜单与路由 */
export const getUsageAccess = () => {
  return http.get(`${aiPrefix}/usage/stats/access`);
};

/** 总览指标卡(仅超管) */
export const getUsageOverview = (params: UsageRangeParams) => {
  return http.get(`${aiPrefix}/usage/stats/overview`, params);
};

/** 趋势按天(仅超管) */
export const getUsageTrend = (params: UsageRangeParams) => {
  return http.get(`${aiPrefix}/usage/stats/trend`, params);
};

/** 功能分布(仅超管) */
export const getUsageFeatureDist = (params: UsageRangeParams) => {
  return http.get(`${aiPrefix}/usage/stats/feature-dist`, params);
};

/** 对话类状态分布(仅超管) */
export const getUsageStatusDist = (params: UsageRangeParams) => {
  return http.get(`${aiPrefix}/usage/stats/status-dist`, params);
};

/** 用户活跃排行(仅超管;limit 缺省10,上限100) */
export const getUsageUserRank = (params: UsageRangeParams & { limit?: number }) => {
  return http.get(`${aiPrefix}/usage/stats/user-rank`, params);
};

/** 事件明细分页(仅超管) */
export const getUsageEvents = (params: UsageEventsParams) => {
  return http.get(`${aiPrefix}/usage/stats/events`, params);
};
