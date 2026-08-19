<template>
  <div class="fd-layout">
    <!-- 左侧菜单 -->
    <aside class="sidebar">
      <div class="logo-section">
        <div class="logo-icon">
          <span>智</span>
        </div>

        <div class="logo-text">
          <span class="system-name">{{ t('layout.systemName') }}</span>
          <span class="system-subtitle">{{ t('layout.systemSubtitle') }}</span>
        </div>
      </div>

      <nav class="side-menu">
        <template v-for="item in menuItems" :key="item.path">
          <!-- 无 children 的一级菜单 -->
          <router-link
            v-if="!item.children?.length"
            :to="getFullPath(item.path)"
            class="menu-item"
            active-class="is-active"
          >
            <span class="menu-icon">
              <component :is="getIcon(item.meta?.title as string)" />
            </span>

            <span class="menu-title" :title="getI18nTitle(item.meta?.title as string)">
              {{ getI18nTitle(item.meta?.title as string) }}
            </span>
          </router-link>

          <!-- 有 children 的一级菜单：点击后以大面板形式弹出 -->
          <div
            v-else
            class="menu-group"
            :class="{ 'is-active': isMenuGroupActive(item) }"
            @mouseenter="handleMenuGroupEnter(item, $event)"
            @mouseleave="scheduleCloseMegaMenu"
          >
            <div
              class="menu-group-title"
              :class="{ 'is-open': activeMegaMenuPath === item.path }"
              @click.stop="toggleMegaMenu(item, $event)"
            >
              <span class="menu-icon">
                <component :is="getIcon(item.meta?.title as string)" />
              </span>

              <span class="menu-title" :title="getI18nTitle(item.meta?.title as string)">
                {{ getI18nTitle(item.meta?.title as string) }}
              </span>

              <span class="menu-arrow" :class="{ 'is-open': activeMegaMenuPath === item.path }">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9.4 8.6 12.8 12l-3.4 3.4 1.4 1.4 4.8-4.8-4.8-4.8-1.4 1.4z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </div>
          </div>
        </template>
      </nav>
    </aside>

    <!-- 弹出式大菜单 -->
    <transition name="mega-menu-fade">
      <div
        v-if="activeMegaMenu"
        ref="megaMenuRef"
        class="mega-menu-panel"
        :style="megaMenuStyle"
        @mouseenter="clearMegaCloseTimer"
        @mouseleave="scheduleCloseMegaMenu"
        @click.stop
      >
        <!-- 存在三级路由时，左侧展示分类 -->
        <div v-if="hasMegaSections" class="mega-menu-sections">
          <template v-for="section in activeMegaSections" :key="section.path">
            <button
              v-if="section.children?.length"
              type="button"
              class="mega-section-item"
              :class="{ 'is-active': activeMegaSectionPath === section.path }"
              @mouseenter="selectMegaSection(section)"
              @click="selectMegaSection(section)"
            >
              <span class="mega-section-title">
                {{ getI18nTitle(section.meta?.title as string) }}
              </span>

              <span class="mega-section-arrow">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9.4 8.6 12.8 12l-3.4 3.4 1.4 1.4 4.8-4.8-4.8-4.8-1.4 1.4z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </button>

            <router-link
              v-else
              :to="getFullPath(section.path, activeMegaMenu.path)"
              class="mega-section-item"
              :class="{
                'is-active': isMegaRouteActive(getFullPath(section.path, activeMegaMenu.path)),
              }"
              @click="closeMegaMenu"
            >
              <span class="mega-section-title">
                {{ getI18nTitle(section.meta?.title as string) }}
              </span>

              <span class="mega-section-arrow">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9.4 8.6 12.8 12l-3.4 3.4 1.4 1.4 4.8-4.8-4.8-4.8-1.4 1.4z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </router-link>
          </template>
        </div>

        <!-- 右侧菜单内容 -->
        <div class="mega-menu-content" :class="{ 'is-full': !hasMegaSections }">
          <router-link
            v-for="child in megaDisplayItems"
            :key="child.path"
            :to="getMegaItemPath(child)"
            class="mega-menu-link"
            :class="{ 'is-active': isMegaRouteActive(getMegaItemPath(child)) }"
            @click="closeMegaMenu"
          >
            <span class="mega-link-title" :title="getI18nTitle(child.meta?.title as string)">
              {{ getI18nTitle(child.meta?.title as string) }}
            </span>
          </router-link>

          <div v-if="!megaDisplayItems.length" class="mega-menu-empty">暂无菜单</div>
        </div>
      </div>
    </transition>

    <!-- 右侧内容区 -->
    <section class="content-wrapper">
      <header class="content-header">
        <div class="header-left">
          <div class="title-row">
            <h2 class="page-title">{{ currentTitle }}</h2>
          </div>

          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item
              v-for="item in webBreadcrumbList"
              :key="item.path"
              :to="isCurrentBreadcrumb(item) ? undefined : { path: item.fullPath }"
            >
              <span
                class="breadcrumb-label"
                :class="{ 'is-current': isCurrentBreadcrumb(item) }"
                :title="getI18nTitle(item.title)"
              >
                {{ getI18nTitle(item.title) }}
              </span>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <div class="lang-switch">
            <button
              type="button"
              class="lang-option"
              :class="{ 'is-active': locale === 'zh-CN' }"
              @click="changeLang('zh-CN')"
            >
              <span class="lang-icon">中</span>
              <span>{{ t('layout.zh') }}</span>
            </button>

            <button
              type="button"
              class="lang-option"
              :class="{ 'is-active': locale === 'en-US' }"
              @click="changeLang('en-US')"
            >
              <span class="lang-icon">EN</span>
              <span>{{ t('layout.en') }}</span>
            </button>
          </div>

          <el-dropdown
            trigger="click"
            popper-class="user-dropdown-popper"
            @command="handleUserCommand"
          >
            <div class="header-user" tabindex="0" role="button" aria-haspopup="menu">
              <div class="avatar">{{ getUserInfo()?.nickname?.[0] || '-' }}</div>

              <div class="header-user-info">
                <span class="username">{{ getUserInfo()?.nickname || '-' }}</span>
                <span class="role">{{ getUserInfo()?.workno || '-' }}</span>
              </div>

              <span class="user-dropdown-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="m7 9.5 5 5 5-5" stroke="currentColor" stroke-width="2" />
                </svg>
              </span>
            </div>

            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  command="logout"
                  class="logout-dropdown-item"
                  :disabled="logoutLoading"
                >
                  <span class="logout-dropdown-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10M14.5 8l4 4-4 4M18.5 12H9"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                  <span>{{ logoutText }}</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="main-container">
        <div class="page-card">
          <router-view />
        </div>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  type Component,
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { type RouteRecordRaw, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { type BreadcrumbItem, useBreadcrumbStore } from '@/store/modules/breadcrumb';
import { getUserInfo } from '@/utils/device';
import { ensureUsageAccess, usageAccess } from '@/utils/usageAccess';
// import autofit from 'autofit.js';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/api';

const { t, locale } = useI18n();

type Lang = 'zh-CN' | 'en-US';

const titleKeyMap: Record<string, string> = {
  智维引擎: 'layout.systemName',
  中文: 'layout.zh',
  English: 'layout.en',
  工作台: 'layout.workspace',
  丰达web: 'routeTitle.fengdaWeb',

  登录页: 'routeTitle.login',
  中转页: 'routeTitle.callback',

  首页: 'routeTitle.home',

  创建模板: 'routeTitle.createTemplate',
  编辑模板: 'routeTitle.editTemplate',
  模板详情: 'routeTitle.templateDetail',
  模板管理: 'routeTitle.templateManage',
  表单模板管理: 'routeTitle.formTemplateManage',

  表单详情: 'routeTitle.formDetail',
  填单: 'routeTitle.fillForm',
  语音填单: 'routeTitle.voiceForm',
  语音填单管理: 'routeTitle.voiceFormManage',
  语音填单历史: 'routeTitle.voiceFormHistory',
  表单管理: 'routeTitle.formManage',
  历史填单管理: 'routeTitle.formHistoryManage',

  主数据管理: 'routeTitle.masterDataManage',

  知识问答管理: 'routeTitle.qaManage',
  知识库管理: 'routeTitle.knowledgeBaseManage',
  分片管理: 'routeTitle.splitManagement',
  知识库: 'routeTitle.knowledgeBase',
  知识库问答: 'routeTitle.knowledgeBaseQa',
  文件管理: 'routeTitle.fileManagement',
  智能问数管理: 'routeTitle.dataQueryManage',
  智能问数: 'routeTitle.dataQuery',
  智能问数历史: 'routeTitle.dataQueryHistory',
  数据源管理: 'routeTitle.datasourceManage',
  元数据管理: 'routeTitle.metadataManage',
  语义模型: 'routeTitle.semanticModel',
  预设问答: 'routeTitle.presetQa',
  数据源分组: 'routeTitle.datasourceGroup',
  'OPCUA 服务实时监控': 'routeTitle.OPCUAServicRealTimeMonitoring',
  系统管理: 'routeTitle.systemManage',
  神经网络预测: 'routeTitle.neuralNetworkPrediction',
  '2号启动锅炉燃烧系统': 'routeTitle.boilerYstem',
  锅炉系统智能预测: 'routeTitle.intelligentPrediction',

  运营统计: 'routeTitle.usageStats',
  组织信息: 'routeTitle.organizationInfo',
  智能推荐: 'routeTitle.recommend',
};

const getI18nTitle = (title?: string) => {
  if (!title) return '';

  const normalizedTitle = title.trim();
  const key = titleKeyMap[normalizedTitle];

  return key ? t(key) : normalizedTitle;
};

const changeLang = (lang: Lang) => {
  locale.value = lang;
  localStorage.setItem('lang', lang);
};

const router = useRouter();
const route = useRoute();

const logoutLoading = ref(false);

const logoutText = computed(() => {
  if (logoutLoading.value) {
    return locale.value === 'en-US' ? 'Logging out...' : '退出中...';
  }

  return locale.value === 'en-US' ? 'Log out' : '退出登录';
});

/**
 * 调用后端退出登录接口。
 * 如果你的接口不在 api.base.logout，请只修改这里即可，
 * 例如：api.auth.logout()、api.user.logout()。
 */

const clearLoginState = () => {
  // 保留语言设置，其余本地登录信息全部清除。
  const savedLang = localStorage.getItem('lang');

  localStorage.clear();
  sessionStorage.clear();

  if (savedLang) {
    localStorage.setItem('lang', savedLang);
  }
};

const handleLogout = async () => {
  if (logoutLoading.value) return;

  try {
    await ElMessageBox.confirm(
      locale.value === 'en-US' ? 'Are you sure you want to log out?' : '确定要退出当前账号吗？',
      locale.value === 'en-US' ? 'Log out' : '退出登录',
      {
        confirmButtonText: locale.value === 'en-US' ? 'Confirm' : '确定',
        cancelButtonText: locale.value === 'en-US' ? 'Cancel' : '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  logoutLoading.value = true;

  try {
    const res = await api.login.logout();
    if (res.data !== true) {
      await fetch('https://gms.sec.com.cn/uaa/security/sso/logout', {
        method: 'GET',
      }).catch(() => undefined);
      // 使用 Image 信标方式调用 SSO 登出：
      // - 浏览器自动携带 GMS 域 cookie，不受 CORS 限制
      // - 返回的 HTML/JS 不会被解析执行，避免 frame-busting 劫持整个页面
      // console.log('[logout] 开始调用 GMS SSO 登出');
      // const img = new Image();
      // img.src = 'https://gms.sec.com.cn/uaa/security/sso/logout';
    }
    clearLoginState();
    await router.replace('/login');
  } catch {
    ElMessage.error(locale.value === 'en-US' ? 'Failed to log out' : '退出登录失败');
  } finally {
    logoutLoading.value = false;
  }
};

const handleUserCommand = (command: string) => {
  if (command === 'logout') {
    void handleLogout();
  }
};

const basePath = '/web';

const breadcrumbStore = useBreadcrumbStore();
const { list: breadcrumbList } = storeToRefs(breadcrumbStore);

const webBreadcrumbList = computed(() => {
  return breadcrumbList.value.filter((item) => {
    const fullPath = item.fullPath || item.path;

    return fullPath === basePath || fullPath.startsWith(`${basePath}/`);
  });
});

const visibleMenuTitles = [
  '首页',
  '表单模板管理',
  '主数据管理',
  '表单管理',
  '文件管理',
  '知识库管理',
  '知识库问答',
  '智能问数',
  '数据源管理',
  '知识问答管理',
  '智能问数管理',
  '语音填单管理',
  '系统管理',
  '神经网络预测',
  '智能推荐',
  '运营统计',
];

const activeMegaMenuPath = ref('');
const activeMegaSectionPath = ref('');
const megaMenuTop = ref(92);
const megaMenuRef = ref<HTMLElement | null>(null);
const megaCloseTimer = ref<number | null>(null);

const createSvgIcon = (paths: string[]) =>
  defineComponent({
    name: 'MenuSvgIcon',
    setup() {
      return () =>
        h(
          'svg',
          {
            class: 'svg-icon',
            viewBox: '0 0 24 24',
            fill: 'none',
            xmlns: 'http://www.w3.org/2000/svg',
            'aria-hidden': 'true',
          },
          paths.map((d) =>
            h('path', {
              d,
              fill: 'currentColor',
            }),
          ),
        );
    },
  });

const HomeIcon = createSvgIcon([
  'M4 10.4 12 3.8l8 6.6v8.3c0 .7-.6 1.3-1.3 1.3h-4.1v-5.6H9.4V20H5.3c-.7 0-1.3-.6-1.3-1.3v-8.3z',
]);

const TemplateIcon = createSvgIcon([
  'M5 3.5h14c.8 0 1.5.7 1.5 1.5v14c0 .8-.7 1.5-1.5 1.5H5c-.8 0-1.5-.7-1.5-1.5V5c0-.8.7-1.5 1.5-1.5zm2.2 3.8v2.5h9.6V7.3H7.2zm0 4.3V14h3.2v-2.4H7.2zm5.1 0V14h4.5v-2.4h-4.5zm-5.1 4.1v2.2h9.6v-2.2H7.2z',
]);

const CreateTemplateIcon = createSvgIcon([
  'M5.5 4h9.2L19 8.3v10.2c0 .8-.7 1.5-1.5 1.5h-12c-.8 0-1.5-.7-1.5-1.5v-13C4 4.7 4.7 4 5.5 4zm8.4 1.8v3.3h3.3l-3.3-3.3zM10.8 11h2v2.2H15v1.9h-2.2v2.2h-2v-2.2H8.6v-1.9h2.2V11z',
]);

const EditTemplateIcon = createSvgIcon([
  'M5.5 4h9.6L19 7.9v10.6c0 .8-.7 1.5-1.5 1.5h-12c-.8 0-1.5-.7-1.5-1.5v-13C4 4.7 4.7 4 5.5 4zm8.7 1.7v3.1h3.1l-3.1-3.1zM8 15.7l.4-2.2 5-5 1.9 1.9-5 5-2.3.3zm7.8-5.8-1.9-1.9.8-.8c.4-.4.9-.4 1.3 0l.6.6c.4.4.4.9 0 1.3l-.8.8z',
]);

const TemplateDetailIcon = createSvgIcon([
  'M5 4h14v16H5V4zm2 2v12h10V6H7zm2 2.5h6v1.7H9V8.5zm0 3h6v1.7H9v-1.7zm0 3h4v1.7H9v-1.7z',
]);

const MasterDataIcon = createSvgIcon([
  'M12 3C7.6 3 4 4.3 4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6c0-1.7-3.6-3-8-3zm0 2c3.4 0 5.8.8 5.8 1S15.4 7 12 7s-5.8-.8-5.8-1S8.6 5 12 5zm5.8 4.1v2.3c0 .3-2.3 1.2-5.8 1.2s-5.8-.9-5.8-1.2V9.1c1.4.8 3.6 1.2 5.8 1.2s4.4-.4 5.8-1.2zm0 5v3.7c0 .3-2.3 1.2-5.8 1.2s-5.8-.9-5.8-1.2v-3.7c1.4.8 3.6 1.2 5.8 1.2s4.4-.4 5.8-1.2z',
]);

const FormManageIcon = createSvgIcon([
  'M6 3.5h9.2L20 8.3V19c0 .8-.7 1.5-1.5 1.5H6c-.8 0-1.5-.7-1.5-1.5V5c0-.8.7-1.5 1.5-1.5zm8.5 1.8v3.6h3.6l-3.6-3.6zM7.5 11h9v1.8h-9V11zm0 3.5h9v1.8h-9v-1.8z',
]);

const FillFormIcon = createSvgIcon([
  'M6 3.5h12c.8 0 1.5.7 1.5 1.5v14c0 .8-.7 1.5-1.5 1.5H6c-.8 0-1.5-.7-1.5-1.5V5c0-.8.7-1.5 1.5-1.5zm2 4.2h8v1.8H8V7.7zm0 3.8h8v1.8H8v-1.8zm0 3.8h5v1.8H8v-1.8z',
]);

const HistoryFormIcon = createSvgIcon([
  'M12 4a8 8 0 1 1-7.5 5.2H2.8V4.5h1.9v2.4A8 8 0 0 1 12 4zm0 2a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm1 2.5v3.1l2.5 1.5-.9 1.5-3.4-2V8.5H13z',
]);

const VoiceFormIcon = createSvgIcon([
  'M12 3.5c1.7 0 3 1.3 3 3v5c0 1.7-1.3 3-3 3s-3-1.3-3-3v-5c0-1.7 1.3-3 3-3zm5.2 7.2c0 2.7-2 5-4.4 5.4V19h3v2H8.2v-2h3v-2.9c-2.5-.4-4.4-2.7-4.4-5.4h2c0 1.9 1.4 3.5 3.2 3.5s3.2-1.6 3.2-3.5h2z',
]);

const FileManageIcon = createSvgIcon([
  'M4.5 5.2c0-.9.8-1.7 1.7-1.7h5.1l1.8 2.2h4.7c.9 0 1.7.8 1.7 1.7v11.1c0 .9-.8 1.7-1.7 1.7H6.2c-.9 0-1.7-.8-1.7-1.7V5.2zm3 4.4h9v1.8h-9V9.6zm0 3.5h6.8v1.8H7.5v-1.8z',
]);

const KnowledgeBaseIcon = createSvgIcon([
  'M5.2 4.2h11.2c1 0 1.8.8 1.8 1.8v13.8H6.2c-1 0-1.8-.8-1.8-1.8V5c0-.5.3-.8.8-.8zm2 3v10h9V7.2h-9zm11 1.2h.7c.6 0 1.1.5 1.1 1.1v10.3h-1.8V8.4zM8.7 9.5h5.8v1.6H8.7V9.5zm0 3.1h4.2v1.6H8.7v-1.6z',
]);

const KnowledgeQaIcon = createSvgIcon([
  'M5.4 5h13.2c1 0 1.9.8 1.9 1.9v7.8c0 1-.9 1.9-1.9 1.9h-6.4l-4.5 3.2c-.6.4-1.3 0-1.3-.8v-2.4h-1c-1 0-1.9-.9-1.9-1.9V6.9c0-1.1.9-1.9 1.9-1.9zm6.7 2.8c-1.7 0-3 1-3.1 2.6h2c.1-.6.5-1 1.1-1 .7 0 1.1.4 1.1.9s-.3.8-1 1.1c-.9.5-1.4 1.1-1.4 2.1v.3h1.8v-.2c0-.5.3-.8.9-1.1.9-.5 1.6-1.1 1.6-2.2 0-1.5-1.2-2.5-3-2.5zm-1 6.8v1.8H13v-1.8h-1.9z',
]);

const QaManageIcon = createSvgIcon([
  'M5 4h14c.8 0 1.5.7 1.5 1.5v10c0 .8-.7 1.5-1.5 1.5h-5.6L9 20.2V17H5c-.8 0-1.5-.7-1.5-1.5v-10C3.5 4.7 4.2 4 5 4zm2.2 4.2H15V10H7.2V8.2zm0 3.5h5.3v1.8H7.2v-1.8zm9.4-3.7 1.3 1.3-3.2 3.2-1.7-1.7 1.2-1.2.5.5 1.9-2.1z',
]);

const DataAskIcon = createSvgIcon([
  'M5 18.5h14V20H5v-1.5zm1.2-7h2.3V17H6.2v-5.5zm4.1-4h2.3V17h-2.3V7.5zm4.1 2.8h2.3V17h-2.3v-6.7zM18.4 4l1.3 1.3-4.6 4.6-3-3-4.4 4.4-1.3-1.3 5.7-5.7 3 3L18.4 4z',
]);

const DataQueryManageIcon = createSvgIcon([
  'M5 4h14v4H5V4zm0 5.8h6.2v4.1H5V9.8zm7.8 0H19v4.1h-6.2V9.8zM5 15.7h6.2V20H5v-4.3zm7.8 0H19V20h-6.2v-4.3z',
]);

const DatasourceIcon = createSvgIcon([
  'M12 3.2c4.1 0 7.5 1.2 7.5 2.8v12c0 1.6-3.4 2.8-7.5 2.8S4.5 19.6 4.5 18V6c0-1.6 3.4-2.8 7.5-2.8zm0 2c-3.3 0-5.3.7-5.3.9S8.7 7 12 7s5.3-.7 5.3-.9-2-.9-5.3-.9zM6.7 9v2.4c0 .3 2 .9 5.3.9s5.3-.6 5.3-.9V9c-1.3.6-3.2.9-5.3.9S8 9.6 6.7 9zm0 5.1V18c0 .3 2 .9 5.3.9s5.3-.6 5.3-.9v-3.9c-1.3.6-3.2.9-5.3.9s-4-.3-5.3-.9z',
]);

const MetadataIcon = createSvgIcon(['M5 4h14v16H5V4zm2 2v3h10V6H7zm0 5v7h4v-7H7zm6 0v7h4v-7h-4z']);

const SemanticModelIcon = createSvgIcon([
  'M12 3.5 19.5 8v8L12 20.5 4.5 16V8L12 3.5zm0 2.2L7.2 8.5 12 11.3l4.8-2.8L12 5.7zm-5.5 4.5v4.6l4.5 2.7v-4.6l-4.5-2.7zm11 0L13 12.9v4.6l4.5-2.7v-4.6z',
]);

const PresetQaIcon = createSvgIcon([
  'M4.5 5.5C4.5 4.7 5.2 4 6 4h12c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H6c-.8 0-1.5-.7-1.5-1.5v-13zM8 8h8v1.8H8V8zm0 3.5h6.2v1.8H8v-1.8zm0 3.5h4v1.8H8V15zm8-1.2 1.4 1.4-3.1 3.1-1.8-1.8 1.2-1.2.6.6 1.7-1.7z',
]);

const DatasourceGroupIcon = createSvgIcon([
  'M6.5 5.5h4.2v4.2H6.5V5.5zm6.8 0h4.2v4.2h-4.2V5.5zM6.5 14.3h4.2v4.2H6.5v-4.2zm6.8 0h4.2v4.2h-4.2v-4.2zM9.7 10.7h4.6v1.8H9.7v-1.8z',
]);

const SystemIcon = createSvgIcon([
  'M12 2.8 19.5 7v5.6c0 4.5-3.1 7.5-7.5 8.6-4.4-1.1-7.5-4.1-7.5-8.6V7L12 2.8zm0 2.3L6.5 8.2v4.4c0 3.3 2.1 5.5 5.5 6.5 3.4-1 5.5-3.2 5.5-6.5V8.2L12 5.1zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 1.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z',
]);

const NeuralNetworkIcon = createSvgIcon([
  'M7 6.5a2.5 2.5 0 1 1 1.8 2.4l2.1 2.1c.3-.1.7-.2 1.1-.2s.8.1 1.1.2l2.1-2.1A2.5 2.5 0 1 1 17 10.5c-.2 0-.5 0-.7-.1l-2.2 2.2c.2.4.4.9.4 1.4s-.1 1-.4 1.4l2.2 2.2c.2-.1.5-.1.7-.1a2.5 2.5 0 1 1-1.8 4.3l-2.1-2.1c-.3.1-.7.2-1.1.2s-.8-.1-1.1-.2l-2.1 2.1A2.5 2.5 0 1 1 7 17.5c.2 0 .5 0 .7.1l2.2-2.2c-.2-.4-.4-.9-.4-1.4s.1-1 .4-1.4L7.7 10.4c-.2.1-.5.1-.7.1A2.5 2.5 0 0 1 7 6.5zm5 6.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z',
]);

const PredictIcon = createSvgIcon([
  'M5 18.5h14V20H5v-1.5zm1.2-2.2c.9-4.7 3.5-8.1 7.3-9.9l.8 1.7c-3.2 1.5-5.3 4.2-6.1 8.2h-2zm11.1-9.5 1.3 1.3-4.2 4.2-2.2-2.2 1.2-1.2 1 1 2.9-3.1z',
]);

const DefaultIcon = createSvgIcon([
  'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm0 4.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zm1.1 9.1h-2.2v-5.5h2.2v5.5z',
]);

/** 单条路由是否应在菜单中展示（排除隐藏标记 + 必填动态参数路径） */
const isMenuVisibleRoute = (item: RouteRecordRaw) => {
  if (item.meta?.hideInMenu) return false;

  const path = item.path || '';

  return !path.split('/').some((segment) => segment.startsWith(':') && !segment.endsWith('?'));
};

const menuItems = computed<RouteRecordRaw[]>(() => {
  const webRoute = router.getRoutes().find((item) => item.path === basePath);

  if (!webRoute || !webRoute.children) {
    return [];
  }

  return webRoute.children.filter((item) => {
    const title = item.meta?.title as string;

    // 超管专属页面（meta.adminOnly，如运营统计）：权限探针确认前一律不显示
    if (item.meta?.adminOnly && usageAccess.value !== true) {
      return false;
    }

    return visibleMenuTitles.includes(title) && isMenuVisibleRoute(item);
  }) as RouteRecordRaw[];
});

const currentTitle = computed(() => {
  return getI18nTitle((route.meta?.title as string) || '工作台');
});

const removeOptionalParams = (path: string) => {
  return path.replace(/\/?:\w+\?/g, '');
};

const getFullPath = (path: string, parentPath = '') => {
  let fullPath = path;

  if (parentPath && !path.startsWith('/')) {
    fullPath = `${parentPath}/${path}`;
  }

  if (!fullPath.startsWith('/')) {
    fullPath = `${basePath}/${fullPath}`;
  }

  return removeOptionalParams(fullPath);
};

const isCurrentBreadcrumb = (item: BreadcrumbItem) => {
  return item.path === route.path;
};

const activeMegaMenu = computed<RouteRecordRaw | null>(() => {
  return menuItems.value.find((item) => item.path === activeMegaMenuPath.value) || null;
});

/** 当前菜单分组下可展示的子菜单（排除隐藏项与必填动态参数项） */
const activeMegaSections = computed<RouteRecordRaw[]>(() => {
  return ((activeMegaMenu.value?.children || []) as RouteRecordRaw[]).filter(isMenuVisibleRoute);
});

const hasMegaSections = computed(() => {
  return Boolean(activeMegaSections.value.some((item) => item.children?.length));
});

const activeMegaSection = computed<RouteRecordRaw | null>(() => {
  const children = activeMegaSections.value;

  return children.find((item) => item.path === activeMegaSectionPath.value) || children[0] || null;
});

const megaDisplayItems = computed<RouteRecordRaw[]>(() => {
  const menu = activeMegaMenu.value;

  if (!menu?.children?.length) {
    return [];
  }

  if (!hasMegaSections.value) {
    return activeMegaSections.value;
  }

  const section = activeMegaSection.value;

  if (!section) {
    return [];
  }

  if (section.children?.length) {
    return (section.children as RouteRecordRaw[]).filter(isMenuVisibleRoute);
  }

  return [section];
});

const megaMenuStyle = computed(() => ({
  top: `${megaMenuTop.value}px`,
  maxHeight: `calc(100% - ${megaMenuTop.value + 16}px)`,
}));

const updateMegaMenuPosition = (target: HTMLElement) => {
  const layout = document.querySelector<HTMLElement>('.fd-layout');

  if (!layout) {
    megaMenuTop.value = 92;
    return;
  }

  const layoutRect = layout.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const scaleY = layout.offsetHeight ? layoutRect.height / layout.offsetHeight : 1;
  const rawTop = (targetRect.top - layoutRect.top) / (scaleY || 1);

  megaMenuTop.value = Math.min(Math.max(rawTop, 88), 180);
};

const setDefaultMegaSection = (item: RouteRecordRaw) => {
  const children = item.children || [];
  const currentSection = children.find((child) => {
    const childPath = getFullPath(child.path, item.path);

    return route.path === childPath || route.path.startsWith(`${childPath}/`);
  });

  activeMegaSectionPath.value = currentSection?.path || children[0]?.path || '';
};

const clearMegaCloseTimer = () => {
  if (!megaCloseTimer.value) {
    return;
  }

  window.clearTimeout(megaCloseTimer.value);
  megaCloseTimer.value = null;
};

const closeMegaMenu = () => {
  clearMegaCloseTimer();
  activeMegaMenuPath.value = '';
  activeMegaSectionPath.value = '';
};

const scheduleCloseMegaMenu = () => {
  clearMegaCloseTimer();

  megaCloseTimer.value = window.setTimeout(() => {
    closeMegaMenu();
  }, 160);
};

const openMegaMenu = (item: RouteRecordRaw, event: MouseEvent) => {
  clearMegaCloseTimer();

  const isSameMenu = activeMegaMenuPath.value === item.path;

  activeMegaMenuPath.value = item.path;

  if (!isSameMenu) {
    setDefaultMegaSection(item);
  }

  updateMegaMenuPosition(event.currentTarget as HTMLElement);
};

const handleMenuGroupEnter = (item: RouteRecordRaw, event: MouseEvent) => {
  openMegaMenu(item, event);
};

const toggleMegaMenu = (item: RouteRecordRaw, event: MouseEvent) => {
  if (activeMegaMenuPath.value === item.path) {
    closeMegaMenu();
    return;
  }

  openMegaMenu(item, event);
};

const selectMegaSection = (section: RouteRecordRaw) => {
  activeMegaSectionPath.value = section.path;
};

const getMegaItemPath = (item: RouteRecordRaw) => {
  const menu = activeMegaMenu.value;

  if (!menu) {
    return getFullPath(item.path);
  }

  if (!hasMegaSections.value) {
    return getFullPath(item.path, menu.path);
  }

  const section = activeMegaSection.value;

  if (!section?.children?.length) {
    return getFullPath(item.path, menu.path);
  }

  return getFullPath(item.path, getFullPath(section.path, menu.path));
};

const isMegaRouteActive = (path: string) => {
  return route.path === path || route.path.startsWith(`${path}/`);
};

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node;

  if (megaMenuRef.value?.contains(target)) {
    return;
  }

  closeMegaMenu();
};

const isMenuGroupActive = (item: RouteRecordRaw) => {
  const menuPath = getFullPath(item.path);

  return route.path === menuPath || route.path.startsWith(`${menuPath}/`);
};

const getIcon = (title?: string): Component => {
  const icons: Record<string, Component> = {
    首页: HomeIcon,

    模板管理: TemplateIcon,
    表单模板管理: TemplateIcon,
    创建模板: CreateTemplateIcon,
    编辑模板: EditTemplateIcon,
    模板详情: TemplateDetailIcon,

    主数据管理: MasterDataIcon,

    表单管理: FormManageIcon,
    表单详情: FormManageIcon,
    填单: FillFormIcon,
    历史填单管理: HistoryFormIcon,

    语音填单: VoiceFormIcon,
    语音填单管理: VoiceFormIcon,
    语音填单历史: HistoryFormIcon,

    文件管理: FileManageIcon,

    知识库: KnowledgeBaseIcon,
    知识库管理: KnowledgeBaseIcon,
    知识库问答: KnowledgeQaIcon,

    知识问答管理: QaManageIcon,

    智能问数: DataAskIcon,
    智能问数管理: DataQueryManageIcon,
    智能问数历史: HistoryFormIcon,

    数据源管理: DatasourceIcon,
    元数据管理: MetadataIcon,
    语义模型: SemanticModelIcon,
    预设问答: PresetQaIcon,
    数据源分组: DatasourceGroupIcon,

    系统管理: SystemIcon,

    神经网络预测: NeuralNetworkIcon,
    '2号启动锅炉燃烧系统': NeuralNetworkIcon,
    锅炉系统智能预测: PredictIcon,
  };

  return icons[title?.trim() || ''] || DefaultIcon;
};

const updateBreadcrumb = () => {
  if (!route.path.startsWith(`${basePath}/`) && route.path !== basePath) {
    return;
  }

  breadcrumbStore.add(route);
};

onMounted(async () => {
  breadcrumbStore.init();
  updateBreadcrumb();

  // 预拉取超管权限探针（adminOnly 菜单显隐依赖此结果，先等结果再渲染避免闪现/遗漏）
  await ensureUsageAccess();

  document.addEventListener('click', handleDocumentClick);

  // autofit.init({
  //   dh: 1080,
  //   dw: 1920,
  //   el: '.fd-layout',
  //   resize: true,
  //   limit: 0.3,
  // });
});

onBeforeUnmount(() => {
  clearMegaCloseTimer();
  document.removeEventListener('click', handleDocumentClick);
});

watch(
  () => route.fullPath,
  () => {
    updateBreadcrumb();
    closeMegaMenu();
  },
  {
    immediate: true,
  },
);
</script>

<style scoped lang="scss">
.fd-layout {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  color: #2f3338;
  background: #eadfd8;
}

/* 左侧菜单 */
.sidebar {
  position: relative;
  z-index: 2;
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 270px;
  height: 100%;
  background: #fff;
  border-right: 1px solid #eee4de;
  box-shadow: none;

  .logo-section {
    display: flex;
    gap: 12px;
    align-items: center;
    height: 76px;
    padding: 0 22px;
    border-bottom: 1px solid #eee4de;
  }

  .logo-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    font-size: 19px;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, #ff9a3d 0%, #f58220 100%);
    border-radius: 6px;
    box-shadow: 0 4px 10px rgb(245 130 32 / 18%);
  }

  .logo-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.15;
  }

  .system-name {
    font-size: 18px;
    font-weight: 800;
    color: #4a4f55;
    letter-spacing: 0.5px;
  }

  .system-subtitle {
    margin-top: 5px;
    font-size: 12px;
    color: #9a9fa6;
  }

  .side-menu {
    flex: 1;
    padding: 18px 14px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 5px;
    }

    &::-webkit-scrollbar-thumb {
      background: #d9d2cd;
      border-radius: 999px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }
  }

  .menu-item,
  .menu-group-title {
    position: relative;
    display: flex;
    gap: 12px;
    align-items: center;
    height: 46px;
    padding: 0 14px;
    margin-bottom: 8px;
    overflow: hidden;
    font-size: 14px;
    font-weight: 600;
    color: #505863;
    text-decoration: none;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    transition:
      color 0.2s ease,
      background-color 0.2s ease,
      border-color 0.2s ease;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 3px;
      height: 0;
      content: '';
      background: #f58220;
      border-radius: 0 2px 2px 0;
      transform: translateY(-50%);
      transition: height 0.2s ease;
    }

    &:hover {
      color: #e96f0f;
      background: #fff9f4;
      border-color: #f7e4d4;

      .menu-icon {
        color: #e96f0f;
        background: #fff0e2;
      }
    }
  }

  .menu-group-title {
    cursor: pointer;
    user-select: none;
  }

  .menu-item.is-active,
  .menu-group.is-active .menu-group-title {
    color: #e96f0f;
    background: linear-gradient(90deg, #fff3e8 0%, #fffaf6 100%);
    border-color: #f5d8c0;
    box-shadow: none;

    &::before {
      height: 24px;
    }

    .menu-icon {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d, #f58220);
      box-shadow: 0 3px 8px rgb(245 130 32 / 16%);
    }
  }

  .menu-item.is-active {
    &::after {
      position: absolute;
      top: 50%;
      right: 12px;
      width: 6px;
      height: 6px;
      content: '';
      background: #f58220;
      border-radius: 50%;
      box-shadow: none;
      transform: translateY(-50%);
    }
  }

  .menu-icon {
    position: relative;
    z-index: 1;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: #f58220;
    background: #fff4e9;
    border-radius: 6px;
    transition:
      color 0.2s ease,
      background-color 0.2s ease;

    .svg-icon {
      display: block;
      width: 18px;
      height: 18px;
    }
  }

  .menu-title {
    position: relative;
    z-index: 1;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu-arrow {
    position: relative;
    z-index: 1;
    display: inline-flex;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    color: #a8adb3;
    transition:
      color 0.2s ease,
      transform 0.2s ease;

    svg {
      width: 18px;
      height: 18px;
    }

    &.is-open {
      color: #f58220;
      transform: none;
    }
  }
}

/* 弹出式大菜单：仅改变菜单展开方式，不影响原页面布局 */
.mega-menu-panel {
  position: absolute;
  left: 300px;
  z-index: 30;
  display: flex;
  width: min(960px, calc(100% - 332px));
  min-height: 260px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #f58220;
  border-radius: 10px;
  box-shadow: 0 12px 30px rgb(70 54 44 / 14%);
}

.mega-menu-sections {
  flex-shrink: 0;
  width: 245px;
  padding: 10px 0;
  overflow-y: auto;
  background: #fff;
  border-right: 1px solid #eee4de;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d2cd;
    border-radius: 999px;
  }
}

