import { createI18n } from 'vue-i18n';
import zhCN from './langs/zh-Hans';
import enUS from './langs/en';

const defaultLang = localStorage.getItem('lang') || 'zh-CN';

const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: defaultLang,
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
});

export default i18n;
