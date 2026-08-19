import http from '../http';
import { aiPrefix, opcPrefix } from '../http';

// 其它的首页数据
export const getHomeInfo = () => {
  return http.get(`${aiPrefix}/visu/rendering`);
};
// 机组负荷
export const getCrewWorkload = () => {
  return http.get(`${opcPrefix}/workload/getCrewWorkload`);
};

export default { getHomeInfo, getCrewWorkload };
