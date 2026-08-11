import type { IRoute } from '@yusui/types';
import type { IMenu } from './menu';

// 用户信息
export interface UserInfo {
  // 租户id
  tenantId: string;
  // 租户名称
  tenantName: string;
  // 用户id
  id: string;
  // 头像
  avatar: string;
  // 账号
  username: string;
  // 昵称
  nickName: string;
  // 性别
  sex: string;
  // 手机号码
  phone: string;
  // 邮箱
  email: string;
  // 备注
  remark: string;
  // 状态
  status: string;
  /** 用户角色 */
  roles?: Array<string>;
  // 菜单列表
  menus: IMenu[];
  // 路由
  routes?: IRoute[];
  // 权限集
  permissions?: string[];
  // 额外数据
  extraData?: object;
  // 扩展字段
  [key: string]: any;
}