.mega-section-item {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  min-height: 50px;
  padding: 0 22px 0 28px;
  font-size: 15px;
  font-weight: 500;
  color: #343a40;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-left: 3px solid transparent;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease;

  &:hover,
  &.is-active {
    color: #e96f0f;
    background: #fff8f2;
    border-left-color: #f58220;
  }
}

.mega-section-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mega-section-arrow {
  display: inline-flex;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: #6f757b;

  svg {
    width: 18px;
    height: 18px;
  }
}

.mega-menu-content {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 28px;
  align-content: start;
  padding: 10px 18px 18px;
  overflow-y: auto;
  background: #fff;

  &.is-full {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding-left: 28px;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d2cd;
    border-radius: 999px;
  }
}

.mega-menu-link {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 50px;
  padding: 0 10px;
  font-size: 15px;
  font-weight: 500;
  color: #343a40;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition:
    color 0.18s ease,
    background-color 0.18s ease;

  &:hover,
  &.is-active {
    color: #e96f0f;
    background: #fff8f2;
  }
}

.mega-link-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}

.mega-menu-empty {
  grid-column: 1 / -1;
  padding: 42px 20px;
  font-size: 14px;
  color: #8b929c;
  text-align: center;
}

.mega-menu-fade-enter-active,
.mega-menu-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.mega-menu-fade-enter-from,
.mega-menu-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

