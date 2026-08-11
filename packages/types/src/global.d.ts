import { Emu } from '../types';
declare global {
  var Emu: Emu;

  // 请求相应结果
  type RspResult<T = any> = {
    code: string;
    msg: string;
    data?: T;
  };

  interface String {
    replaceAll(searchValue: string | RegExp, replaceValue: string): string;
  }

  interface Array {
    distinct(): void;
  }
}

declare module 'mockjs';
