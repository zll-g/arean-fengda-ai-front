/** 登录账户 */
export type LoginInfo = {
  remember: boolean;
  username: string;
  password: string;
};

/** 登录实体 */
export type LoginDto = {
  captchaCode: string;
  grant_type: string; // 明确枚举可能的值
  username: string;
  tenantId: string;
  password: string; // 加密后的字符串
  scope: 'openid' | string; // 如果有其他scope可扩展
};

/** 用户Token */
export interface TokenInfo {
  /** 登录时间 */
  loginTimestamp?: string;
  /** 登录主机 */
  host: any;
  /** token */
  access_token: string;
  /** `access_token`的过期时间（时间戳） */
  expires_in: number;
  /** 用于调用刷新accessToken的接口时所需的token */
  refresh_token: string;
}
