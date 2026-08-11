import { createPinia, PiniaVuePlugin } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import type { App } from 'vue';

export default (app: App<Element>) => {
  app.use(PiniaVuePlugin);
  const store = createPinia();
  store.use(piniaPluginPersistedstate);
  app.use(store);

  return store;
};

export * from './modules/login';
export * from './modules/knowledge-chat';
export * from './modules/dataQuery-chat';
export * from './modules/h5-todo';
export * from './modules/h5-knowledge';
export * from './modules/h5-common';
