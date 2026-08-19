import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
// import pluginBasicSsl from '@vitejs/plugin-basic-ssl';
// import pluginMkcert from 'vite-plugin-mkcert';
import { fileViewerRenderers } from '@file-viewer/vite-plugin';
export default defineConfig({
  // plugins: [vue(), pluginBasicSsl()],
  plugins: [
    vue(),
    fileViewerRenderers({
      copyAssets: true,
    }),
    // pluginMkcert({
    //   source: 'coding', // 使用国内源
    // }),
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      sass: {
        additionalData: `@use "@/assets/styles/element.scss" as *;`,
      },
      scss: {
        additionalData: `@use "@/assets/styles/app.scss" as *;`,
      },
    },
  },
  server: {
    // 服务端渲染
    // 端口号
    port: 10011,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://192.168.1.144:5488',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // '/api': {
      //   target: 'http://192.168.1.144:5100',
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api/, ''),
      // },
      // '/oss': {
      //   target: 'http://192.168.1.144:5131',
      //   changeOrigin: true,
      // },
      // '/file': {
      //   target: 'http://192.168.1.144:5131',
      //   changeOrigin: true,
      // },
      '/network': {
        target: 'http://10.15.3.227:7007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/network/, ''),
      },
      // '/opc': {
      //   target: 'http://192.168.1.144:5101',
      //   changeOrigin: true,
      // },
    },
    watch: {
      ignored: ['**/public/**'],
    },
  },
  optimizeDeps: {
    include: ['vue'],
  },
});
