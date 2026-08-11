import { createApp } from 'vue';
import AppCmp from './App.vue';
import ElementPlus from 'element-plus';
import '@/assets/styles/element.scss';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import layer from '@layui/layer-vue';
import '@layui/layer-vue/lib/index.css';
import Vant from 'vant';
import 'vant/lib/index.css';
import useRouter from './router';
import useStore from './store';
import i18n from '@/locales/index';
import { imgError, imgSrc, imgShow } from '@/directives/imageDirective';
import FileViewer from '@file-viewer/vue3';
import 'markstream-vue/index.css';
const render = () => {
  const app = createApp(AppCmp);
  useStore(app);
  useRouter(app);
  app.directive('img-src', imgSrc);
  app.directive('img-error', imgError);
  app.directive('img-show', imgShow);

  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
  }
  app
    .use(ElementPlus)
    .use(layer)
    .use(Vant)
    .use(i18n)
    .use(FileViewer as any)
    .mount('#app');
};

render();