/* 右侧内容区域 */
.content-wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;

  .content-header {
    position: relative;
    z-index: 1;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    height: 76px;
    padding: 0 28px;
    background: #fff;
    border-bottom: 1px solid #eee4de;
    box-shadow: none;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }

  .title-row {
    display: flex;
    gap: 10px;
    align-items: center;
    min-width: 0;
  }

  .page-title {
    max-width: 420px;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 21px;
    font-weight: 700;
    color: #3d434a;
    white-space: nowrap;
  }

  .page-tag {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    font-size: 12px;
    font-weight: 700;
    color: #e96f0f;
    background: #fff4e9;
    border: 1px solid #f4d7bf;
    border-radius: 4px;
  }

  .breadcrumb {
    display: flex;
    max-width: 1500px;
    margin-top: 8px;
    overflow: auto hidden;
    font-size: 13px;
    white-space: nowrap;
    scrollbar-width: thin;

    :deep(.el-breadcrumb__item) {
      float: none;
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      min-width: max-content;
    }

    :deep(.el-breadcrumb__separator) {
      flex-shrink: 0;
      margin: 0 7px;
      font-weight: 400;
      color: #b4aaa3;
    }

    :deep(.el-breadcrumb__inner) {
      min-width: max-content;
      font-weight: 400;
      color: #8b929c;

      &:hover {
        color: #e96f0f;
      }
    }

    &::-webkit-scrollbar {
      height: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #d7cec8;
      border-radius: 999px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    .breadcrumb-label {
      display: inline-flex;
      align-items: center;
      max-width: none;
      height: 24px;
      padding: 0 8px;
      overflow: visible;
      text-overflow: unset;
      color: #505863;
      white-space: nowrap;
      border-radius: 4px;
      transition:
        color 0.2s ease,
        background-color 0.2s ease;

      &:hover {
        color: #e96f0f;
        background: #fff6ef;
      }

      &.is-current {
        color: #e96f0f;
        cursor: default;
        background: #fff0e2;
        border: 1px solid #f3d2b7;
        box-shadow: none;

        &:hover {
          color: #e96f0f;
        }
      }
    }
  }

  .header-right {
    display: flex;
    flex-shrink: 0;
    gap: 16px;
    align-items: center;
    margin-left: 20px;

    .lang-switch {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      height: 42px;
      padding: 4px;
      background: #fff;
      border: 1px solid #eadfd8;
      border-radius: 6px;
      box-shadow: none;
    }

    .lang-option {
      position: relative;
      display: inline-flex;
      gap: 7px;
      align-items: center;
      justify-content: center;
      height: 34px;
      padding: 0 12px;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      color: #505863;
      cursor: pointer;
      outline: none;
      background: transparent;
      border: 0;
      border-radius: 4px;
      transition:
        color 0.2s ease,
        background-color 0.2s ease;

      &:hover {
        color: #e96f0f;
        background: #fff6ef;
      }

      &.is-active {
        color: #fff;
        background: linear-gradient(135deg, #ff9a3d, #f58220);
        box-shadow: none;

        .lang-icon {
          color: #e96f0f;
          background: #fff;
        }
      }
    }

    .lang-icon {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 5px;
      font-size: 11px;
      font-weight: 800;
      color: #e96f0f;
      background: #fff4e9;
      border-radius: 4px;
      transition:
        color 0.2s ease,
        background-color 0.2s ease;
    }
  }

  .header-user {
    display: flex;
    gap: 10px;
    align-items: center;
    height: 44px;
    padding: 4px 10px 4px 5px;
    cursor: pointer;
    user-select: none;
    outline: none;
    background: #fff;
    border: 1px solid #eadfd8;
    border-radius: 6px;
    box-shadow: none;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease;

    &:hover,
    &:focus-visible {
      background: #fffaf6;
      border-color: #efc7a7;
      box-shadow: none;
      transform: none;
    }
  }

  .user-dropdown-arrow {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    margin-left: 2px;
    color: #9a9fa6;

    svg {
      width: 16px;
      height: 16px;
    }
  }

  .avatar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    font-size: 14px;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, #ff9a3d, #f58220);
    border-radius: 6px;
    box-shadow: none;
  }

  .header-user-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.15;
  }

  .username {
    display: block;
    font-size: 14px;
    font-weight: 700;
    color: #3d434a;
  }

  .role {
    display: block;
    max-width: 150px;
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    color: #8b929c;
    white-space: nowrap;
  }

  .main-container {
    flex: 1;
    overflow: auto;
    background: #f4f0ee;

    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    &::-webkit-scrollbar-thumb {
      background: #d3cbc6;
      border-radius: 999px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }
  }

  .page-card {
    height: 100%;
    padding: 22px;
    background: #fff;
    border: 1px solid #eee4de;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgb(70 54 44 / 4%);
  }
}

