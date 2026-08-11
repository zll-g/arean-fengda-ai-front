<template>
  <div class="not-found-page">
    <van-sticky>
      <van-nav-bar
        title="页面不存在"
        left-text="返回"
        left-arrow
        @click-left="onClickLeft"
        @dblclick="handleDoubleClickTitle"
      />
    </van-sticky>
    <div class="not-found">
      <van-empty image="error" image-size="200" description="页面不存在">
        <template #description>
          <p class="tip-text">抱歉，您访问的页面不存在</p>
        </template>
        <van-button round type="primary" class="bottom-button" @click="goHome">
          返回首页
        </van-button>
      </van-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { showToast } from 'vant';

const router = useRouter();

const onClickLeft = () => {
  router.back();
};

const handleDoubleClickTitle = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('已返回顶部');
};

const goHome = () => {
  router.push('/h5/home');
};
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 46px);
  padding: var(--spacing-md);
}

.tip-text {
  margin: var(--spacing-md) 0;
  font-size: 16px;
  color: var(--color-text);
}

.bottom-button {
  margin-top: var(--spacing-lg);
}
</style>
