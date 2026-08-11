import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';
import { SelfStorage } from '@/utils/securels';
import type { LoginInfo } from '@/types';

export interface ILoginStore {
  loginUser: Ref<LoginInfo>;
}

export const useLoginStore = defineStore(
  '_secure__ls__uprotal_login',
  (): ILoginStore => {
    // 登录用户
    const loginUser = ref({} as LoginInfo);

    return {
      loginUser,
    };
  },
  {
    persist: {
      storage: SelfStorage,
      paths: ['loginUser'], // 指定需要持久化的字段
    },
  },
);