@media (width <=1200px) {
  .mega-menu-panel {
    width: min(820px, calc(100% - 332px));
  }

  .mega-menu-sections {
    width: 220px;
  }

  .mega-menu-content {
    gap: 0 18px;
  }
}

@media (width <=1200px) {
  .content-wrapper {
    .search-box {
      width: 220px;
    }

    .breadcrumb {
      max-width: 720px;
    }
  }
}

@media (width <=960px) {
  .sidebar {
    width: 260px;
  }

  .mega-menu-panel {
    left: 260px;
    width: calc(100% - 276px);
  }

  .mega-menu-sections {
    width: 200px;
  }

  .mega-menu-content {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    &.is-full {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .content-wrapper {
    .content-header {
      padding: 0 18px;
    }

    .search-box {
      display: none;
    }

    .page-title {
      max-width: 260px;
    }

    .breadcrumb {
      max-width: 420px;
    }

    .breadcrumb-label {
      max-width: 220px;
    }

    .main-container {
      padding: 16px;
    }

    .page-card {
      padding: 16px;
      border-radius: 8px;
    }
  }
}
</style>
<style lang="scss">
.user-dropdown-popper {
  padding: 6px !important;
  background: #fff !important;
  border: 1px solid #eee4de !important;
  border-radius: 8px !important;
  box-shadow: 0 10px 28px rgb(70 54 44 / 14%) !important;

  .el-popper__arrow::before {
    background: #fff !important;
    border-color: #eee4de !important;
  }

  .el-dropdown-menu {
    padding: 0;
    background: transparent;
  }

  .logout-dropdown-item {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 140px;
    height: 40px;
    padding: 0 14px;
    color: #505863;
    border-radius: 6px;

    &:hover,
    &:focus {
      color: #e96f0f;
      background: #fff4e9;
    }

    &.is-disabled {
      color: #b8bcc1;
      cursor: not-allowed;
      background: transparent;
    }
  }

  .logout-dropdown-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;

    svg {
      width: 18px;
      height: 18px;
    }
  }
}

.el-switch.is-checked .el-switch__core {
  background-color: #ff8a26 !important;
  border-color: #ff8a26 !important;
}
</style>
