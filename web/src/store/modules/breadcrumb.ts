import { defineStore } from 'pinia';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

export interface BreadcrumbItem {
  title: string;
  path: string;
  fullPath: string;
  name?: string;
}

const STORAGE_KEY = 'web_breadcrumb_history';

export const useBreadcrumbStore = defineStore('breadcrumb', {
  state: () => ({
    list: [] as BreadcrumbItem[],
  }),

  actions: {
    /**
     * 初始化缓存
     * 刷新页面后仍然保留面包屑
     */
    init() {
      const cache = sessionStorage.getItem(STORAGE_KEY);

      if (!cache) {
        this.list = [];
        return;
      }

      try {
        const list = JSON.parse(cache) as BreadcrumbItem[];

        if (Array.isArray(list)) {
          this.list = list;
        } else {
          this.list = [];
        }
      } catch {
        this.list = [];
      }
    },

    /**
     * 保存到 sessionStorage
     */
    save() {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.list));
    },

    /**
     * 添加访问过的路由
     * 规则：
     * 1. 只记录 /web 下的页面
     * 2. 不记录 /web 布局本身
     * 3. 根据 path 去重
     * 4. 已存在的路由不重复添加
     */
    add(route: RouteLocationNormalizedLoaded) {
      const title = route.meta?.title as string | undefined;

      if (!title) {
        return;
      }

      // 只记录 web 端页面，避免 h5 路由进入面包屑
      if (!route.path.startsWith('/web')) {
        return;
      }

      // 不记录布局路由本身
      if (route.path === '/web') {
        return;
      }

      const item: BreadcrumbItem = {
        title,
        path: route.path,
        fullPath: route.fullPath,
        name: route.name ? String(route.name) : undefined,
      };

      // 根据 path 去重，避免重复添加
      const exists = this.list.some((breadcrumb) => breadcrumb.path === item.path);

      if (exists) {
        return;
      }

      this.list.push(item);
      this.save();
    },

    /**
     * 删除某一个面包屑
     */
    remove(path: string) {
      this.list = this.list.filter((item) => item.path !== path);
      this.save();
    },

    /**
     * 清空面包屑
     */
    clear() {
      this.list = [];
      sessionStorage.removeItem(STORAGE_KEY);
    },
  },
});
