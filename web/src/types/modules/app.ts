/** 认证方式 */
export enum AuthTypeEnum {
  /** 无需认证 */
  No = '0',
  /** 密码模式(oauth2) */
  OAuth2 = '1',
  /** 基础认证 */
  Basic = '2',
  /** 回调认证 */
  Callback = '3',
}

/** 前端传值跳转方式 */
export enum PostTypeEnum {
  /** 窗口传值 */
  PostMessage = '0',
  /** 占位符 */
  Placeholder = '1',
  /** 直接跳转 */
  Open = '2',
}

// 应用项
export interface AppItem {
  id: string; // 默认桌面应用ID / 我的桌面应用管理ID
  name: string;
  logo: string;
  clientAccessId: string; // 我的桌面应用ID
  clientType: string;
  postType: PostTypeEnum;
  sort: Number;
  tip: string;
  remark: string;
  isFavorites: string;
}

// 未收藏应用
export interface UnFavorites {
  [key: string]: AppItem[];
}

// 应用数据
export interface AppData {
  favorites: AppItem[];
  unFavorites: UnFavorites;
  // 扩展字段
  [key: string]: any;
}

/** 应用跳转返回值 */
export interface ClientTokenData {
  type: 'FORWARD' | 'HIKVISION_FORWARD' | string;
  homepage: string;
  data: string;
}
