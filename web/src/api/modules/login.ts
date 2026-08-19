import http from '../http';
import { aiPrefix } from '../http';

/** 登录 */
export const login = (data?: object) => {
  return http.post(`${aiPrefix}/local/login`, data);
};

/** 登录 */
export const logout = () => {
  return http.post(`${aiPrefix}/local/logout`);
};

export default { login, logout };
