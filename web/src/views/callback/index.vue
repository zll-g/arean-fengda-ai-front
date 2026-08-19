<template>
  <div class="redirect-container">
    <div class="loading-card fade-in">
      <div v-show="status === 'loading'" class="spinner">
        <div class="bounce1" />
        <div class="bounce2" />
        <div class="bounce3" />
      </div>
      <div v-show="status === 'success'" class="status-icon success-icon">✓</div>
      <div v-show="status === 'error'" class="status-icon error-icon">✕</div>

      <h2 class="loading-title">
        {{ title }}
        <span v-if="status === 'loading'" class="dot-anim">...</span>
      </h2>

      <p v-if="desc" class="loading-desc">{{ desc }}</p>

      <el-progress
        v-if="status !== 'error'"
        :percentage="progress"
        :show-text="false"
        :stroke-width="8"
        :status="status === 'success' ? 'success' : ''"
        class="progress-bar"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { isLoggedIn, isMobile, saveToken, saveUserInfo } from '@/utils/device';
import { aiPrefix } from '@/api/http';

const router = useRouter();

// 状态管理
const status = ref<'loading' | 'success' | 'error'>('loading');
const title = ref('正在验证登录');
const desc = ref('');
const progress = ref(0);
let progressTimer: ReturnType<typeof setInterval> | null = null;

// 模拟进度条增长
const startFakeProgress = () => {
  progress.value = 0;
  progressTimer = setInterval(() => {
    if (progress.value < 85) {
      // 随机增加 1 到 15 的进度，最多卡在 85% 等待接口返回
      progress.value += Math.floor(Math.random() * 15) + 1;
    }
  }, 200);
};

// 结束进度条
const finishProgress = () => {
  if (progressTimer) clearInterval(progressTimer);
  progress.value = 100;
};

const handleCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const error = urlParams.get('error');
  console.log(code, state, 888888888);
  // 用户拒绝授权
  if (error) {
    status.value = 'error';
    title.value = '授权失败';
    desc.value = urlParams.get('error_description') || '用户取消了登录或授权失败';
    return;
  }

  // 参数缺失
  if (!code) {
    status.value = 'error';
    title.value = '登录失败';
    desc.value = '回调参数缺失，请重新发起登录';
    return;
  }
  console.log(JSON.stringify({ code, state }), 3333);
  try {
    const data = {
      code,
      state,
    };
    const response = await fetch(`${aiPrefix}/gms/auth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    console.log(result, 222);
    if (result.code === '200') {
      const { token, userInfo } = result.data;
      saveToken(token);
      saveUserInfo(userInfo);

      status.value = 'success';
      title.value = '验证成功';
      desc.value = '即将为您跳转页面';
      finishProgress();

      // 稍微延迟跳转，让用户看到 100% 和成功状态
      setTimeout(() => {
        router.push(isMobile() ? '/h5/home' : '/web/home');
      }, 800);
    } else {
      status.value = 'error';
      title.value = '验证失败';
      desc.value = result.message || '登录状态获取失败，请重试';
    }
  } catch (e) {
    console.error('回调处理失败：', e);
    status.value = 'error';
    title.value = '网络错误';
    desc.value = '无法连接到服务器，请稍后重试';
  }
};

onMounted(() => {
  startFakeProgress();
  if (isLoggedIn()) {
    status.value = 'success';
    title.value = '验证成功';
    desc.value = '即将为您跳转页面';
    router.push(isMobile() ? '/h5/home' : '/web/home');
  } else {
    handleCallback();
  }
});

onUnmounted(() => {
  if (progressTimer) {
    clearInterval(progressTimer);
  }
});
</script>

<style scoped lang="scss">
/* 页面整体背景：更现代的柔和动态渐变 */
.redirect-container {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  padding: 0;
  margin: 0;
  background: linear-gradient(-45deg, #e6e9f0, #eef1f5, #d9e2ec, #f0f4f8);
  background-size: 400% 400%;
  animation: gradientBG 15s ease infinite;

  /* 毛玻璃卡片设计 */
  .loading-card {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 85%;
    max-width: 420px;
    padding: 45px 50px;
    background: rgb(255 255 255 / 70%);
    border-radius: 24px;
    box-shadow:
      0 10px 40px rgb(0 0 0 / 5%),
      inset 0 0 0 1px rgb(255 255 255 / 80%);

    &.fade-in {
      animation: fadeInUP 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* 状态图标 */
    .status-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      margin-bottom: 20px;
      font-size: 32px;
      color: #fff;
      border-radius: 50%;
      animation: scaleIn 0.4s ease-out forwards;

      &.success-icon {
        background-color: var(--el-color-success, #67c23a);
        box-shadow: 0 4px 12px rgb(103 194 58 / 30%);
      }

      &.error-icon {
        background-color: var(--el-color-danger, #f56c6c);
        box-shadow: 0 4px 12px rgb(245 108 108 / 30%);
      }
    }

    /* 标题与描述文本 */
    .loading-title {
      margin: 0 0 8px;
      font-size: 22px;
      font-weight: 600;
      color: #2c3e50;
      text-align: center;
      letter-spacing: 0.5px;
    }

    .loading-desc {
      margin: 0 0 25px;
      font-size: 14px;
      line-height: 1.5;
      color: #606266;
      text-align: center;
    }

    /* Element Plus 进度条定制 */
    .progress-bar {
      width: 100%;
      margin-top: 5px;

      :deep(.el-progress-bar__inner) {
        border-radius: 10px;
        transition: width 0.3s ease;

        /* 让进度条涨起来更丝滑 */
      }

      :deep(.el-progress-bar__outer) {
        background-color: rgb(0 0 0 / 4%);
        border-radius: 10px;
      }
    }

    /* 弹跳小球动画组件 */
    .spinner {
      display: flex;
      justify-content: space-between;
      width: 70px;
      margin-bottom: 30px;

      div {
        display: inline-block;
        width: 14px;
        height: 14px;
        background-color: var(--el-color-primary, #409eff);
        border-radius: 100%;
        animation: sk-bouncedelay 1.4s infinite ease-in-out both;
      }

      .bounce1 {
        animation-delay: -0.32s;
      }

      .bounce2 {
        animation-delay: -0.16s;
      }
    }

    /* 移动端媒体查询适配 */
    @media screen and (width <=480px) {
      padding: 35px 25px;
      border-radius: 20px;

      .loading-title {
        font-size: 18px;
      }

      .loading-desc {
        margin: 0 0 20px;
        font-size: 13px;
      }

      .spinner {
        width: 60px;
        margin-bottom: 25px;

        div {
          width: 12px;
          height: 12px;
        }
      }
    }
  }
}

/* 文本后三个点的闪烁动画，固定宽度防止文字抖动 */
.dot-anim {
  display: inline-block;
  width: 24px;
  overflow: hidden;
  vertical-align: bottom;
  text-align: left;
  white-space: nowrap;
  animation: dot-blink 1.5s infinite steps(4, end);
}
</style>
