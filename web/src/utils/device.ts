const AUTH_CONFIG = {
  TOKEN_KEY: 'jwt_token',
  // 用户信息的 key
  USER_INFO_KEY: 'user_info',
  // state 的 key（防 CSRF）
  STATE_KEY: 'oauth_state',
};

// 分辨用户端
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * 保存 Token
 */
export const saveToken = (token: string) => {
  localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
};

/**
 * 获取 Token
 */
export const getToken = () => {
  return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
};

/**
 * 保存用户信息
 */
export const saveUserInfo = (userInfo: any) => {
  localStorage.setItem(AUTH_CONFIG.USER_INFO_KEY, JSON.stringify(userInfo));
};

/**
 * 获取用户信息
 */
export const getUserInfo = () => {
  const info = localStorage.getItem(AUTH_CONFIG.USER_INFO_KEY);
  return info ? JSON.parse(info) : null;
};

/**
 * 判断是否已登录（本地有 Token 就视为已登录，实际可加有效期判断）
 */
export const isLoggedIn = () => {
  return !!getToken();
};
