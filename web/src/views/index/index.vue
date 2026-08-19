<template>
  <div />
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted } from 'vue';
import { aiPrefix } from '@/api/http';

const login = async () => {
  console.log(111);
  try {
    const resp = await fetch(`${aiPrefix}/gms/auth/config`);
    const result = await resp.json();

    if (result.code === '200') {
      const { authorizeUrl, state } = result.data;
      console.log(authorizeUrl, 555);
      sessionStorage.setItem('oauth_state', state);

      window.location.href = authorizeUrl;
    } else {
      console.error('获取授权 URL 失败：', result.message);
      ElMessage.error('登录配置获取失败，请联系管理员');
    }
  } catch (e) {
    console.error('请求后端失败：', e);
    ElMessage.error('网络错误，请稍后重试');
  }
};
onMounted(() => {
  login();
});
</script>

<style lang="scss" scoped></style>
