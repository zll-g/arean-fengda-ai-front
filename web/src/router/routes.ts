import type { RouteRecordRaw } from 'vue-router';
import FdHeader from '@/components/fd-layout/index.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requireAuth: false },
  },
  {
    path: '/index',
    name: 'index',
    component: () => import('@/views/index/index.vue'),
    meta: { title: '登录页', requireAuth: false },
  },
  {
    path: '/callback',
    name: 'callback',
    component: () => import('@/views/callback/index.vue'),
    meta: { title: '中转页', requireAuth: false },
  },
  {
    path: '/web',
    name: 'web',
    component: FdHeader,
    meta: { title: '丰达web' },
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('@/views/web/home/index.vue'),
        meta: { title: '首页', requireAuth: true },
      },

      {
        path: 'template/create',
        name: 'TemplateCreate',
        component: () => import('@/views/web/template/TemplateEditor.vue'),
        meta: { title: '创建模板', requireAuth: true },
      },
      {
        path: 'template/edit/:id',
        name: 'TemplateEdit',
        component: () => import('@/views/web/template/TemplateEditor.vue'),
        meta: { title: '编辑模板', requireAuth: true },
      },
      {
        path: 'template/detail/:id',
        name: 'TemplateDetail',
        component: () => import('@/views/web/template/TemplateDetailPage.vue'),
        meta: { title: '模板详情', requireAuth: true },
      },

      // {
      //   path: 'form/:templateId',
      //   name: 'form',
      //   component: () => import('@/views/web/voice-filled/index.vue'),
      //   meta: { title: '语音填单', requireAuth: true },
      // },
      // {
      //   path: 'voice-filled',
      //   name: 'voiceFilled',
      //   component: () => import('@/views/web/voice-filled/index.vue'),
      //   meta: { title: '语音填单', requireAuth: true },
      // },
      {
        path: 'form-data/:id',
        name: 'FormData',
        component: () => import('@/views/web/voice-filled/components/Detail.vue'),
        meta: { title: '表单详情', requireAuth: true },
      },
      {
        path: 'form/:templateId',
        name: 'form',
        component: () => import('@/views/web/form/index.vue'),
        meta: { title: '填单', requireAuth: true },
      },
      {
        path: 'voice-management',
        name: 'VoiceManagement',
        meta: { title: '语音填单管理', requireAuth: true },
        children: [
          {
            path: 'form-history',
            name: 'form-history',
            component: () => import('@/views/web/form-history/index.vue'),
            meta: { title: '表单管理', requireAuth: true },
          },
          {
            path: 'templates',
            name: 'Templates',
            component: () => import('@/views/web/template/TemplateList.vue'),
            meta: { title: '表单模板管理', requireAuth: true },
          },
          {
            path: 'master',
            name: 'master',
            component: () => import('@/views/web/master/index.vue'),
            meta: { title: '主数据管理', requireAuth: true },
          },
        ],
      },
      {
        path: 'knowledge-management',
        name: 'KnowledgeManagement',
        meta: { title: '知识问答管理', requireAuth: true },
        children: [
          {
            path: 'knowledge-qa',
            name: 'KnowledgeQa',
            component: () => import('@/views/web/knowledge-qa/index.vue'),
            meta: { title: '知识库问答', requireAuth: true },
          },
          {
            path: 'knowledge-base',
            name: 'KnowledgeBase',
            component: () => import('@/views/web/knowledge-base/index.vue'),
            meta: { title: '知识库管理', requireAuth: true },
          },
          {
            path: 'split-management/:documentId',
            name: 'SplitManagement',
            component: () => import('@/views/web/split-management/index.vue'),
            // 带必填参数的功能页：仅从知识库文档行入口进入,不出现在导航菜单
            meta: { title: '分片管理', requireAuth: true, hideInMenu: true },
          },
          {
            path: 'file-management',
            name: 'fileManagement',
            component: () => import('@/views/web/file-management/index.vue'),
            meta: { title: '文件管理', requireAuth: true },
          },
        ],
      },

      {
        path: 'dataQuery-management',
        name: 'DataQueryManagement',
        meta: { title: '智能问数管理', requireAuth: true },
        children: [
          {
            path: 'data-query',
            name: 'WebDataQuery',
            component: () => import('@/views/web/data-query/index.vue'),
            meta: { title: '智能问数', requireAuth: true },
          },
          {
            path: 'datasource',
            name: 'DataSource',
            component: () => import('@/views/web/datasource/index.vue'),
            meta: { title: '数据源管理', requireAuth: true },
          },
          {
            path: 'metadata/:datasourceId?',
            name: 'Metadata',
            alias: '/web/metadata/:datasourceId?',
            component: () => import('@/views/web/metadata/index.vue'),
            meta: { title: '元数据管理', requireAuth: true },
          },
          {
            path: 'semantic/:datasourceId?',
            name: 'Semantic',
            alias: '/web/semantic/:datasourceId?',
            component: () => import('@/views/web/semantic/index.vue'),
            meta: { title: '语义模型', requireAuth: true },
          },
          {
            path: 'fewshot/:datasourceId?',
            name: 'Fewshot',
            alias: '/web/fewshot/:datasourceId?',
            component: () => import('@/views/web/fewshot/index.vue'),
            meta: { title: '预设问答', requireAuth: true },
          },
          {
            path: 'datasource-group',
            name: 'DatasourceGroup',
            alias: '/web/datasource-group',
            component: () => import('@/views/web/datasource-group/index.vue'),
            meta: { title: '数据源分组', requireAuth: true },
          },
          {
            path: 'health',
            name: 'Health',
            component: () => import('@/views/web/health/index.vue'),
            meta: { title: 'OPCUA 服务实时监控', requireAuth: true },
          },
        ],
      },
      {
        path: 'neural-network',
        name: 'NeuralNetwork',
        meta: { title: '神经网络预测', requireAuth: true },
        children: [
          {
            path: 'boiler-ystem',
            name: 'BoilerYstem',
            alias: '/web/boiler-ystem',
            component: () => import('@/views/web/neural-network/ystem.vue'),
            meta: { title: '2号启动锅炉燃烧系统', requireAuth: true },
          },
          {
            path: 'boiler-prediction',
            name: 'BoilerPrediction',
            component: () => import('@/views/web/neural-network/predict.vue'),
            meta: { title: '锅炉系统智能预测', requireAuth: true },
          },
        ],
      },
      {
        path: 'usage-stats',
        name: 'usageStats',
        component: () => import('@/views/web/usage-stats/index.vue'),
        // 仅超级管理员可见:菜单显隐(fd-layout)+ 路由守卫(adminOnly)双重拦截,
        // 后端 /usage/stats/* 接口 isSuperAccount 再兜底
        meta: { title: '运营统计', requireAuth: true, adminOnly: true, hideInMenu: true },
      },
      {
        path: 'system-management',
        name: 'SystemManagement',
        meta: { title: '系统管理', requireAuth: true },
        children: [
          {
            path: 'organization-info',
            name: 'OrganizationInfo',
            component: () => import('@/views/web/organization-info/index.vue'),
            meta: { title: '组织信息', requireAuth: true },
          },
          {
            path: 'suggest',
            name: 'Suggest',
            component: () => import('@/views/web/suggest/index.vue'),
            meta: { title: '智能推荐', requireAuth: true },
          },
        ],
      },
    ],
  },
  // H5 移动端路由
  {
    path: '/h5',
    component: () => import('@/components/h5/H5Layout.vue'),
    children: [
      // 首页
      {
        path: 'home',
        name: 'H5Home',
        component: () => import('@/views/h5/home/Home.vue'),
        meta: {
          title: '首页',
          keepAlive: true,
          requireAuth: true,
        },
      },
      {
        path: 'template',
        name: 'TemplatesH5',
        component: () => import('@/views/h5/chat/template.vue'),
        meta: {
          title: '表单模板',
          keepAlive: true,
          requireAuth: true,
        },
      },
      {
        path: 'form/:templateId',
        name: 'formH5',
        component: () => import('@/views/h5/chat/form.vue'),
        meta: { title: '填单', requireAuth: true },
      },
      // 智能问数历史记录
      {
        path: 'dataQuery-history',
        name: 'DataQueryHistory',
        component: () => import('@/views/h5/data-query/history.vue'),
        meta: {
          title: '智能问数历史',
          keepAlive: false,
          requireAuth: true,
        },
      },
      // 智能问数对话
      {
        path: 'dataQuery-qa',
        name: 'DataQuery',
        component: () => import('@/views/h5/data-query/DataQuery.vue'),
        meta: {
          title: '智能问数',
          keepAlive: true,
          requireAuth: true,
        },
      },
      {
        path: 'knowledge-history',
        name: 'KnowledgeHistory',
        component: () => import('@/views/h5/knowledge/knowledge-history.vue'),
        meta: {
          title: '知识库问答历史',
          keepAlive: false,
          requireAuth: true,
        },
      },
      {
        path: 'knowledge-qa',
        name: 'H5KnowledgeQa',
        component: () => import('@/views/h5/knowledge/knowledge-qa.vue'),
        meta: {
          title: '知识库问答',
          keepAlive: true,
          requireAuth: true,
        },
      },
      // 预测分析
      {
        path: 'predictive',
        name: 'Predictive',
        component: () => import('@/views/h5/predictive/Predictive.vue'),
        meta: {
          title: '预测分析',
          keepAlive: true,
          requireAuth: true,
        },
      },
      {
        path: 'voice-interaction',
        name: 'VoiceInteraction',
        component: () => import('@/views/h5/chat/VoiceInteraction/VoiceInteraction.vue'),
        meta: {
          title: '语音填单',
          keepAlive: true,
          requireAuth: true,
        },
      },
      // 404 页面
      {
        path: ':pathMatch(.*)*',
        name: 'H5NotFound',
        component: () => import('@/views/h5/NotFound.vue'),
        meta: {
          title: '页面不存在',
          requireAuth: false,
        },
      },
    ],
  },
];

export default routes;
