import http from '../http';
import { aiPrefix } from '../http';

/** 获取AI推荐类型 */
export const getRecommendType = () => {
  return http.get(`${aiPrefix}/recommend/getAllRecommendType`);
};

/** 获取AI推荐列表 */
export const getRecommendList = (params?: object) => {
  return http.get(`${aiPrefix}/recommend/listPage`, params);
};

export default { getRecommendType, getRecommendList };
