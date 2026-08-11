<template>
  <div class="predictive-page">
    <van-sticky>
      <van-nav-bar
        title="数据预测"
        left-text="返回"
        left-arrow
        @click-left="onClickLeft"
        @dblclick="handleDoubleClickTitle"
      />
    </van-sticky>
    <Charts />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import Charts from './components/charts.vue';

const router = useRouter();

const onClickLeft = () => {
  router.back();
};

const handleDoubleClickTitle = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('已返回顶部');
};
</script>

<style scoped>
.predictive-page {
  min-height: 100vh;
  background-color: #f7f8fa;
}
</style>
