import type { App } from 'vue';
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type Router,
} from 'vue-router';

import NProgress from 'nprogress';
import baseRoutes from './routes';
import 'nprogress/nprogress.css';
import { ElMessage } from 'element-plus';
import http from '@/api/http';
import { layer } from '@layui/layer-vue';
import { isLoggedIn } from '@/utils/device';
import { ensureUsageAccess } from '@/utils/usageAccess';
// 路由实例
let router: Router;
// 路由集合
let routes = baseRoutes;
// 错误路由

// 进度条初始值
NProgress.configure({
  easing: 'ease', // 缓冲动画类型，可选值如'ease'、'linear'等
  speed: 500, // 动画速度，单位为毫秒
  trickleSpeed: 200, // 每次进度条步进的速度，单位为毫秒
  showSpinner: false, // 是否显示环形进度动画
  minimum: 0.2, // 设置开始时最低百分比  同inc
});

/**
 * 初始化
 * @param {App<Element>} app 应用实例
 */
const init = (app: App<Element>) => {
  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  // 路由过滤器
  router.beforeEach(
    async (
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext,
    ) => {
      // 设置页面标识，用于请求管理
      http.setCurrentPageKey(to.name as string);
      // 调整路由时关闭所有layer弹层
      layer.closeAll();

      NProgress.start();

      // 验证页面是否真实存在
      if (to.matched.length == 0) {
        await alert404(from, next);
        return;
      }

      // 验证是否需要验证权限 ||  如果是登录页或错误页时，直接跳转至对应页面页
      if (!to.meta.requireAuth || to.name === 'login') {
        next();
        return;
      }

      // 验证路由权限
      if (isLoggedIn()) {
        if (to.meta.adminOnly) {
          const allowed = await ensureUsageAccess();
          if (!allowed) {
            alert404(from, next, `权限不足，您无权限访问【${to?.meta?.title || '页面'}】`);
            return;
          }
        }
        next();
      } else {
        alert404(from, next, `权限不足，您无权限访问【${to?.meta?.title || '页面'}】`);
        next('/login');
        return;
      }
    },
  );

  router.afterEach(() => {
    NProgress.done();
  });

  app.use(router);
};

async function alert404(
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
  content?: string,
) {
  NProgress.done();
  if (!('/index' == from.path || '/callback' == from.path || 'login' == from.path)) {
    ElMessage.warning(content || '抱歉，您访问的页面不存在！');
    next(from.fullPath);
    return;
  }

  //判断是从登录页进来的
  if (['/', '/index', '/callback', '/login'].includes(from.path)) {
    next();
  } else {
    next(from.fullPath);
  }
}

export default (app: App<Element>) => {
  init(app);
};

export { router };
