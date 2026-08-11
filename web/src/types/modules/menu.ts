// 菜单类型
export enum MenuType {
  // 目录
  Catalog = 'C',
  // 菜单
  Menu = 'M',
  // 按钮
  Button = 'B',
  // 接口
  Interface = 'J',
}

// 菜单跳转类型
export enum MenuTarget {
  // 新开页签跳转
  Blank,
  // 内部跳转
  Self,
  // 弹层
  Dialog = 2,
}

//菜单
export interface IMenu {
  id: string;
  menuName: string;
  menuPath: string;
  menuType: MenuType;
  target: MenuTarget;
  childrenList?: IMenu[];
  [prop: string]: any;
}

export enum MenuPlatformBelong {
  // 后台
  Manage = '0',
  // 前台
  Web = '1',
}

// 是否公共接口
export enum DefaultInterface {
  // 是
  Yes = '1',
  // 否
  No = '0',
}
