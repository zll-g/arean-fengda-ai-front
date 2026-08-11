<template>
  <div class="h5-layout">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

// H5页面专用布局组件，提供可滚动容器
onMounted(() => {
  // 修改父元素样式以允许滚动
  const htmlEl = document.documentElement;
  const bodyEl = document.body;
  const appEl = document.getElementById('app');

  // 保存原始样式
  const originalStyles = {
    html: {
      height: htmlEl.style.height,
      overflow: htmlEl.style.overflow,
    },
    body: {
      height: bodyEl.style.height,
      overflow: bodyEl.style.overflow,
    },
    app: appEl
      ? {
          height: appEl.style.height,
          overflow: appEl.style.overflow,
        }
      : null,
  };

  // 设置为可滚动
  htmlEl.style.height = 'auto';
  htmlEl.style.overflow = 'auto';
  bodyEl.style.height = 'auto';
  bodyEl.style.overflow = 'auto';
  if (appEl) {
    appEl.style.height = 'auto';
    appEl.style.overflow = 'visible';
  }

  // 组件卸载时恢复原始样式
  onUnmounted(() => {
    htmlEl.style.height = originalStyles.html.height;
    htmlEl.style.overflow = originalStyles.html.overflow;
    bodyEl.style.height = originalStyles.body.height;
    bodyEl.style.overflow = originalStyles.body.overflow;
    if (appEl && originalStyles.app) {
      appEl.style.height = originalStyles.app.height;
      appEl.style.overflow = originalStyles.app.overflow;
    }
  });
});
</script>

<style scoped>
.h5-layout {
  position: relative;
  z-index: 1;
  width: 100%;
  height: auto;
  min-height: 100vh;
  overflow: hidden auto;
  background-color: #f7f8fa;
  -webkit-overflow-scrolling: touch; /* iOS平滑滚动 */
}
</style>
