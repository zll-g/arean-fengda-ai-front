import { ref } from 'vue';
import { getUsageAccess } from '@/api/modules/usage-stats';

/**
 * 运营统计访问权限(仅超管)模块级单例。
 *
 * 后端 /usage/stats/access 探针为权威判定(JWT claim key 不在前端硬编码),
 * 本模块负责首拉缓存:fd-layout 菜单显隐与 router adminOnly 守卫共用同一状态。
 * 登出/切账号时调用 resetUsageAccess 失效缓存(登录态变化会强制刷新页面,实践中天然重置)。
 */
const accessState = ref<boolean | null>(null); // null=未拉取/拉取中
let pendingRequest: Promise<boolean> | null = null;

/** 响应式权限状态(null=未知,菜单按不显示处理,拉取成功为 true 后显现) */
export const usageAccess = accessState;

/**
 * 确保拿到权限结果(并发去重;探针失败按无权限处理,不抛错)。
 *
 * @returns true=当前登录人是超管
 */
export const ensureUsageAccess = (): Promise<boolean> => {
  if (accessState.value !== null) {
    return Promise.resolve(accessState.value);
  }
  if (pendingRequest) {
    return pendingRequest;
  }
  pendingRequest = getUsageAccess()
    .then((res: any) => {
      accessState.value = res?.data?.access === true;
      return accessState.value;
    })
    .catch(() => {
      accessState.value = false;
      return false;
    })
    .finally(() => {
      pendingRequest = null;
    });
  return pendingRequest;
};

/** 失效缓存(登出/切换账号时调用) */
export const resetUsageAccess = () => {
  accessState.value = null;
  pendingRequest = null;
};
