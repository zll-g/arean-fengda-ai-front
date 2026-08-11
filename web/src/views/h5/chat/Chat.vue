<template>
  <div class="chat-page">
    <van-sticky>
      <van-nav-bar
        title="语音交互"
        left-text="返回"
        left-arrow
        @click-left="onClickLeft"
        @dblclick="handleDoubleClickTitle"
      >
        <template #right>
          <van-icon name="comment-o" size="18" />
        </template>
      </van-nav-bar>
    </van-sticky>
    <FloatingMenu />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import FloatingMenu from '@/components/h5/common/FloatingMenu.vue';
import { showToast } from 'vant';

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
.chat-page {
  min-height: 100vh;
  background-color: #f7f8fa;
}
</style>
